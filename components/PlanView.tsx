"use client";
import { useState } from "react";
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
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-balance">{plan.title}</h2>
          {plan.weather && (
            <span className="flex-none text-sm text-muted tabular-nums">
              {[plan.weather.tempMax !== null ? `${Math.round(plan.weather.tempMax)}°C` : null, plan.weather.aqi !== null ? `AQI ${plan.weather.aqi}` : null].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        <p className="max-w-[68ch] text-base text-ink/85">{plan.summary}</p>
      </header>

      {plan.mode === "fallback" && (
        <p className="rounded-xl bg-subtle px-4 py-3 text-sm text-muted">
          The AI planner wasn&apos;t available, so a rule-based planner built this from the same real places and checks. It&apos;s less personal.
        </p>
      )}

      <ol>
        {plan.stops.map((s, i) => (
          <li key={`${s.placeId}-${i}`}>
            <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 sm:grid-cols-[68px_minmax(0,1fr)_auto] sm:gap-5">
              <div className="pt-4 text-[15px] font-semibold tabular-nums">
                {s.start}
                <span className="block text-sm font-normal text-muted">{s.end}</span>
              </div>
              <article className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold leading-snug">
                    <a href={mapUrl(`${s.name} ${s.area}`, s.lat, s.lng)} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                      {s.name}
                    </a>
                    <span className="ml-2 font-sans text-sm font-normal text-muted">{s.area}</span>
                  </h3>
                  <span className="flex-none text-[15px] font-semibold tabular-nums sm:hidden">{s.cost ? inr(s.cost) : "Free"}</span>
                </div>
                <p className="text-base">{s.activity}</p>
                <p className="text-[15px] text-good">
                  <span className="font-semibold">Why it fits: </span>
                  {s.why}
                </p>
                {s.tradeoff && (
                  <p className="text-[15px] text-warn">
                    <span className="font-semibold">Trade-off: </span>
                    {s.tradeoff}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
                  <SourceBadge source={s.source} />
                  {s.backup && <span>Backup: {s.backup.name}</span>}
                </div>
              </article>
              <div className="hidden pt-4 text-right text-[15px] font-semibold tabular-nums sm:block">{s.cost ? inr(s.cost) : "Free"}</div>
            </div>
            {s.travelToNext ? (
              <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 py-2 sm:grid-cols-[68px_minmax(0,1fr)] sm:gap-5">
                <span />
                <span className="pl-5 text-sm text-muted tabular-nums">
                  {s.travelToNext.mode === "walk" ? "Walk" : "Cab"} {s.travelToNext.minutes} min{s.travelToNext.fare ? `, about ${inr(s.travelToNext.fare)}` : ""}
                </span>
              </div>
            ) : (
              i < plan.stops.length - 1 && <div className="h-3" />
            )}
          </li>
        ))}
      </ol>

      {plan.stops.some((s) => s.source === "mock") && (
        <p className="rounded-xl bg-warn/10 px-4 py-3 text-sm text-warn">
          Stops marked <strong>Sample data</strong> are fictional venues, added to show coverage while more real data sources are connected. Everything else is a real place.
        </p>
      )}

      {plan.warnings.length > 0 && (
        <details className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-warn">Things to know ({plan.warnings.length})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            {plan.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="space-y-3 border-t border-line pt-4">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-base tabular-nums">
          <span>
            <strong className={overBudget ? "text-warn" : ""}>{inr(plan.totals.cost)}</strong>
            <span className="text-muted">{plan.totals.budget ? ` of ${inr(plan.totals.budget)}` : ""}, cabs included</span>
          </span>
          <span>
            <strong className={overTime ? "text-warn" : ""}>{dur(plan.totals.minutes)}</strong>
            <span className="text-muted">{plan.totals.availableMinutes ? ` of ${dur(plan.totals.availableMinutes)}` : ""}</span>
          </span>
          {!overBudget && !overTime && !plan.warnings.length && <span className="font-semibold text-good">All constraints met</span>}
        </div>
        <DataLegend plan={plan} />
      </div>
    </div>
  );
}

const TWEAKS = ["Cheaper", "More outdoor", "Add live music", "Swap lunch spot", "Shorter day"];

export function RefineBox({ onSubmit, disabled, runId }: { onSubmit: (text: string) => void; disabled: boolean; runId: string | null }) {
  const [text, setText] = useState("");
  const [rated, setRated] = useState<"up" | "down" | null>(null);
  const submit = (t: string) => {
    if (!t.trim() || disabled) return;
    onSubmit(t.trim());
    setText("");
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Change anything: cheaper, start at 2pm, I'm in Gurugram now…"
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          maxLength={400}
        />
        <button type="submit" disabled={disabled || !text.trim()} className="flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[15px] font-semibold text-accent-ink disabled:opacity-50">
          <span className="hidden sm:inline">Update plan</span>
          <ArrowRightIcon />
          <span className="sr-only sm:hidden">Update plan</span>
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {TWEAKS.map((t) => (
          <button key={t} type="button" disabled={disabled} onClick={() => submit(t)} className="h-9 rounded-full border border-line-strong bg-surface px-3.5 text-sm hover:border-accent disabled:opacity-50">
            {t}
          </button>
        ))}
        <span className="ml-auto flex gap-2">
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
