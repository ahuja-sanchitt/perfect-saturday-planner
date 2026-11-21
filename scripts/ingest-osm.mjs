// Build-time OpenStreetMap snapshot for Delhi NCR.
// Why: the public Overpass API takes 10–30s per query (measured) — too slow for a live request,
// so we pull real OSM places once and ship them. Live Overpass stays as an optional top-up.
// Usage: node scripts/ingest-osm.mjs
import { writeFileSync } from "node:fs";

const BBOX = "28.38,76.95,28.75,77.45"; // south,west,north,east (Delhi + Gurugram + Noida core)
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

const CATEGORIES = {
  park: { q: `nwr["leisure"="park"]["name"]["name"!~"^(Park|DDA Park)$"]`, kind: "activity", indoor: false, cost: 0, dur: 60, tags: ["walks", "nature"] },
  museum: { q: `nwr["tourism"="museum"]["name"]`, kind: "activity", indoor: true, cost: 50, dur: 75, tags: ["museum", "history", "indoor"] },
  gallery: { q: `nwr["tourism"="gallery"]["name"]`, kind: "activity", indoor: true, cost: 0, dur: 45, tags: ["art", "indoor"] },
  heritage: { q: `nwr["historic"~"monument|ruins|archaeological_site|fort|tomb"]["name"]`, kind: "activity", indoor: false, cost: 25, dur: 45, tags: ["heritage", "history", "walks"] },
  music: { q: `nwr["amenity"~"music_venue|theatre|arts_centre"]["name"]`, kind: "activity", indoor: true, cost: 500, dur: 120, tags: ["music", "culture", "indoor"] },
  vegetarian: { q: `nwr["amenity"~"restaurant|cafe"]["diet:vegetarian"~"yes|only"]["name"]`, kind: "food", indoor: true, cost: 350, dur: 60, tags: ["veg"] },
  cafe: { q: `nwr["amenity"="cafe"]["name"]["cuisine"!~"coffee_shop"]`, kind: "food", indoor: true, cost: 400, dur: 60, tags: ["cafe"] },
};

async function query(body) {
  let lastErr;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body: `data=${encodeURIComponent(body)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PerfectSaturdayPlanner/1.0 (ingest)" },
        signal: AbortSignal.timeout(180_000),
      });
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      console.warn(`  ${url} failed: ${e.message}`);
    }
  }
  throw lastErr;
}

const region = (lat, lng) => (lng < 77.13 && lat < 28.52 ? "Gurugram" : lng > 77.3 && lat < 28.64 ? "Noida" : "Delhi");

const places = [];
for (const [cat, c] of Object.entries(CATEGORIES)) {
  process.stdout.write(`Fetching ${cat}… `);
  try {
    const json = await query(`[out:json][timeout:170];(${c.q}(${BBOX}););out center;`);
    const seen = new Set();
    let n = 0;
    for (const el of json.elements) {
      const lat = el.lat ?? el.center?.lat, lng = el.lon ?? el.center?.lon, name = el.tags?.name;
      if (!lat || !lng || !name) continue;
      const key = `${name.toLowerCase()}|${lat.toFixed(3)}|${lng.toFixed(3)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const t = el.tags;
      const vegOnly = t["diet:vegetarian"] === "only";
      places.push({
        id: `osm-${el.type[0]}${el.id}`,
        name,
        kind: c.kind,
        category: cat,
        area: t["addr:suburb"] || t["addr:neighbourhood"] || t["addr:city"] || "",
        region: region(lat, lng),
        lat: +lat.toFixed(5),
        lng: +lng.toFixed(5),
        indoor: c.indoor,
        costPerPerson: c.cost,
        durationMin: c.dur,
        tags: [...c.tags, "osm"],
        ...(c.kind === "food" ? { diet: { vegOnly, vegFriendly: vegOnly || t["diet:vegetarian"] === "yes" } } : {}),
        ...(t.opening_hours ? { osmHours: t.opening_hours } : {}),
        note: "From OpenStreetMap — crowd levels and prices are estimates.",
        source: "osm",
      });
      n++;
    }
    console.log(`${n}`);
  } catch (e) {
    console.log(`FAILED (${e.message})`);
  }
}

writeFileSync(new URL("../data/ncr/osm.json", import.meta.url), JSON.stringify({ source: "openstreetmap-overpass", takenAt: new Date().toISOString(), bbox: BBOX, places }, null, 0));
console.log(`Wrote ${places.length} places to data/ncr/osm.json`);
