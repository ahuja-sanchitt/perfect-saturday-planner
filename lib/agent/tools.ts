// Agent tools: JSON-schema definitions (strict, byte-stable for prompt caching) + handlers.
import { z } from "zod";
import { CURATED_PLACES } from "@/lib/data/curated";
import { LOCALITIES, inNcrBounds } from "@/lib/data/localities";
import { DINEOUT_SNAPSHOT, EVENTS_SNAPSHOT } from "@/lib/data/snapshot";
import { haversineKm, slotOf, toMinutes } from "@/lib/geo";
import { geocode, getTravel, getWeather, osmLabel, searchOsm, type WeatherInfo } from "@/lib/providers/live";
import type { Locality, Place, Preferences } from "@/lib/types";
import { checkPlan } from "./validate";

export interface ToolContext {
  prefs: Preferences;
  date: string;
  places: Map<string, Place>; // registry of every place a search tool returned this run
  origin: { lat: number; lng: number; name: string } | null;
  weather: WeatherInfo | null;
  dataSources: Set<string>;
  finalizeAttempts: number;
  finalPlan: FinalPlanInput | null;
  finalCheck: Awaited<ReturnType<typeof checkPlan>> | null;
  /** Set when the user is refining a previous plan; used to verify the change was actually made. */
  refinement?: { request: string; previousCost: number; previousMinutes: number; previousPlaceIds: string[] };
}

export interface ToolResult { output: unknown; summary: string; cacheHit?: boolean; ok?: boolean }

// ---------------- Schemas (zod for runtime validation of model-supplied args) ----------------
const LatLng = { lat: z.number(), lng: z.number() };
const DraftStopZ = z.object({ placeId: z.string(), start: z.string(), end: z.string() });
export const FinalStopZ = DraftStopZ.extend({
  activity: z.string(),
  why: z.string(),
  tradeoff: z.string().nullable(),
  backupPlaceId: z.string().nullable(),
});
export const FinalPlanZ = z.object({ title: z.string(), summary: z.string(), stops: z.array(FinalStopZ).min(1).max(6) });
export type FinalPlanInput = z.infer<typeof FinalPlanZ>;

const ARGS = {
  resolve_area: z.object({ query: z.string() }),
  get_weather: z.object(LatLng),
  search_activities: z.object({ ...LatLng, interests: z.array(z.string()), preferIndoor: z.boolean(), maxKm: z.number() }),
  search_food: z.object({ ...LatLng, maxSpendPerPerson: z.number(), cuisineHint: z.string().nullable(), maxKm: z.number() }),
  search_events: z.object({ ...LatLng, interests: z.array(z.string()) }),
  get_travel_time: z.object({ fromPlaceId: z.string(), toPlaceId: z.string() }),
  estimate_cost: z.object({ placeIds: z.array(z.string()) }),
  validate_plan: z.object({ stops: z.array(DraftStopZ) }),
  finalize_plan: FinalPlanZ,
};
export type ToolName = keyof typeof ARGS;

// ---------------- JSON schema tool definitions (sorted by name → deterministic prefix) ----------------
const num = { type: "number" } as const;
const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const draftStop = obj({ placeId: str, start: { type: "string", description: "HH:MM 24h" }, end: { type: "string", description: "HH:MM 24h" } });

