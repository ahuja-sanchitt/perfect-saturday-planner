// Self-built observability: a span recorder that (1) streams events to the UI, (2) keeps
// recent runs in a ring buffer for /runs, (3) logs one JSON line per run for Vercel logs.
// Span attribute names loosely follow the OpenTelemetry GenAI conventions so the data
// could be exported to Langfuse/OTel later without reshaping.
import type { LlmUsage, Preferences, RunStats, TraceEvent } from "@/lib/types";

export interface Span {
  id: string;
  name: string;
  kind: "llm" | "tool" | "cache" | "guard";
  startMs: number;
  endMs?: number;
  ok?: boolean;
  summary?: string;
  cacheHit?: boolean;
  usage?: LlmUsage;
  attributes?: Record<string, unknown>;
}

export interface RunRecord {
  runId: string;
  startedAt: string;
  input: string;
  prefs?: Preferences;
  outcome: "plan" | "clarify" | "refused" | "error" | "fallback" | "running";
  stats?: RunStats;
  spans: Span[];
  planTitle?: string;
  feedback?: { rating: "up" | "down"; comment?: string; at: string };
}

const g = globalThis as unknown as { __runs?: RunRecord[] };
const RUNS = (g.__runs ??= []);
const MAX_RUNS = 50;

export function listRuns() {
  return RUNS;
}
export function getRun(id: string) {
  return RUNS.find((r) => r.runId === id);
}

export class Tracer {
  readonly runId = crypto.randomUUID().slice(0, 8);
  readonly startedAt = Date.now();
  readonly record: RunRecord;
  private seq = 0;

  constructor(private emit: (e: TraceEvent) => void, input: string) {
    this.record = { runId: this.runId, startedAt: new Date().toISOString(), input: input.slice(0, 500), outcome: "running", spans: [] };
    RUNS.unshift(this.record);
    if (RUNS.length > MAX_RUNS) RUNS.length = MAX_RUNS;
  }

  send(e: TraceEvent) {
    this.emit(e);
  }

  start(name: string, kind: Span["kind"], input?: unknown, attributes?: Record<string, unknown>): Span {
    const span: Span = { id: `${this.runId}-${++this.seq}`, name, kind, startMs: Date.now(), attributes };
    this.record.spans.push(span);
    this.emit({ type: "step_start", id: span.id, name, kind, input, at: span.startMs - this.startedAt });
    return span;
  }

  end(span: Span, r: { ok: boolean; summary: string; cacheHit?: boolean; usage?: LlmUsage }) {
    span.endMs = Date.now();
    Object.assign(span, r);
    this.emit({ type: "step_end", id: span.id, name: span.name, ok: r.ok, summary: r.summary, ms: span.endMs - span.startMs, cacheHit: r.cacheHit, usage: r.usage });
  }

  stats(promptVersions: Record<string, string>, responseCacheHit: boolean, dataSources: string[]): RunStats {
    const llm = this.record.spans.filter((s) => s.usage);
    const sum = (f: (u: LlmUsage) => number) => llm.reduce((a, s) => a + f(s.usage!), 0);
    const inputTokens = sum((u) => u.inputTokens);
    const cachedTokens = sum((u) => u.cachedTokens);
    return {
      runId: this.runId,
      totalMs: Date.now() - this.startedAt,
      llmCalls: llm.length,
      toolCalls: this.record.spans.filter((s) => s.kind === "tool").length,
      inputTokens,
      cachedTokens,
      outputTokens: sum((u) => u.outputTokens),
      costUsd: sum((u) => u.costUsd),
      savedUsd: sum((u) => u.savedUsd),
      cacheHitPct: inputTokens ? Math.round((cachedTokens / inputTokens) * 100) : 0,
      promptVersions,
      responseCacheHit,
      dataSources,
    };
  }

  finish(outcome: RunRecord["outcome"], stats: RunStats, extra: Partial<RunRecord> = {}) {
    Object.assign(this.record, { outcome, stats, ...extra });
    // One structured log line per run (visible in Vercel function logs).
    if (process.env.QUIET_RUN_LOGS === "1") return;
    console.log(JSON.stringify({ event: "run_complete", outcome, ...stats, spans: this.record.spans.map((s) => ({ name: s.name, kind: s.kind, ms: (s.endMs ?? s.startMs) - s.startMs, ok: s.ok, cacheHit: s.cacheHit, model: s.usage?.model, cached: s.usage?.cachedTokens, input: s.usage?.inputTokens })) }));
  }
}
