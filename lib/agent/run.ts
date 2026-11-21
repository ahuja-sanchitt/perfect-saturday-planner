// The agent orchestrator: guard → parse → (clarify | refuse) → response cache → tool loop → plan.
import { createHash } from "node:crypto";
import type OpenAI from "openai";
import { responseCache, stableStringify } from "@/lib/cache/store";
import { CURATED_PLACES } from "@/lib/data/curated";
import { DINEOUT_SNAPSHOT } from "@/lib/data/snapshot";
import { osmPlaceById } from "@/lib/providers/live";
import { upcomingSaturday } from "@/lib/geo";
import { getOpenAI, hasLlm, toUsage } from "@/lib/llm/client";
import { Tracer } from "@/lib/obs/trace";
import { activeVersions, loadPrompt } from "@/lib/prompts/loader";
import type { Plan, Preferences, TraceEvent } from "@/lib/types";
import { assemblePlan } from "./assemble";
import { fallbackPlan } from "./fallback";
import { parseHeuristic, parseWithLlm, type PlanForm } from "./parse";
import { TOOL_DEFINITIONS, runTool, type ToolContext } from "./tools";

export interface PlanRequest {
  message: string;
  form?: PlanForm;
  answers?: Record<string, string>;
  previous?: { prefs: Preferences; plan: Plan } | null;
  changeRequest?: string;
  promptVersion?: string; // planner A/B override, e.g. "v1"
}

const MAX_TURNS = 10;
const WALL_CLOCK_MS = 85_000;

