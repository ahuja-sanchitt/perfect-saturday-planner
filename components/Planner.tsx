"use client";
import { useState, useSyncExternalStore } from "react";
import { Console } from "./Console";
import { PlanView, RefineBox } from "./PlanView";
import { ThinkingBanner, ThinkingCard } from "./Thinking";
import { usePlanner, type FormInput } from "./usePlanner";

// Console open/closed preference, persisted per viewer (falls back to open if storage is blocked).
const subscribeStorage = (cb: () => void) => {
  window.addEventListener("console-pref", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("console-pref", cb);
    window.removeEventListener("storage", cb);
  };
};
const readConsolePref = () => {
  try {
    return localStorage.getItem("consoleOpen") !== "0";
  } catch {
    return true;
  }
};

const EXAMPLES: { label: string; text?: string; form?: FormInput }[] = [
  { label: "Brief example", form: { area: "South Delhi", budget: 2000, hours: 4, mood: "tired but wants to do something fun", interests: ["food", "music", "walks"], constraints: ["vegetarian", "avoid crowded places"] } },
  { label: "Gurugram, with partner", text: "Me and my partner in Gurugram, ₹3500, free from 3pm for 5 hours, love live music and good food" },
  { label: "₹500 only", text: "Broke student near North Campus, ₹500 total, 3 hours, want something chill" },
  { label: 'Vague: "something fun"', text: "plan something fun" },
  { label: "Outside NCR", text: "Planning a Saturday in Bangalore, 2k budget, like cafes" },
];

const INTERESTS = ["food", "walks", "music", "art", "history", "nature", "cafes", "shopping"];

