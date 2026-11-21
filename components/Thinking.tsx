"use client";
import { useEffect, useState } from "react";
import type { TraceItem } from "./usePlanner";

// Status lines shown for whatever the agent is doing right now.
const PHRASES: Record<string, string[]> = {
  parse_preferences: ["Reading between the lines", "Decoding your vibe", "Translating “tired but fun”", "Understanding your Saturday"],
  response_cache: ["Checking if we've planned this before"],
  planner: ["Thinking it through", "Sketching the day", "Weighing the options", "Connecting the dots", "Plotting a good day"],
  resolve_area: ["Finding you on the NCR map", "Locating the nearest metro", "Getting our bearings"],
  get_weather: ["Checking the sky over Delhi", "Sniffing the AQI", "Consulting the weather gods", "Deciding: umbrella or sunglasses"],
  search_activities: ["Scouting quiet corners", "Hunting for hidden gems", "Asking the locals", "Flipping through the city guide"],
  search_food: ["Reading menus", "Hunting for a table without a queue", "Sniffing out good food", "Checking what's veg-friendly"],
  search_events: ["Checking what's on this Saturday", "Scanning the gig listings"],
  get_travel_time: ["Negotiating with Delhi traffic", "Timing the cab rides", "Dodging Ring Road jams", "Plotting the route"],
  estimate_cost: ["Counting rupees", "Doing the math on cab fares", "Keeping it within budget"],
  validate_plan: ["Double-checking the timings", "Making sure nothing's closed", "Stress-testing the plan", "Checking for crowds"],
  finalize_plan: ["Polishing the itinerary", "Writing why each stop fits you", "Adding the finishing touches"],
};
const IDLE = ["Brewing chai", "Finding parking in CP", "Bargaining at Sarojini", "Waiting for the metro", "Counting Mughal tombs", "Avoiding the crowds", "Asking a rickshaw-wala"];

const GLYPHS = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];

const STAGES: { label: string; done: (names: Set<string>) => boolean }[] = [
  { label: "Understand", done: (n) => n.has("parse_preferences") },
  { label: "Weather", done: (n) => n.has("get_weather") },
  { label: "Places", done: (n) => n.has("search_activities") || n.has("search_food") },
  { label: "Routes", done: (n) => n.has("get_travel_time") || n.has("estimate_cost") || n.has("validate_plan") },
  { label: "Validate", done: (n) => n.has("validate_plan") || n.has("finalize_plan") },
  { label: "Polish", done: (n) => n.has("finalize_plan") },
];

const keyFor = (name: string) => (name.startsWith("planner turn") ? "planner" : name);

/** Hook: ticking clock for animations (paused for reduced-motion users). */
function useTick(ms: number) {
  const [state, setState] = useState({ tick: 0, now: 0 });
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const id = setInterval(() => setState((s) => ({ tick: s.tick + 1, now: Date.now() })), reduce ? ms * 8 : ms);
    return () => clearInterval(id);
  }, [ms]);
  return state;
}

function useThinkingState(trace: TraceItem[], startedAt: number | null) {
  const { tick, now } = useTick(120);
  const steps = trace.filter((t): t is Extract<TraceItem, { kind: "step" }> => t.kind === "step").map((t) => t.step);
  const running = [...steps].reverse().find((s) => s.running);
  const lastThought = [...trace].reverse().find((t): t is Extract<TraceItem, { kind: "thinking" }> => t.kind === "thinking");
  const names = new Set(steps.filter((s) => !s.running).map((s) => keyFor(s.name)));

  const pool = running ? PHRASES[keyFor(running.name)] ?? IDLE : IDLE;
  const phrase = pool[Math.floor(tick / 18) % pool.length]; // rotate every ~2.2s
  const glyph = GLYPHS[tick % GLYPHS.length];
  const elapsed = startedAt && now ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const tools = steps.filter((s) => s.kind === "tool" && !s.running).length;
  const tokens = steps.reduce((a, s) => a + (s.usage ? s.usage.inputTokens + s.usage.outputTokens : 0), 0);
  // The model's reasoning summaries start with a bold headline, e.g. "**Estimating costs**".
  const headline = lastThought?.text.match(/\*\*(.+?)\*\*/)?.[1] ?? null;
  return { phrase, glyph, elapsed, tools, tokens, headline, names, runningName: running?.name };
}

export function ThinkingCard({ trace, startedAt, onShowTrace }: { trace: TraceItem[]; startedAt: number | null; onShowTrace: () => void }) {
  const s = useThinkingState(trace, startedAt);
  return (
    <div className="space-y-5" aria-live="polite">
      <div className="rounded-2xl border border-line bg-surface px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="w-5 text-center font-mono text-xl leading-none text-accent" aria-hidden="true">{s.glyph}</span>
          <span className="shimmer-text min-w-0 flex-1 truncate text-[16px] font-semibold">{s.phrase}…</span>
          <span className="flex-none font-mono text-xs text-muted">
            {s.elapsed}s{s.tools ? ` · ${s.tools} tools` : ""}{s.tokens ? ` · ${(s.tokens / 1000).toFixed(1)}k tok` : ""}
          </span>
        </div>
        {s.headline && <p className="mt-1.5 pl-8 text-[13px] italic text-muted">{s.headline}</p>}
        <ol className="mt-4 flex items-center gap-1.5 pl-8" aria-label="Progress">
          {STAGES.map((st, i) => {
            const done = st.done(s.names);
            const active = !done && (i === 0 || STAGES[i - 1].done(s.names));
            return (
              <li key={st.label} className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={`h-1 rounded-full ${done ? "bg-accent" : active ? "stage-active" : "bg-line"}`} />
                <span className={`hidden truncate text-[11px] sm:block ${done || active ? "text-ink" : "text-muted"}`}>{st.label}</span>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={onShowTrace} className="mt-3 pl-8 text-[13px] font-medium text-accent lg:hidden">
          Watch the agent work →
        </button>
      </div>

      {/* Skeleton itinerary while the plan is being built */}
      <div className="space-y-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-4" style={{ opacity: 1 - i * 0.22 }}>
            <div className="skeleton mt-3.5 h-3 w-10 rounded" />
            <div className="space-y-2 rounded-2xl border border-line bg-surface px-4 py-3.5">
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="skeleton h-3 w-5/6 rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact sticky banner used while an existing plan is being updated. */
export function ThinkingBanner({ trace, startedAt, change }: { trace: TraceItem[]; startedAt: number | null; change: string | null }) {
  const s = useThinkingState(trace, startedAt);
  return (
    <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="w-5 text-center font-mono text-lg leading-none text-accent" aria-hidden="true">{s.glyph}</span>
        <div className="min-w-0 flex-1">
          <div className="shimmer-text truncate text-[15px] font-semibold">{s.phrase}…</div>
          <div className="truncate text-xs text-muted">
            Updating your plan{change ? `: “${change}”` : ""} · {s.elapsed}s{s.tools ? ` · ${s.tools} tools` : ""}
          </div>
        </div>
      </div>
      <div className="progress-track mt-2.5 h-0.5 overflow-hidden rounded-full bg-line">
        <div className="progress-bar h-full w-1/3 rounded-full bg-accent" />
      </div>
    </div>
  );
}
