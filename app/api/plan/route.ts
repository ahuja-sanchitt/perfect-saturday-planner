import { z } from "zod";
import { runAgent } from "@/lib/agent/run";
import { rateLimit } from "@/lib/cache/ratelimit";
import type { TraceEvent } from "@/lib/types";

export const maxDuration = 120;

const Body = z.object({
  message: z.string().max(1000).default(""),
  form: z
    .object({
      area: z.string().max(80).optional(),
      budget: z.number().min(0).max(100000).optional(),
      hours: z.number().min(0).max(14).optional(),
      mood: z.string().max(200).optional(),
      interests: z.array(z.string().max(40)).max(10).optional(),
      constraints: z.array(z.string().max(60)).max(10).optional(),
    })
    .optional(),
  answers: z.record(z.string().max(200), z.string().max(200)).optional(),
  previous: z.any().optional(),
  changeRequest: z.string().max(400).optional(),
  promptVersion: z.string().max(5).optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(ip);
  if (!rl.ok) {
    return Response.json({ error: `Too many plans — try again in ${rl.retryInSec}s.` }, { status: 429 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid request", details: parsed.error.issues.slice(0, 3) }, { status: 400 });
  const body = parsed.data;
  if (!body.message.trim() && !body.form && !body.changeRequest) return Response.json({ error: "Tell me about your Saturday first." }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: TraceEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        await runAgent(body, emit);
      } catch (e) {
        console.error("run failed", e);
        emit({ type: "error", message: "Something went wrong while planning. Please try again." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
