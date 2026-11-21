"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { RunRecord } from "@/lib/obs/trace";

interface RunsResponse {
  runs: RunRecord[];
  caches: { tool: { size: number; hits: number; misses: number }; response: { size: number; hits: number; misses: number } };
  note: string;
}

export default function RunsPage() {
  const [data, setData] = useState<RunsResponse | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/runs").then((r) => r.json()).then(setData).catch(() => setData(null));
  }, []);

  const runs = data?.runs ?? [];
  const done = runs.filter((r) => r.stats);
  const avg = (f: (r: RunRecord) => number) => (done.length ? done.reduce((s, r) => s + f(r), 0) / done.length : 0);
  const byVersion = new Map<string, { n: number; up: number; down: number; cost: number }>();
  for (const r of done) {
    const v = r.stats!.promptVersions.planner ?? "?";
    const e = byVersion.get(v) ?? { n: 0, up: 0, down: 0, cost: 0 };
    e.n++;
    e.cost += r.stats!.costUsd;
    if (r.feedback?.rating === "up") e.up++;
    if (r.feedback?.rating === "down") e.down++;
    byVersion.set(v, e);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">Agent runs</h1>
        <Link href="/" className="text-sm font-medium text-accent hover:underline">← Back to planner</Link>
      </div>
      <p className="text-sm text-muted">{data?.note ?? "Loading…"}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Runs" value={String(runs.length)} />
        <Card label="Avg cost / run" value={`$${avg((r) => r.stats!.costUsd).toFixed(4)}`} />
        <Card label="Avg prompt-cache hit" value={`${Math.round(avg((r) => r.stats!.cacheHitPct))}%`} />
        <Card label="Avg latency" value={`${(avg((r) => r.stats!.totalMs) / 1000).toFixed(1)}s`} />
        <Card label="Response cache" value={`${data?.caches.response.hits ?? 0} hits`} />
        <Card label="Tool cache" value={`${data?.caches.tool.hits ?? 0} hits / ${data?.caches.tool.misses ?? 0} misses`} />
      </div>

      {byVersion.size > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">By planner prompt version (online signal)</h2>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-subtle text-left text-muted">
                <tr><th className="px-3 py-2">Prompt</th><th className="px-3 py-2">Runs</th><th className="px-3 py-2">👍</th><th className="px-3 py-2">👎</th><th className="px-3 py-2">Avg cost</th></tr>
              </thead>
              <tbody>
                {[...byVersion.entries()].map(([v, e]) => (
                  <tr key={v} className="border-t border-line"><td className="px-3 py-2 font-mono">{v}</td><td className="px-3 py-2">{e.n}</td><td className="px-3 py-2">{e.up}</td><td className="px-3 py-2">{e.down}</td><td className="px-3 py-2">${(e.cost / e.n).toFixed(4)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Recent runs</h2>
        {runs.length === 0 && <p className="text-sm text-muted">No runs on this server instance yet.</p>}
        <ul className="space-y-2">
          {runs.map((r) => (
            <li key={r.runId} className="rounded-xl border border-line bg-surface">
              <button type="button" onClick={() => setOpen(open === r.runId ? null : r.runId)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left text-sm">
                <span className="font-mono text-muted">{r.runId}</span>
                <span className="rounded-full bg-subtle px-2 py-0.5 text-xs">{r.outcome}</span>
                <span className="min-w-0 flex-1 truncate">{r.planTitle ?? r.input}</span>
                {r.stats && <span className="font-mono text-xs text-muted">${r.stats.costUsd.toFixed(4)} · {r.stats.cacheHitPct}% cached · {(r.stats.totalMs / 1000).toFixed(1)}s</span>}
                {r.feedback && <span>{r.feedback.rating === "up" ? "👍" : "👎"}</span>}
              </button>
              {open === r.runId && (
                <div className="space-y-1 border-t border-line px-4 py-3 font-mono text-xs">
                  <div className="text-muted">input: {r.input}</div>
                  {r.spans.map((s) => (
                    <div key={s.id} className="flex gap-2">
                      <span className={s.ok ? "text-good" : "text-bad"}>{s.ok ? "✓" : "✗"}</span>
                      <span className="w-40 flex-none truncate">{s.name}</span>
                      <span className="w-14 flex-none text-muted">{s.endMs ? `${s.endMs - s.startMs}ms` : ""}</span>
                      <span className="min-w-0 flex-1 truncate text-muted">{s.summary}</span>
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
