// Fixed-window per-IP rate limiter (in-memory). Protects the OpenAI key on a public URL.
const g = globalThis as unknown as { __rl?: Map<string, { count: number; windowStart: number }> };
const buckets = (g.__rl ??= new Map());

export function rateLimit(ip: string, limitPerMin = Number(process.env.RATE_LIMIT_PER_MIN ?? 8)) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now - b.windowStart > 60_000) {
    buckets.set(ip, { count: 1, windowStart: now });
    return { ok: true, remaining: limitPerMin - 1 };
  }
  b.count++;
  return { ok: b.count <= limitPerMin, remaining: Math.max(0, limitPerMin - b.count), retryInSec: Math.ceil((60_000 - (now - b.windowStart)) / 1000) };
}
