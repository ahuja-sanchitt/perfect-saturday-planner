// Deterministic plan validation + costing. The LLM proposes; this code disposes.
import { getTravel, type WeatherInfo } from "@/lib/providers/live";
import { slotOf, toMinutes } from "@/lib/geo";
import type { Place, Preferences, Violation } from "@/lib/types";

export interface DraftStop { placeId: string; start: string; end: string }

export interface Leg { minutes: number; fare: number; mode: string; km: number; source: string }

export interface PlanCheck {
  ok: boolean;
  violations: Violation[];
  warnings: Violation[];
  totals: { placesCost: number; travelCost: number; cost: number; minutes: number; firstLegMinutes: number };
  legs: (Leg | null)[]; // legs[i] = travel from stop i to stop i+1
  firstLeg: Leg | null;
}

const DAY = "Sat";

export async function checkPlan(
  stops: DraftStop[],
  places: Map<string, Place>,
  prefs: Preferences,
  origin: { lat: number; lng: number } | null,
  weather: WeatherInfo | null,
): Promise<PlanCheck> {
  const violations: Violation[] = [];
  const warnings: Violation[] = [];
  const err = (code: string, stopIndex: number | null, message: string) => violations.push({ code, stopIndex, message, severity: "error" });
  const warn = (code: string, stopIndex: number | null, message: string) => warnings.push({ code, stopIndex, message, severity: "warning" });

  if (stops.length === 0) err("EMPTY", null, "Plan has no stops.");

  // 1. Every stop must be a real place returned by a search tool (no invented venues).
  const resolved = stops.map((s, i) => {
    const p = places.get(s.placeId);
    if (!p) err("UNKNOWN_PLACE", i, `placeId "${s.placeId}" was not returned by any search tool. Use only ids from search results.`);
    return p;
  });

  // 2. Times
  const times = stops.map((s, i) => {
    const a = toMinutes(s.start), b = toMinutes(s.end);
    if (Number.isNaN(a) || Number.isNaN(b)) err("BAD_TIME", i, `Stop ${i + 1} has invalid time "${s.start}–${s.end}" (use HH:MM, 24h).`);
    else if (b - a < 20) err("TOO_SHORT", i, `Stop ${i + 1} is only ${b - a} min — make each stop at least 20 min.`);
    return { a, b };
  });

  // 3. Travel between consecutive stops (real routing where available)
  const legs: (Leg | null)[] = await Promise.all(
    stops.map(async (_, i) => {
      const p = resolved[i], q = resolved[i + 1];
      if (!p || !q) return null;
      const { value } = await getTravel(p, q);
      return { minutes: value.minutes, fare: value.fare, mode: value.mode, km: value.km, source: value.source };
    }),
  );
  let firstLeg: Leg | null = null;
  if (origin && resolved[0]) {
    const { value } = await getTravel(origin, resolved[0]);
    firstLeg = { minutes: value.minutes, fare: value.fare, mode: value.mode, km: value.km, source: value.source };
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const leg = legs[i];
    const cur = times[i], next = times[i + 1];
    if (!leg || Number.isNaN(cur.b) || Number.isNaN(next.a)) continue;
    const gap = next.a - cur.b;
    if (gap < 0) err("OVERLAP", i + 1, `Stop ${i + 2} starts before stop ${i + 1} ends.`);
    else if (gap + 5 < leg.minutes) err("TRAVEL_TIME", i + 1, `Only ${gap} min between stop ${i + 1} and ${i + 2}, but travel takes ~${leg.minutes} min (${leg.km} km by ${leg.mode}).`);
    if (leg.km > 18) err("TOO_FAR", i + 1, `Stop ${i + 1} → ${i + 2} is ${leg.km} km apart — too far for a relaxed day. Pick closer places.`);
  }

  // 4. Per-place checks: hours, diet, crowds, AQI
  resolved.forEach((p, i) => {
    if (!p) return;
    const { a, b } = times[i];
    if (Number.isNaN(a)) return;
    if (p.hours) {
      if (p.hours.closedDays?.includes(DAY)) err("CLOSED", i, `${p.name} is closed on Saturdays.`);
      const open = toMinutes(p.hours.open), close = toMinutes(p.hours.close);
      if (a < open || b > close) err("HOURS", i, `${p.name} is open ${p.hours.open}–${p.hours.close}; stop is ${stops[i].start}–${stops[i].end}.`);
    }
    if (p.kind === "food" && prefs.diet !== "any") {
      const d = p.diet;
      if (!d || (!d.vegOnly && !d.vegFriendly)) err("DIET", i, `${p.name} is not suitable for a ${prefs.diet} diet.`);
      else if (prefs.diet === "jain" && !d.jainOptions) warn("DIET_JAIN", i, `${p.name} may not have Jain options — mention it.`);
      else if (!d.vegOnly) warn("DIET_MIXED", i, `${p.name} is veg-friendly but not pure veg — say so in the 'why'.`);
    }
    if (prefs.avoidCrowds && p.crowd) {
      const level = p.crowd[slotOf(a)];
      if (level === "high") err("CROWDED", i, `${p.name} is usually crowded in the ${slotOf(a)} — reschedule, swap, or justify with a trade-off.`);
    }
    const aqi = slotOf(a) === "morning" ? weather?.aqiMorning : weather?.aqiAfternoon;
    if (!p.indoor && aqi && aqi >= 200 && b - a > 45) warn("AQI", i, `${p.name} is outdoors for ${b - a} min while AQI is ~${aqi}.`);
    if (!p.indoor && weather?.precipProbMax && weather.precipProbMax >= 60) warn("RAIN", i, `${p.name} is outdoors with ${weather.precipProbMax}% rain chance — offer an indoor backup.`);
  });

  // 5. Totals vs constraints
  const group = Math.max(1, prefs.groupSize || 1);
  const placesCost = resolved.reduce((s, p) => s + (p ? p.costPerPerson * group : 0), 0);
  const travelCost = legs.reduce((s, l) => s + (l?.fare ?? 0), 0) + (firstLeg?.fare ?? 0);
  const cost = placesCost + travelCost;
  const valid = times.filter((t) => !Number.isNaN(t.a) && !Number.isNaN(t.b));
  const span = valid.length ? valid[valid.length - 1].b - valid[0].a : 0;
  const minutes = span + (firstLeg?.minutes ?? 0);

  if (prefs.budget) {
    if (cost > prefs.budget * 1.15) err("BUDGET", null, `Total ₹${cost} exceeds the ₹${prefs.budget} budget by more than 15%.`);
    else if (cost > prefs.budget) warn("BUDGET_SLIGHT", null, `Total ₹${cost} is slightly over the ₹${prefs.budget} budget — add a trade-off note explaining why it's worth it.`);
  }
  if (prefs.hours) {
    const avail = prefs.hours * 60;
    if (minutes > avail + 10) err("TIME", null, `Plan takes ${minutes} min including the first ride, but only ${avail} min are available.`);
    if (stops.length > Math.ceil(prefs.hours) + 1) err("TOO_MANY_STOPS", null, `${stops.length} stops in ${prefs.hours}h is rushed — keep it to ${Math.ceil(prefs.hours)} or fewer.`);
    if (minutes < avail * 0.5) warn("UNDERUSED", null, `Plan only uses ${minutes} of ${avail} available minutes.`);
  }
  if (prefs.energy === "low" && stops.length > 3) warn("ENERGY", null, "User has low energy — 3 stops or fewer is better.");

  return { ok: violations.length === 0, violations, warnings, totals: { placesCost, travelCost, cost, minutes, firstLegMinutes: firstLeg?.minutes ?? 0 }, legs, firstLeg };
}
