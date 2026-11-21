---
name: Perfect Saturday · Delhi NCR
description: Your Saturday billed like a hand-painted Delhi single-screen show.
colors:
  ground: "#fafaf8"
  surface: "#ffffff"
  subtle: "#f1f1ee"
  ink: "#1b1a2e"
  muted: "#57556a"
  line: "#e4e2dc"
  line-strong: "#cfccc4"
  night: "#1b1a2e"
  night-ink: "#f3f1ea"
  saffron-bill: "#e8762a"
  saffron-ink: "#1b1a2e"
  saffron-muted: "#3d2414"
  magenta-action: "#b5245b"
  accent-ink: "#ffffff"
  accent-soft: "#f7e4ec"
  marquee-yellow: "#f2c230"
  hoarding-teal: "#17565d"
  console-line: "#23707a"
  console-ink: "#eef7f6"
  console-muted: "#c3e2e0"
  console-good: "#a8f0c6"
  console-bad: "#ffb8ad"
  good: "#1f6f78"
  warn: "#a64a10"
  bad: "#b42318"
typography:
  display-bill:
    fontFamily: "Yatra One, serif"
    fontSize: "44px"
    fontWeight: 400
    lineHeight: 1.05
  display-showtime:
    fontFamily: "Yatra One, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "\"tnum\" 1"
  headline:
    fontFamily: "Yatra One, serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1.25
  title:
    fontFamily: "Yatra One, serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  figure:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.55
    fontFeature: "\"tnum\" 1"
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.5
  console-log:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.625
rounded:
  xl: "12px"
spacing:
  gutter-mobile: "16px"
  gutter-desktop: "32px"
  group: "24px"
  item: "12px"
  card-x: "20px"
  card-y: "16px"
components:
  button-primary:
    backgroundColor: "{colors.magenta-action}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.xl}"
    padding: "0 24px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.xl}"
    padding: "0 14px"
    height: "40px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "0 14px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.magenta-action}"
    rounded: "{rounded.xl}"
    padding: "0 14px"
    height: "36px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  header-bar:
    backgroundColor: "{colors.night}"
    textColor: "{colors.night-ink}"
    padding: "12px 32px"
  bill:
    backgroundColor: "{colors.saffron-bill}"
    textColor: "{colors.saffron-ink}"
    typography: "{typography.display-bill}"
    rounded: "{rounded.xl}"
    padding: "24px 28px"
  showtime-tile:
    backgroundColor: "{colors.night}"
    textColor: "{colors.marquee-yellow}"
    typography: "{typography.display-showtime}"
    rounded: "{rounded.xl}"
    width: "104px"
    height: "88px"
  stop-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "16px 20px"
  price-column:
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
    width: "88px"
  source-badge-real:
    textColor: "{colors.good}"
    rounded: "{rounded.xl}"
    padding: "0 10px"
    height: "24px"
  source-badge-sample:
    textColor: "{colors.warn}"
    rounded: "{rounded.xl}"
    padding: "0 10px"
    height: "24px"
  console-panel:
    backgroundColor: "{colors.hoarding-teal}"
    textColor: "{colors.console-ink}"
    typography: "{typography.console-log}"
    width: "400px"
---

# Design System: Perfect Saturday · Delhi NCR

## Overview

**Creative North Star: "The Picture Palace"**

The plan is a hand-painted bill outside a Delhi single-screen cinema, and the stops are its showtimes. Flat enamel-paint fields sit on a near-white ground: a night-indigo header bar and showtime tiles, one saffron bill carrying the plan title, magenta reserved for the action, and a deep hoarding-teal console where the agent's work is shown in full. Display lettering (Yatra One) is the hoarding painter's hand; everything that has to be read stays in one legible body face at one size.

Density is moderate and phone-first. A single plan column reads top to bottom at 360px; on desktop the teal console takes a fixed right panel. Hierarchy comes from paint field, hue and weight rather than from a ladder of text sizes. The world is light only: people plan in daylight on a phone, so there is no night variant (`color-scheme: light`).

Confirmed rejection: the category default of white itinerary cards with a map pane.

**Key Characteristics:**
- Flat enamel fields, no shadows; depth is paint against ground.
- One reading size (16px) across the plan column; hierarchy by hue and weight.
- One corner radius (12px) on every field, card, control and badge.
- Lettered display face only for the app title, plan title, stop names, showtimes and a few headings.
- Every stop carries a visible source badge; real and sample data are never confused.
- The agent console is a whole region painted teal, with real logs in mono.

## Colors

Five enamel roles on a near-white ground, each with one job.

### Primary
- **Saffron Bill** (saffron-bill): the field behind the plan title, summary and totals. One per plan, never a button or a highlight. Text on it is Night Ink (saffron-ink); secondary text is Burnt Umber (saffron-muted), never a tint of white.
- **Night Indigo** (night): structure. The header bar, the showtime tiles, the selected Plan tab, and the 2px rule of the main describe field. Text on it is Bone (night-ink) at full or 80% strength.

