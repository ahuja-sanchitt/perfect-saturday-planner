import type { Locality } from "@/lib/types";

// Delhi NCR gazetteer. Coordinates are neighbourhood centroids (approximate);
// `metro` is the nearest/most useful metro station.
export const LOCALITIES: Locality[] = [
  // Broad regions (used when the user is vague, e.g. "South Delhi")
  { name: "South Delhi", aliases: ["south delhi", "sodel"], region: "Delhi", lat: 28.545, lng: 77.205, metro: "Hauz Khas" },
  { name: "Central Delhi", aliases: ["central delhi", "lutyens", "lutyens delhi"], region: "Delhi", lat: 28.613, lng: 77.215, metro: "Central Secretariat" },
  { name: "North Delhi", aliases: ["north delhi"], region: "Delhi", lat: 28.688, lng: 77.21, metro: "Vishwavidyalaya" },
  { name: "West Delhi", aliases: ["west delhi"], region: "Delhi", lat: 28.642, lng: 77.12, metro: "Rajouri Garden" },
  { name: "East Delhi", aliases: ["east delhi", "trans yamuna"], region: "Delhi", lat: 28.63, lng: 77.295, metro: "Preet Vihar" },
  { name: "Delhi", aliases: ["delhi", "new delhi", "dilli"], region: "Delhi", lat: 28.6139, lng: 77.209, metro: "Rajiv Chowk" },

  // Delhi neighbourhoods
  { name: "Connaught Place", aliases: ["cp", "connaught place", "rajiv chowk", "janpath"], region: "Delhi", lat: 28.6315, lng: 77.2167, metro: "Rajiv Chowk" },
  { name: "Khan Market", aliases: ["khan market"], region: "Delhi", lat: 28.6003, lng: 77.227, metro: "Khan Market" },
  { name: "Lodhi Road", aliases: ["lodhi", "lodhi road", "lodhi colony", "lodi road", "jor bagh"], region: "Delhi", lat: 28.59, lng: 77.225, metro: "JLN Stadium" },
  { name: "Nizamuddin", aliases: ["nizamuddin", "nizamuddin east", "nizamuddin west"], region: "Delhi", lat: 28.59, lng: 77.245, metro: "JLN Stadium" },
  { name: "Defence Colony", aliases: ["defence colony", "def col", "defcol"], region: "Delhi", lat: 28.573, lng: 77.232, metro: "Lajpat Nagar" },
  { name: "Lajpat Nagar", aliases: ["lajpat nagar", "lajpat"], region: "Delhi", lat: 28.5677, lng: 77.2433, metro: "Lajpat Nagar" },
  { name: "Green Park", aliases: ["green park"], region: "Delhi", lat: 28.559, lng: 77.2068, metro: "Green Park" },
  { name: "Hauz Khas", aliases: ["hauz khas", "hkv", "hauz khas village"], region: "Delhi", lat: 28.5494, lng: 77.2001, metro: "Hauz Khas" },
  { name: "Saket", aliases: ["saket", "select citywalk"], region: "Delhi", lat: 28.5245, lng: 77.2066, metro: "Saket" },
  { name: "Malviya Nagar", aliases: ["malviya nagar"], region: "Delhi", lat: 28.5355, lng: 77.21, metro: "Malviya Nagar" },
  { name: "Mehrauli", aliases: ["mehrauli", "qutub", "qutab"], region: "Delhi", lat: 28.5212, lng: 77.182, metro: "Qutab Minar" },
  { name: "Vasant Kunj", aliases: ["vasant kunj", "vk"], region: "Delhi", lat: 28.52, lng: 77.158, metro: "Chhatarpur" },
  { name: "Greater Kailash", aliases: ["gk", "gk1", "gk 1", "gk2", "gk 2", "greater kailash"], region: "Delhi", lat: 28.5482, lng: 77.2386, metro: "Kailash Colony" },
  { name: "Kalkaji", aliases: ["kalkaji", "nehru place"], region: "Delhi", lat: 28.5492, lng: 77.2588, metro: "Kalkaji Mandir" },
  { name: "Chanakyapuri", aliases: ["chanakyapuri", "diplomatic enclave"], region: "Delhi", lat: 28.596, lng: 77.187, metro: "Lok Kalyan Marg" },
  { name: "Karol Bagh", aliases: ["karol bagh"], region: "Delhi", lat: 28.6519, lng: 77.1909, metro: "Karol Bagh" },
  { name: "Rajouri Garden", aliases: ["rajouri", "rajouri garden"], region: "Delhi", lat: 28.6417, lng: 77.12, metro: "Rajouri Garden" },
  { name: "Janakpuri", aliases: ["janakpuri"], region: "Delhi", lat: 28.6219, lng: 77.0878, metro: "Janakpuri West" },
  { name: "Dwarka", aliases: ["dwarka"], region: "Delhi", lat: 28.5921, lng: 77.046, metro: "Dwarka Sector 21" },
  { name: "Old Delhi", aliases: ["old delhi", "chandni chowk", "purani dilli", "jama masjid"], region: "Delhi", lat: 28.6506, lng: 77.2303, metro: "Chandni Chowk" },
  { name: "North Campus", aliases: ["north campus", "du", "kamla nagar", "hudson lane"], region: "Delhi", lat: 28.688, lng: 77.21, metro: "Vishwavidyalaya" },
  { name: "Majnu ka Tilla", aliases: ["majnu ka tilla", "mkt", "majnu ka tila"], region: "Delhi", lat: 28.7016, lng: 77.2273, metro: "Vidhan Sabha" },
  { name: "Mayur Vihar", aliases: ["mayur vihar"], region: "Delhi", lat: 28.6045, lng: 77.294, metro: "Mayur Vihar Phase-1" },
  { name: "Preet Vihar", aliases: ["preet vihar", "laxmi nagar"], region: "Delhi", lat: 28.6417, lng: 77.295, metro: "Preet Vihar" },

  // Gurugram
  { name: "Gurugram", aliases: ["gurugram", "gurgaon", "ggn"], region: "Gurugram", lat: 28.4595, lng: 77.0266, metro: "MG Road" },
  { name: "Cyber City", aliases: ["cyber city", "cyber hub", "cyberhub", "dlf cyber city"], region: "Gurugram", lat: 28.495, lng: 77.089, metro: "Cyber City (Rapid Metro)" },
  { name: "MG Road Gurugram", aliases: ["mg road", "mg road gurgaon", "dlf phase 1", "dlf phase 2"], region: "Gurugram", lat: 28.4795, lng: 77.08, metro: "MG Road" },
  { name: "Golf Course Road", aliases: ["golf course road", "gcr", "dlf phase 5", "sector 54"], region: "Gurugram", lat: 28.45, lng: 77.1, metro: "Sector 54 Chowk (Rapid Metro)" },
  { name: "Sohna Road", aliases: ["sohna road"], region: "Gurugram", lat: 28.42, lng: 77.04, metro: "none nearby (cab)" },
  { name: "Sector 29 Gurugram", aliases: ["sector 29", "leisure valley"], region: "Gurugram", lat: 28.467, lng: 77.065, metro: "IFFCO Chowk" },
  { name: "Galleria / DLF Phase 4", aliases: ["galleria", "dlf phase 4", "dlf phase 3"], region: "Gurugram", lat: 28.4672, lng: 77.082, metro: "Sikanderpur" },

  // Noida / Ghaziabad / Faridabad
  { name: "Noida", aliases: ["noida"], region: "Noida", lat: 28.5355, lng: 77.391, metro: "Noida Sector 18" },
  { name: "Noida Sector 18", aliases: ["sector 18", "noida sector 18", "atta market"], region: "Noida", lat: 28.57, lng: 77.321, metro: "Noida Sector 18" },
  { name: "Noida Sector 62", aliases: ["sector 62", "noida sector 62"], region: "Noida", lat: 28.627, lng: 77.365, metro: "Noida Sector 62" },
  { name: "Greater Noida", aliases: ["greater noida", "gr noida"], region: "Noida", lat: 28.4744, lng: 77.504, metro: "Knowledge Park II" },
  { name: "Indirapuram", aliases: ["indirapuram", "ghaziabad", "vaishali"], region: "Ghaziabad", lat: 28.646, lng: 77.369, metro: "Vaishali" },
  { name: "Faridabad", aliases: ["faridabad"], region: "Faridabad", lat: 28.4089, lng: 77.3178, metro: "Old Faridabad" },
];

// Rough bounding box of the NCR area we support.
export const NCR_BOUNDS = { minLat: 28.3, maxLat: 28.9, minLng: 76.8, maxLng: 77.6 };

export function inNcrBounds(lat: number, lng: number): boolean {
  return lat >= NCR_BOUNDS.minLat && lat <= NCR_BOUNDS.maxLat && lng >= NCR_BOUNDS.minLng && lng <= NCR_BOUNDS.maxLng;
}
