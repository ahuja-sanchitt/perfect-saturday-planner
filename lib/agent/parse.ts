// Step 1: turn free text / form input into structured Preferences.
// Primary: small model + structured output. Fallback: deterministic heuristics (no key / API down).
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { getOpenAI, toUsage } from "@/lib/llm/client";
import type { LoadedPrompt } from "@/lib/prompts/loader";
import type { LlmUsage, Preferences } from "@/lib/types";
import { findLocality } from "./tools";

export const PreferencesZ = z.object({
  area: z.string().nullable(),
  inNcr: z.boolean(),
  budget: z.number().nullable(),
  hours: z.number().nullable(),
  startTime: z.string().nullable(),
  groupSize: z.number(),
  energy: z.enum(["low", "medium", "high"]),
  mood: z.string(),
  interests: z.array(z.string()),
  diet: z.enum(["any", "veg", "vegan", "jain"]),
  avoidCrowds: z.boolean(),
  otherConstraints: z.array(z.string()),
  clarifyingQuestions: z.array(z.object({ question: z.string(), options: z.array(z.string()) })),
});

export interface PlanForm {
  area?: string;
  budget?: number;
  hours?: number;
  mood?: string;
  interests?: string[];
  constraints?: string[];
}

export interface ParseInput {
  message: string;
  form?: PlanForm;
  answers?: Record<string, string>;
  previous?: Preferences;
  changeRequest?: string;
}

const wrap = (tag: string, v: unknown) => (v === undefined || v === null || v === "" ? "" : `<${tag}>\n${typeof v === "string" ? v : JSON.stringify(v)}\n</${tag}>\n`);

export async function parseWithLlm(input: ParseInput, prompt: LoadedPrompt): Promise<{ prefs: Preferences; usage: LlmUsage }> {
  const openai = getOpenAI();
  const user =
    wrap("form", input.form) +
    wrap("message", [input.message, input.changeRequest].filter(Boolean).join("\n")) +
    wrap("previous_preferences", input.previous ? { ...input.previous, clarifyingQuestions: undefined } : undefined) +
    wrap("answers", input.answers && Object.keys(input.answers).length ? input.answers : undefined);
  const res = await openai.responses.parse({
    model: prompt.model,
    instructions: prompt.body,
    input: [{ role: "user", content: user || "<message>(empty)</message>" }],
    text: { format: zodTextFormat(PreferencesZ, "preferences") },
    reasoning: { effort: prompt.effort },
    prompt_cache_key: prompt.ref,
  });
  if (!res.output_parsed) throw new Error("Parser returned no structured output");
  return { prefs: normalize(res.output_parsed, input), usage: toUsage(prompt.model, res.usage) };
}

function normalize(p: Preferences, input: ParseInput): Preferences {
  const out = { ...p, groupSize: Math.max(1, Math.round(p.groupSize || 1)) };
  // Answers to clarifying questions must never re-trigger the same question.
  if (input.answers && Object.keys(input.answers).length) out.clarifyingQuestions = out.clarifyingQuestions.filter((q) => !(q.question in input.answers!));
  out.clarifyingQuestions = out.clarifyingQuestions.slice(0, 2);
  if (out.budget !== null && out.budget <= 0) out.budget = null;
  if (out.hours !== null && (out.hours <= 0 || out.hours > 14)) out.hours = null;
  return out;
}

// ---------------- Deterministic fallback parser ----------------
const OUTSIDE_NCR = ["bangalore", "bengaluru", "mumbai", "bombay", "pune", "chennai", "hyderabad", "kolkata", "jaipur", "chandigarh", "goa", "ahmedabad", "lucknow"];
const INTEREST_WORDS = ["food", "music", "live music", "walks", "walk", "art", "history", "heritage", "nature", "cafes", "cafe", "shopping", "photography", "books", "museum", "culture"];

export function parseHeuristic(input: ParseInput): Preferences {
  const f = input.form ?? {};
  const text = [input.message, input.changeRequest, ...Object.values(input.answers ?? {}), f.mood, ...(f.interests ?? []), ...(f.constraints ?? [])].filter(Boolean).join(" ").toLowerCase();
  const prev = input.previous;
  const outside = OUTSIDE_NCR.find((c) => text.includes(c));
  const plain = text.replace(/,/g, "");
  const kMatch = /(\d+(?:\.\d+)?)\s?k\b/.exec(plain);
  const rupeeMatch = /(?:₹|rs\.?\s?|inr\s?)(\d{3,6})|(\d{3,6})\s?(?:rs|rupees|inr)\b|budget\D{0,6}(\d{3,6})|(\d{3,6})\s?(?:budget|bucks)\b/.exec(plain);
  const rupees = rupeeMatch ? Number(rupeeMatch[1] ?? rupeeMatch[2] ?? rupeeMatch[3] ?? rupeeMatch[4]) : null;
  const budget = f.budget ?? (kMatch ? Number(kMatch[1]) * 1000 : rupees) ?? prev?.budget ?? null;
  const hoursMatch = /(\d+(?:\.\d+)?)\s?(?:hours|hrs|hr|h)\b/.exec(text);
  const hours = f.hours ?? (hoursMatch ? Number(hoursMatch[1]) : text.includes("half day") ? 4 : text.includes("full day") || text.includes("whole day") ? 8 : null) ?? prev?.hours ?? null;
  const areaLoc = f.area ? findLocality(f.area) : findLocality(text) ?? null;
  const area = f.area ?? areaLoc?.name ?? prev?.area ?? null;
  const diet: Preferences["diet"] = /\bjain\b/.test(text) ? "jain" : /\bvegan\b/.test(text) ? "vegan" : /\bveg(etarian|gie)?\b|\bveg\b/.test(text) ? "veg" : prev?.diet ?? "any";
  const interests = [...new Set(INTEREST_WORDS.filter((w) => text.includes(w)).map((w) => (w === "walk" ? "walks" : w === "cafe" ? "cafes" : w)))];
  const questions: Preferences["clarifyingQuestions"] = [];
  if (!outside && !area) questions.push({ question: "Where will you be starting from?", options: ["South Delhi", "Central Delhi", "Gurugram", "Noida"] });
  return {
    area,
    inNcr: !outside,
    budget,
    hours,
    startTime: null,
    groupSize: /\b(partner|girlfriend|boyfriend|wife|husband|friend)\b/.test(text) ? 2 : prev?.groupSize ?? 1,
    energy: /tired|lazy|exhausted|hungover|chill|slow/.test(text) ? "low" : /energetic|adventur|active/.test(text) ? "high" : prev?.energy ?? "medium",
    mood: f.mood ?? input.message.slice(0, 120),
    interests: interests.length ? interests : prev?.interests ?? [],
    diet,
    avoidCrowds: /crowd|quiet|peaceful|calm|introvert/.test(text) || (prev?.avoidCrowds ?? false),
    otherConstraints: f.constraints?.filter((c) => !/veg|crowd/i.test(c)) ?? prev?.otherConstraints ?? [],
    clarifyingQuestions: input.answers && Object.keys(input.answers).length ? [] : questions,
  };
}