export const TOOL_DEFINITIONS = [
  {
    name: "estimate_cost",
    description: "Total cost in INR for visiting these places in order: entry/spend for the whole group plus cab fares between them and from the user's area to the first stop.",
    parameters: obj({ placeIds: strArr }),
  },
  {
    name: "finalize_plan",
    description: "Submit the final plan. It is validated server-side; if it fails you get the violations back and must fix them. Every placeId and backupPlaceId must come from search results.",
    parameters: obj({
      title: { type: "string", description: "Short, friendly plan title" },
      summary: { type: "string", description: "1–2 sentences on the overall shape of the day and why it suits the user" },
      stops: {
        type: "array",
        items: obj({
          placeId: str,
          start: { type: "string", description: "HH:MM 24h" },
          end: { type: "string", description: "HH:MM 24h" },
          activity: { type: "string", description: "What to actually do there, concretely (1 sentence)" },
          why: { type: "string", description: "Why this fits THIS user — reference their mood, interests or constraints" },
          tradeoff: { type: ["string", "null"], description: "Honest trade-off if any (over budget, farther, busier), else null" },
          backupPlaceId: { type: ["string", "null"], description: "Alternative placeId from search results if this one doesn't work out, else null" },
        }),
      },
    }),
  },
  {
    name: "get_travel_time",
    description: "Road travel time, distance and cab fare between two places from search results (OSRM routing, Delhi-traffic adjusted).",
    parameters: obj({ fromPlaceId: str, toPlaceId: str }),
  },
  {
    name: "get_weather",
    description: "Saturday forecast and air quality (US AQI) for a location. Use it to decide indoor vs outdoor.",
    parameters: obj({ lat: num, lng: num }),
  },
  {
    name: "resolve_area",
    description: "Resolve a Delhi NCR neighbourhood or region name to coordinates and nearest metro. Returns not_in_ncr for places outside Delhi NCR.",
    parameters: obj({ query: str }),
  },
  {
    name: "search_activities",
    description: "Find things to do near a point: parks, walks, heritage, museums, galleries, music venues. Combines curated local knowledge (crowd levels, tips) with live OpenStreetMap data.",
    parameters: obj({ lat: num, lng: num, interests: strArr, preferIndoor: { type: "boolean" }, maxKm: { type: "number", description: "Search radius in km (5–15 typical)" } }),
  },
  {
    name: "search_events",
    description: "Events and live shows happening on the planned Saturday near a point (Swiggy Scenes snapshot).",
    parameters: obj({ lat: num, lng: num, interests: strArr }),
  },
  {
    name: "search_food",
    description: "Find restaurants/cafés near a point that satisfy the user's diet, filtered by max spend per person. Sources: Swiggy Dineout snapshot, curated list, OpenStreetMap.",
    parameters: obj({ lat: num, lng: num, maxSpendPerPerson: num, cuisineHint: { type: ["string", "null"] }, maxKm: num }),
  },
  {
    name: "validate_plan",
    description: "Check a draft itinerary against hard constraints (budget, time incl. travel, opening hours, diet, crowds, distance). Use before finalize_plan.",
    parameters: obj({ stops: { type: "array", items: draftStop } }),
  },
].map((t) => ({ type: "function" as const, strict: true, ...t }));

// ---------------- Helpers ----------------
function compact(p: Place, ctx: ToolContext) {
  const hours = p.hours ? `${p.hours.open}-${p.hours.close}${p.hours.closedDays?.length ? `, closed ${p.hours.closedDays.join("/")}` : ""}` : "unknown";
  const crowd = p.crowd ? `morning ${p.crowd.morning}, afternoon ${p.crowd.afternoon}, evening ${p.crowd.evening}` : "unknown";
  const veg = p.diet ? (p.diet.vegOnly ? "pure veg" : p.diet.vegFriendly ? "veg-friendly (mixed menu)" : "non-veg focused") : undefined;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    area: p.area,
    indoor: p.indoor,
    costPerPersonInr: p.costPerPerson,
    typicalMinutes: p.durationMin,
    hours,
    crowd,
    ...(veg ? { diet: veg } : {}),
    distanceKm: ctx.origin ? Math.round(haversineKm(ctx.origin, p) * 10) / 10 : undefined,
    tip: p.note,
    source: p.source,
  };
}

function register(ctx: ToolContext, places: Place[]) {
  for (const p of places) ctx.places.set(p.id, p);
}

function interestScore(p: Place, interests: string[]): number {
  const words = interests.map((i) => i.toLowerCase());
  return p.tags.reduce((s, t) => s + (words.some((w) => t.includes(w) || w.includes(t)) ? 1 : 0), 0) + (words.some((w) => p.category.includes(w)) ? 1 : 0);
}

