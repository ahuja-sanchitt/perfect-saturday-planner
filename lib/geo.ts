// Geography + time helpers. Deterministic: the LLM never does this arithmetic.

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Delhi-realistic cab estimate from straight-line distance (road factor ~1.35, ~20 km/h Saturday traffic). */
export function estimateCab(km: number): { roadKm: number; minutes: number; fare: number } {
  const roadKm = km * 1.35;
  const minutes = Math.max(5, Math.round((roadKm / 20) * 60 + 4)); // +4 min pickup
  const fare = Math.round(Math.max(60, 40 + roadKm * 16)); // typical app-cab fare
  return { roadKm: Math.round(roadKm * 10) / 10, minutes, fare };
}

/** Walking is fine for short hops. */
export function travelMode(km: number): "walk" | "cab" {
  return km <= 0.9 ? "walk" : "cab";
}

export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function slotOf(mins: number): "morning" | "afternoon" | "evening" {
  if (mins < 12 * 60) return "morning";
  if (mins < 17 * 60) return "afternoon";
  return "evening";
}

/** The Saturday we are planning for, in IST (today if it is Saturday). */
export function upcomingSaturday(now = new Date()): { iso: string; label: string } {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const day = ist.getUTCDay(); // 0 Sun .. 6 Sat
  const add = (6 - day + 7) % 7;
  const sat = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + add));
  const iso = sat.toISOString().slice(0, 10);
  const label = sat.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return { iso, label };
}
