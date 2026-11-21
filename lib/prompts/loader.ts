// Prompt registry with versioning. Prompts live in /prompts/<id>/<version>.md with YAML-ish
// frontmatter. Each loaded prompt carries a content hash, so every trace/cache entry/feedback
// record can be tied to the exact prompt text that produced it.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export interface PromptMeta {
  id: string;
  version: string;
  model: string;
  effort: "minimal" | "low" | "medium" | "high";
  changelog?: string;
}

export interface LoadedPrompt extends PromptMeta {
  body: string;
  hash: string;
  ref: string; // id@version#hash
}

const ROOT = path.join(process.cwd(), "prompts");
const cache = new Map<string, LoadedPrompt>();

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!m) return { meta: {}, body: raw.trim() };
  const meta: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
  }
  return { meta, body: m[2].trim() };
}

export function activeVersions(): Record<string, string> {
  const reg = JSON.parse(readFileSync(path.join(ROOT, "registry.json"), "utf8")) as { active: Record<string, string> };
  // Env override for A/B or rollback without a deploy, e.g. PROMPT_VERSION_OVERRIDE="planner=v1"
  const override = process.env.PROMPT_VERSION_OVERRIDE;
  if (override) {
    for (const pair of override.split(",")) {
      const [id, v] = pair.split("=").map((s) => s.trim());
      if (id && v) reg.active[id] = v;
    }
  }
  return reg.active;
}

export function loadPrompt(id: string, version?: string): LoadedPrompt {
  const v = version ?? activeVersions()[id];
  if (!v || !/^v\d+$/.test(v)) throw new Error(`Unknown prompt version for ${id}: ${v}`);
  const key = `${id}@${v}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const raw = readFileSync(path.join(ROOT, id, `${v}.md`), "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 8);
  const envModel = process.env[`${id.toUpperCase()}_MODEL`]; // e.g. PLANNER_MODEL
  const loaded: LoadedPrompt = {
    id,
    version: v,
    model: envModel || meta.model || "gpt-5.4-mini",
    effort: (meta.effort as PromptMeta["effort"]) || "low",
    changelog: meta.changelog,
    body,
    hash,
    ref: `${id}@${v}#${hash}`,
  };
  cache.set(key, loaded);
  return loaded;
}
