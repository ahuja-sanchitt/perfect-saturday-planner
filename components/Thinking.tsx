"use client";
import { useEffect, useState } from "react";
import { Sparkle } from "./icons";
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

const STAGES: { label: string; done: (names: Set<string>) => boolean }[] = [
  { label: "Understand", done: (n) => n.has("parse_preferences") },
  { label: "Weather", done: (n) => n.has("get_weather") },
  { label: "Places", done: (n) => n.has("search_activities") || n.has("search_food") },
  { label: "Routes", done: (n) => n.has("get_travel_time") || n.has("estimate_cost") || n.has("validate_plan") },
  { label: "Validate", done: (n) => n.has("validate_plan") || n.has("finalize_plan") },
  { label: "Polish", done: (n) => n.has("finalize_plan") },
];

const keyFor = (name: string) => (name.startsWith("planner turn") ? "planner" : name);

/** One-second clock for the elapsed counter and phrase rotation. */
function useClock() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useThinkingState(trace: TraceItem[], startedAt: number | null) {
  const now = useClock();
  const steps = trace.filter((t): t is Extract<TraceItem, { kind: "step" }> => t.kind === "step").map((t) => t.step);
  const running = [...steps].reverse().find((s) => s.running);
  const lastThought = [...trace].reverse().find((t): t is Extract<TraceItem, { kind: "thinking" }> => t.kind === "thinking");
  const names = new Set(steps.filter((s) => !s.running).map((s) => keyFor(s.name)));
  const elapsed = startedAt && now ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const pool = running ? PHRASES[keyFor(running.name)] ?? IDLE : IDLE;
  const phrase = pool[Math.floor(elapsed / 3) % pool.length]; // a new line every ~3s
  const tools = steps.filter((s) => s.kind === "tool" && !s.running).length;
  const tokens = steps.reduce((a, s) => a + (s.usage ? s.usage.inputTokens + s.usage.outputTokens : 0), 0);
  // The model's reasoning summaries start with a bold headline, e.g. "**Estimating costs**".
  const headline = lastThought?.text.match(/\*\*(.+?)\*\*/)?.[1] ?? null;
  return { phrase, elapsed, tools, tokens, headline, names };
}

function meta(s: ReturnType<typeof useThinkingState>) {
  return [`${s.elapsed}s`, s.tools ? `${s.tools} tools` : null, s.tokens ? `${(s.tokens / 1000).toFixed(1)}k tokens` : null].filter(Boolean).join(" · ");
}

export function ThinkingCard({ trace, startedAt, onShowTrace }: { trace: TraceItem[]; startedAt: number | null; onShowTrace: () => void }) {
  const s = useThinkingState(trace, startedAt);
  return (
    <div className="space-y-6" aria-live="polite">
      <div className="rounded-xl border border-line bg-surface px-5 py-5">
        <div className="flex items-start gap-3">
          <Sparkle size={22} spinning className="mt-0.5 flex-none text-accent" />
          <div className="min-w-0 flex-1">
            <p key={s.phrase} className="status-in font-display text-lg">{s.phrase}…</p>
            <p className="mt-0.5 text-base text-muted tabular-nums">
              {s.headline ? <span className="text-ink/80">{s.headline} · </span> : null}
              {meta(s)}
            </p>
          </div>
        </div>
        <ol className="mt-5 grid grid-cols-6 gap-2" aria-label="Progress">
          {STAGES.map((st, i) => {
            const done = st.done(s.names);
            const active = !done && (i === 0 || STAGES[i - 1].done(s.names));
            return (
              <li key={st.label} className="flex min-w-0 flex-col gap-1.5" aria-current={active ? "step" : undefined}>
                <span className={`h-1.5 rounded-xl ${done ? "bg-accent" : active ? "bg-accent/40" : "bg-line"}`} />
                <span className={`hidden truncate text-base sm:block ${done || active ? "text-ink" : "text-muted"}`}>{st.label}</span>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={onShowTrace} className="mt-4 text-base font-medium text-accent lg:hidden">
          Watch the agent work
        </button>
      </div>

      {/* Placeholder itinerary while the plan is being built */}
      <div className="space-y-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-5" style={{ opacity: 1 - i * 0.25 }}>
            <div className="skeleton h-[76px] w-full rounded-xl sm:h-[88px]" />
            <div className="space-y-2.5 rounded-xl border border-line bg-surface px-5 py-4">
              <div className="skeleton h-4 w-1/2 rounded-xl" />
              <div className="skeleton h-3.5 w-5/6 rounded-xl" />
              <div className="skeleton h-3.5 w-2/3 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sticky banner used while an existing plan is being updated; the old plan stays readable underneath. */
export function ThinkingBanner({ trace, startedAt, change }: { trace: TraceItem[]; startedAt: number | null; change: string | null }) {
  const s = useThinkingState(trace, startedAt);
  return (
    <div className="sticky top-0 z-10 -mx-4 -mt-6 border-b border-line bg-bg px-4 py-3.5 sm:-mx-8 sm:px-8" aria-live="polite">
      <div className="flex items-center gap-3">
        <Sparkle size={20} spinning className="flex-none text-accent" />
        <div className="min-w-0 flex-1">
          <p key={s.phrase} className="status-in truncate font-semibold">{s.phrase}…</p>
          <p className="truncate text-base text-muted tabular-nums">
            Updating your plan{change ? `: “${change}”` : ""} · {meta(s)}
          </p>
        </div>
      </div>
    </div>
  );
}
