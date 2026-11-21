---
version: 1
slug: "components-planner-tsx"
primary_target: "components/Planner.tsx"
related_targets: ["components/PlanView.tsx","components/Console.tsx","components/Thinking.tsx","app/globals.css"]
---

# Surface: planner app (home route `/`)

Scope: the whole planner screen: input, plan, thinking states, refine box, agent console (desktop panel + mobile tab). `/runs` inherits the world.
Mode: Operate. Audience: evaluators first (BitScale founders), role-playing a Delhi NCR resident. Constraints: mobile-first 360px, data-honesty badges always visible, WCAG AA, reduced motion.

## Direction contract

THESIS: Your Saturday billed like a hand-painted Delhi single-screen show. The plan is the bill, and the stops are its showtimes. Refuses the category default of white itinerary cards with a map pane.

OWN-WORLD: Enamel-paint fields on a near-white ground: night-indigo ink (#1b1a2e) for structure and showtime tiles, a saffron bill field (#e8762a) carrying the plan title, magenta (#b5245b) only for the primary action, deep hoarding teal (#17565d) owning the whole agent-console region, and marquee yellow (#f2c230) for showtime numerals and console highlights. Display: Yatra One, lettered, for the app title, plan title, stop names and showtimes only. Body: Atkinson Hyperlegible Next at one reading size (16px), with hierarchy by hue and weight. Console: JetBrains Mono for real logs.

STORY: The evaluator types or taps an example and watches the agent work in the teal console. The bill then paints in, with each stop showing its time, what to do, why it fits, any trade-off and a source badge. They refine conversationally and trust the plan because every check is visible.

FIRST VIEWPORT: Ink header bar (yellow lettered title, NCR and date, console toggle). The input row has a magenta primary action. Below it sits the saffron bill (plan title and summary on the left, cost/time/AQI on the right), then the showtime grid: ink time tiles with yellow lettered times, white stop cards, and price on the right. The teal console fills the right 400px on desktop and becomes a tab on mobile.

FORM: Picture Palace (Delhi cinema hoardings), position 7 on the ordered list, seed:5f0870b93e2a21dc. Raises named: one reading size (acetate), showtime grid as armature (Crouwel), detail on focus (streaming), one geometry (zoo map).

Signature interaction: the bill paints in, a one-time left-to-right wipe of the saffron field when a plan lands; the thinking sparkle turns during runs.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
