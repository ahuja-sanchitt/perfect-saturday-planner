import type { Crowd, OpeningHours, Place, Region } from "@/lib/types";

/*
 * Hand-curated Delhi NCR places. This is the "local knowledge" layer that live APIs
 * don't give us: crowd patterns by time of day, indoor/outdoor, realistic spend, tips.
 *
 * All figures are approximate (entry fees, typical spend per person, hours) and are
 * flagged `verified: false` until a local reviews them. Costs are per person in INR.
 * Restaurant costPerPerson ≈ half of "cost for two".
 */

type C = [Crowd, Crowd, Crowd];
const crowd = ([morning, afternoon, evening]: C) => ({ morning, afternoon, evening });
const hrs = (open: string, close: string, closedDays?: string[]): OpeningHours => ({ open, close, closedDays });

function activity(
  id: string,
  name: string,
  category: string,
  area: string,
  region: Region,
  lat: number,
  lng: number,
  o: { indoor: boolean; cost: number; dur: number; hours: OpeningHours; crowd: C; tags: string[]; note?: string },
): Place {
  return {
    id, name, kind: "activity", category, area, region, lat, lng,
    indoor: o.indoor, costPerPerson: o.cost, durationMin: o.dur, hours: o.hours,
    crowd: crowd(o.crowd), tags: o.tags, note: o.note, source: "curated", verified: false,
  };
}

function food(
  id: string,
  name: string,
  category: string,
  area: string,
  region: Region,
  lat: number,
  lng: number,
  o: { costForTwo: number; vegOnly: boolean; vegFriendly: boolean; jain?: boolean; hours: OpeningHours; crowd: C; tags: string[]; indoor?: boolean; note?: string },
): Place {
  return {
    id, name, kind: "food", category, area, region, lat, lng,
    indoor: o.indoor ?? true, costPerPerson: Math.round(o.costForTwo / 2), durationMin: 60, hours: o.hours,
    crowd: crowd(o.crowd), diet: { vegOnly: o.vegOnly, vegFriendly: o.vegFriendly, jainOptions: o.jain },
    tags: o.tags, note: o.note, source: "curated", verified: false,
  };
}

