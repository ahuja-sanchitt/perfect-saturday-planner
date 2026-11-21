# Perfect Saturday · Delhi NCR

An AI agent that plans a realistic, personalised Saturday in Delhi NCR. You describe your mood, budget, time, interests and constraints, and it returns a timed itinerary with a "why this fits you" line for each stop. A live **agent console** streams every LLM call, tool call, cache hit, validation failure and retry as it happens.

**Live:** https://perfect-saturday-planner-tau.vercel.app · **Runs dashboard:** `/runs`

---

## Run locally

```bash
npm install
cp .env.example .env.local      # add OPENAI_API_KEY (optional: works without it via the fallback planner)
npm run dev                      # http://localhost:3000
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run eval` | Offline evals on `evals/cases.json` (deterministic checks + LLM judge) |
| `npm run eval -- --pv v1,v2` | Compare planner prompt versions side by side |
| `npm run ingest:osm` | Re-pull the OpenStreetMap snapshot for NCR |
| `npm run typecheck` / `npm run lint` | Static checks |

---

## How it works

```
POST /api/plan (Server-Sent Events)
 ├─ guard        zod-validated input, length caps, per-IP rate limit
 ├─ parse        gpt-5.4-nano + structured output → Preferences (+ ≤2 clarifying questions)
 │                └─ not in NCR → polite refusal · vague → clarify chips · LLM down → heuristic parser
 ├─ cache        response cache (hash of prefs + prompt version + date) → 0-token replay
 ├─ agent loop   gpt-5.4-mini + 9 strict function tools, parallel calls, ≤8 turns, 55s budget
 │    resolve_area · get_weather · search_activities · search_food · search_events
 │    get_travel_time · estimate_cost · validate_plan · finalize_plan (server-side gate)
 └─ fallback     rule-based planner over the same tools + validator if the LLM fails
```

**Key design decision:** the LLM makes the *judgement calls* (what suits a tired, vegetarian, crowd-averse person). Deterministic code handles the *facts*: travel time, cost, opening hours, diet, crowd levels and time arithmetic. `finalize_plan` re-validates every plan on the server. A plan is rejected if it uses a place no search returned, goes over time or budget, or breaks the diet. The model then has to fix it, or the plan ships with its problems flagged. This is what keeps suggestions realistic and makes invented venues impossible.

### Data: real, with no logins needed to test

| Source | Used for | How |
|---|---|---|
| **Curated NCR guide** (87 real places: 57 things to do, 30 restaurants) | Crowd levels by time of day, indoor/outdoor, realistic spend, local tips | Hand-written in `lib/data/curated.ts`; values flagged `verified: false` until reviewed |
| **Sample venues** (32, fictional) | Fill gaps (live music, cafés, workshops in Gurugram/Noida) | `lib/data/mock.ts`, `source: "mock"`. Every stop carries a source badge (Real · curated / OpenStreetMap / Swiggy, or **Sample data**), and plans with sample stops show a notice. They rank below real places |
| **OpenStreetMap** (1,700+ places) | Parks, museums, galleries, heritage, music venues, veg restaurants | Build-time snapshot via Overpass (`scripts/ingest-osm.mjs`). The public Overpass API took 10–30 s per query when tested, too slow for a live request. Set `OSM_LIVE=1` to top up live |
| **Open-Meteo** | Saturday forecast + **air quality (AQI)**, which shapes Delhi plans | Live, keyless, cached 30 min |
| **OSRM** | Real road travel times (scaled ×1.6 for Delhi traffic) | Live, keyless, cached 6 h, haversine fallback |
| **Swiggy Dineout / Scenes** | Restaurants with real prices, plus events | Planned: local snapshot via Swiggy's official MCP servers (`data/ncr/*.json`). Swiggy needs a per-user OAuth login, so the deployed app reads a snapshot instead of calling it live |

---

## AI engineering / LLMOps

