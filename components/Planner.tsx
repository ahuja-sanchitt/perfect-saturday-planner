"use client";
import { useState, useSyncExternalStore } from "react";
import { Console } from "./Console";
import { PlanView, RefineBox } from "./PlanView";
import { PanelIcon, Sparkle, SunIcon } from "./icons";
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
            <SunIcon className="text-accent" />
            <span className="font-display text-xl font-semibold tracking-[-0.02em]">Perfect Saturday</span>
            <span className="rounded-full bg-subtle px-2 py-0.5 text-xs font-semibold text-muted">Delhi NCR</span>
          </div>
          <button
            type="button"
            onClick={toggleConsole}
            aria-pressed={consoleOpen}
            className={`hidden h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold lg:flex ${consoleOpen ? "border-c-bg bg-c-bg text-white" : "border-line-strong bg-surface text-ink"}`}
          >
            <PanelIcon />
            {consoleOpen ? "Hide agent console" : "Show agent console"}
          </button>
        </header>

        {/* Mobile tabs */}
        <div role="tablist" aria-label="View" className="mx-4 mt-3 flex gap-1 rounded-xl bg-subtle p-1 lg:hidden">
          {(["plan", "trace"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-[15px] font-semibold ${tab === t ? "bg-surface text-ink" : "text-muted"}`}>
              {t === "plan" ? "Plan" : <>Agent trace{running && <Sparkle size={13} spinning className="text-accent" />}</>}
            </button>
          ))}
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto ${tab === "trace" ? "hidden lg:block" : ""}`}>
          {/* Input */}
          <section className="space-y-3 border-b border-line px-4 py-6 sm:px-8">
            <div className="flex items-center justify-between">
              <label htmlFor="describe" className="text-sm font-semibold">
                {useForm ? "Your preferences" : "Describe your Saturday"}
              </label>
              <button type="button" onClick={() => setUseForm((f) => !f)} className="text-sm font-medium text-accent underline-offset-4 hover:underline">
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
                className="w-full resize-none rounded-xl border border-line-strong bg-surface px-4 py-3 text-base outline-none placeholder:text-muted focus:border-accent"
              />
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={submit} disabled={running || (!useForm && !text.trim())} className="h-12 flex-none rounded-xl bg-accent px-6 text-base font-semibold text-accent-ink disabled:opacity-50">
                {running ? "Planning…" : "Plan my Saturday"}
              </button>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex.label} type="button" disabled={running} onClick={() => runExample(ex)} className="h-9 rounded-full border border-line-strong bg-surface px-3.5 text-sm hover:border-accent disabled:opacity-50">
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Output */}
          <section className="space-y-6 px-4 py-6 sm:px-8">
            {running && p.plan && <ThinkingBanner trace={p.trace} startedAt={p.startedAt} change={p.changes[p.changes.length - 1] ?? null} />}
            {p.status === "idle" && !p.plan && <EmptyState />}

            {p.notice && (
              <div role="status" className={`rounded-xl border px-4 py-3 text-[15px] ${p.notice.level === "error" ? "border-bad/40 text-bad" : "border-line-strong bg-subtle text-ink"}`}>
                {p.notice.text}
              </div>
            )}

            {p.status === "clarify" && (
              <div className="space-y-5 rounded-2xl border border-line bg-surface p-5">
                <h2 className="font-display text-lg font-semibold">Quick question{p.questions.length > 1 ? "s" : ""} before I plan</h2>
                {p.questions.map((q) => (
                  <div key={q.question} className="space-y-2">
                    <p className="text-base">{q.question}</p>
                    <div className="flex flex-wrap gap-2">
                      {q.options.map((o) => (
                        <button key={o} type="button" onClick={() => pick(q.question, o)} aria-pressed={answers[q.question] === o} className={`h-11 rounded-full border px-4 text-sm ${answers[q.question] === o ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line-strong bg-surface"}`}>
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
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                <span>Your changes:</span>
                {p.changes.map((c, i) => (
                  <span key={i} className="rounded-full bg-subtle px-3 py-1 text-ink">{c}</span>
                ))}
              </div>
            )}

            {p.plan && (
              <div className={`transition-opacity duration-300 ${running ? "pointer-events-none opacity-55" : ""}`} aria-busy={running}>
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
  const field = "h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-base text-ink outline-none focus:border-accent";
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium">
        Area in NCR
        <input className={field} value={form.area ?? ""} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Hauz Khas, Gurugram" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Budget (₹)
        <input className={field} type="number" min={0} step={100} value={form.budget ?? ""} onChange={(e) => setForm({ ...form, budget: e.target.value ? Number(e.target.value) : undefined })} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Hours free
        <input className={field} type="number" min={1} max={12} value={form.hours ?? ""} onChange={(e) => setForm({ ...form, hours: e.target.value ? Number(e.target.value) : undefined })} />
      </label>
      <label className="col-span-2 flex flex-col gap-1.5 text-sm font-medium sm:col-span-4">
        Mood
        <input className={field} value={form.mood ?? ""} onChange={(e) => setForm({ ...form, mood: e.target.value })} placeholder="tired but wants to do something fun" />
      </label>
      <fieldset className="col-span-2 sm:col-span-4">
        <legend className="mb-2 text-sm font-medium">Interests</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <button key={i} type="button" aria-pressed={form.interests?.includes(i)} onClick={() => toggle("interests", i)} className={`h-9 rounded-full border px-3.5 text-sm ${form.interests?.includes(i) ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line-strong bg-surface"}`}>
              {i}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="col-span-2 sm:col-span-4">
        <legend className="mb-2 text-sm font-medium">Constraints</legend>
        <div className="flex flex-wrap gap-2">
          {["vegetarian", "vegan", "jain", "avoid crowded places", "near metro", "no alcohol"].map((c) => (
            <button key={c} type="button" aria-pressed={form.constraints?.includes(c)} onClick={() => toggle("constraints", c)} className={`h-9 rounded-full border px-3.5 text-sm ${form.constraints?.includes(c) ? "border-accent bg-accent-soft font-semibold text-accent" : "border-line-strong bg-surface"}`}>
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
    <div className="max-w-[65ch] space-y-4 py-4">
      <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-balance">Tell me your mood, budget and free time.</h2>
      <p className="text-base text-muted">I&apos;ll plan a realistic Saturday in Delhi NCR, check it against your budget, time, diet and crowd limits, and explain why each stop suits you.</p>
      <ul className="space-y-2 text-[15px] text-muted">
        <li>Places come from a local guide and OpenStreetMap, with live weather, air quality and travel times.</li>
        <li>The agent console on the right shows every tool call, cache hit and retry as it&nbsp;happens.</li>
      </ul>
    </div>
  );
}