export const CURATED_PLACES: Place[] = [
  // ---------------- Central & South Delhi: gardens, heritage, walks ----------------
  activity("sunder-nursery", "Sunder Nursery", "park", "Nizamuddin", "Delhi", 28.5933, 77.2425, {
    indoor: false, cost: 50, dur: 75, hours: hrs("07:00", "19:00"), crowd: ["low", "medium", "high"],
    tags: ["walks", "nature", "heritage", "photography", "calm", "low-effort"],
    note: "Mughal-era tombs inside a landscaped garden; flat paths and benches. Quietest before noon.",
  }),
  activity("lodhi-garden", "Lodhi Garden", "park", "Lodhi Road", "Delhi", 28.5931, 77.2197, {
    indoor: false, cost: 0, dur: 60, hours: hrs("06:00", "20:00"), crowd: ["medium", "low", "medium"],
    tags: ["walks", "nature", "heritage", "free", "calm", "low-effort"],
    note: "Free, big enough to never feel crowded. Morning walkers clear out by 10.",
  }),
  activity("lodhi-art-district", "Lodhi Art District street murals", "walk", "Lodhi Colony", "Delhi", 28.5845, 77.2266, {
    indoor: false, cost: 0, dur: 45, hours: hrs("07:00", "19:00"), crowd: ["low", "low", "low"],
    tags: ["walks", "art", "photography", "free", "offbeat"],
    note: "Open-air murals across Lodhi Colony blocks; self-guided, shaded lanes.",
  }),
  activity("humayuns-tomb", "Humayun's Tomb", "heritage", "Nizamuddin", "Delhi", 28.5933, 77.2507, {
    indoor: false, cost: 40, dur: 60, hours: hrs("06:00", "18:00"), crowd: ["medium", "high", "high"],
    tags: ["heritage", "history", "photography", "walks"],
    note: "UNESCO site; tour groups peak late morning to afternoon on weekends.",
  }),
  activity("purana-qila", "Purana Qila", "heritage", "Pragati Maidan", "Delhi", 28.6096, 77.2437, {
    indoor: false, cost: 30, dur: 60, hours: hrs("07:00", "17:00"), crowd: ["low", "medium", "medium"],
    tags: ["heritage", "history", "walks", "calm"],
    note: "Old fort ramparts with good views; far less crowded than Red Fort.",
  }),
  activity("mehrauli-arch-park", "Mehrauli Archaeological Park", "heritage", "Mehrauli", "Delhi", 28.5195, 77.188, {
    indoor: false, cost: 0, dur: 75, hours: hrs("06:00", "18:00"), crowd: ["low", "low", "low"],
    tags: ["heritage", "walks", "nature", "free", "offbeat", "calm"],
    note: "100+ ruins in a scrub forest; feels empty even on Saturdays. Uneven trails.",
  }),
  activity("qutub-minar", "Qutub Minar", "heritage", "Mehrauli", "Delhi", 28.5245, 77.1855, {
    indoor: false, cost: 40, dur: 60, hours: hrs("07:00", "21:00"), crowd: ["medium", "high", "high"],
    tags: ["heritage", "history", "photography"],
    note: "Iconic but busy on weekends; go right at opening.",
  }),
  activity("hauz-khas-deer-park", "Hauz Khas lake & Deer Park", "park", "Hauz Khas", "Delhi", 28.5535, 77.194, {
    indoor: false, cost: 0, dur: 60, hours: hrs("06:00", "19:00"), crowd: ["low", "medium", "high"],
    tags: ["walks", "nature", "lake", "free", "heritage"],
    note: "Lake, deer enclosure and the Hauz Khas complex ruins. Evenings get crowded.",
  }),
  activity("sanjay-van", "Sanjay Van", "park", "Vasant Kunj", "Delhi", 28.5375, 77.1705, {
    indoor: false, cost: 0, dur: 75, hours: hrs("06:00", "18:00"), crowd: ["low", "low", "low"],
    tags: ["walks", "nature", "free", "offbeat", "calm"],
    note: "Dense urban forest with dirt trails; go with company, not after dusk.",
  }),
  activity("garden-five-senses", "Garden of Five Senses", "park", "Saidulajab", "Delhi", 28.5133, 77.1983, {
    indoor: false, cost: 35, dur: 60, hours: hrs("09:00", "19:00"), crowd: ["low", "medium", "high"],
    tags: ["walks", "nature", "photography"],
    note: "Landscaped garden; popular with couples by late afternoon.",
  }),
  activity("nehru-park", "Nehru Park", "park", "Chanakyapuri", "Delhi", 28.5843, 77.1888, {
    indoor: false, cost: 0, dur: 60, hours: hrs("06:00", "20:00"), crowd: ["medium", "low", "medium"],
    tags: ["walks", "nature", "free", "calm", "music"],
    note: "Large lawns; occasionally hosts free 'Music in the Park' concerts.",
  }),
  activity("agrasen-ki-baoli", "Agrasen ki Baoli", "heritage", "Connaught Place", "Delhi", 28.6262, 77.225, {
    indoor: false, cost: 0, dur: 30, hours: hrs("07:00", "18:00"), crowd: ["medium", "high", "high"],
    tags: ["heritage", "photography", "free"],
    note: "Stepwell near CP; short visit, Instagram-busy in afternoons.",
  }),
  activity("india-gate", "Kartavya Path & India Gate", "landmark", "Central Delhi", "Delhi", 28.6129, 77.2295, {
    indoor: false, cost: 0, dur: 45, hours: hrs("06:00", "22:00"), crowd: ["low", "medium", "high"],
    tags: ["walks", "free", "landmark"],
    note: "Pleasant mornings; very crowded on weekend evenings.",
  }),

  // ---------------- Museums, galleries, culture (indoor) ----------------
  activity("knma-saket", "Kiran Nadar Museum of Art", "museum", "Saket", "Delhi", 28.5286, 77.2196, {
    indoor: true, cost: 0, dur: 75, hours: hrs("10:30", "18:30", ["Mon"]), crowd: ["low", "low", "low"],
    tags: ["art", "museum", "free", "calm", "indoor", "low-effort"],
    note: "Free modern & contemporary art inside DLF South Court mall; air-conditioned and quiet.",
  }),
  activity("national-museum", "National Museum", "museum", "Janpath", "Delhi", 28.6117, 77.2195, {
    indoor: true, cost: 20, dur: 90, hours: hrs("10:00", "18:00", ["Mon"]), crowd: ["low", "low", "low"],
    tags: ["history", "museum", "indoor", "calm"],
    note: "Huge collection; pick two galleries rather than trying to see it all.",
  }),
  activity("ngma", "National Gallery of Modern Art", "museum", "India Gate", "Delhi", 28.6105, 77.2347, {
    indoor: true, cost: 20, dur: 75, hours: hrs("10:00", "17:30", ["Mon"]), crowd: ["low", "low", "low"],
    tags: ["art", "museum", "indoor", "calm"],
    note: "Jaipur House galleries; usually near-empty.",
  }),
  activity("crafts-museum", "National Crafts Museum", "museum", "Pragati Maidan", "Delhi", 28.6142, 77.2425, {
    indoor: true, cost: 20, dur: 60, hours: hrs("10:00", "18:00", ["Mon"]), crowd: ["low", "low", "low"],
    tags: ["art", "crafts", "museum", "indoor", "calm"],
    note: "Village-style complex with artisans; Café Lota is right next door.",
  }),
  activity("triveni-kala-sangam", "Triveni Kala Sangam", "gallery", "Mandi House", "Delhi", 28.6236, 77.2335, {
    indoor: true, cost: 0, dur: 60, hours: hrs("10:00", "20:00", ["Sun"]), crowd: ["low", "low", "low"],
    tags: ["art", "music", "free", "indoor", "calm"],
    note: "Free galleries and an amphitheatre; check notice board for weekend performances.",
  }),
  activity("ihc", "India Habitat Centre", "cultural-centre", "Lodhi Road", "Delhi", 28.5891, 77.2257, {
    indoor: true, cost: 0, dur: 60, hours: hrs("10:00", "20:00"), crowd: ["low", "low", "medium"],
    tags: ["art", "music", "events", "free", "indoor", "calm"],
    note: "Free exhibitions most days; evening talks/concerts (some need passes).",
  }),

  // ---------------- Food-led neighbourhoods ----------------
  activity("champa-gali", "Champa Gali", "cafe-lane", "Saidulajab", "Delhi", 28.518, 77.196, {
    indoor: false, cost: 0, dur: 60, hours: hrs("11:00", "23:00"), crowd: ["low", "medium", "high"],
    tags: ["food", "cafes", "art", "music", "photography"],
    note: "Lane of indie cafés and craft stores; some cafés host live acoustic sets at night.",
  }),
  activity("majnu-ka-tilla", "Majnu ka Tilla (Tibetan colony)", "neighbourhood", "Majnu ka Tilla", "Delhi", 28.7016, 77.2273, {
    indoor: false, cost: 0, dur: 75, hours: hrs("10:00", "21:00"), crowd: ["medium", "high", "high"],
    tags: ["food", "culture", "shopping", "walks"],
    note: "Narrow lanes, momos and laphing; tight spaces get packed by afternoon.",
  }),
  activity("dilli-haat-ina", "Dilli Haat INA", "market", "INA", "Delhi", 28.5733, 77.2079, {
    indoor: false, cost: 30, dur: 90, hours: hrs("10:30", "22:00"), crowd: ["low", "high", "high"],
    tags: ["food", "shopping", "crafts", "culture"],
    note: "State food stalls + handicrafts; weekend afternoons are busy.",
  }),
  activity("old-delhi-food-walk", "Old Delhi food walk (Chandni Chowk)", "food-walk", "Old Delhi", "Delhi", 28.6506, 77.2303, {
    indoor: false, cost: 300, dur: 120, hours: hrs("09:00", "21:00"), crowd: ["high", "high", "high"],
    tags: ["food", "heritage", "walks", "street-food"],
    note: "Paranthe Wali Gali, jalebis, chaat. Always crowded; not for crowd-averse users.",
  }),

  // ---------------- Music / evening ----------------
  activity("piano-man-safdarjung", "The Piano Man Jazz Club", "music", "Safdarjung Enclave", "Delhi", 28.5626, 77.196, {
    indoor: true, cost: 900, dur: 120, hours: hrs("19:00", "23:30"), crowd: ["low", "low", "high"],
    tags: ["music", "live-music", "jazz", "indoor", "evening"],
    note: "Live jazz most nights; book a table on weekends. Evening only.",
  }),

  // ---------------- Gurugram ----------------
  activity("aravalli-biodiversity-park", "Aravalli Biodiversity Park", "park", "DLF Phase 3", "Gurugram", 28.488, 77.105, {
    indoor: false, cost: 0, dur: 75, hours: hrs("06:00", "18:00"), crowd: ["medium", "low", "low"],
    tags: ["walks", "nature", "free", "calm"],
    note: "Restored scrub forest with walking trails; little shade after 11.",
  }),
  activity("cyber-hub", "DLF Cyber Hub", "food-hub", "Cyber City", "Gurugram", 28.495, 77.089, {
    indoor: false, cost: 0, dur: 60, hours: hrs("11:00", "23:30"), crowd: ["low", "medium", "high"],
    tags: ["food", "music", "nightlife", "cafes"],
    note: "Dozens of restaurants in one walkable block; gets loud after 7pm.",
  }),
  activity("museo-camera", "Museo Camera", "museum", "DLF Phase 1", "Gurugram", 28.4718, 77.1003, {
    indoor: true, cost: 300, dur: 75, hours: hrs("11:00", "19:00", ["Mon"]), crowd: ["low", "low", "low"],
    tags: ["photography", "museum", "art", "indoor", "calm"],
    note: "Museum of photography and vintage cameras; quiet even on weekends.",
  }),
  activity("leisure-valley-park", "Leisure Valley Park", "park", "Sector 29", "Gurugram", 28.4675, 77.0663, {
    indoor: false, cost: 0, dur: 45, hours: hrs("06:00", "20:00"), crowd: ["medium", "low", "medium"],
    tags: ["walks", "nature", "free", "low-effort"],
    note: "Long green strip for an easy walk near Sector 29's food street.",
  }),
  activity("sultanpur-np", "Sultanpur National Park", "park", "Sultanpur", "Gurugram", 28.46, 76.893, {
    indoor: false, cost: 10, dur: 120, hours: hrs("07:00", "16:30"), crowd: ["low", "low", "low"],
    tags: ["nature", "birds", "walks", "offbeat"],
    note: "Bird sanctuary ~45 min from central Gurugram; best early morning in winter.",
  }),

  // ---------------- Noida ----------------
  activity("okhla-bird-sanctuary", "Okhla Bird Sanctuary", "park", "Noida Sector 95", "Noida", 28.5639, 77.3023, {
    indoor: false, cost: 30, dur: 75, hours: hrs("07:00", "17:30"), crowd: ["low", "low", "low"],
    tags: ["nature", "birds", "walks", "calm"],
    note: "Wetland trail on the Yamuna; bring binoculars in winter.",
  }),
  activity("noida-botanical-garden", "Noida Botanical Garden", "park", "Noida Sector 38A", "Noida", 28.564, 77.341, {
    indoor: false, cost: 20, dur: 60, hours: hrs("08:00", "17:00"), crowd: ["low", "low", "medium"],
    tags: ["nature", "walks", "calm", "low-effort"],
    note: "Quiet green escape next to the Botanical Garden metro.",
  }),

  // ---------------- Restaurants & cafés ----------------
  food("sagar-ratna-defcol", "Sagar Ratna", "south-indian", "Defence Colony", "Delhi", 28.5743, 77.2337, {
    costForTwo: 800, vegOnly: true, vegFriendly: true, jain: true, hours: hrs("08:00", "23:00"), crowd: ["low", "medium", "medium"],
    tags: ["veg", "south-indian", "budget", "quick"], note: "Pure veg; quieter before 12:30.",
  }),
  food("saravana-bhavan-cp", "Saravana Bhavan", "south-indian", "Connaught Place", "Delhi", 28.6287, 77.219, {
    costForTwo: 700, vegOnly: true, vegFriendly: true, jain: true, hours: hrs("08:00", "22:30"), crowd: ["medium", "high", "high"],
    tags: ["veg", "south-indian", "budget"], note: "Pure veg; weekend lunch queues are common.",
  }),
  food("naivedyam-hkv", "Naivedyam", "south-indian", "Hauz Khas", "Delhi", 28.5537, 77.1942, {
    costForTwo: 800, vegOnly: true, vegFriendly: true, hours: hrs("11:00", "23:00"), crowd: ["low", "medium", "medium"],
    tags: ["veg", "south-indian", "calm"], note: "Pure veg, temple-style décor, rarely packed.",
  }),
  food("indian-coffee-house-cp", "Indian Coffee House", "cafe", "Connaught Place", "Delhi", 28.6337, 77.2177, {
    costForTwo: 300, vegOnly: false, vegFriendly: true, hours: hrs("09:00", "21:00"), crowd: ["low", "medium", "low"],
    tags: ["cafe", "budget", "nostalgic", "coffee"], note: "Old-school rooftop coffee house on Mohan Singh Place; very cheap.",
  }),
  food("cafe-lota", "Café Lota", "modern-indian", "Pragati Maidan", "Delhi", 28.6143, 77.2421, {
    costForTwo: 1200, vegOnly: false, vegFriendly: true, hours: hrs("08:00", "21:30"), crowd: ["low", "medium", "medium"],
    tags: ["cafe", "modern-indian", "calm", "outdoor-seating"], indoor: false, note: "Courtyard café at the Crafts Museum; good veg regional dishes.",
  }),
  food("triveni-terrace-cafe", "Triveni Terrace Café", "cafe", "Mandi House", "Delhi", 28.6236, 77.2335, {
    costForTwo: 500, vegOnly: false, vegFriendly: true, hours: hrs("10:00", "19:30", ["Sun"]), crowd: ["low", "medium", "low"],
    tags: ["cafe", "budget", "calm", "art"], note: "Simple café overlooking Triveni's amphitheatre.",
  }),
  food("big-chill-khan", "Big Chill Café", "cafe", "Khan Market", "Delhi", 28.6002, 77.227, {
    costForTwo: 1800, vegOnly: false, vegFriendly: true, hours: hrs("12:00", "23:30"), crowd: ["low", "high", "high"],
    tags: ["cafe", "desserts", "italian"], note: "Popular; weekend waits of 20–40 min.",
  }),
  food("burma-burma-saket", "Burma Burma", "burmese", "Saket", "Delhi", 28.5287, 77.2191, {
    costForTwo: 1800, vegOnly: true, vegFriendly: true, jain: true, hours: hrs("12:00", "23:00"), crowd: ["low", "medium", "high"],
    tags: ["veg", "burmese", "tea", "calm"], note: "Pure-veg Burmese at Select Citywalk; walkable to KNMA.",
  }),
  food("burma-burma-cyberhub", "Burma Burma", "burmese", "Cyber City", "Gurugram", 28.4952, 77.0888, {
    costForTwo: 1800, vegOnly: true, vegFriendly: true, jain: true, hours: hrs("12:00", "23:00"), crowd: ["low", "medium", "high"],
    tags: ["veg", "burmese", "tea"], note: "Pure-veg Burmese at Cyber Hub.",
  }),
  food("jugmug-thela", "Jugmug Thela", "cafe", "Champa Gali", "Delhi", 28.5181, 77.1961, {
    costForTwo: 800, vegOnly: false, vegFriendly: true, hours: hrs("11:00", "23:00"), crowd: ["low", "medium", "high"],
    tags: ["cafe", "tea", "calm", "music"], note: "Tea-and-snacks café in Champa Gali.",
  }),
  food("rose-cafe", "Rose Café", "cafe", "Saidulajab", "Delhi", 28.5175, 77.1965, {
    costForTwo: 1200, vegOnly: false, vegFriendly: true, hours: hrs("10:00", "22:00"), crowd: ["low", "medium", "medium"],
    tags: ["cafe", "brunch", "calm"], note: "Pastel brunch café; relaxed on Saturday mornings.",
  }),
  food("grammar-room", "The Grammar Room", "cafe", "Mehrauli", "Delhi", 28.524, 77.184, {
    costForTwo: 2000, vegOnly: false, vegFriendly: true, hours: hrs("09:00", "23:00"), crowd: ["low", "medium", "medium"],
    tags: ["cafe", "brunch", "view"], note: "Brunch spot with Qutub views at One Style Mile.",
  }),
  food("ama-cafe-mkt", "Ama Café", "cafe", "Majnu ka Tilla", "Delhi", 28.702, 77.227, {
    costForTwo: 700, vegOnly: false, vegFriendly: true, hours: hrs("08:00", "21:30"), crowd: ["medium", "high", "high"],
    tags: ["cafe", "tibetan", "desserts"], note: "Cosy Tibetan café; small, fills up fast.",
  }),
  food("haldirams-lajpat", "Haldiram's", "north-indian", "Lajpat Nagar", "Delhi", 28.5677, 77.2433, {
    costForTwo: 600, vegOnly: true, vegFriendly: true, jain: true, hours: hrs("08:00", "23:00"), crowd: ["medium", "high", "high"],
    tags: ["veg", "budget", "chaat", "quick"], note: "Pure veg; fast but busy.",
  }),
  food("haldirams-noida18", "Haldiram's", "north-indian", "Noida Sector 18", "Noida", 28.57, 77.3215, {
    costForTwo: 600, vegOnly: true, vegFriendly: true, jain: true, hours: hrs("08:00", "23:00"), crowd: ["medium", "high", "high"],
    tags: ["veg", "budget", "chaat", "quick"], note: "Pure veg near Sector 18 metro.",
  }),
  food("diggin-anandlok", "Diggin", "italian", "Anand Lok", "Delhi", 28.5588, 77.212, {
    costForTwo: 1800, vegOnly: false, vegFriendly: true, hours: hrs("12:00", "23:00"), crowd: ["low", "high", "high"],
    tags: ["italian", "garden-seating", "cafe"], indoor: false, note: "Garden café; weekend afternoons are busy.",
  }),
  food("cafe-delhi-heights-cyberhub", "Cafe Delhi Heights", "multi-cuisine", "Cyber City", "Gurugram", 28.4948, 77.0893, {
    costForTwo: 1800, vegOnly: false, vegFriendly: true, hours: hrs("09:00", "23:30"), crowd: ["low", "medium", "high"],
    tags: ["multi-cuisine", "brunch"], note: "Large menu, good for groups.",
  }),
];
