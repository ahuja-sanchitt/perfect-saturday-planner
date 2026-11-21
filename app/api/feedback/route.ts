import { z } from "zod";
import { getRun } from "@/lib/obs/trace";

const Body = z.object({ runId: z.string().max(20), rating: z.enum(["up", "down"]), comment: z.string().max(500).optional() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid feedback" }, { status: 400 });
  const { runId, rating, comment } = parsed.data;
  const run = getRun(runId);
  const record = { rating, comment, at: new Date().toISOString() };
  if (run) run.feedback = record;
  // Logged even if the run lives on another serverless instance.
  console.log(JSON.stringify({ event: "feedback", runId, rating, comment, prompt: run?.stats?.promptVersions }));
  return Response.json({ ok: true });
}
