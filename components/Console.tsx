"use client";
import { useEffect, useRef } from "react";
import type { RunStats } from "@/lib/types";
import type { Status, TraceItem } from "./usePlanner";

const fmtUsd = (n: number) => (n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`);
const fmtTok = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export function Console({ trace, stats, status, promptVersions, className = "" }: { trace: TraceItem[]; stats: RunStats | null; status: Status; promptVersions: Record<string, string> | null; className?: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [trace.length]);

  return (
    <section aria-label="Agent console" className={`flex min-h-0 flex-col bg-c-bg font-mono text-c-ink ${className}`}>
      <div className="flex items-center justify-between border-b border-c-line px-5 py-4">
        <span className="font-sans text-[13px] font-bold tracking-[0.08em] text-white">AGENT CONSOLE</span>
        <span className="text-xs text-c-muted">
          {promptVersions?.planner?.split("#")[0] ?? "idle"} ·{" "}
          {status === "running" ? <span className="pulse-dot text-c-info">running</span> : status === "idle" ? "ready" : <span className="text-c-good">{status === "clarify" ? "waiting for you" : "done"}</span>}
        </span>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 text-[12.5px] leading-relaxed" aria-live="polite">
        {trace.length === 0 && (
          <div className="space-y-2 text-c-muted">
            <p>Every step the agent takes shows up here: the LLM calls, tool calls, cache hits, validation failures and retries.</p>
            <p>Try an example on the left.</p>
          </div>
        )}
        {trace.map((it, i) => {
          if (it.kind === "divider")
            return (
              <div key={i} className="flex items-center gap-2 pt-1 text-[11px] uppercase tracking-wider text-c-muted">
                <span className="h-px flex-1 bg-c-line" />
                <span className="max-w-[70%] truncate">{it.text}</span>
                <span className="h-px flex-1 bg-c-line" />
              </div>
            );
          if (it.kind === "thinking")
            return (
              <div key={i} className="border-l-2 border-c-line pl-3 italic text-c-muted">
                {it.text}
              </div>
            );
          if (it.kind === "message")
            return (
              <div key={i} className={it.level === "error" ? "text-c-bad" : "text-c-info"}>
                ! {it.text}
              </div>
            );
          const s = it.step;
          const mark = s.running ? "…" : s.ok ? "✓" : "✗";
          const color = s.running ? "text-c-info" : s.ok ? "text-c-good" : "text-c-bad";
          return (
            <div key={s.id} className="flex gap-2.5">
              <span className={`w-3.5 flex-none ${color} ${s.running ? "pulse-dot" : ""}`}>{mark}</span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <span className="text-white">
                    {s.name}
                    {s.kind === "llm" && s.usage && <span className="text-c-muted"> · {s.usage.model.replace("gpt-", "")}</span>}
                  </span>
                  <span className="flex-none text-c-muted">
                    {s.cacheHit ? <span className="text-c-good">cache hit · </span> : null}
                    {s.ms !== undefined ? `${(s.ms / 1000).toFixed(1)}s` : ""}
                  </span>
                </div>
                {s.summary && <div className="break-words text-c-muted">{s.summary}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-c-line px-5 py-4 text-xs">
        <Stat label="tokens (in/out)" value={stats ? `${fmtTok(stats.inputTokens)} / ${fmtTok(stats.outputTokens)}` : "—"} />
        <Stat label="prompt cache hit" value={stats ? `${stats.cacheHitPct}%` : "—"} good={!!stats && stats.cacheHitPct > 0} />
        <Stat label="run cost" value={stats ? fmtUsd(stats.costUsd) : "—"} sub={stats && stats.savedUsd > 0 ? `saved ${fmtUsd(stats.savedUsd)} via cache` : undefined} />
        <Stat label="latency" value={stats ? `${(stats.totalMs / 1000).toFixed(1)}s` : "—"} sub={stats ? `${stats.llmCalls} LLM · ${stats.toolCalls} tools` : undefined} />
        {stats?.responseCacheHit && <div className="col-span-2 text-c-good">Served from response cache: 0 tokens spent</div>}
        <div className="col-span-2 break-words text-c-muted">
          {promptVersions ? Object.values(promptVersions).join(" · ") : "prompts: planner@v2 · parser@v1"}
          {stats?.dataSources.length ? <> · data: {stats.dataSources.join(", ")}</> : null}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div>
      <div className="text-c-muted">{label}</div>
      <div className={`text-[15px] ${good ? "text-c-good" : "text-white"}`}>{value}</div>
      {sub && <div className="text-[11px] text-c-muted">{sub}</div>}
    </div>
  );
}