export function findLocality(query: string): Locality | null {
  const q = query.toLowerCase().trim().replace(/[.,]/g, "");
  if (!q) return null;
  let best: Locality | null = null;
  let bestLen = 0;
  for (const loc of LOCALITIES) {
    for (const alias of [loc.name.toLowerCase(), ...loc.aliases]) {
      if ((q === alias || q.includes(alias) || alias.includes(q)) && alias.length > bestLen && (q.length >= 3 || q === alias)) {
        best = loc;
        bestLen = alias.length;
      }
    }
  }
  return best;
}

const INTEREST_TO_OSM: Record<string, string[]> = {
  walk: ["park"], walks: ["park"], nature: ["park"], park: ["park"],
  art: ["gallery", "museum"], museum: ["museum"], history: ["heritage", "museum"], heritage: ["heritage"],
  music: ["music"], "live music": ["music"], theatre: ["music"], culture: ["museum", "music"],
};

// ---------------- Handlers ----------------
export async function runTool(name: string, rawArgs: unknown, ctx: ToolContext): Promise<ToolResult> {
  if (!(name in ARGS)) return { output: { error: `Unknown tool ${name}` }, summary: "unknown tool", ok: false };
  const parsed = ARGS[name as ToolName].safeParse(rawArgs);
  if (!parsed.success) return { output: { error: "Invalid arguments", details: parsed.error.issues.slice(0, 3) }, summary: "invalid args", ok: false };
  const args = parsed.data as never;
  switch (name as ToolName) {
    case "resolve_area": return resolveArea(args, ctx);
    case "get_weather": return weather(args, ctx);
    case "search_activities": return searchActivities(args, ctx);
    case "search_food": return searchFood(args, ctx);
    case "search_events": return searchEvents(args, ctx);
    case "get_travel_time": return travelTime(args, ctx);
    case "estimate_cost": return estimateCost(args, ctx);
    case "validate_plan": return validatePlan(args, ctx);
    case "finalize_plan": return finalizePlan(args, ctx);
  }
}

async function resolveArea({ query }: z.infer<typeof ARGS.resolve_area>, ctx: ToolContext): Promise<ToolResult> {
  const loc = findLocality(query);
  if (loc) {
    ctx.origin ??= { lat: loc.lat, lng: loc.lng, name: loc.name };
    ctx.dataSources.add("NCR gazetteer");
    return { output: { name: loc.name, region: loc.region, lat: loc.lat, lng: loc.lng, nearestMetro: loc.metro }, summary: `${query} → ${loc.name} · ${loc.metro} metro`, cacheHit: true };
  }
  const { value: geo, hit } = await geocode(`${query}, Delhi NCR`);
  if (geo && inNcrBounds(geo.lat, geo.lng)) {
    ctx.origin ??= { lat: geo.lat, lng: geo.lng, name: query };
    ctx.dataSources.add("OSM Nominatim");
    return { output: { name: query, lat: geo.lat, lng: geo.lng, label: geo.label }, summary: `${query} → geocoded (Nominatim)`, cacheHit: hit };
  }
  return { output: { error: "not_in_ncr", message: `"${query}" is not a Delhi NCR area this planner covers.` }, summary: `${query} → not in NCR`, ok: false };
}

async function weather({ lat, lng }: z.infer<typeof ARGS.get_weather>, ctx: ToolContext): Promise<ToolResult> {
  const { value, hit } = await getWeather(lat, lng, ctx.date);
  ctx.weather = value;
  if (value.source !== "unavailable") ctx.dataSources.add("Open-Meteo");
  const t = value.tempMax !== null ? `${Math.round(value.tempMax)}°C` : "n/a";
  return { output: value, summary: `${t} · rain ${value.precipProbMax ?? "?"}% · AQI ${value.aqiAfternoon ?? value.aqiMax ?? "?"} → ${value.advice}`, cacheHit: hit, ok: value.source !== "unavailable" };
}

