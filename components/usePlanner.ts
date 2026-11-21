"use client";
import { useCallback, useRef, useState } from "react";
import type { LlmUsage, Plan, Preferences, RunStats, TraceEvent } from "@/lib/types";

export interface Step {
  id: string;
  name: string;
  kind: "llm" | "tool" | "cache" | "guard";
  running: boolean;
  ok?: boolean;
  summary?: string;
  ms?: number;
  cacheHit?: boolean;
  usage?: LlmUsage;
}

export type TraceItem =
  | { kind: "step"; step: Step }
  | { kind: "thinking"; text: string }
  | { kind: "message"; text: string; level: "info" | "error" }
  | { kind: "divider"; text: string };

export interface FormInput {
  area?: string;
  budget?: number;
  hours?: number;
  mood?: string;
  interests?: string[];
  constraints?: string[];
}

interface Request {
  message: string;
  form?: FormInput;
  answers?: Record<string, string>;
  changeRequest?: string;
  previous?: { prefs: Preferences; plan: Plan } | null;
}

export type Status = "idle" | "running" | "clarify" | "done" | "error";

export function usePlanner() {
  const [status, setStatus] = useState<Status>("idle");
  const [trace, setTrace] = useState<TraceItem[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [promptVersions, setPromptVersions] = useState<Record<string, string> | null>(null);
  const [questions, setQuestions] = useState<{ question: string; options: string[] }[]>([]);
  const [notice, setNotice] = useState<{ text: string; level: "info" | "error" } | null>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [runAt, setRunAt] = useState<number | null>(null); // server time of the latest run (dates the plan)
  const [replaying, setReplaying] = useState(false);
  const lastReq = useRef<Request | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handle = useCallback((e: TraceEvent) => {
    switch (e.type) {
      case "run_start":
        setRunAt(e.at);
        setRunId(e.runId);
        setPromptVersions(e.promptVersions);
        break;
      case "step_start":
        setTrace((t) => [...t, { kind: "step", step: { id: e.id, name: e.name, kind: e.kind, running: true } }]);
        break;
      case "step_end":
        setTrace((t) =>
          t.map((it) =>
            it.kind === "step" && it.step.id === e.id
              ? { kind: "step", step: { ...it.step, running: false, ok: e.ok, summary: e.summary, ms: e.ms, cacheHit: e.cacheHit, usage: e.usage } }
              : it,
          ),
        );
        break;
      case "thinking":
        setTrace((t) => [...t, { kind: "thinking", text: e.text }]);
        break;
      case "message":
        setTrace((t) => [...t, { kind: "message", text: e.text, level: e.level }]);
        setNotice({ text: e.text, level: e.level });
        break;
      case "clarify":
        setQuestions(e.questions);
        setPrefs(e.prefs);
        setStatus("clarify");
        break;
      case "plan":
        setPlan(e.plan);
        setPrefs(e.prefs);
        setStatus("done");
        break;
      case "done":
        setStats(e.stats);
        setStatus((s) => (s === "running" ? "done" : s));
        break;
      case "error":
        setNotice({ text: e.message, level: "error" });
        setStatus("error");
        break;
    }
  }, []);

  const send = useCallback(
    async (req: Request, label: string) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      lastReq.current = req;
      setStatus("running");
      setReplaying(false);
      setStartedAt(Date.now());
      setQuestions([]);
      setNotice(null);
      setStats(null);
      setTrace((t) => [...t, { kind: "divider", text: label }]);
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf("\n\n")) >= 0) {
            const chunk = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            const line = chunk.split("\n").find((l) => l.startsWith("data: "));
            if (line) handle(JSON.parse(line.slice(6)) as TraceEvent);
          }
        }
        setStatus((s) => (s === "running" ? (plan ? "done" : "idle") : s));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setNotice({ text: (err as Error).message, level: "error" });
        setStatus("error");
      }
    },
    [handle, plan],
  );

  const start = useCallback(
    (message: string, form?: FormInput) => {
      setPlan(null);
      setPrefs(null);
      setChanges([]);
      setTrace([]);
      return send({ message, form }, "New plan");
    },
    [send],
  );

  const answer = useCallback(
    (answers: Record<string, string>) => {
      const prev = lastReq.current ?? { message: "" };
      return send({ ...prev, answers: { ...(prev.answers ?? {}), ...answers } }, "Answered questions");
    },
    [send],
  );

  const refine = useCallback(
    (changeRequest: string) => {
      if (!plan || !prefs) return;
      setChanges((c) => [...c, changeRequest]);
      return send({ message: lastReq.current?.message ?? "", changeRequest, previous: { prefs, plan } }, `Change: ${changeRequest}`);
    },
    [send, plan, prefs],
  );

  /** Replays a recorded production run (public/replay-run.json). No live call is made; the UI says so. */
  const replay = useCallback(async () => {
    const res = await fetch("/replay-run.json").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { events: TraceEvent[] };
    setTrace([{ kind: "divider", text: "Replay of a recorded run" }]);
    setReplaying(true);
    setStatus("running");
    for (const e of data.events) handle(e);
    setNotice({ text: "This is a replay of a recorded production run, shown instantly. Plan your own Saturday to run the live agent.", level: "info" });
  }, [handle]);

  /** Start from scratch: cancel any in-flight run and clear the plan, trace and conversation. */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    lastReq.current = null;
    setStatus("idle");
    setTrace([]);
    setPlan(null);
    setPrefs(null);
    setStats(null);
    setRunId(null);
    setPromptVersions(null);
    setQuestions([]);
    setNotice(null);
    setChanges([]);
    setStartedAt(null);
    setRunAt(null);
    setReplaying(false);
  }, []);

  return { status, trace, plan, prefs, stats, runId, promptVersions, questions, notice, changes, startedAt, runAt, replaying, start, answer, refine, replay, reset };
}
