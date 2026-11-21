# Perfect Saturday · Delhi NCR

An AI agent that plans a realistic, personalised Saturday in Delhi NCR. You describe your mood, budget, free time, interests and constraints. The agent searches real places, checks the weather and air quality, routes the day, and validates it against your constraints. You get a timed plan that explains why each stop fits you, and you can watch every step live in the agent console.

- **Live app:** https://delhi-saturday.vercel.app
- **Runs dashboard:** https://delhi-saturday.vercel.app/runs
- **Loom walkthrough:** https://www.loom.com/share/73a5a3b787f1462ebf2df48c9c63ff78

---

## Try it in 30 seconds

1. Tap **Brief example**, the assignment's input: South Delhi, ₹2,000, 4 hrs, tired, vegetarian, avoid crowds.
2. Watch the **agent console** as it parses, checks weather and AQI, searches, routes, and validates. Failed checks and retries appear too.
3. Refine with **Cheaper**, **More outdoor**, or free text, or press **Start over**.
4. Edge cases to try: **Vague: "something fun"** (clarifying questions), **Outside NCR** (polite refusal), **₹500 only** (tight budget).

A live run takes about 30–45 s across 6–8 model calls. Repeating a request within 30 minutes is served from cache.

---

## How it works

```
POST /api/plan  (Server-Sent Events: every step streams to the UI)
 ├─ guard       zod-validated input, length caps, per-IP rate limit
 ├─ parse       gpt-5.4-nano + structured output → preferences (+ ≤2 clarifying questions)
 │              outside NCR → refusal · vague → clarify chips · LLM down → heuristic parser
 ├─ cache       response cache keyed on prefs + prompt version + date (0-token replay)
 ├─ agent loop  gpt-5.4-mini · 9 strict tools · parallel calls · ≤10 turns (+2 repair) · 85 s budget
 │              resolve_area · get_weather · search_activities · search_food · search_events
 │              get_travel_time · estimate_cost · validate_plan · finalize_plan
 └─ fallback    rule-based planner over the same tools and validator, labelled in the UI
```

**The core decision: the LLM makes the judgement calls, and code checks the facts.** The model decides what suits a tired, vegetarian, crowd-averse person. Deterministic code computes travel time, cost, Saturday opening hours, diet fit, crowd level by time of day, and time arithmetic. `finalize_plan` is a server-side gate: it rejects any place a search didn't return, any plan over budget or time, and any diet violation. The agent has to fix the plan before it ships, so invented venues are impossible.

Refinements are checked the same way. A "cheaper" plan must actually cost less, and a "shorter" one must take less time. Both rules came from bugs found in testing.

---

## AI engineering

| Practice | What's built |
|---|---|
| **Prompt versioning** | `prompts/<id>/v<N>.md` with frontmatter (model, effort, changelog). The body is hashed, so every trace, cache entry and feedback record carries e.g. `planner@v3#8f8de257`. The active version is set in `prompts/registry.json`. `PROMPT_VERSION_OVERRIDE` rolls back without a deploy, and a `promptVersion` request field supports A/B tests |
| **Prompt caching** | A byte-stable prefix: static instructions, then sorted tool schemas, then dynamic content, with `prompt_cache_key` set to the prompt ref. Hits compound across agent turns. The turn-budget nudge is appended *after* the cached prefix. **About 80% cache hit** on production runs |
| **App caching** | Response cache plus tool cache (weather, routes, OSM), LRU + TTL behind a `CacheStore` interface, so Redis is a one-file swap |
| **Model routing** | gpt-5.4-nano parses and judges, gpt-5.4-mini plans. Effort is set per prompt, and models can be overridden by env |
| **Structured outputs** | `zodTextFormat` for the parser and judge, `strict: true` tools, and zod re-validation of every tool argument |
| **Cost & tokens** | Each call tracks input, cached, output and reasoning tokens, converted to USD. Each run reports cost, cache savings, latency and tool count. **About $0.012–0.019 per plan** |
| **Observability** | Self-built span tracer (OTel GenAI-style fields). It streams to the console, keeps a ring buffer for `/runs`, and writes one JSON log line per run |
| **Evals** | 12 cases: happy paths, tiny budget, short window, Jain/vegan, vague input, no area, outside NCR and prompt injection. Each is scored with deterministic checks plus an LLM-as-judge rubric. `npm run eval -- --pv v1,v2,v3` compares prompt versions |
| **Guardrails** | User text is treated as data, place IDs must come from search results, there are turn and wall-clock caps, SDK retries, a rate limit, and schema checks in and out |
| **Feedback** | Each rating is tied to its run and prompt version, and aggregated by version on `/runs` |
| **Variety** | A recency penalty (about 2 h decay) plus jitter among near-equal options stops the same venues winning every plan |

### Eval results (12 cases per version)

