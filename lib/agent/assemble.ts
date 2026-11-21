import type { Plan, PlanStop, Preferences } from "@/lib/types";
import type { FinalPlanInput, ToolContext } from "./tools";
import type { PlanCheck } from "./validate";

export function assemblePlan(final: FinalPlanInput, check: PlanCheck, ctx: ToolContext, mode: Plan["mode"], extraWarnings: string[] = []): Plan {
  const prefs: Preferences = ctx.prefs;
  const group = Math.max(1, prefs.groupSize || 1);
  const stops: PlanStop[] = final.stops.map((s, i) => {
    const p = ctx.places.get(s.placeId)!;
    const backup = s.backupPlaceId ? ctx.places.get(s.backupPlaceId) : undefined;
    const leg = check.legs[i];
    return {
      placeId: s.placeId,
      name: p.name,
      area: p.area,
      start: s.start,
      end: s.end,
      activity: s.activity,
      why: s.why,
      tradeoff: s.tradeoff,
      backup: backup ? { placeId: backup.id, name: backup.name } : null,
      cost: p.costPerPerson * group,
      travelToNext: leg ? { minutes: leg.minutes, mode: leg.mode, fare: leg.fare } : null,
      lat: p.lat,
      lng: p.lng,
      source: p.source,
    };
  });
  const w = ctx.weather;
  return {
    title: final.title,
    summary: final.summary,
    stops,
    totals: { cost: check.totals.cost, budget: prefs.budget, minutes: check.totals.minutes, availableMinutes: prefs.hours ? prefs.hours * 60 : null },
    weather: w ? { tempMax: w.tempMax, aqi: w.aqiAfternoon ?? w.aqiMax, note: w.advice } : null,
    warnings: [...check.violations.map((v) => v.message), ...check.warnings.filter((v) => v.code !== "DIET_MIXED").map((v) => v.message), ...extraWarnings],
    mode,
  };
}