async function searchActivities(a: z.infer<typeof ARGS.search_activities>, ctx: ToolContext): Promise<ToolResult> {
  const point = { lat: a.lat, lng: a.lng };
  const maxKm = Math.min(Math.max(a.maxKm, 3), 20);
  const curated = CURATED_PLACES.filter((p) => p.kind === "activity" && haversineKm(point, p) <= maxKm);

  // Live OSM top-up for the user's interests.
  const cats = [...new Set(a.interests.flatMap((i) => INTEREST_TO_OSM[i.toLowerCase()] ?? []))].slice(0, 2);
  let osm: Place[] = [];
  let osmNote = "";
  let anyHit = false;
  const results = await Promise.allSettled(cats.map((c) => searchOsm(a.lat, a.lng, c, Math.min(maxKm, 6) * 1000)));
  for (const r of results) {
    if (r.status === "fulfilled") { osm.push(...r.value.value); anyHit ||= r.value.hit; }
    else osmNote = "OpenStreetMap was unavailable; using curated data only.";
  }
  const curatedNames = new Set(curated.map((p) => p.name.toLowerCase()));
  osm = osm.filter((p) => !curatedNames.has(p.name.toLowerCase()));
  if (osm.length) ctx.dataSources.add(osmLabel());
  ctx.dataSources.add("Curated NCR guide");

  const scored = [...curated, ...osm]
    .map((p) => {
      // Curated places carry verified-ish hours, crowd and price data, so they outrank raw OSM.
      let s = interestScore(p, a.interests) * 2 + (p.source === "curated" ? 3 : -1) - haversineKm(point, p) / 4;
      if (a.preferIndoor && p.indoor) s += 2;
      if (ctx.prefs.avoidCrowds && p.crowd && p.crowd.afternoon === "high" && p.crowd.morning !== "low") s -= 2;
      if (ctx.prefs.energy === "low" && p.tags.includes("low-effort")) s += 1;
      return { p, s };
    })
    .sort((x, y) => y.s - x.s)
    .slice(0, 12)
    .map((x) => x.p);
  register(ctx, scored);
  return {
    output: { count: scored.length, places: scored.map((p) => compact(p, ctx)), ...(osmNote ? { note: osmNote } : {}) },
    summary: `${scored.length} found (${scored.filter((p) => p.source === "curated").length} curated, ${scored.filter((p) => p.source === "osm").length} OSM live)${osmNote ? " · OSM down, fallback" : ""}`,
    cacheHit: anyHit,
  };
}

