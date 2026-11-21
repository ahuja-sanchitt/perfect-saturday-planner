"use client";
import { useState } from "react";
import type { Plan } from "@/lib/types";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const dur = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;
const mapUrl = (name: string, lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}%20%40${lat},${lng}`;

export function PlanView({ plan }: { plan: Plan }) {
  const overBudget = plan.totals.budget !== null && plan.totals.cost > plan.totals.budget;
  const overTime = plan.totals.availableMinutes !== null && plan.totals.minutes > plan.totals.availableMinutes;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-xl font-bold">{plan.title}</h2>
        {plan.weather && (
          <span className="text-[13px] text-muted">
            {plan.weather.tempMax !== null ? `${Math.round(plan.weather.tempMax)}°C` : ""}
            {plan.weather.aqi !== null ? ` · AQI ${plan.weather.aqi}` : ""}
          </span>
        )}
      </div>
      <p className="text-[15px] leading-relaxed text-ink/90">{plan.summary}</p>
      {plan.mode === "fallback" && (
        <p className="rounded-xl border border-line-strong bg-subtle px-4 py-3 text-sm text-muted">
          The AI planner wasn&apos;t available, so a rule-based planner built this from the same real places and checks. It&apos;s less personalised.
        </p>
      )}

      <ol className="space-y-0">
        {plan.stops.map((s, i) => (
          <li key={`${s.placeId}-${i}`}>
            <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:gap-4">
              <div className="pt-3.5 font-mono text-[13px] text-muted">
                {s.start}
                <span className="block text-[11px] opacity-70">{s.end}</span>
              </div>
              <article className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[15px] font-semibold">
                    <a href={mapUrl(`${s.name} ${s.area}`, s.lat, s.lng)} target="_blank" rel="noreferrer" className="hover:underline">
                      {s.name}
                    </a>{" "}
                    <span className="text-[13px] font-normal text-muted">· {s.area}</span>
                  </h3>
                  <span className="text-sm font-semibold sm:hidden">{s.cost ? inr(s.cost) : "Free"}</span>
                </div>
                <p className="text-[13.5px] text-ink/85">{s.activity}</p>
                <p className="text-[12.5px] font-medium text-good">Why you: {s.why}</p>
                {s.tradeoff && <p className="text-[12.5px] font-medium text-warn">Trade-off: {s.tradeoff}</p>}
                <div className="flex flex-wrap gap-x-3 text-xs text-muted">
                  {s.backup && <span>Backup: {s.backup.name}</span>}
                  <span>Source: {s.source === "swiggy" ? "Swiggy Dineout" : s.source === "osm" ? "OpenStreetMap" : "curated guide"}</span>
                </div>
              </article>
              <div className="hidden pt-3.5 text-right text-sm font-semibold sm:block">{s.cost ? inr(s.cost) : "Free"}</div>
            </div>
            {s.travelToNext && (
              <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 py-1.5 sm:grid-cols-[64px_minmax(0,1fr)] sm:gap-4">
                <span />
                <span className="pl-4 text-xs text-muted">
                  {s.travelToNext.mode} {s.travelToNext.minutes} min{s.travelToNext.fare ? ` · ~${inr(s.travelToNext.fare)}` : ""}
                </span>
              </div>
            )}
            {!s.travelToNext && i < plan.stops.length - 1 && <div className="h-2" />}
          </li>
        ))}
      </ol>

      {plan.warnings.length > 0 && (
        <details className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium text-warn">Heads-up ({plan.warnings.length})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            {plan.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          <strong className={overBudget ? "text-warn" : ""}>{inr(plan.totals.cost)}</strong>
          <span className="text-muted">{plan.totals.budget ? ` of ${inr(plan.totals.budget)}` : ""} incl. cabs</span>
        </span>
        <span>
          <strong className={overTime ? "text-warn" : ""}>{dur(plan.totals.minutes)}</strong>
          <span className="text-muted">{plan.totals.availableMinutes ? ` of ${dur(plan.totals.availableMinutes)}` : ""}</span>
        </span>
        {!overBudget && !overTime && !plan.warnings.length && <span className="font-semibold text-good">All constraints met</span>}
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
    <div className="space-y-2.5">
      <form
        className="flex items-center gap-2 rounded-2xl border border-line-strong bg-surface py-1.5 pl-4 pr-1.5"
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
          placeholder="Change anything: make it cheaper, start at 2pm, I'm in Gurugram now…"
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          maxLength={400}
        />
        <button type="submit" disabled={disabled || !text.trim()} className="flex h-11 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink disabled:opacity-50">
          <span className="hidden sm:inline">Update plan</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          <span className="sr-only sm:hidden">Update plan</span>
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {TWEAKS.map((t) => (
          <button key={t} type="button" disabled={disabled} onClick={() => submit(t)} className="h-9 rounded-full border border-line-strong bg-surface px-3 text-[13px] text-ink/80 hover:border-accent disabled:opacity-50">
            {t}
          </button>
        ))}
        <span className="ml-auto flex gap-2">
          <button type="button" aria-label="Good plan" aria-pressed={rated === "up"} onClick={() => rate("up")} className={`flex h-11 w-11 items-center justify-center rounded-xl border ${rated === "up" ? "border-good text-good" : "border-line-strong"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 10v11M15 5.9 14 10h5.8a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 18.4 21H7V10l4-8a3 3 0 0 1 4 3.9Z" /></svg>
          </button>
          <button type="button" aria-label="Bad plan" aria-pressed={rated === "down"} onClick={() => rate("down")} className={`flex h-11 w-11 items-center justify-center rounded-xl border ${rated === "down" ? "border-bad text-bad" : "border-line-strong"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 14V3M9 18.1 10 14H4.2a2 2 0 0 1-2-2.3l1.4-7A2 2 0 0 1 5.6 3H17v11l-4 8a3 3 0 0 1-4-3.9Z" /></svg>
          </button>
        </span>
      </div>
    </div>
  );
}
