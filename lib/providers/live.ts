// Live, free, keyless data sources: Open-Meteo (weather + AQI), OSRM (routing),
// Overpass/OSM (places), Nominatim (geocoding). Every call is cached, time-boxed and
// has a deterministic fallback so the planner never hard-fails on a flaky API.
import { cached, toolCache } from "@/lib/cache/store";
import { estimateCab, haversineKm } from "@/lib/geo";
import type { Place } from "@/lib/types";
import osmSnapshot from "@/data/ncr/osm.json";

const OSM_SNAPSHOT = osmSnapshot as unknown as { takenAt: string | null; places: (Place & { osmHours?: string })[] };

const UA = "PerfectSaturdayPlanner/1.0 (take-home demo)";

async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 6000): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, Accept: "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}`);
  return (await res.json()) as T;
}

// ---------------- Weather + AQI ----------------
export interface WeatherInfo {
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  precipProbMax: number | null;
  aqiMorning: number | null;
  aqiAfternoon: number | null;
  aqiMax: number | null;
  advice: string;
  source: "open-meteo" | "unavailable";
}

export async function getWeather(lat: number, lng: number, date: string) {
  const key = `wx:${lat.toFixed(2)}:${lng.toFixed(2)}:${date}`;
  return cached(toolCache, key, 30 * 60_000, async (): Promise<WeatherInfo> => {
    try {
      const [wx, aq] = await Promise.all([
        fetchJson<{ daily: { temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[] } }>(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FKolkata&start_date=${date}&end_date=${date}`,
        ),
        fetchJson<{ hourly: { time: string[]; us_aqi: (number | null)[] } }>(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi&timezone=Asia%2FKolkata&start_date=${date}&end_date=${date}`,
        ).catch(() => null),
      ]);
      const tempMax = wx.daily.temperature_2m_max?.[0] ?? null;
      const tempMin = wx.daily.temperature_2m_min?.[0] ?? null;
      const precip = wx.daily.precipitation_probability_max?.[0] ?? null;
      let aqiMorning: number | null = null, aqiAfternoon: number | null = null, aqiMax: number | null = null;
      if (aq?.hourly?.us_aqi?.length) {
        const vals = aq.hourly.us_aqi.map((v) => v ?? 0);
        const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null);
        aqiMorning = avg(vals.slice(8, 12));
        aqiAfternoon = avg(vals.slice(12, 18));
        aqiMax = Math.max(...vals.slice(8, 22));
      }
      return { date, tempMax, tempMin, precipProbMax: precip, aqiMorning, aqiAfternoon, aqiMax, advice: weatherAdvice(tempMax, precip, aqiAfternoon ?? aqiMax), source: "open-meteo" };
    } catch {
      return { date, tempMax: null, tempMin: null, precipProbMax: null, aqiMorning: null, aqiAfternoon: null, aqiMax: null, advice: "Weather unavailable — keep one indoor backup.", source: "unavailable" };
    }
  });
}

function weatherAdvice(tempMax: number | null, precip: number | null, aqi: number | null): string {
  const notes: string[] = [];
  if (precip !== null && precip >= 50) notes.push(`${precip}% chance of rain — favour indoor stops`);
  if (tempMax !== null && tempMax >= 36) notes.push(`hot (${Math.round(tempMax)}°C) — outdoors only early morning`);
  if (aqi !== null && aqi >= 200) notes.push(`very poor air (AQI ~${aqi}) — keep outdoor time short, prefer indoor`);
  else if (aqi !== null && aqi >= 150) notes.push(`unhealthy air (AQI ~${aqi}) — limit outdoor time to the morning`);
  return notes.length ? notes.join("; ") : "Pleasant — outdoor plans are fine.";
}

// ---------------- Routing (OSRM public demo server) ----------------
export interface TravelInfo { km: number; minutes: number; fare: number; mode: "walk" | "cab"; source: "osrm" | "estimate" }

export async function getTravel(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const straight = haversineKm(a, b);
  if (straight <= 0.9) {
    return { value: { km: Math.round(straight * 10) / 10, minutes: Math.max(3, Math.round((straight / 4.5) * 60)), fare: 0, mode: "walk", source: "estimate" } as TravelInfo, hit: false };
  }
  const key = `route:${a.lat.toFixed(3)},${a.lng.toFixed(3)}>${b.lat.toFixed(3)},${b.lng.toFixed(3)}`;
  return cached(toolCache, key, 6 * 3600_000, async (): Promise<TravelInfo> => {
    const est = estimateCab(straight);
    if (process.env.FORCE_OSRM_FAIL === "1") return { km: est.roadKm, minutes: est.minutes, fare: est.fare, mode: "cab", source: "estimate" };
    try {
      const r = await fetchJson<{ routes: { distance: number; duration: number }[] }>(
        `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`,
        {},
        4000,
      );
      const route = r.routes?.[0];
      if (!route) throw new Error("no route");
      const km = route.distance / 1000;
      // OSRM free-flow durations are optimistic for Delhi: scale by 1.6 and add pickup time.
      const minutes = Math.round((route.duration / 60) * 1.6 + 4);
      const fare = Math.round(Math.max(60, 40 + km * 16));
      return { km: Math.round(km * 10) / 10, minutes, fare, mode: "cab", source: "osrm" };
    } catch {
      return { km: est.roadKm, minutes: est.minutes, fare: est.fare, mode: "cab", source: "estimate" };
    }
  });
}