async function searchFood(a: z.infer<typeof ARGS.search_food>, ctx: ToolContext): Promise<ToolResult> {
  const point = { lat: a.lat, lng: a.lng };
  const maxKm = Math.min(Math.max(a.maxKm, 2), 15);
  const diet = ctx.prefs.diet;
  const pool: Place[] = [...DINEOUT_SNAPSHOT.places, ...CURATED_PLACES.filter((p) => p.kind === "food")];
  let osmNote = "";
  let hit = false;
  if (diet !== "any") {
    try {
      const r = await searchOsm(a.lat, a.lng, "vegetarian", Math.min(maxKm, 5) * 1000);
      hit = r.hit;
      const names = new Set(pool.map((p) => p.name.toLowerCase()));
      pool.push(...r.value.filter((p) => !names.has(p.name.toLowerCase())));
      if (r.value.length) ctx.dataSources.add(osmLabel());
    } catch {
      osmNote = "OpenStreetMap was unavailable; using snapshot + curated data.";
    }
  }
  const dietOk = (p: Place) => diet === "any" || (p.diet && (p.diet.vegOnly || p.diet.vegFriendly));
  const near = pool.filter((p) => haversineKm(point, p) <= maxKm && dietOk(p));
  const affordable = near.filter((p) => p.costPerPerson <= a.maxSpendPerPerson);
  const hint = a.cuisineHint?.toLowerCase();
  const rank = (p: Place) =>
    (p.source === "swiggy" ? 2 : p.source === "curated" ? 1.5 : 0) +
    (p.diet?.vegOnly && diet !== "any" ? 1 : 0) +
    (hint && (p.category.includes(hint) || p.tags.some((t) => t.includes(hint))) ? 2 : 0) +
    (ctx.prefs.avoidCrowds && p.crowd?.afternoon === "high" ? -1.5 : 0) -
    haversineKm(point, p) / 3;
  const chosen = (affordable.length ? affordable : near).sort((x, y) => rank(y) - rank(x)).slice(0, 10);
  register(ctx, chosen);
  if (DINEOUT_SNAPSHOT.places.length) ctx.dataSources.add(`Swiggy Dineout snapshot (${DINEOUT_SNAPSHOT.takenAt?.slice(0, 10)})`);
  ctx.dataSources.add("Curated NCR guide");
  const note = !affordable.length && near.length ? `Nothing within ₹${a.maxSpendPerPerson}/person; showing cheapest nearby options instead.` : osmNote || undefined;
  return {
    output: { count: chosen.length, places: chosen.map((p) => compact(p, ctx)), ...(note ? { note } : {}), ...(chosen.length === 0 ? { suggestion: "Increase maxKm or maxSpendPerPerson." } : {}) },
    summary: `${chosen.length} ${diet !== "any" ? diet + "-friendly " : ""}spots${note ? " · " + note : ""}`,
    cacheHit: hit,
  };
}

async function searchEvents(a: z.infer<typeof ARGS.search_events>, ctx: ToolContext): Promise<ToolResult> {
  const point = { lat: a.lat, lng: a.lng };
  const events = EVENTS_SNAPSHOT.events.filter((e) => e.date === ctx.date && haversineKm(point, e) <= 15);
  register(ctx, events);
  if (!EVENTS_SNAPSHOT.takenAt) {
    return { output: { count: 0, events: [], note: "No events snapshot available for this Saturday. Do not invent events; use venues from search_activities instead." }, summary: "no events snapshot → skip events", cacheHit: true };
  }
  ctx.dataSources.add(`Swiggy Scenes snapshot (${EVENTS_SNAPSHOT.takenAt.slice(0, 10)})`);
  return {
    output: { count: events.length, events: events.map((e) => ({ ...compact(e, ctx), startTime: e.startTime, endTime: e.endTime })) },
    summary: `${events.length} events on ${ctx.date}`,
    cacheHit: true,
  };
}

async function travelTime(a: z.infer<typeof ARGS.get_travel_time>, ctx: ToolContext): Promise<ToolResult> {
  const p = ctx.places.get(a.fromPlaceId), q = ctx.places.get(a.toPlaceId);
  if (!p || !q) return { output: { error: "Unknown placeId — use ids from search results." }, summary: "unknown place", ok: false };
  const { value, hit } = await getTravel(p, q);
  if (value.source === "osrm") ctx.dataSources.add("OSRM routing");
  return { output: value, summary: `${p.name} → ${q.name}: ${value.minutes} min ${value.mode}, ₹${value.fare}`, cacheHit: hit };
}

async function estimateCost(a: z.infer<typeof ARGS.estimate_cost>, ctx: ToolContext): Promise<ToolResult> {
  const stops = a.placeIds.map((id, i) => ({ placeId: id, start: `${10 + i * 2}:00`, end: `${11 + i * 2}:00` }));
  const check = await checkPlan(stops, ctx.places, ctx.prefs, ctx.origin, ctx.weather);
  const unknown = check.violations.filter((v) => v.code === "UNKNOWN_PLACE");
  if (unknown.length) return { output: { error: unknown.map((v) => v.message) }, summary: "unknown place ids", ok: false };
  const { placesCost, travelCost, cost } = check.totals;
  return {
    output: { placesCostInr: placesCost, travelCostInr: travelCost, totalInr: cost, budgetInr: ctx.prefs.budget, withinBudget: ctx.prefs.budget ? cost <= ctx.prefs.budget : null },
    summary: `₹${cost} (places ₹${placesCost} + cabs ₹${travelCost})${ctx.prefs.budget ? ` vs ₹${ctx.prefs.budget}` : ""}`,
  };
}

