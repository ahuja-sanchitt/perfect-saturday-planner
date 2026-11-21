import OpenAI from "openai";
import type { LlmUsage } from "@/lib/types";

let client: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  client ??= new OpenAI({ maxRetries: 2, timeout: 45_000 });
  return client;
}
export const hasLlm = () => Boolean(process.env.OPENAI_API_KEY);

// USD per 1M tokens. Sources: OpenAI model pages (gpt-5.4-mini), aggregator listings (gpt-5.4-nano).
// Cached input is billed at 10% of input. Reasoning tokens are billed as output.
export const PRICING: Record<string, { input: number; cached: number; output: number }> = {
  "gpt-5.4-mini": { input: 0.75, cached: 0.075, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, cached: 0.02, output: 1.25 },
};

interface RawUsage {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { cached_tokens?: number };
  output_tokens_details?: { reasoning_tokens?: number };
}

export function toUsage(model: string, u: RawUsage | null | undefined): LlmUsage {
  const price = PRICING[model] ?? PRICING["gpt-5.4-mini"];
  const inputTokens = u?.input_tokens ?? 0;
  const cachedTokens = u?.input_tokens_details?.cached_tokens ?? 0;
  const outputTokens = u?.output_tokens ?? 0;
  const reasoningTokens = u?.output_tokens_details?.reasoning_tokens ?? 0;
  const uncached = inputTokens - cachedTokens;
  const costUsd = (uncached * price.input + cachedTokens * price.cached + outputTokens * price.output) / 1e6;
  const savedUsd = (cachedTokens * (price.input - price.cached)) / 1e6;
  return { model, inputTokens, cachedTokens, outputTokens, reasoningTokens, costUsd, savedUsd };
}