export async function runAgent(req: PlanRequest, emit: (e: TraceEvent) => void): Promise<void> {
  const tracer = new Tracer(emit, req.changeRequest ? `[change] ${req.changeRequest}` : req.message || JSON.stringify(req.form ?? {}));
  const versions = activeVersions();
  if (req.promptVersion && /^v\d+$/.test(req.promptVersion)) versions.planner = req.promptVersion;
  const parserPrompt = loadPrompt("parser", versions.parser);
  const plannerPrompt = loadPrompt("planner", versions.planner);
  const promptRefs = { parser: parserPrompt.ref, planner: plannerPrompt.ref };
  const date = upcomingSaturday();
  tracer.send({ type: "run_start", runId: tracer.runId, promptVersions: promptRefs, at: Date.now() });

  const ctx: ToolContext = {
    prefs: undefined as unknown as Preferences,
    date: date.iso,
    places: new Map(),
    origin: null,
    weather: null,
    dataSources: new Set(),
    finalizeAttempts: 0,
    finalPlan: null,
    finalCheck: null,
  };
  const finish = (outcome: Parameters<Tracer["finish"]>[0], responseCacheHit = false, extra = {}) => {
    const stats = tracer.stats(promptRefs, responseCacheHit, [...ctx.dataSources]);
    tracer.finish(outcome, stats, extra);
    tracer.send({ type: "done", stats });
  };

  // ---------- 1. Parse preferences ----------
  let prefs: Preferences;
  const pSpan = tracer.start("parse_preferences", "llm", undefined, { "gen_ai.request.model": parserPrompt.model, prompt: parserPrompt.ref });
  try {
    if (!hasLlm()) throw new Error("no OPENAI_API_KEY");
    const { prefs: p, usage } = await parseWithLlm({ ...req, previous: req.previous?.prefs }, parserPrompt);
    prefs = p;
    tracer.end(pSpan, { ok: true, summary: describePrefs(prefs), usage });
  } catch (e) {
    prefs = parseHeuristic({ ...req, previous: req.previous?.prefs });
    tracer.end(pSpan, { ok: false, summary: `LLM parser unavailable (${(e as Error).message}) → heuristic parser: ${describePrefs(prefs)}` });
  }
  // Refinements are relative ("cheaper", "shorter"): keep the user's original budget/time unless they
  // give a new number. (Caught in testing: the parser turned "Cheaper" into an invented lower budget.)
  if (req.previous?.prefs && req.changeRequest && !/\d/.test(req.changeRequest)) {
    prefs = { ...prefs, budget: req.previous.prefs.budget, hours: req.previous.prefs.hours, groupSize: req.previous.prefs.groupSize, clarifyingQuestions: [] };
  }
  ctx.prefs = prefs;
  tracer.record.prefs = prefs;

  // ---------- 2. Guardrails: scope + clarification ----------
  if (!prefs.inNcr) {
    tracer.send({ type: "message", level: "info", text: "I only plan Saturdays in Delhi NCR for now (Delhi, Gurugram, Noida, Ghaziabad, Faridabad). Tell me where in NCR you'll be and I'll plan it!" });
    return finish("refused");
  }
  if (prefs.clarifyingQuestions.length) {
    tracer.send({ type: "clarify", questions: prefs.clarifyingQuestions, prefs });
    return finish("clarify");
  }
  if (!prefs.area) prefs.area = "Central Delhi";

  // ---------- 3. Response cache ----------
  const cacheKey = createHash("sha256")
    .update(stableStringify({ p: { ...prefs, mood: prefs.mood.toLowerCase(), clarifyingQuestions: [] }, c: req.changeRequest ?? "", prev: req.previous?.plan.stops.map((s) => s.placeId) ?? [], v: plannerPrompt.ref, d: date.iso }))
    .digest("hex")
    .slice(0, 16);
  const cSpan = tracer.start("response_cache", "cache");
  const cachedPlan = process.env.DISABLE_RESPONSE_CACHE === "1" ? undefined : responseCache.get<Plan>(cacheKey);
  if (cachedPlan) {
    tracer.end(cSpan, { ok: true, summary: `hit ${cacheKey} — returning cached plan (0 LLM tokens)`, cacheHit: true });
    tracer.send({ type: "plan", plan: cachedPlan, prefs });
    return finish("plan", true, { planTitle: cachedPlan.title });
  }
  tracer.end(cSpan, { ok: true, summary: `miss ${cacheKey}`, cacheHit: false });

  const exec = async (name: string, args: unknown) => {
    const span = tracer.start(name, "tool", args);
    try {
      const r = await runTool(name, args, ctx);
      tracer.end(span, { ok: r.ok ?? true, summary: r.summary, cacheHit: r.cacheHit });
      return r.output;
    } catch (e) {
      tracer.end(span, { ok: false, summary: `error: ${(e as Error).message}` });
      return { error: `Tool failed: ${(e as Error).message}. Continue with other data.` };
    }
  };

  // ---------- 4. Agent loop ----------
  let plan: Plan | null = null;
  let failure = "";
  if (hasLlm()) {
    try {
      plan = await plannerLoop(req, ctx, tracer, exec, plannerPrompt, date.label);
      if (!plan) failure = "planner did not produce a valid plan";
    } catch (e) {
      failure = `LLM error: ${(e as Error).message}`;
      tracer.send({ type: "message", level: "error", text: `The AI planner hit an error (${(e as Error).message}). Switching to the rule-based planner.` });
    }
  } else {
    failure = "no OpenAI API key configured";
  }

  // ---------- 5. Fallback ----------
  if (!plan) {
    if (!ctx.prefs.inNcr) return finish("refused");
    plan = await fallbackPlan(ctx, tracer, exec, failure);
    if (!plan) {
      tracer.send({ type: "message", level: "error", text: "I couldn't find places that fit all your constraints. Try a bigger budget, more time, or a different area." });
      return finish("error");
    }
  }

  responseCache.set(cacheKey, plan, 30 * 60_000);
  tracer.send({ type: "plan", plan, prefs: ctx.prefs });
  finish(plan.mode === "fallback" ? "fallback" : "plan", false, { planTitle: plan.title });
}

