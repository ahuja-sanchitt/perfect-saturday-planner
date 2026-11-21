"use client";
import { useEffect, useRef } from "react";
import type { RunStats } from "@/lib/types";
import { CheckIcon, CrossIcon, InfoIcon, Sparkle } from "./icons";
import type { Status, TraceItem } from "./usePlanner";

const fmtUsd = (n: number) => (n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`);
const fmtTok = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export function Console({ trace, stats, status, promptVersions, className = "" }: { trace: TraceItem[]; stats: RunStats | null; status: Status; promptVersions: Record<string, string> | null; className?: string }) {
  const listRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // follow the newest step unless the reader scrolls up
  // Pin to the newest step on mount (a mobile tab switch remounts this) and whenever content grows
  // or reflows; instant, so an evaluator lands on the latest checks rather than mid-run.
  useEffect(() => {
    const list = listRef.current, inner = innerRef.current;
    if (!list || !inner) return;
    const pin = () => {
      if (stick.current) list.scrollTop = list.scrollHeight;
    };
    pin();
    const raf = requestAnimationFrame(pin);
    const ro = new ResizeObserver(pin);
    ro.observe(inner);
    ro.observe(list);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  useEffect(() => {
    const list = listRef.current;
    if (list && stick.current) list.scrollTop = list.scrollHeight;
  }, [trace]);
  const onScroll = () => {
    const list = listRef.current;
    if (list) stick.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
  };

  const statusLabel = status === "running" ? "working" : status === "idle" ? "ready" : status === "clarify" ? "waiting for you" : status === "error" ? "stopped" : "done";
  return (
    <section aria-label="Agent console" className={`flex min-h-0 flex-col bg-c-bg text-c-ink ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-c-line px-5 py-4">
        <h2 className="font-display text-[22px] leading-none text-marquee">Agent console</h2>
        <span className="flex items-center gap-2 text-[13px] text-c-muted">
          {status === "running" && <Sparkle size={14} spinning className="text-c-info" />}
          <span className={status === "running" ? "text-c-info" : status === "idle" ? "" : "text-c-good"}>{statusLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-[12px]">{promptVersions?.planner?.split("#")[0] ?? "planner"}</span>
        </span>
      </div>

      <div ref={listRef} onScroll={onScroll} className="console-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4 text-[13px] leading-relaxed" aria-live="polite">
        <div ref={innerRef} className="space-y-3.5">
        {trace.length === 0 && (
          <div className="max-w-[46ch] space-y-2 text-[14px] text-c-muted">
            <p>Each step the agent takes appears here as it happens: model calls, tool calls, cache hits, failed checks and&nbsp;retries.</p>
            <p>Pick an example on the left to watch one run.</p>
          </div>
        )}
        {trace.map((it, i) => {
          if (it.kind === "divider")
            return (
              <div key={i} className="flex items-center gap-3 pt-1 text-[12px] text-c-muted">
                <span className="h-px flex-1 bg-c-line" />
                <span className="max-w-[70%] truncate">{it.text}</span>
                <span className="h-px flex-1 bg-c-line" />
              </div>
            );
          if (it.kind === "thinking")
            return (
              <Thought key={i} text={it.text} />
            );
          if (it.kind === "message")
            return (
              <div key={i} className={`flex gap-2.5 ${it.level === "error" ? "text-c-bad" : "text-c-info"}`}>
                <InfoIcon size={15} className="mt-0.5 flex-none" />
                <span>{it.text}</span>
              </div>
            );
          const s = it.step;
          return (
            <div key={s.id} className="flex gap-2.5">
              <span className="mt-0.5 flex w-4 flex-none justify-center">
                {s.running ? <Sparkle size={14} spinning className="text-c-info" /> : s.ok ? <CheckIcon size={15} className="text-c-good" /> : <CrossIcon size={15} className="text-c-bad" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <span className="font-mono text-[13px] text-white">
                    {s.name}
                    {s.kind === "llm" && s.usage && <span className="text-c-muted"> · {s.usage.model.replace("gpt-", "")}</span>}
                  </span>
                  <span className="flex-none text-[12px] text-c-muted tabular-nums">
                    {s.cacheHit ? <span className="text-c-good">cached · </span> : null}
                    {s.ms !== undefined ? `${(s.ms / 1000).toFixed(1)}s` : ""}
                  </span>
                </div>
                {s.summary && <div className="break-words text-c-muted">{s.summary}</div>}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-c-line px-5 py-4 text-[13px]">
        <Stat label="Tokens in / out" value={stats ? `${fmtTok(stats.inputTokens)} / ${fmtTok(stats.outputTokens)}` : "–"} />
        <Stat label="Prompt cache hit" value={stats ? `${stats.cacheHitPct}%` : "–"} good={!!stats && stats.cacheHitPct > 0} />
        <Stat label="Run cost" value={stats ? fmtUsd(stats.costUsd) : "–"} sub={stats && stats.savedUsd > 0 ? `${fmtUsd(stats.savedUsd)} saved by caching` : undefined} />
        <Stat label="Latency" value={stats ? `${(stats.totalMs / 1000).toFixed(1)}s` : "–"} sub={stats ? `${stats.llmCalls} model calls, ${stats.toolCalls} tools` : undefined} />
        {stats?.responseCacheHit && <p className="col-span-2 text-c-good">Served from the response cache, so no tokens were spent.</p>}
        <p className="col-span-2 break-words text-[12px] text-c-muted">
          <span className="font-mono">{promptVersions ? Object.values(promptVersions).join("  ") : "parser@v1  planner@v3"}</span>
          {stats?.dataSources.length ? <span className="block pt-1">Data: {stats.dataSources.join(", ")}</span> : null}
        </p>
      </dl>
    </section>
  );
}

/**
 * A model reasoning summary. Long ones show the first ~220 characters and expand to the full text
 * by click or keyboard, so nothing in the trace is hidden.
 */
function Thought({ text }: { text: string }) {
  const plain = text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (plain.length <= 220) return <p className="pl-6 text-c-muted italic">{plain}</p>;
  const short = `${plain.slice(0, 220).replace(/\s+\S*$/, "")}…`;
  return (
    <details className="group pl-6 text-c-muted italic">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">{short} </span>
        <span className="text-c-info not-italic underline underline-offset-4 group-open:hidden">Show full thought</span>
        <span className="hidden text-c-info not-italic underline underline-offset-4 group-open:inline">Show less</span>
      </summary>
      <p className="mt-1">{plain}</p>
    </details>
  );
}

function Stat({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-c-muted">{label}</dt>
      <dd className={`text-[16px] tabular-nums ${good ? "text-c-good" : "text-white"}`}>{value}</dd>
      {sub && <dd className="text-[12px] text-c-muted">{sub}</dd>}
    </div>
  );
}