| Planner | Deterministic checks | Judge avg (1–5) | Avg cost | Avg cache hit | Avg latency |
|---|---|---|---|---|---|
| v1 | 12/12 | 3.33 | $0.0148 | 26% | 27.9 s |
| v2 | 12/12 | 3.39 | $0.0149 | 41% | 29.9 s |
| **v3 (active)** | **12/12** | 3.21 | **$0.0126** | **50%** | 28.5 s |

- **Hard constraints hold on every version.** The validator enforces them, not the prompt.
- **v3 is about 15% cheaper** with the best cache hit, because it makes fewer exploratory tool calls.
- **The judge differences are within noise**, with one sample per case. v3 stays active because it carries the refinement fix.

Raw results are in `evals/results/`.

**Why Delhi NCR only:** it's where I live, so I can check plans myself (places, timings, crowds, prices) instead of relying only on an LLM judging LLM output.

---

## Data: real sources, honestly labelled

| Source | Used for | How |
|---|---|---|
| **Curated NCR guide**, 87 real places | Crowd levels by time of day, indoor/outdoor, spend, local tips | `lib/data/curated.ts`. Details are estimates, flagged `verified: false` |
| **OpenStreetMap**, about 1,700 places | Parks, museums, heritage, music venues, veg restaurants | Build-time snapshot (`npm run ingest:osm`). Live Overpass took 10–30 s per query when tested |
| **Open-Meteo** | Saturday forecast and **air quality (AQI)**, which shapes Delhi plans | Live, keyless, cached |
| **OSRM** | Real road travel times, scaled for Delhi traffic | Live, keyless, cached, with a haversine fallback |
| **Sample venues**, 32, fictional | Fill gaps (live music, cafés in Gurugram and Noida) | `lib/data/mock.ts`. Always shown with an amber **Sample data** badge, and ranked below real places |

Every stop shows its source badge. Plans that include sample venues show a notice.

---

## Failure handling

| Situation | Behaviour |
|---|---|
| City outside NCR | Polite refusal: NCR only, by design |
| Vague input or no area | 1–2 clarifying questions as tap-to-answer chips |
| Plan breaks a constraint | Validator rejects it, and the agent fixes it (up to 3 attempts) or ships with the issue flagged |
| Nothing affordable or diet-safe | Search widens, then returns the closest option with a trade-off note |
| OSM, routing or weather down | Snapshot or estimate fallback, and the source is shown |
| OpenAI down or no key | Rule-based fallback planner, labelled in the UI |
| Abuse | Per-IP rate limit and input caps |

---

## Design

I wanted it to look different from the usual AI-generated UI. I used the [Impeccable](https://impeccable.style) design skill: it captured product context (`PRODUCT.md`), generated competing visual directions on a decision page, and ran an independent finish review.

The chosen world is **Picture Palace**, after Delhi's hand-painted single-screen cinema hoardings:
- Each plan is a saffron bill that paints in when it lands.
- Stops are ink showtime tiles with lettered times.
- The agent console is a hoarding-teal panel.
- It's light-only and mobile-first, with WCAG AA contrast.

The full system is in `DESIGN.md`. The finish review returned **ship**, and Impeccable's detector reports 0 issues in production.

---

## Run locally

```bash
cd saturday-planner
npm install
cp .env.example .env.local     # add OPENAI_API_KEY (without it, the fallback planner runs)
npm run dev                    # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run eval` | Run the eval suite (`--pv v1,v2,v3` to compare prompt versions) |
| `npm run ingest:osm` | Refresh the OpenStreetMap snapshot |
| `npm run typecheck` / `npm run lint` | Static checks |

URL options: `?motion=off` disables animations, and `?tab=trace` opens the mobile trace tab.

## Project layout

```
app/            page, /runs dashboard, API routes (plan SSE, feedback, runs)
components/     Planner, PlanView (bill + showtimes), Console, Thinking, icons
lib/agent/      run loop, tools, validator, parser, fallback planner, variety
lib/llm/        OpenAI client, pricing and usage accounting
lib/prompts/    versioned prompt loader      prompts/   planner v1–v3, parser, judge
lib/providers/  Open-Meteo, OSRM, OSM        lib/data/  curated guide, sample venues, localities
lib/obs/        tracer and run store         evals/     cases, runner, results
```

## Limitations

- Caches, `/runs` and feedback are in-memory per serverless instance, so they reset on cold starts. `CacheStore` is ready for Redis.
- Curated prices, hours and crowd levels are approximate, and OSM places have estimated prices.
- A Swiggy Dineout/Scenes snapshot, via Swiggy's official MCP, is the next data source. It needs a one-time OAuth login.
- The evals don't yet cover multi-turn refinement.

## How AI tools were used

I built this with Claude Code as a pair programmer: planning, scaffolding, the tools, prompts and eval harness, plus the Impeccable skill for the visual design. I made the product calls: NCR-only scope, real data sources, the validator-as-gate design and the UX. I then tested and reviewed every path, which is where the refinement and budget bugs were caught and fixed.
