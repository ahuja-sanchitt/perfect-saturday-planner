# Design system

This system was checked against [Impeccable](https://impeccable.style)'s design rules, and its detector reports 0 anti-patterns on the rendered pages (`npx impeccable detect http://localhost:3000/`).

## Product context
The product is a Saturday planner for people in Delhi NCR. Most people use it on a phone, in daylight. It should feel like a thoughtful local friend, and it also has to show the agent's work honestly. **Light is the default.** The agent console is the one deliberately dark region of the screen, the place where the "machine" lives.

## Type
| Role | Face | Use |
|---|---|---|
| Display | Bricolage Grotesque 600 | Page and plan titles, stop names, section headings. Warm and slightly quirky, never generic |
| Body | Instrument Sans 400–700 | Everything else. 16px for reading copy, 14–15px for metadata, 12px minimum for labels |
| Mono | JetBrains Mono | **Only** inside the agent console, where the content really is tool names and logs. Never used as decoration |

- Headings use `text-wrap: balance`, and body text uses `pretty`. Reading copy is capped at about 65–68ch.
- Times, money and counts use `tabular-nums`, not a monospace font.

## Color (OKLCH, defined as roles)
- **Canvas** `--bg`: a cool near-white, so the palette isn't cream by reflex. **Surface** `--surface` and **subtle** `--subtle` sit on top of it.
- **Ink** `--ink` for text, **muted** `--muted` for secondary text, which keeps at least 4.5:1 contrast on the canvas.
- **Accent** `--accent` is Delhi saffron/terracotta. It is reserved for the primary action, focus and selection, and the agent's sparkle.
- **Status**: `--good` for "why it fits" and real-data badges, `--warn` for trade-offs and sample-data notices, `--bad` for errors.
- **Console**: deep blue-black, with calm status colors (no neon), and muted text at roughly 6:1 or better.
- Dark mode is designed separately for each role, not inverted.

## Shape and space
- Tailwind's 4px spacing scale. Groups are separated by 24px (`space-y-6`), and items within a group by 8–12px.
- Cards use a 16px radius and **either** a border **or** a fill, never both, and never nested. Pills are only for small controls and badges.
- Touch targets are at least 44px (chips are 36px with spacing around them).

## Iconography
One SVG set (`components/icons.tsx`) drawn at a 1.75 stroke. No Unicode glyphs or emoji as icons.

## Motion
There is **one authored moment**: the agent's sparkle turns while work is in flight (ease-out-expo), and the status line rises in each time the agent moves to a new step. Placeholder stops fade gently while loading, and nothing else moves. Everything respects `prefers-reduced-motion`.

## Data honesty
Every plan stop carries a source badge: green **Real · curated guide / OpenStreetMap / Swiggy Dineout**, or amber **Sample data** for fictional venues. A plan that includes sample venues shows a notice about them.
