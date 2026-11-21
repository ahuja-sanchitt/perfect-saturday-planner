"use client";
import { useRef, useState } from "react";
import type { Plan } from "@/lib/types";
import { ArrowRightIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";

type Source = Plan["stops"][number]["source"];

// How each data source is labelled for the user. "mock" = fictional sample venue.
const SOURCE_META: Record<Source, { label: string; title: string; cls: string }> = {
  curated: { label: "Real · curated guide", title: "Real place. Hours, prices and crowd levels are hand-curated estimates.", cls: "border-good/40 text-good" },
  osm: { label: "Real · OpenStreetMap", title: "Real place from OpenStreetMap. Prices and crowd levels are estimates.", cls: "border-good/40 text-good" },
  swiggy: { label: "Real · Swiggy Dineout", title: "Real restaurant from a Swiggy Dineout snapshot.", cls: "border-good/40 text-good" },
  mock: { label: "Sample data", title: "Fictional sample venue used to show coverage. Not a real business.", cls: "border-warn/50 bg-warn/10 text-warn" },
};

export function SourceBadge({ source }: { source: Source }) {
  const m = SOURCE_META[source];
  return (
    <span title={m.title} className={`inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const dur = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
const mapUrl = (name: string, lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}%20%40${lat},${lng}`;

export function PlanView({ plan }: { plan: Plan }) {
  const overBudget = plan.totals.budget !== null && plan.totals.cost > plan.totals.budget;
  const overTime = plan.totals.availableMinutes !== null && plan.totals.minutes > plan.totals.availableMinutes;
  const allMet = !overBudget && !overTime && !plan.warnings.length;
  return (
    <div className="space-y-6">
      {/* The bill: the plan title painted on a saffron field (paints in when a plan lands) */}
      <header className="bill rounded-2xl px-5 py-5 text-saffron-ink sm:px-7 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0 space-y-2">
            <h2 className="font-display text-[34px] leading-[1.05] sm:text-[44px]">{plan.title}</h2>
            <p className="max-w-[62ch] text-base text-saffron-muted">{plan.summary}</p>
          </div>
          <dl className="grid flex-none grid-cols-3 gap-x-5 gap-y-0.5 text-left tabular-nums lg:text-right">
            <dt className="text-sm text-saffron-muted">Spend</dt>
            <dt className="text-sm text-saffron-muted">Time</dt>
            <dt className="text-sm text-saffron-muted">Air</dt>
            <dd className={`text-lg font-bold ${overBudget ? "underline decoration-2 underline-offset-4" : ""}`}>
              {inr(plan.totals.cost)}
              {plan.totals.budget ? <span className="block text-sm font-normal text-saffron-muted">of {inr(plan.totals.budget)}</span> : null}
            </dd>
            <dd className={`text-lg font-bold ${overTime ? "underline decoration-2 underline-offset-4" : ""}`}>
              {dur(plan.totals.minutes)}
              {plan.totals.availableMinutes ? <span className="block text-sm font-normal text-saffron-muted">of {dur(plan.totals.availableMinutes)}</span> : null}
            </dd>
            <dd className="text-lg font-bold">
              {plan.weather?.aqi != null ? `AQI ${plan.weather.aqi}` : "n/a"}
              {plan.weather?.tempMax != null ? <span className="block text-sm font-normal text-saffron-muted">{Math.round(plan.weather.tempMax)}°C</span> : null}
            </dd>
          </dl>
        </div>
      </header>

      {plan.mode === "fallback" && (
        <p className="rounded-xl bg-subtle px-4 py-3 text-[15px] text-muted">
          The AI planner wasn&apos;t available, so a rule-based planner built this from the same real places and checks. It&apos;s less personal.
        </p>
      )}

      {/* Showtimes: ink tiles with lettered times, joined by the travel line */}
      <ol>
        {plan.stops.map((s, i) => (
          <li key={`${s.placeId}-${i}`}>
            <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 sm:grid-cols-[104px_minmax(0,1fr)_auto] sm:gap-5">
              <div className="flex h-[76px] flex-col items-center justify-center rounded-xl bg-night text-marquee sm:h-[88px]">
                <span className="font-display text-[26px] leading-none tabular-nums sm:text-[30px]">{s.start}</span>
                <span className="mt-1 text-[13px] text-night-ink/80 tabular-nums">to {s.end}</span>
              </div>
              <article className="group flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-4 transition-colors focus-within:border-accent hover:border-line-strong">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-[22px] leading-tight">
                    <a href={mapUrl(`${s.name} ${s.area}`, s.lat, s.lng)} target="_blank" rel="noreferrer" className="hover:underline">
                      {s.name}
                    </a>
                    <span className="ml-2 font-sans text-sm text-muted">{s.area}</span>
                  </h3>
                  <span className="flex-none text-base font-bold tabular-nums sm:hidden">{s.cost ? inr(s.cost) : "Free"}</span>
                </div>
                <p className="text-base">{s.activity}</p>
                <p className="text-base text-good">
                  <span className="font-bold">Why it fits: </span>
                  {s.why}
                </p>
                {s.tradeoff && (
                  <p className="text-base text-warn">
                    <span className="font-bold">Trade-off: </span>
                    {s.tradeoff}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
                  <SourceBadge source={s.source} />
                  {s.backup && <span>Backup: {s.backup.name}</span>}
                </div>
              </article>
              <div className="hidden pt-4 text-right text-lg font-bold tabular-nums sm:block">{s.cost ? inr(s.cost) : "Free"}</div>
            </div>
            {i < plan.stops.length - 1 && (
              <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 sm:grid-cols-[104px_minmax(0,1fr)] sm:gap-5" aria-hidden={!s.travelToNext}>
                <span className="mx-auto h-full min-h-7 w-0 border-l-2 border-dashed border-muted/60" />
                <span className="self-center py-2 text-sm text-muted tabular-nums">
                  {s.travelToNext ? `${s.travelToNext.mode === "walk" ? "Walk" : "Cab"} ${s.travelToNext.minutes} min${s.travelToNext.fare ? `, about ${inr(s.travelToNext.fare)}` : ""}` : ""}
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>

      {plan.stops.some((s) => s.source === "mock") && (
        <p className="rounded-xl bg-warn/10 px-4 py-3 text-[15px] text-warn">
          Stops marked <strong>Sample data</strong> are fictional venues, added to show coverage while more real data sources are connected. Everything else is a real place.
        </p>
      )}

      {plan.warnings.length > 0 && (
        <details className="rounded-xl border border-line bg-surface px-4 py-3 text-[15px]">
          <summary className="cursor-pointer font-bold text-warn">Things to know ({plan.warnings.length})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            {plan.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="space-y-3 border-t border-line pt-4">
        {allMet && <p className="font-bold text-good">All constraints met: budget, time with travel, opening hours, diet and crowds.</p>}
        <DataLegend plan={plan} />
      </div>
    </div>
  );
}

const TWEAKS = ["Cheaper", "More outdoor", "Add live music", "Swap lunch spot", "Shorter day"];

export function RefineBox({ onSubmit, disabled, runId }: { onSubmit: (text: string) => void; disabled: boolean; runId: string | null }) {
  const [text, setText] = useState("");
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const [hint, setHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = (t: string) => {
    if (disabled) return;
    if (!t.trim()) {
      // Never a dead button: an empty submit points the person at the field.
      setHint(true);
      inputRef.current?.focus();
      return;
    }
    onSubmit(t.trim());
    setText("");
    setHint(false);
    setRated(null);
  };
  const rate = async (rating: "up" | "down") => {
    setRated(rating);
    if (runId) await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runId, rating }) }).catch(() => {});
  };
  return (
    <div className="space-y-3">
      <form
        className="flex items-center gap-2 rounded-2xl border border-line-strong bg-surface py-1.5 pl-4 pr-1.5 focus-within:border-accent"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <label htmlFor="refine" className="sr-only">
          Change your plan
        </label>
        <input
          id="refine"
          ref={inputRef}
          value={text}
          aria-describedby={hint ? "refine-hint" : undefined}
          onChange={(e) => {
            setText(e.target.value);
            if (hint) setHint(false);
          }}
          placeholder="Change anything: cheaper, start at 2pm, I'm in Gurugram now…"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          maxLength={400}
        />
        <button type="submit" disabled={disabled} className="flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-bold text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-50">
          <span className="hidden sm:inline">Update plan</span>
          <ArrowRightIcon />
          <span className="sr-only sm:hidden">Update plan</span>
        </button>
      </form>
      {hint && (
        <p id="refine-hint" role="status" className="text-sm text-warn">
          Type what to change first, or tap one of the quick changes below.
        </p>
      )}
      <div className="flex items-center gap-2">
        <div className="-my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 sm:flex-wrap" aria-label="Quick changes">
          {TWEAKS.map((t) => (
            <button key={t} type="button" disabled={disabled} onClick={() => submit(t)} className="h-9 flex-none rounded-full border border-line-strong bg-surface px-3.5 text-sm whitespace-nowrap hover:border-accent disabled:opacity-50">
              {t}
            </button>
          ))}
        </div>
        <span className="flex flex-none gap-2">
          <button type="button" aria-label="Good plan" aria-pressed={rated === "up"} onClick={() => rate("up")} className={`flex h-11 w-11 items-center justify-center rounded-xl border ${rated === "up" ? "border-good text-good" : "border-line-strong text-muted"}`}>
            <ThumbUpIcon />
          </button>
          <button type="button" aria-label="Bad plan" aria-pressed={rated === "down"} onClick={() => rate("down")} className={`flex h-11 w-11 items-center justify-center rounded-xl border ${rated === "down" ? "border-bad text-bad" : "border-line-strong text-muted"}`}>
            <ThumbDownIcon />
          </button>
        </span>
      </div>
    </div>
  );
}

function DataLegend({ plan }: { plan: Plan }) {
  const counts = plan.stops.reduce<Record<string, number>>((m, s) => ((m[s.source] = (m[s.source] ?? 0) + 1), m), {});
  const real = plan.stops.length - (counts.mock ?? 0);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
      <span>
        {real} real place{real === 1 ? "" : "s"}
        {counts.mock ? ` and ${counts.mock} sample` : ""}. Weather and AQI live from Open-Meteo, travel times from OSRM.
      </span>
      <span className="flex flex-wrap gap-1.5">
        {(Object.keys(counts) as Source[]).map((k) => (
          <SourceBadge key={k} source={k} />
        ))}
      </span>
    </div>
  );
}