| Practice | Implementation |
|---|---|
| **Prompt versioning** | `prompts/<id>/v<N>.md` with frontmatter (model, effort, changelog). The loader hashes the body, and every trace, cache entry and feedback record carries `planner@v2#8cf6cd45`. The active version is set in `prompts/registry.json`. `PROMPT_VERSION_OVERRIDE` rolls back without a deploy, and the request field `promptVersion` supports A/B tests |
| **Prompt caching** | Request order is static instructions → tools → dynamic content. Tool JSON is deterministic and sorted, and preference JSON is stably stringified, so the prefix stays byte-identical. `prompt_cache_key = prompt ref`, which routes same-prefix traffic to the same cache. Inside the agent loop, each turn re-sends a growing prefix, so hits compound. `usage.input_tokens_details.cached_tokens` is tracked per call and shown as cache-hit % and $ saved |
| **App-level caching** | Tool-result cache (weather, routes, OSM) and response cache, both LRU + TTL behind a `CacheStore` interface, so Redis is a one-file swap |
| **Model routing** | nano for parsing and judging, mini for planning. Effort is set per prompt, and models can be overridden by env |
| **Structured outputs** | `zodTextFormat` for the parser and judge, `strict: true` function tools, and zod re-validation of every tool argument |
| **Cost & token accounting** | Per call: input, cached, output and reasoning tokens → USD from `lib/llm/pricing`. Per run: total cost, savings, latency and tool count |
| **Observability** | Self-built span tracer (OTel GenAI-style attributes). It streams to the UI, keeps a ring buffer for `/runs`, and writes one JSON log line per run to Vercel logs |
| **Evals** | 12 cases covering happy paths, tiny budget, short window, Jain/vegan diets, vague input, no area, outside NCR and prompt injection. Deterministic checks plus an LLM-as-judge rubric. `--pv v1,v2` compares versions |
| **Guardrails** | User text is wrapped in tags and treated as data, place IDs must come from search results, iteration and wall-clock caps, rate limit, SDK retries, and schema validation in and out |
| **Feedback loop** | 👍/👎 is tied to the run ID and prompt version, and aggregated by version on `/runs` |

### Eval results

`npm run eval -- --pv v1,v2,v3`: 12 cases per version, gpt-5.4-mini planner, gpt-5.4-nano judge (21 Nov 2026):

| planner | deterministic pass | judge avg (1–5) | personalization | realism | constraints | delight | avg cost / run | avg prompt-cache hit | avg latency |
|---|---|---|---|---|---|---|---|---|---|
| v1 | 12/12 | 3.33 | 3.67 | 3.11 | 3.22 | 3.33 | $0.0148 | 26% | 27.9s |
| v2 | 12/12 | 3.39 | 3.44 | 3.22 | 3.67 | 3.22 | $0.0149 | 41% | 29.9s |
| v3 | 12/12 | 3.21 | 3.31 | 3.29 | 3.02 | 3.23 | $0.0126 | 50% | 28.5s |

How I read it:
- **Hard constraints hold on every version** (budget, time, diet, pacing, grounded places, refusal and clarification paths, prompt injection). The server-side validator does that work, not the prompt.
- **v3 is about 15% cheaper with the best cache hit rate**, because it makes fewer exploratory tool calls. Cache hit % is averaged over all cases, including clarify and refuse runs, which make no planner calls.
- **Judge differences are within noise:** one sample per case, 9 judged plans per version. v3's lower "constraints" score is the next thing to investigate, using multiple samples per case and a stronger judge, before promoting further.
- v3 stays active because it carries the refinement fix ("cheaper" must actually cost less). This eval set doesn't cover multi-turn refinement yet, which is a known gap.

---

### Variety
A recency penalty that decays over about 2 hours, plus light jitter among near-equal candidates, stops the same few places winning every plan. Jitter is disabled in evals for repeatability. Identical requests within 30 minutes are still served from the response cache on purpose.

## Failure handling

| Failure | Behaviour |
|---|---|
| City outside NCR | Friendly refusal saying the app covers NCR only |
| Vague input / no area | 1–2 clarifying questions as tap-to-answer chips |
| Plan breaks constraints | Validator rejects it, and the agent fixes it (up to 3 attempts) or ships with the issues flagged |
| No affordable/diet match | Search widens, then returns the cheapest suitable option with a trade-off note |
| OSM / routing / weather down | Snapshot or estimate fallback. The plan still validates, and the data source is shown |
| OpenAI down or no key | Rule-based planner over the same tools and validator, labelled as such |
| Abuse | Per-IP rate limit and input length caps |

## Limitations

- The in-memory caches, `/runs` and feedback are per serverless instance and reset on cold starts. The `CacheStore` interface is ready for Redis.
- Curated prices, hours and crowd levels are approximate, and OSM places have estimated prices and unknown crowd levels.
- The Swiggy snapshot ingest is next. It needs a one-time OAuth login on the developer's machine.

## How AI tools were used

_2–3 lines for the submission, e.g.:_ Built with Claude Code as a pair-programmer. It drafted the plan and design mockups, scaffolded the code, and wrote the tools, prompts and eval harness, while I made the product calls: NCR-only scope, real data sources, the validator-as-gate design, and the UX. I then reviewed and tested every path.
