/*
 * Offline eval harness.
 *   npm run eval                      # active planner version
 *   npm run eval -- --pv v1,v2        # compare planner prompt versions
 *   npm run eval -- --only brief-example,vague
 *
 * Two layers of scoring:
 *  1. Deterministic checks (outcome, budget, time, diet, pacing, grounded places, non-empty 'why').
 *  2. LLM-as-judge (cheap model, structured output) on personalization / realism / constraints / delight.
 * Results are written to evals/results/<timestamp>.json and a markdown table is printed.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { runAgent, type PlanRequest } from "@/lib/agent/run";
import { CURATED_PLACES } from "@/lib/data/curated";
import { MOCK_PLACES } from "@/lib/data/mock";
import { DINEOUT_SNAPSHOT } from "@/lib/data/snapshot";
import osm from "@/data/ncr/osm.json";
import { getOpenAI, hasLlm, toUsage } from "@/lib/llm/client";
import { loadPrompt } from "@/lib/prompts/loader";
import type { Place, Plan, Preferences, RunStats, TraceEvent } from "@/lib/types";

process.env.DISABLE_RESPONSE_CACHE = "1";
process.env.QUIET_RUN_LOGS = "1";
process.env.DISABLE_JITTER = "1";

interface Case {
  id: string;
  request: PlanRequest;
  expect: { outcome: "plan" | "clarify" | "refused"; diet?: string; maxStops?: number };
}

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const versions = (flag("pv") ?? "").split(",").filter(Boolean);
const only = (flag("only") ?? "").split(",").filter(Boolean);
const noJudge = args.includes("--no-judge");

const cases: Case[] = JSON.parse(readFileSync(path.join(process.cwd(), "evals", "cases.json"), "utf8"));
const selected = only.length ? cases.filter((c) => only.includes(c.id)) : cases;
const PLACES = new Map<string, Place>([...CURATED_PLACES, ...MOCK_PLACES, ...DINEOUT_SNAPSHOT.places, ...((osm as { places: Place[] }).places ?? [])].map((p) => [p.id, p]));

const JudgeZ = z.object({
  personalization: z.number(),
  realism: z.number(),
  constraint_respect: z.number(),
  delight: z.number(),
  rationale: z.string(),
});

async function runCase(c: Case, pv?: string) {
  let outcome = "error" as "plan" | "clarify" | "refused" | "error";
  let plan: Plan | null = null;
  let prefs: Preferences | null = null;
  let stats: RunStats | null = null;
  const t0 = Date.now();
  await runAgent({ ...c.request, promptVersion: pv }, (e: TraceEvent) => {
    if (e.type === "plan") { outcome = "plan"; plan = e.plan; prefs = e.prefs; }
    if (e.type === "clarify") outcome = "clarify";
    if (e.type === "message" && /only plan|NCR only|covers Delhi NCR/i.test(e.text)) outcome = "refused";
    if (e.type === "done") stats = e.stats;
  });
  const checks: Record<string, boolean> = { outcome: outcome === c.expect.outcome };
  const p = plan as Plan | null;
  if (p && c.expect.outcome === "plan") {
    checks.agent_mode = p.mode === "agent";
    checks.grounded = p.stops.every((s) => PLACES.has(s.placeId) || s.source === "osm");
    checks.budget = p.totals.budget === null || p.totals.cost <= p.totals.budget * 1.15;
    checks.time = p.totals.availableMinutes === null || p.totals.minutes <= p.totals.availableMinutes + 10;
    checks.pacing = p.stops.length <= (c.expect.maxStops ?? 4);
    checks.why = p.stops.every((s) => s.why.trim().length > 20);
    if (c.expect.diet) {
      checks.diet = p.stops.every((s) => {
        const place = PLACES.get(s.placeId);
        return !place || place.kind !== "food" || Boolean(place.diet?.vegOnly || place.diet?.vegFriendly);
      });
    }
  }
  let judge: z.infer<typeof JudgeZ> | null = null;
  let judgeCost = 0;
  if (p && !noJudge && hasLlm()) {
    const jp = loadPrompt("judge");
    const res = await getOpenAI().responses.parse({
      model: jp.model,
      instructions: jp.body,
      input: [{ role: "user", content: `<request>${JSON.stringify(c.request)}</request>\n<plan>${JSON.stringify({ ...p, prefs })}</plan>` }],
      text: { format: zodTextFormat(JudgeZ, "grade") },
      reasoning: { effort: "low" },
      prompt_cache_key: jp.ref,
    });
    judge = res.output_parsed ?? null;
    judgeCost = toUsage(jp.model, res.usage).costUsd;
  }
  const s = stats as RunStats | null;
  return {
    id: c.id,
    pv: pv ?? "active",
    outcome,
    passed: Object.values(checks).every(Boolean),
    checks,
    judge,
    ms: Date.now() - t0,
    costUsd: s?.costUsd ?? 0,
    judgeCostUsd: judgeCost,
    cacheHitPct: s?.cacheHitPct ?? 0,
    planTitle: p?.title,
  };
}

async function main() {
  if (!hasLlm()) console.warn("⚠ OPENAI_API_KEY not set — running deterministic fallback only, judge disabled.\n");
  const runs = versions.length ? versions : [undefined];
  const results: Awaited<ReturnType<typeof runCase>>[] = [];
  // Small worker pool: 4 cases in flight at once.
  const jobs = runs.flatMap((pv) => selected.map((c) => ({ pv, c })));
  const concurrency = Number(flag("concurrency") ?? 4);
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < jobs.length) {
        const { pv, c } = jobs[next++];
        try {
          const r = await runCase(c, pv);
          results.push(r);
          const failed = Object.entries(r.checks).filter(([, ok]) => !ok).map(([k]) => k);
          console.log(`[${pv ?? "active"}] ${c.id}: ${r.passed ? "PASS" : "FAIL"} ${failed.length ? `(${failed.join(", ")})` : ""} ${r.judge ? `judge=${avgJudge(r.judge).toFixed(1)}` : ""} ${r.costUsd.toFixed(4)} ${(r.ms / 1000).toFixed(1)}s`);
        } catch (e) {
          console.log(`[${pv ?? "active"}] ${c.id}: ERROR ${(e as Error).message}`);
        }
      }
    }),
  );

  // Summary table per version
  console.log("\n| planner | pass rate | judge avg (1–5) | personalization | realism | constraints | delight | avg cost | avg cache hit | avg latency |");
  console.log("|---|---|---|---|---|---|---|---|---|---|");
  for (const pv of runs.map((v) => v ?? "active")) {
    const rs = results.filter((r) => r.pv === pv);
    const judged = rs.filter((r) => r.judge);
    const mean = (f: (r: (typeof rs)[number]) => number, xs = rs) => (xs.length ? xs.reduce((s, r) => s + f(r), 0) / xs.length : 0);
    const j = (k: keyof z.infer<typeof JudgeZ>) => (judged.length ? mean((r) => Number(r.judge![k]), judged).toFixed(2) : "–");
    console.log(
      `| ${pv} | ${rs.filter((r) => r.passed).length}/${rs.length} | ${judged.length ? mean((r) => avgJudge(r.judge!), judged).toFixed(2) : "–"} | ${j("personalization")} | ${j("realism")} | ${j("constraint_respect")} | ${j("delight")} | $${mean((r) => r.costUsd).toFixed(4)} | ${Math.round(mean((r) => r.cacheHitPct))}% | ${(mean((r) => r.ms) / 1000).toFixed(1)}s |`,
    );
  }
  const dir = path.join(process.cwd(), "evals", "results");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify({ at: new Date().toISOString(), versions: runs, results }, null, 2));
  console.log(`\nSaved ${path.relative(process.cwd(), file)}`);
}

const avgJudge = (j: z.infer<typeof JudgeZ>) => (j.personalization + j.realism + j.constraint_respect + j.delight) / 4;

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