async function validatePlan(a: z.infer<typeof ARGS.validate_plan>, ctx: ToolContext): Promise<ToolResult> {
  const check = await checkPlan(a.stops, ctx.places, ctx.prefs, ctx.origin, ctx.weather);
  return {
    output: { ok: check.ok, violations: check.violations.map((v) => v.message), warnings: check.warnings.map((v) => v.message), totals: check.totals },
    summary: check.ok ? `passed · ${check.totals.minutes} min · ₹${check.totals.cost}` : `${check.violations.length} issue(s): ${check.violations[0].message}`,
    ok: check.ok,
  };
}

async function finalizePlan(a: FinalPlanInput, ctx: ToolContext): Promise<ToolResult> {
  ctx.finalizeAttempts++;
  const check = await checkPlan(a.stops, ctx.places, ctx.prefs, ctx.origin, ctx.weather);
  // Backups must also be real places.
  const badBackups = a.stops.filter((s) => s.backupPlaceId && !ctx.places.has(s.backupPlaceId));
  const blocking = [
    ...check.violations.filter((v) => !(v.code === "CROWDED" && a.stops[v.stopIndex ?? -1]?.tradeoff)),
    ...badBackups.map((s) => ({ code: "UNKNOWN_BACKUP", message: `backupPlaceId "${s.backupPlaceId}" is not from search results — use a real id or null.` })),
  ];
  const needsTradeoff = check.warnings.some((w) => w.code === "BUDGET_SLIGHT") && !a.stops.some((s) => s.tradeoff);
  if (needsTradeoff) blocking.push({ code: "TRADEOFF_REQUIRED", message: "Plan is slightly over budget: add a tradeoff note on the stop that causes it." });
  // Refinements must actually deliver what was asked (caught in testing: "cheaper" returned a same-cost swap).
  const ref = ctx.refinement;
  if (ref) {
    const req = ref.request.toLowerCase();
    if (/cheap|budget|less money|save|affordable/.test(req) && check.totals.cost >= ref.previousCost)
      blocking.push({ code: "NOT_CHEAPER", message: `User asked for cheaper, but the new total ₹${check.totals.cost} is not below the previous ₹${ref.previousCost}. Swap the most expensive stop for a cheaper one.` });
    if (/short|less time|quick|fewer/.test(req) && check.totals.minutes >= ref.previousMinutes)
      blocking.push({ code: "NOT_SHORTER", message: `User asked for a shorter day, but it still takes ${check.totals.minutes} min (was ${ref.previousMinutes}).` });
    const same = a.stops.map((s) => s.placeId).join() === ref.previousPlaceIds.join();
    if (same && !/time|start|later|earlier/.test(req)) blocking.push({ code: "NO_CHANGE", message: "The plan is identical to the previous one — apply the user's change request." });
  }

  if (blocking.length && ctx.finalizeAttempts < 3) {
    return { output: { accepted: false, attempt: ctx.finalizeAttempts, fix: blocking.map((v) => v.message) }, summary: `rejected (attempt ${ctx.finalizeAttempts}): ${blocking[0].message}`, ok: false };
  }
  ctx.finalPlan = a;
  ctx.finalCheck = check;
  return {
    output: { accepted: true, note: blocking.length ? "Accepted with unresolved issues flagged to the user." : "Accepted." },
    summary: blocking.length ? `accepted with ${blocking.length} flagged issue(s)` : `accepted · ${a.stops.length} stops · ₹${check.totals.cost} · ${check.totals.minutes} min`,
    ok: true,
  };
}

/** Crowd level helper exported for the fallback planner. */
export function crowdAt(p: Place, hhmm: string) {
  return p.crowd?.[slotOf(toMinutes(hhmm))] ?? "medium";
}