### Secondary
- **Magenta Action** (magenta-action): the primary action ("Plan my Saturday", "Update plan"), focus rings, the caret, text links, hover borders on controls and selected chips (with Magenta Wash, accent-soft, behind). Also the thinking sparkle and progress segments in the plan column.

### Tertiary
- **Marquee Yellow** (marquee-yellow): lettered showtime numerals and the app title on night, the console title and in-progress/info lines in the console, and the text-selection fill (with Night text). Never as text on white.
- **Hoarding Teal** (hoarding-teal): owns the whole agent-console region, with Teal Rule (console-line) for dividers and Sea Foam / Pale Coral (console-good / console-bad) for pass and fail marks.

### Neutral
- **Ground** (ground): page background.
- **Surface** (surface): stop cards, inputs, chips, refine bar.
- **Paper Grey** (subtle): mobile tab track, notices, change chips, skeletons.
- **Ink** (ink) and **Slate Muted** (muted): primary and secondary text.
- **Line** / **Line Strong**: card borders and control borders.
- **Status**: Deep Teal-Green (good) for "Why it fits" and real-data badges, Rust (warn) for trade-offs and Sample data, Brick (bad) for errors.

### Named Rules
**The One Bill Rule.** Saffron appears once per plan, as the bill field. A second saffron element dilutes the poster.

**The Magenta Is a Verb Rule.** Magenta marks what you can do next (action, focus, selection). It never decorates.

**The Console Owns Teal Rule.** Hoarding Teal is a region, not an accent. In the plan column it appears only as the selected Agent trace tab, the doorway to the console.

## Typography

**Display Font:** Yatra One (serif fallback), weight 400 only
**Body Font:** Atkinson Hyperlegible Next (system-ui fallback), 400 / 500 / 600 / 700
**Label/Mono Font:** JetBrains Mono 400 / 500, inside the agent console only

**Character:** A painted, lettered display hand against a face built for legibility; the lettering carries the world, the body carries the facts.

### Hierarchy
- **Display, bill** (400, 34px mobile / 44px from 640px, 1.05): the plan title on the saffron bill.
- **Display, showtime** (400, 26px / 30px, 1, tabular): start times in the ink tiles, in marquee yellow.
- **Headline** (400, 34px, tight): the empty-state invitation.
- **Title** (400, 22px, tight): stop names, the console title. Header app title is 20px / 26px. Small display headings (clarify question, thinking phrase) are 18px.
- **Body** (400, 16px, 1.5): everything read in the plan column, including areas, metadata, travel lines and badges. Reading copy capped near 62 to 65ch; headings balance, paragraphs wrap pretty.
- **Figure** (700, 18px, tabular): totals on the bill and the price column.
- **Label** (700, 16px): buttons, field labels, "Why it fits:" and "Trade-off:" leads.
- **Console log** (mono 13px, relaxed): step names and logs; console meta at 12px body face; stats at 16px.

### Named Rules
**The One Reading Size Rule.** The plan column reads at 16px. Emphasis is weight (700) or hue (good, warn, muted), never a smaller size.

**The Lettering Is for Billing Rule.** Yatra One sets names and times: app title, plan title, stop names, showtimes, a few headings. Never body, buttons, labels or figures.

**The Mono Means Logs Rule.** JetBrains Mono appears only where the content is literally tool names, prompt versions and run ids. Times and money use tabular figures in the body face.

## Layout

Phone-first single column. Page gutters are 16px, widening to 32px from 640px. Groups stack at 24px; items within a group at 8 to 12px.

The showtime grid is the armature: each stop row is `76px tile | card` on mobile and `104px tile | card | 88px price` from 640px, with 12px / 20px gaps. Between rows, a 2px dashed travel line runs down the centre of the tile column, with the walk or cab time and fare beside it.

From 1024px the screen splits: the plan column flexes and the teal console is a fixed 400px right panel (toggleable, preference remembered). Below 1024px the console becomes a Plan / Agent trace tab pair. The request collapses to one line once a plan exists, and the refine bar is pinned to the bottom of the plan column.

Touch targets: primary action 48px, inputs and refine controls 44px, secondary buttons and tabs 40px, chips 36px with spacing around them.

## Elevation & Depth

Flat. There are no shadows anywhere; depth is paint against ground. The night header, saffron bill, ink tiles and teal console are solid fields; white cards separate from the ground by a 1px Line border only. The one layered element is the sticky thinking banner while a plan updates, and it uses the ground colour plus a bottom rule, not a shadow.

### Named Rules
**The Enamel Rule.** Fields are solid paint. No shadows, gradients or blur.

## Shapes

One geometry: every field, tile, card, input, button, chip, tab and badge uses the same gently rounded corner (12px). Borders are 1px (Line or Line Strong); the main describe field takes a 2px Night rule as the poster's frame. The only non-rectangular marks are the dashed travel line and the filled four-point sparkle.

