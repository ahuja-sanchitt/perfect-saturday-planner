// Application-level cache. In-memory LRU + TTL behind an interface, so swapping in
// Redis/Upstash later is a one-file change. Caveat (documented in README): serverless
// instances don't share memory and cold starts clear it.

export interface CacheStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs: number): void;
  stats(): { size: number; hits: number; misses: number };
}

class MemoryLru implements CacheStore {
  private map = new Map<string, { value: unknown; expires: number }>();
  private hits = 0;
  private misses = 0;
  constructor(private max = 500) {}

  get<T>(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry || entry.expires < Date.now()) {
      if (entry) this.map.delete(key);
      this.misses++;
      return undefined;
    }
    // refresh LRU position
    this.map.delete(key);
    this.map.set(key, entry);
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expires: Date.now() + ttlMs });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  stats() {
    return { size: this.map.size, hits: this.hits, misses: this.misses };
  }
}

// Survive Next.js dev hot-reloads by pinning to globalThis.
const g = globalThis as unknown as { __toolCache?: CacheStore; __responseCache?: CacheStore };
export const toolCache: CacheStore = (g.__toolCache ??= new MemoryLru(800));
export const responseCache: CacheStore = (g.__responseCache ??= new MemoryLru(200));

/** Memoize an async function result under `key`; reports whether it was a cache hit. */
export async function cached<T>(
  store: CacheStore,
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  const existing = store.get<T>(key);
  if (existing !== undefined) return { value: existing, hit: true };
  const value = await fn();
  store.set(key, value, ttlMs);
  return { value, hit: false };
}

/** Stable JSON stringify (sorted keys) — used for cache keys and byte-stable prompts. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}
