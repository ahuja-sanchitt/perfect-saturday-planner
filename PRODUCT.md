# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: evaluators.** The BitScale founders open the live URL on desktop or phone to judge a take-home assignment for an AI-engineering role. Within minutes they need to see that the agent works, that its plans are realistic, and how it got there: the trace, tool calls, cache hits, cost and prompt version.
- **Persona they role-play: Delhi NCR residents.** Someone planning a Saturday, usually on a phone, who gives their mood ("tired but wants something fun"), budget, free time, interests and constraints (vegetarian, avoid crowds) and wants a plan they would actually follow.

## Product Purpose

An AI agent that turns a person's mood, budget, available time, interests and constraints into a timed, personalised Saturday plan for Delhi NCR. Each stop explains why it fits the person, flags honest trade-offs and suggests a backup. Success means a plan a local would find believable, produced transparently enough that an evaluator can follow every decision.

## Positioning

Plans are grounded and verified, not just generated. Every stop must be a real place returned by a search tool, and deterministic code (not the LLM) checks budget, time including real travel, Saturday opening hours, diet, crowd levels by time of day, and air quality before a plan is shown. Every step of the agent streams live, and sample data is always labelled as such.

## Operating Context

- The user types free text or fills in a form, or taps an example chip, and gets 1–2 clarifying questions when input is vague.
- A run takes about 30–45 seconds (6–8 model calls). A live status and the agent console stream every step during that wait.
- After the first plan, the user refines it conversationally ("cheaper", "more outdoor", "I'm in Gurugram now").
- The agent console (toggleable on desktop, a tab on mobile) shows tool calls, failed validations and retries, tokens, prompt-cache hit %, cost per run and prompt version. `/runs` lists recent runs and feedback.

## Capabilities and Constraints

- Scope is **Delhi NCR only** (Delhi, Gurugram, Noida, Ghaziabad, Faridabad). Other cities get a polite refusal by design.
- Data sources: a curated NCR guide (87 real places, details are estimates), an OpenStreetMap snapshot (about 1,700 places), live Open-Meteo weather and AQI, and OSRM travel times. 32 fictional sample venues fill coverage gaps. A Swiggy Dineout/Scenes snapshot is planned but not yet ingested.
- Stack: Next.js (App Router) on Vercel, with the OpenAI Responses API (gpt-5.4-mini planner, gpt-5.4-nano parser and judge).
- A rule-based fallback planner runs when the LLM is unavailable and is labelled in the UI.

## Brand Commitments

- Name: **Perfect Saturday · Delhi NCR**.
- Voice: a thoughtful local friend. Specific, honest about trade-offs, light Delhi flavour ("Negotiating with Delhi traffic…"), never salesy.

## Evidence on Hand

- Offline eval results: 12 cases × planner v1/v2/v3, all passing the deterministic checks (`evals/results/`, README table).
- Production run metrics: ~80% prompt-cache hit, ~$0.012–0.019 per plan, ~30–45s latency.
- There are no testimonials, user counts or press, and future work must not invent any.

## Product Principles

1. **Show the work.** The agent's reasoning, tool calls and costs are part of the product, not hidden plumbing.
2. **Grounded over clever.** Never suggest a place, time or price the system can't back with a source or a check.
3. **Honest labelling.** Real versus sample data and agent versus fallback plans are always distinguishable at a glance.
4. **Humane plans.** Pace for the person's energy, with slack for Delhi traffic. Fewer, better stops.
5. **The wait is part of the experience.** A 30–45 second run should feel alive and informative, never frozen.

## Accessibility & Inclusion

- Mobile-first: works at 360px with no horizontal scroll and 44px touch targets. Desktop gets the split view.
- WCAG AA contrast in every theme, `prefers-reduced-motion` respected, full keyboard operation, and live regions for streaming status.