**The One Corner Rule.** 12px, everywhere. No pills, no square corners.

## Components

### Buttons
- **Shape:** the system corner (12px).
- **Primary:** Magenta Action fill, white bold 16px label, 48px tall with 24px sides ("Plan my Saturday"); the refine bar's "Update plan" is the same at 44px with an arrow icon. Presses scale to 0.98; disabled drops to 50% opacity.
- **Secondary:** white surface, Line Strong border, bold label, 40px ("New request"); magenta border on hover.
- **On night:** the console toggle is a bordered button on the header, marquee yellow border and text when the console is open, Bone at 40% when closed.
- **Text link:** magenta, underlines on hover with a 4px offset.

### Chips
- **Style:** white surface, Line Strong border, 16px regular label, 36px tall, 14px sides. Examples, quick changes, interests and constraints.
- **State:** selected chips take Magenta Wash fill, magenta border and semibold magenta text, with `aria-pressed`. Hover turns the border magenta.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Surface on Ground.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px Line; Line Strong on hover; magenta when an inner link has focus.
- **Internal Padding:** 16px vertical, 20px horizontal.

### Inputs / Fields
- **Style:** white surface, 12px corner, 16px text. The describe textarea has a 2px Night rule; form fields and the refine bar have a 1px Line Strong border.
- **Focus:** border turns Magenta Action; global focus ring is a 2px magenta outline at 2px offset.
- **Error / empty submit:** no dead buttons. An empty submit focuses the field and shows a Rust hint line beneath it.

### Navigation
- **Header bar:** a Night field, 12px tall padding, with the lettered marquee-yellow app title, a sun icon from 640px, and "Delhi NCR · date" in Bone at 80%. Replays add "(recorded run)".
- **Mobile tabs:** a Paper Grey track holding two 40px tabs; Plan selected is Night with yellow text, Agent trace selected is Teal with console ink. A turning sparkle marks a run in progress.

### The Bill (signature)
The plan title painted on a saffron field: lettered title and summary on the left, Spend / Time / Air totals on the right in 18px bold tabular figures with Burnt Umber labels. Over-budget or over-time totals are underlined, not recoloured. When a plan lands the saffron field paints in from the left, a one-time scale wipe (820ms, expo-out) behind text that is already visible. This is the system's one authored entrance.

### Showtime Tiles (signature)
A Night tile (76px square on mobile, 104 by 88px from 640px) carrying the start time in lettered marquee yellow and "to end" beneath in Bone. Tiles are joined by the dashed travel line, and the 88px price column sits right of each card from 640px (inline in the card on mobile; "Free" for zero).

### Source Badges
24px, 12px corner, 1px border, 16px medium label. Real sources (curated guide, OpenStreetMap, Swiggy Dineout) are Deep Teal-Green text on a 40% green border; Sample data is Rust text on a 10% rust wash. Always visible on every stop and repeated in the data legend; a plan with sample stops also shows a rust notice.

### Agent Console
The whole region painted Hoarding Teal. Lettered marquee-yellow title, status with a turning sparkle while running, then the log: mono step names in white, durations and cache hits right-aligned, check and cross icons in Sea Foam and Pale Coral, model thoughts in italic muted text that truncate at about 220 characters and expand on click or keyboard. The log pins to the newest step unless the reader scrolls up. Stats (tokens, cache hit, cost, latency) close the panel above a Teal Rule.

### Thinking States
While a first plan builds: a white card with a turning magenta sparkle, a rotating Delhi-flavoured status phrase that rises in on each change (380ms), elapsed/tools/tokens meta, six magenta progress segments, and fading skeleton stops. While a plan updates, the old plan stays readable at 55% opacity under a sticky banner. Sparkle, status rise and skeleton fade are run-state feedback, not entrances; all motion stops under reduced motion and `?motion=off`.

## Do's and Don'ts

### Do:
- **Do** keep one saffron bill per plan and let it carry the title and totals.
- **Do** set times in the Night showtime tile with lettered marquee-yellow numerals, joined by the dashed travel line.
- **Do** keep plan-column text at 16px and build emphasis from weight and hue.
- **Do** use the 12px corner on every shape.
- **Do** show a source badge on every stop and keep Sample data in Rust.
- **Do** reserve Magenta Action for the primary action, focus and selection.
- **Do** use tabular figures in the body face for times, prices and counts.
- **Do** draw icons from the one SVG set at a 1.75 stroke.
- **Do** keep the world light only.

### Don't:
- **Don't** use white itinerary cards with a map pane as the plan's form.
- **Don't** add shadows, gradients or blur; fields are flat enamel.
- **Don't** set body copy, buttons, labels or figures in Yatra One.
- **Don't** use JetBrains Mono outside the agent console.
- **Don't** set marquee yellow as text on white, or use Hoarding Teal as an accent in the plan column.
- **Don't** add a second authored entrance; the bill paint-in is the one.
- **Don't** use pills or square corners.