// ---------------- Geocoding (Nominatim) ----------------
export async function geocode(query: string) {
  const key = `geo:${query.toLowerCase()}`;
  return cached(toolCache, key, 24 * 3600_000, async () => {
    try {
      const r = await fetchJson<{ lat: string; lon: string; display_name: string }[]>(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`,
        {},
        5000,
      );
      if (!r.length) return null;
      return { lat: Number(r[0].lat), lng: Number(r[0].lon), label: r[0].display_name };
    } catch {
      return null;
    }
  });
}

// ---------------- Places (Overpass / OSM) ----------------
const OSM_QUERIES: Record<string, string> = {
  park: `nwr["leisure"="park"]["name"]`,
  museum: `nwr["tourism"="museum"]["name"]`,
  gallery: `nwr["tourism"="gallery"]["name"]`,
  heritage: `nwr["historic"~"monument|ruins|archaeological_site|fort"]["name"]`,
  music: `nwr["amenity"~"music_venue|theatre|arts_centre"]["name"]`,
  cafe: `nwr["amenity"="cafe"]["name"]`,
  vegetarian: `nwr["amenity"~"restaurant|cafe"]["diet:vegetarian"~"yes|only"]["name"]`,
};

const OSM_DEFAULTS: Record<string, Partial<Place>> = {
  park: { indoor: false, costPerPerson: 0, durationMin: 60, kind: "activity", tags: ["walks", "nature"] },
  museum: { indoor: true, costPerPerson: 50, durationMin: 75, kind: "activity", tags: ["museum", "indoor"] },
  gallery: { indoor: true, costPerPerson: 0, durationMin: 45, kind: "activity", tags: ["art", "indoor"] },
  heritage: { indoor: false, costPerPerson: 30, durationMin: 45, kind: "activity", tags: ["heritage", "walks"] },
  music: { indoor: true, costPerPerson: 500, durationMin: 120, kind: "activity", tags: ["music", "indoor"] },
  cafe: { indoor: true, costPerPerson: 400, durationMin: 60, kind: "food", tags: ["cafe"] },
  vegetarian: { indoor: true, costPerPerson: 350, durationMin: 60, kind: "food", tags: ["veg"] },
};

interface OverpassEl { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

export const osmLabel = () => (OSM_SNAPSHOT.takenAt ? `OpenStreetMap (snapshot ${OSM_SNAPSHOT.takenAt.slice(0, 10)})` : "OpenStreetMap (live)");

/**
 * OSM places near a point. Served from the build-time snapshot (data/ncr/osm.json) because the
 * public Overpass API measured 10–30s per query. Set OSM_LIVE=1 to top up live (5s budget).
 */
export async function searchOsm(lat: number, lng: number, category: string, radiusM = 4000): Promise<{ value: Place[]; hit: boolean }> {
  if (process.env.FORCE_OSM_FAIL === "1") throw new Error("OSM disabled (FORCE_OSM_FAIL)");
  const point = { lat, lng };
  const fromSnapshot = OSM_SNAPSHOT.places
    .filter((p) => p.category === category && haversineKm(point, p) <= radiusM / 1000)
    .sort((a, b) => haversineKm(point, a) - haversineKm(point, b))
    .slice(0, 25)
    .map((p) => ({ ...p, osmHours: undefined }) as Place);
  if (fromSnapshot.length || process.env.OSM_LIVE !== "1") return { value: fromSnapshot, hit: true };
  return searchOsmLive(lat, lng, category, radiusM);
}

async function searchOsmLive(lat: number, lng: number, category: string, radiusM: number) {
  const q = OSM_QUERIES[category];
  if (!q) return { value: [] as Place[], hit: false };
  const key = `osm:${category}:${lat.toFixed(2)}:${lng.toFixed(2)}:${radiusM}`;
  return cached(toolCache, key, 12 * 3600_000, async (): Promise<Place[]> => {
    const body = `[out:json][timeout:8];(${q}(around:${radiusM},${lat},${lng}););out center 25;`;
    const r = await fetchJson<{ elements: OverpassEl[] }>(
      "https://overpass-api.de/api/interpreter",
      { method: "POST", body: `data=${encodeURIComponent(body)}`, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      5000,
    );
    const defaults = OSM_DEFAULTS[category];
    return r.elements
      .map((el): Place | null => {
        const plat = el.lat ?? el.center?.lat;
        const plng = el.lon ?? el.center?.lon;
        const name = el.tags?.name;
        if (!plat || !plng || !name) return null;
        const vegOnly = el.tags?.["diet:vegetarian"] === "only";
        return {
          id: `osm-${el.type[0]}${el.id}`,
          name,
          kind: defaults.kind ?? "activity",
          category,
          area: el.tags?.["addr:suburb"] ?? el.tags?.["addr:city"] ?? "nearby",
          region: "Delhi",
          lat: plat,
          lng: plng,
          indoor: defaults.indoor ?? false,
          costPerPerson: defaults.costPerPerson ?? 0,
          durationMin: defaults.durationMin ?? 60,
          tags: [...(defaults.tags ?? []), "osm"],
          diet: defaults.kind === "food" ? { vegOnly, vegFriendly: vegOnly || el.tags?.["diet:vegetarian"] === "yes" } : undefined,
          note: "From OpenStreetMap — hours, crowd and prices are estimates.",
          source: "osm",
        };
      })
      .filter((p): p is Place => p !== null);
  });
}
