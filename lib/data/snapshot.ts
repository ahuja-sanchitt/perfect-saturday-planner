// Swiggy snapshots (Dineout restaurants + Scenes events), produced locally by
// `npm run ingest:swiggy` using the official Swiggy MCP servers and the developer's own
// Swiggy login. The deployed app only reads these files — no Swiggy calls at runtime.
import dineout from "@/data/ncr/dineout.json";
import events from "@/data/ncr/events.json";
import type { Place } from "@/lib/types";

export interface SnapshotEvent extends Place {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;
  url?: string;
}

export const DINEOUT_SNAPSHOT = dineout as { source: string; takenAt: string | null; places: Place[] };
export const EVENTS_SNAPSHOT = events as unknown as { source: string; takenAt: string | null; events: SnapshotEvent[] };
