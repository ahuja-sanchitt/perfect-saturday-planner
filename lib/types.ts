// Shared domain types for the Saturday planner.

export type Diet = "any" | "veg" | "vegan" | "jain";
export type Crowd = "low" | "medium" | "high";
export type Region = "Delhi" | "Gurugram" | "Noida" | "Ghaziabad" | "Faridabad";

export interface Locality {
  name: string;
  aliases: string[];
  region: Region;
  lat: number;
  lng: number;
  metro: string;
}

export interface OpeningHours {
  open: string; // "HH:MM"
  close: string; // "HH:MM"
  closedDays?: string[]; // e.g. ["Mon"]
}

/** A place the agent can put into a plan. Every stop must reference one of these by id. */
export interface Place {
  id: string;
  name: string;
  kind: "activity" | "food" | "event";
  category: string; // park, museum, heritage, cafe, restaurant, music, market...
  area: string;
  region: Region;
  lat: number;
  lng: number;
  indoor: boolean;
  costPerPerson: number; // INR, entry or typical spend per person
  durationMin: number; // typical time spent
  hours?: OpeningHours;
  crowd?: { morning: Crowd; afternoon: Crowd; evening: Crowd };
  diet?: { vegOnly: boolean; vegFriendly: boolean; jainOptions?: boolean };
  tags: string[];
  note?: string; // local tip
  source: "curated" | "osm" | "swiggy" | "mock"; // mock = fictional sample venue, labelled in the UI
  verified?: boolean;
  distanceKm?: number;
}

export interface Preferences {
  area: string | null;
  inNcr: boolean;
  budget: number | null; // INR total
  hours: number | null;
  startTime: string | null; // "HH:MM"
  groupSize: number;
  energy: "low" | "medium" | "high";
  mood: string;
  interests: string[];
  diet: Diet;
  avoidCrowds: boolean;
  otherConstraints: string[];
  clarifyingQuestions: { question: string; options: string[] }[];
}

export interface PlanStop {
  placeId: string;
  name: string;
  area: string;
  start: string;
  end: string;
  activity: string;
  why: string;
  tradeoff: string | null;
  backup: { placeId: string; name: string } | null;
  cost: number;
  travelToNext: { minutes: number; mode: string; fare: number } | null;
  lat: number;
  lng: number;
  source: Place["source"];
}

export interface Plan {
  title: string;
  summary: string;
  stops: PlanStop[];
  totals: { cost: number; budget: number | null; minutes: number; availableMinutes: number | null };
  weather: { tempMax: number | null; aqi: number | null; note: string } | null;
  warnings: string[];
  mode: "agent" | "fallback";
}

export interface Violation {
  code: string;
  stopIndex: number | null;
  message: string;
  severity: "error" | "warning";
}

// ---- Trace / streaming ----
export type TraceEvent =
  | { type: "run_start"; runId: string; promptVersions: Record<string, string>; at: number }
  | { type: "step_start"; id: string; name: string; kind: "llm" | "tool" | "cache" | "guard"; input?: unknown; at: number }
  | {
      type: "step_end";
      id: string;
      name: string;
      ok: boolean;
      summary: string;
      ms: number;
      cacheHit?: boolean;
      usage?: LlmUsage;
    }
  | { type: "thinking"; text: string }
  | { type: "clarify"; questions: { question: string; options: string[] }[]; prefs: Preferences }
  | { type: "message"; text: string; level: "info" | "error" }
  | { type: "plan"; plan: Plan; prefs: Preferences }
  | { type: "done"; stats: RunStats }
  | { type: "error"; message: string };

export interface LlmUsage {
  model: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  costUsd: number;
  savedUsd: number;
}

export interface RunStats {
  runId: string;
  totalMs: number;
  llmCalls: number;
  toolCalls: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  costUsd: number;
  savedUsd: number;
  cacheHitPct: number;
  promptVersions: Record<string, string>;
  responseCacheHit: boolean;
  dataSources: string[];
}
