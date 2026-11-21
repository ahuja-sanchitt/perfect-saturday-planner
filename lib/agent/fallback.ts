// Rule-based planner used when the LLM is unavailable (no key, API error, timeout) or
// fails to produce a valid plan. Uses the same tools and validator as the agent, so the
// result is still grounded in real places and checked constraints — just less personal.
import { toHHMM, toMinutes } from "@/lib/geo";
import { getTravel } from "@/lib/providers/live";
import type { Place, Plan } from "@/lib/types";
import type { Tracer } from "@/lib/obs/trace";
import { assemblePlan } from "./assemble";
import { crowdAt, findLocality, type FinalPlanInput, type ToolContext } from "./tools";
import { checkPlan } from "./validate";

type Exec = (name: string, args: unknown) => Promise<unknown>;

export async function fallbackPlan(ctx: ToolContext, tracer: Tracer, exec: Exec, reason: string): Promise<Plan | null> {
  const prefs = ctx.prefs;
  const loc = findLocality(prefs.area ?? "") ?? findLocality("Central Delhi")!;
  await exec("resolve_area", { query: prefs.area ?? "Central Delhi" });
  const origin = ctx.origin ?? { lat: loc.lat, lng: loc.lng, name: loc.name };
  await exec("get_weather", { lat: origin.lat, lng: origin.lng });
  const badAir = (ctx.weather?.aqiAfternoon ?? 0) >= 150 || (ctx.weather?.precipProbMax ?? 0) >= 60;
  const budget = prefs.budget ?? 2000;
  const group = Math.max(1, prefs.groupSize);

  await exec("search_activities", { lat: origin.lat, lng: origin.lng, interests: prefs.interests.length ? prefs.interests : ["walks", "art"], preferIndoor: badAir, maxKm: 10 });
  await exec("search_food", { lat: origin.lat, lng: origin.lng, maxSpendPerPerson: Math.round((budget * 0.45) / group), cuisineHint: null, maxKm: 8 });

  const all = [...ctx.places.values()];
  const start = toMinutes(prefs.startTime ?? "11:00");
  const hours = prefs.hours ?? 4;
  const okAt = (p: Place, t: number) => {
    const hh = toHHMM(t);
    if (p.hours?.closedDays?.includes("Sat")) return false;
    if (p.hours && (t < toMinutes(p.hours.open) || t + 60 > toMinutes(p.hours.close))) return false;
    return !(prefs.avoidCrowds && crowdAt(p, hh) === "high");
  };
  // Prefer curated places (known hours/crowds/prices) over raw OSM entries.
  const byTrust = (xs: Place[]) => [...xs.filter((p) => p.source !== "osm"), ...xs.filter((p) => p.source === "osm")];
  const acts = byTrust(all.filter((p) => p.kind === "activity"));
  const foods = byTrust(all.filter((p) => p.kind === "food"));
  const first = acts.find((p) => okAt(p, start) && (!badAir || p.indoor)) ?? acts.find((p) => okAt(p, start));
  const lunchAt = Math.max(start + 75 + 20, 12 * 60 + 30);
  const lunch = foods.find((p) => okAt(p, lunchAt));
  const third = hours >= 4 ? acts.find((p) => p !== first && okAt(p, lunchAt + 80) && (!badAir || p.indoor)) : undefined;
  const picks = [first, lunch, third].filter((p): p is Place => Boolean(p));
  if (!picks.length) return null;

  // Schedule sequentially with real travel times, stopping when the time budget runs out.
  const firstLeg = (await getTravel(origin, picks[0])).value.minutes;
  const endBy = start + hours * 60 - firstLeg;
  const stops: FinalPlanInput["stops"] = [];
  let t = start;
  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    const dur = Math.min(p.durationMin, p.kind === "food" ? 60 : 75);
    if (t + dur > endBy && stops.length) break;
    stops.push({
      placeId: p.id,
      start: toHHMM(t),
      end: toHHMM(t + dur),
      activity: p.source === "osm" ? `Visit ${p.name} (check timings before you go).` : p.note ?? `Spend some unhurried time at ${p.name}.`,
      why: whyFor(p, ctx),
      tradeoff: null,
      backupPlaceId: null,
    });
    const next = picks[i + 1];
    t += dur + (next ? (await getTravel(p, next)).value.minutes + 5 : 0);
  }
  const final: FinalPlanInput = {
    title: `A simple Saturday around ${origin.name}`,
    summary: `Built by the rule-based fallback planner (${reason}). Places and constraints are real and checked; descriptions are less personalised.`,
    stops,
  };
  const check = await checkPlan(stops, ctx.places, prefs, origin, ctx.weather);
  tracer.send({ type: "message", level: "info", text: `Fallback planner used: ${reason}` });
  return assemblePlan(final, check, ctx, "fallback");
}

function whyFor(p: Place, ctx: ToolContext): string {
  const bits: string[] = [];
  const prefs = ctx.prefs;
  if (p.kind === "food" && prefs.diet !== "any") bits.push(p.diet?.vegOnly ? "pure vegetarian" : "veg-friendly menu");
  if (prefs.avoidCrowds && p.crowd) bits.push("usually not crowded at this time");
  if (prefs.energy === "low" && (p.tags.includes("low-effort") || p.tags.includes("calm"))) bits.push("easy-going, low effort");
  const match = p.tags.filter((t) => prefs.interests.some((i) => t.includes(i.toLowerCase())));
  if (match.length) bits.push(`matches your interest in ${match.slice(0, 2).join(" & ")}`);
  if (p.indoor && (ctx.weather?.aqiAfternoon ?? 0) >= 150) bits.push("indoors while air quality is poor");
  return bits.length ? `${bits.join(", ")}.`.replace(/^./, (c) => c.toUpperCase()) : "Close by and fits your time and budget.";
}