async function plannerLoop(
  req: PlanRequest,
  ctx: ToolContext,
  tracer: Tracer,
  exec: (name: string, args: unknown) => Promise<unknown>,
  prompt: ReturnType<typeof loadPrompt>,
  dateLabel: string,
): Promise<Plan | null> {
  const openai = getOpenAI();
  const { clarifyingQuestions: _omit, ...prefsForModel } = ctx.prefs;
  void _omit;
  // Dynamic content goes AFTER the static instructions + tools, so the prefix stays cacheable.
  let userMsg = `<saturday>${ctx.date} (${dateLabel})</saturday>\n<preferences>\n${stableStringify(prefsForModel)}\n</preferences>`;
  if (req.previous && req.changeRequest) {
    const prev = req.previous.plan.stops.map((s) => ({ placeId: s.placeId, name: s.name, start: s.start, end: s.end, cost: s.cost }));
    const { cost, minutes } = req.previous.plan.totals;
    userMsg += `\n<previous_plan>\n${stableStringify({ title: req.previous.plan.title, stops: prev, totalCostInr: cost, totalMinutes: minutes })}\n</previous_plan>\n<change_request>\n${req.changeRequest}\n</change_request>`;
    ctx.refinement = { request: req.changeRequest, previousCost: cost, previousMinutes: minutes, previousPlaceIds: req.previous.plan.stops.map((s) => s.placeId) };
    // Re-register previous places so the model can keep them without re-searching.
    for (const s of req.previous.plan.stops) {
      const known = [...CURATED_PLACES, ...DINEOUT_SNAPSHOT.places].find((p) => p.id === s.placeId) ?? osmPlaceById(s.placeId);
      if (known) ctx.places.set(known.id, known);
    }
  }
  const input: OpenAI.Responses.ResponseInputItem[] = [{ role: "user", content: userMsg }];
  const started = Date.now();

  // A rejected finalize_plan near the cap earns up to 2 repair turns.
  for (let turn = 1; turn <= MAX_TURNS + (ctx.finalizeAttempts > 0 ? 2 : 0); turn++) {
    if (Date.now() - started > WALL_CLOCK_MS) {
      tracer.send({ type: "message", level: "error", text: "Planner took too long — wrapping up with the fallback planner." });
      return null;
    }
    // Turn-budget nudge, appended at the END so the cached prefix is untouched (caught in testing:
    // the model kept re-running estimate_cost until it hit the turn cap).
    const left = Math.max(1, MAX_TURNS - turn + 1);
    if (left <= 5 && !ctx.finalPlan) {
      input.push({ role: "developer", content: `Turn budget: ${left} turn(s) left including this one. Stop exploring and call finalize_plan now with your best plan that passes validation.` });
    }
    const span = tracer.start(`planner turn ${turn}`, "llm", undefined, { "gen_ai.request.model": prompt.model, prompt: prompt.ref });
    const res = await openai.responses.create({
      model: prompt.model,
      instructions: prompt.body,
      input,
      tools: TOOL_DEFINITIONS,
      parallel_tool_calls: true,
      reasoning: { effort: prompt.effort, summary: "auto" },
      prompt_cache_key: prompt.ref,
    });
    const usage = toUsage(prompt.model, res.usage);
    const calls = res.output.filter((o): o is OpenAI.Responses.ResponseFunctionToolCall => o.type === "function_call");
    tracer.end(span, {
      ok: true,
      summary: `${calls.length ? `→ ${calls.map((c) => c.name).join(", ")}` : "→ text reply"} · ${usage.inputTokens} in (${usage.cachedTokens} cached) / ${usage.outputTokens} out`,
      usage,
      cacheHit: usage.cachedTokens > 0,
    });
    for (const item of res.output) {
      if (item.type === "reasoning") {
        const text = item.summary?.map((s) => s.text).join(" ").trim();
        if (text) tracer.send({ type: "thinking", text });
      }
    }

    if (!calls.length) {
      const text = res.output_text?.trim();
      if (text && /ncr/i.test(text) && !ctx.finalPlan) {
        ctx.prefs.inNcr = false;
        tracer.send({ type: "message", level: "info", text });
      }
      return ctx.finalPlan && ctx.finalCheck ? assemblePlan(ctx.finalPlan, ctx.finalCheck, ctx, "agent") : null;
    }

    input.push(...(res.output as OpenAI.Responses.ResponseInputItem[]));
    const outputs = await Promise.all(
      calls.map(async (c) => {
        let args: unknown;
        try {
          args = JSON.parse(c.arguments);
        } catch {
          return { type: "function_call_output" as const, call_id: c.call_id, output: JSON.stringify({ error: "Arguments were not valid JSON" }) };
        }
        const out = await exec(c.name, args);
        return { type: "function_call_output" as const, call_id: c.call_id, output: JSON.stringify(out) };
      }),
    );
    input.push(...outputs);

    if (ctx.finalPlan && ctx.finalCheck) {
      const flagged = ctx.finalizeAttempts >= 3 && !ctx.finalCheck.ok ? ["Some constraints could not be fully met — see warnings."] : [];
      return assemblePlan(ctx.finalPlan, ctx.finalCheck, ctx, "agent", flagged);
    }
  }
  tracer.send({ type: "message", level: "error", text: `Planner hit the ${MAX_TURNS}-turn limit.` });
  return null;
}

function describePrefs(p: Preferences): string {
  return [
    p.area ?? "area?",
    p.budget ? `₹${p.budget}` : "budget?",
    p.hours ? `${p.hours}h` : "time?",
    `energy=${p.energy}`,
    p.diet !== "any" ? `diet=${p.diet}` : null,
    p.avoidCrowds ? "avoid crowds" : null,
    p.interests.length ? p.interests.join("/") : null,
    p.clarifyingQuestions.length ? `${p.clarifyingQuestions.length} question(s)` : null,
    !p.inNcr ? "OUTSIDE NCR" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
