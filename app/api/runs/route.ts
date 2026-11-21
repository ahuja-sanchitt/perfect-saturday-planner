import { connection } from "next/server";
import { listRuns } from "@/lib/obs/trace";
import { responseCache, toolCache } from "@/lib/cache/store";

export async function GET() {
  await connection(); // always dynamic
  return Response.json({
    runs: listRuns().map((r) => ({ ...r, spans: r.spans.map((s) => ({ ...s, attributes: undefined })) })),
    caches: { tool: toolCache.stats(), response: responseCache.stats() },
    note: "In-memory per serverless instance; resets on cold start.",
  });
}
