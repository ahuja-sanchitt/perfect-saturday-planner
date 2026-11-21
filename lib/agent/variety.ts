// Variety: stop the same few places from winning every plan.
// 1) Recency penalty: places that made it into recent plans are down-ranked (decays over ~2h).
// 2) Light jitter: near-equal candidates are shuffled so repeat requests see fresh options.
const g = globalThis as unknown as { __recentPicks?: Map<string, { count: number; at: number }> };
const recent = (g.__recentPicks ??= new Map());
const DECAY_MS = 2 * 3600_000;

export function recordPicks(placeIds: string[]) {
  const now = Date.now();
  for (const id of placeIds) {
    const e = recent.get(id);
    const decayed = e ? e.count * Math.max(0, 1 - (now - e.at) / DECAY_MS) : 0;
    recent.set(id, { count: decayed + 1, at: now });
  }
}

export function recencyPenalty(id: string): number {
  const e = recent.get(id);
  if (!e) return 0;
  const decayed = e.count * Math.max(0, 1 - (Date.now() - e.at) / DECAY_MS);
  return Math.min(2.5, decayed * 0.8);
}

/** Small random spread so ties don't always resolve the same way. Disabled in evals for repeatability. */
export function jitter(): number {
  return process.env.DISABLE_JITTER === "1" ? 0 : (Math.random() - 0.5) * 0.8;
}
