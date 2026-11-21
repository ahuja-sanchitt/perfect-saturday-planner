import type { Crowd, Place, Region } from "@/lib/types";

/*
 * SAMPLE (MOCK) VENUES — FICTIONAL.
 * These names are invented to fill coverage gaps (live music, cafés, workshops in Gurugram/Noida)
 * so the planner has realistic variety while real data sources are being added (Swiggy snapshot,
 * more curated places). They are always tagged `source: "mock"` and shown in the UI with a
 * "Sample data" badge so they are never mistaken for real businesses.
 */

type Row = [
  id: string,
  name: string,
  kind: "activity" | "food",
  category: string,
  area: string,
  region: Region,
  lat: number,
  lng: number,
  indoor: boolean,
  costPerPerson: number,
  durationMin: number,
  open: string,
  close: string,
  crowd: [Crowd, Crowd, Crowd],
  tags: string[],
  diet?: "veg-only" | "veg-friendly" | "non-veg",
];

const ROWS: Row[] = [
  // ---- Live music (Delhi) ----
  ["mock-banyan-sessions", "Banyan Sessions", "activity", "music", "Shahpur Jat", "Delhi", 28.5505, 77.2095, true, 600, 120, "17:00", "23:30", ["low", "low", "medium"], ["music", "live-music", "acoustic", "indoor", "evening", "calm"]],
  ["mock-teen-taal-courtyard", "Teen Taal Courtyard", "activity", "music", "Mehrauli", "Delhi", 28.5228, 77.1838, false, 500, 120, "16:00", "22:00", ["low", "low", "medium"], ["music", "live-music", "classical", "heritage", "evening"]],
  ["mock-vinyl-room-gk", "The Vinyl Room", "activity", "music", "Greater Kailash", "Delhi", 28.5475, 77.2375, true, 450, 90, "13:00", "23:00", ["low", "low", "medium"], ["music", "records", "indoor", "calm", "cafes"]],
  ["mock-open-mic-hkv", "Lakeview Open Mic", "activity", "music", "Hauz Khas", "Delhi", 28.5528, 77.1938, true, 300, 120, "15:00", "21:00", ["low", "medium", "high"], ["music", "comedy", "poetry", "indoor"]],
  // ---- Live music (Gurugram / Noida) ----
  ["mock-aravalli-unplugged", "Aravalli Unplugged", "activity", "music", "Golf Course Road", "Gurugram", 28.4525, 77.0985, true, 700, 120, "16:00", "23:30", ["low", "low", "medium"], ["music", "live-music", "acoustic", "indoor", "evening"]],
  ["mock-sector29-jam", "Sector 29 Jam House", "activity", "music", "Sector 29", "Gurugram", 28.4682, 77.0655, true, 600, 120, "17:00", "23:59", ["low", "low", "high"], ["music", "live-music", "rock", "nightlife", "indoor"]],
  ["mock-terrace-strings", "Terrace Strings", "activity", "music", "Cyber City", "Gurugram", 28.4945, 77.0905, false, 800, 120, "17:30", "23:30", ["low", "low", "medium"], ["music", "live-music", "rooftop", "evening"]],
  ["mock-riverbank-notes", "Riverbank Notes", "activity", "music", "Noida Sector 18", "Noida", 28.5695, 77.3235, true, 500, 120, "16:00", "23:00", ["low", "low", "medium"], ["music", "live-music", "acoustic", "indoor", "evening"]],
  ["mock-sitar-and-chai", "Sitar & Chai", "activity", "music", "Noida Sector 62", "Noida", 28.6262, 77.3672, true, 350, 90, "11:00", "21:00", ["low", "low", "low"], ["music", "classical", "calm", "indoor", "cafes"]],
  // ---- Workshops & indoor activities ----
  ["mock-clayhouse-pottery", "Clayhouse Pottery Studio", "activity", "workshop", "Chhatarpur", "Delhi", 28.503, 77.182, true, 1200, 120, "10:00", "19:00", ["low", "low", "low"], ["art", "crafts", "workshop", "indoor", "calm", "hands-on"]],
  ["mock-inkpot-calligraphy", "Inkpot Calligraphy Class", "activity", "workshop", "Lajpat Nagar", "Delhi", 28.569, 77.2425, true, 800, 90, "11:00", "18:00", ["low", "low", "low"], ["art", "workshop", "indoor", "calm"]],
  ["mock-boardgame-den-ggn", "Meeple Den Board Game Café", "activity", "games", "DLF Phase 4", "Gurugram", 28.4665, 77.0835, true, 400, 120, "12:00", "23:00", ["low", "medium", "high"], ["games", "cafes", "indoor", "social", "low-effort"]],
  ["mock-boardgame-den-noida", "Dice & Dosa Game Café", "activity", "games", "Noida Sector 18", "Noida", 28.5712, 77.3205, true, 350, 120, "12:00", "22:30", ["low", "medium", "high"], ["games", "cafes", "indoor", "social", "low-effort"]],
  ["mock-paint-jam-ggn", "Canvas & Kulhad Paint Jam", "activity", "workshop", "Golf Course Road", "Gurugram", 28.4485, 77.1012, true, 900, 120, "11:00", "20:00", ["low", "low", "medium"], ["art", "workshop", "indoor", "social"]],
  ["mock-book-nook-noida", "Second Chapter Book Nook", "activity", "bookshop", "Noida Sector 62", "Noida", 28.6255, 77.3642, true, 0, 45, "10:00", "21:00", ["low", "low", "low"], ["books", "indoor", "calm", "free"]],
  ["mock-book-nook-ggn", "Paperboat Books & Brews", "activity", "bookshop", "MG Road Gurugram", "Gurugram", 28.4801, 77.0812, true, 0, 45, "10:00", "21:00", ["low", "low", "medium"], ["books", "indoor", "calm", "cafes"]],
  ["mock-yoga-park-noida", "Sunrise Yoga in the Park", "activity", "wellness", "Noida Sector 38A", "Noida", 28.5655, 77.3395, false, 200, 60, "07:00", "10:00", ["low", "low", "low"], ["wellness", "nature", "calm", "low-effort"]],
  ["mock-heritage-walk-ggn", "Old Gurgaon Heritage Walk", "activity", "walk", "Sadar Bazaar", "Gurugram", 28.4645, 77.0302, false, 300, 90, "08:00", "12:00", ["low", "medium", "high"], ["walks", "heritage", "history", "guided"]],
  ["mock-art-gallery-noida", "Gallery Yamuna", "activity", "gallery", "Noida Sector 50", "Noida", 28.5705, 77.3605, true, 0, 45, "11:00", "19:00", ["low", "low", "low"], ["art", "indoor", "calm", "free"]],
  ["mock-stargazing-ggn", "Aravalli Stargazing Meetup", "activity", "nature", "Sohna Road", "Gurugram", 28.4205, 77.0412, false, 500, 120, "18:30", "22:30", ["low", "low", "low"], ["nature", "science", "evening", "offbeat"]],

  // ---- Food (Delhi) ----
  ["mock-tulsi-thali-house", "Tulsi Thali House", "food", "thali", "Karol Bagh", "Delhi", 28.6515, 77.1902, true, 350, 60, "11:30", "22:30", ["low", "medium", "medium"], ["veg", "thali", "budget"], "veg-only"],
  ["mock-kikar-cafe", "Kikar Tree Café", "food", "cafe", "Malviya Nagar", "Delhi", 28.5362, 77.2112, false, 450, 60, "09:00", "22:00", ["low", "low", "medium"], ["cafe", "garden-seating", "calm"], "veg-friendly"],
  ["mock-dosa-dabba", "Dosa Dabba", "food", "south-indian", "North Campus", "Delhi", 28.6875, 77.2095, true, 150, 45, "08:00", "22:00", ["low", "medium", "medium"], ["veg", "budget", "student", "quick"], "veg-only"],
  ["mock-vegan-greenhouse", "The Greenhouse (Vegan)", "food", "vegan", "Khan Market", "Delhi", 28.6008, 77.2264, true, 700, 60, "10:00", "22:30", ["low", "medium", "medium"], ["vegan", "veg", "healthy", "calm"], "veg-only"],
  // ---- Food (Gurugram) ----
  ["mock-chaupal-ggn", "Chaupal Veg Kitchen", "food", "north-indian", "Sector 29", "Gurugram", 28.4676, 77.0648, true, 450, 60, "11:00", "23:00", ["low", "medium", "high"], ["veg", "north-indian", "family"], "veg-only"],
  ["mock-filter-kaapi-ggn", "Filter Kaapi Co.", "food", "cafe", "Golf Course Road", "Gurugram", 28.4512, 77.0995, true, 350, 45, "08:00", "21:00", ["low", "low", "medium"], ["cafe", "coffee", "south-indian", "calm"], "veg-only"],
  ["mock-rooftop-ggn", "Skyline Tandoor Rooftop", "food", "north-indian", "MG Road Gurugram", "Gurugram", 28.4795, 77.0795, false, 900, 75, "12:00", "23:59", ["low", "medium", "high"], ["rooftop", "music", "date"], "veg-friendly"],
  ["mock-jain-bhojanalaya-ggn", "Shanti Jain Bhojanalaya", "food", "thali", "Sohna Road", "Gurugram", 28.4212, 77.0425, true, 300, 45, "11:00", "22:00", ["low", "medium", "low"], ["veg", "jain", "thali", "budget"], "veg-only"],
  // ---- Food (Noida) ----
  ["mock-annapurna-noida", "Annapurna Thali", "food", "thali", "Noida Sector 18", "Noida", 28.5702, 77.3228, true, 350, 60, "11:00", "22:30", ["low", "medium", "high"], ["veg", "thali", "jain", "budget"], "veg-only"],
  ["mock-brew-and-bites-noida", "Brew & Bites", "food", "cafe", "Noida Sector 62", "Noida", 28.6268, 77.3658, true, 400, 60, "09:00", "22:00", ["low", "low", "medium"], ["cafe", "coffee", "calm"], "veg-friendly"],
  ["mock-garden-dhaba-noida", "Botanical Garden Dhaba", "food", "north-indian", "Noida Sector 38A", "Noida", 28.5648, 77.3402, false, 300, 60, "11:00", "23:00", ["low", "medium", "medium"], ["veg", "budget", "outdoor-seating"], "veg-only"],
  ["mock-momo-point-noida", "Himalayan Momo Point", "food", "tibetan", "Noida Sector 50", "Noida", 28.5698, 77.3612, true, 250, 45, "12:00", "22:30", ["low", "medium", "medium"], ["momos", "budget", "quick"], "veg-friendly"],
];

export const MOCK_PLACES: Place[] = ROWS.map(([id, name, kind, category, area, region, lat, lng, indoor, cost, dur, open, close, crowd, tags, diet]) => ({
  id,
  name,
  kind,
  category,
  area,
  region,
  lat,
  lng,
  indoor,
  costPerPerson: cost,
  durationMin: dur,
  hours: { open, close },
  crowd: { morning: crowd[0], afternoon: crowd[1], evening: crowd[2] },
  ...(kind === "food" ? { diet: { vegOnly: diet === "veg-only", vegFriendly: diet !== "non-veg", jainOptions: tags.includes("jain") } } : {}),
  tags,
  note: "Sample venue (fictional) — included to demo coverage; not a real business.",
  source: "mock" as const,
}));