export function Planner() {
  const p = usePlanner();
  const [text, setText] = useState("");
  const [useForm, setUseForm] = useState(false);
  const [form, setForm] = useState<FormInput>({ area: "", budget: 2000, hours: 4, mood: "", interests: [], constraints: [] });
  const consoleOpen = useSyncExternalStore(subscribeStorage, readConsolePref, () => true);
  const [tab, setTab] = useState<"plan" | "trace">("plan");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const running = p.status === "running";

  const toggleConsole = () => {
    try {
      localStorage.setItem("consoleOpen", consoleOpen ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event("console-pref"));
  };

  const submit = () => {
    if (running) return;
    setAnswers({});
    if (useForm) {
      const constraints = (form.constraints ?? []).filter(Boolean);
      p.start(text, { ...form, area: form.area || undefined, constraints });
    } else if (text.trim()) p.start(text.trim());
  };

  const runExample = (ex: (typeof EXAMPLES)[number]) => {
    if (running) return;
    setAnswers({});
    if (ex.form) {
      setUseForm(true);
      setForm({ ...form, ...ex.form });
      setText("");
      p.start("", ex.form);
    } else {
      setUseForm(false);
      setText(ex.text ?? "");
      p.start(ex.text ?? "");
    }
  };

  const pick = (q: string, a: string) => {
    const next = { ...answers, [q]: a };
    setAnswers(next);
    if (p.questions.every((x) => next[x.question])) p.answer(next);
  };

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      {/* ---------------- Main (plan) column ---------------- */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            <span className="text-[17px] font-bold">Perfect Saturday</span>
            <span className="rounded-full bg-subtle px-2 py-0.5 text-xs font-semibold text-muted">Delhi NCR</span>
          </div>
          <button
            type="button"
            onClick={toggleConsole}
            aria-pressed={consoleOpen}
            className={`hidden h-10 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold lg:flex ${consoleOpen ? "border-c-bg bg-c-bg text-white" : "border-line-strong bg-surface text-ink"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></svg>
            {consoleOpen ? "Hide agent console" : "Show agent console"}
          </button>
        </header>

        {/* Mobile tabs */}
        <div role="tablist" aria-label="View" className="mx-4 mt-3 flex gap-1 rounded-xl bg-subtle p-1 lg:hidden">
          {(["plan", "trace"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-10 flex-1 rounded-lg text-sm font-semibold ${tab === t ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
              {t === "plan" ? "Plan" : <>Agent trace{running && <span className="pulse-dot ml-1.5 text-accent">●</span>}</>}
            </button>
          ))}
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto ${tab === "trace" ? "hidden lg:block" : ""}`}>
          {/* Input */}
          <section className="space-y-3 border-b border-line px-4 py-5 sm:px-8">
            <div className="flex items-center justify-between">
              <label htmlFor="describe" className="text-[13px] font-semibold text-muted">
                {useForm ? "Your preferences" : "Describe your Saturday"}
              </label>
              <button type="button" onClick={() => setUseForm((f) => !f)} className="text-[13px] font-medium text-accent hover:underline">
                {useForm ? "Type it instead" : "Use a form instead"}
              </button>
            </div>

            {useForm ? (
              <FormFields form={form} setForm={setForm} />
            ) : (
              <textarea
                id="describe"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={2}
                maxLength={1000}
                placeholder="e.g. Tired but want something fun. ₹2,000, 4 hrs, South Delhi, veg, hate crowds"
                className="w-full resize-none rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-muted focus:border-accent"
              />
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={submit} disabled={running || (!useForm && !text.trim())} className="h-12 rounded-xl bg-accent px-6 text-[15px] font-semibold text-accent-ink disabled:opacity-50">
                {running ? "Planning…" : "Plan my Saturday"}
              </button>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex.label} type="button" disabled={running} onClick={() => runExample(ex)} className="h-8 rounded-full border border-line-strong bg-surface px-3 text-[13px] text-ink/80 hover:border-accent disabled:opacity-50">
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Output */}
          <section className="space-y-5 px-4 pb-5 sm:px-8">
            {running && p.plan ? <ThinkingBanner trace={p.trace} startedAt={p.startedAt} change={p.changes[p.changes.length - 1] ?? null} /> : <div className="h-0" />}
            {p.status === "idle" && !p.plan && <EmptyState />}

            {p.notice && (
              <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${p.notice.level === "error" ? "border-bad/40 text-bad" : "border-line-strong bg-subtle text-ink"}`}>
                {p.notice.text}
              </div>
            )}

            {p.status === "clarify" && (
              <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
                <p className="text-sm font-semibold">Quick question{p.questions.length > 1 ? "s" : ""} before I plan:</p>
                {p.questions.map((q) => (
                  <div key={q.question} className="space-y-2">
                    <p className="text-[15px]">{q.question}</p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((o) => (
                        <button key={o} type="button" onClick={() => pick(q.question, o)} aria-pressed={answers[q.question] === o} className={`h-11 rounded-full border px-4 text-sm ${answers[q.question] === o ? "border-accent bg-accent/10 font-semibold text-accent" : "border-line-strong bg-surface"}`}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {running && !p.plan && <ThinkingCard trace={p.trace} startedAt={p.startedAt} onShowTrace={() => setTab("trace")} />}

            {p.changes.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                <span>Your changes:</span>
                {p.changes.map((c, i) => (
                  <span key={i} className="rounded-full bg-subtle px-2.5 py-1">{c}</span>
                ))}
              </div>
            )}

            {p.plan && (
              <div className={running ? "updating pointer-events-none" : ""} aria-busy={running}>
                <PlanView plan={p.plan} />
              </div>
            )}
          </section>
        </div>

        {/* Refine box — pinned to the bottom after the first plan */}
        {p.plan && (
          <footer className={`border-t border-line bg-surface px-4 py-3 sm:px-8 ${tab === "trace" ? "hidden lg:block" : ""}`}>
            <RefineBox onSubmit={p.refine} disabled={running} runId={p.runId} />
          </footer>
        )}

        {/* Mobile trace tab */}
        {tab === "trace" && <Console className="m-4 flex-1 rounded-2xl lg:hidden" trace={p.trace} stats={p.stats} status={p.status} promptVersions={p.promptVersions} />}
      </main>

      {/* ---------------- Desktop console ---------------- */}
      {consoleOpen && <Console className="hidden w-[400px] flex-none lg:flex" trace={p.trace} stats={p.stats} status={p.status} promptVersions={p.promptVersions} />}
    </div>
  );
}

function FormFields({ form, setForm }: { form: FormInput; setForm: (f: FormInput) => void }) {
  const toggle = (key: "interests" | "constraints", v: string) => {
    const cur = form[key] ?? [];
    setForm({ ...form, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const field = "h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-[15px] outline-none focus:border-accent";
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-muted">
        Area in NCR
        <input className={field} value={form.area ?? ""} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Hauz Khas, Gurugram" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Budget (₹)
        <input className={field} type="number" min={0} step={100} value={form.budget ?? ""} onChange={(e) => setForm({ ...form, budget: e.target.value ? Number(e.target.value) : undefined })} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted">
        Hours free
        <input className={field} type="number" min={1} max={12} value={form.hours ?? ""} onChange={(e) => setForm({ ...form, hours: e.target.value ? Number(e.target.value) : undefined })} />
      </label>
      <label className="col-span-2 flex flex-col gap-1 text-xs font-medium text-muted sm:col-span-4">
        Mood
        <input className={field} value={form.mood ?? ""} onChange={(e) => setForm({ ...form, mood: e.target.value })} placeholder="tired but wants to do something fun" />
      </label>
      <fieldset className="col-span-2 sm:col-span-4">
        <legend className="mb-1 text-xs font-medium text-muted">Interests</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <button key={i} type="button" aria-pressed={form.interests?.includes(i)} onClick={() => toggle("interests", i)} className={`h-9 rounded-full border px-3 text-[13px] ${form.interests?.includes(i) ? "border-accent bg-accent/10 font-semibold text-accent" : "border-line-strong bg-surface"}`}>
              {i}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="col-span-2 sm:col-span-4">
        <legend className="mb-1 text-xs font-medium text-muted">Constraints</legend>
        <div className="flex flex-wrap gap-2">
          {["vegetarian", "vegan", "jain", "avoid crowded places", "near metro", "no alcohol"].map((c) => (
            <button key={c} type="button" aria-pressed={form.constraints?.includes(c)} onClick={() => toggle("constraints", c)} className={`h-9 rounded-full border px-3 text-[13px] ${form.constraints?.includes(c) ? "border-accent bg-accent/10 font-semibold text-accent" : "border-line-strong bg-surface"}`}>
              {c}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-3 py-6 text-[15px] text-muted">
      <p className="text-ink">Tell me how you&apos;re feeling, your budget and how much time you have. I&apos;ll plan a realistic Saturday in Delhi NCR.</p>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>Real places: curated local picks plus OpenStreetMap, with real travel times, weather and air quality.</li>
        <li>Every plan is checked against your budget, time, diet and crowd preferences before you see it.</li>
        <li>Open the agent console to watch each tool call, cache hit and retry live.</li>
      </ul>
    </div>
  );
}
