# Design: the Observatory

This document defines the visual system, the chart's encoding, motion and the performance rules for AI Model Evolution. It is for anyone adding UI or animation to this repo.

## Direction and why

The site went through two looks before this one. The first was a generic neon dashboard. The second, the "Atlas", was a light editorial page. The owner then supplied a reference: a dark, space-themed timeline. It has one glowing row per lab with a badge card, name and year labels on every node, a record panel on the right, and a release histogram with Play along the bottom. This design follows that reference. It keeps what the Atlas got right: direct labels, written turning points, an honest open/closed encoding, and a source behind every fact.

The guardrail against looking generic: **every glow carries data.** Color is always a lab, brightness is always emphasis, and each line is a real relationship from the records. Nothing on the page is decoration except the background and the record's header art.

## 1. Visual system

### Color

There is one dark theme. Tokens live in `src/app/globals.css`. They kept their names from the Atlas theme, so every page picks them up.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#05070d` | Page background, and the halo behind chart labels |
| `--paper-2` / `--card` | `#0e1426` / `#0a0f1e` | Raised fills; solid panels and dialogs |
| `--glass` | `rgb(10 15 30 / 0.84)` | Translucent cards over the starfield (`glass` utility) |
| `--ink` / `--ink-2` / `--ink-3` | `#edf1fb` / `#aab3c9` / `#7c86a1` | Primary, secondary and tertiary text |
| `--rule` / `--rule-2` | 13% / 26% periwinkle | Hairlines and card borders |
| `--accent` / `--accent-2` | `#9d8cff` / `#5f8dff` | Violet-to-blue: active tabs, kickers, citations, the slider |
| `--today` | `#ff8566` | The "today" rule and the replay cursor |
| `--focus` | `#a9bcff` | Keyboard focus ring |

- **Lab colors** live in `data/organizations.yaml`. They are bright, well-separated hues chosen to glow on the dark background. Labs with fewer than five models share the "Other labs" row, so their colors only need to differ from each other there.
- **Gradient text** is used for exactly one phrase per page title (`text-gradient`).
- **Background:** a fixed starfield (one canvas, drawn once), a few twinkling stars, faint nebulae (`SpaceBackground`), and a planet's rim rising at the bottom of the full-screen pages (`Horizon`).

### Typography

Geist Sans throughout: titles 600 with tight tracking (−0.02 to −0.03em), UI at 12–14px, and tabular figures for numbers. There is no serif and no decorative monospace.

### Surfaces

Cards are translucent navy with a 1px border and a faint top highlight (`glass`). **They never use `backdrop-filter`** (see Performance). The lab badges (`OrgBadge`) are the lab's monogram on a tile lit in its color. The shared row's badge is a 2×2 grid of its labs' colors.

## 2. The timeline

| Element | Encoding |
|---|---|
| **Rows** | One per lab with five or more models, in `order`. Smaller labs share "Other labs", which expands into one row each. Row height fills the screen (56–104px). Clicking a lab's card shows only that lab. |
| **Time** | The default "Activity" spacing gives every year at least 44px and shares the rest by how many models came out that year, so the crowded recent years get room (`src/lib/timescale.ts`). "Calendar" spaces years evenly. The monthly histogram below always uses true time. |
| **Nodes** | A glowing orb in the lab's color. Open weights are solid with a white-hot core; closed models are rings. Milestones (the story's key models and the turning points) are larger. The picked model gets a bright halo and a slowly breathing ring. The featured model is ringed but doesn't dim anything. |
| **Crowding** | Nodes closer than 14px on a row's line move to parallel lines just above and below it (`assignSlots`). Spacing is recomputed when a zoom settles, not during it. |
| **Lines** | Each row has a faint line that fades in from the left and runs to the lab's latest release. Lineage lines take the newer model's color, and a line between labs blends from one lab's color into the other's. Solid is a successor, dashed a fine-tune or derivative, dotted a distillation, and faint dotted an influence. |
| **Labels** | Two lines, the name and the year (month and year once zoomed in far enough), hanging below or above and beside the node, clear of the line through it. They are placed greedily: milestones first, then family roots, then the newest (`placeLabels` with `sideCandidates`). The hovered, picked and featured models always get a label. |
| **Axis** | Years, months once a year is wide enough, turning points as violet diamonds with a caption where one fits, and "Today". |
| **Bottom bar** | Play; releases per month as stacked dots with the visible window bracketed (drag to move); a minimap of every row; zoom; the spacing switch; and a "How to read it" popover. On very wide screens the legend is also shown inline. |
| **Record panel** | On wide screens it is always present and shows the newest milestone until a model is picked. Its tabs are Overview (generated orb art, summary, facts, links), Technical and Sources. A citation number opens Sources at that source. Related models are listed below the tabs. |

## 3. Motion

**Principle:** motion shows time, relationships or where you are.

| Moment | Behavior |
|---|---|
| **First load** (≈2s, once per page load) | A cursor sweeps from 2017 to today. Nodes ignite, lines extend and labels appear as they find room. |
| **Play** | Replays history in about 16 seconds at a steady pace across the chart, so busy years take longer to pass. The year runs in the histogram's title. |
| **Hover / pick** | The node swells. Its lineage brightens, redraws, and carries a travelling light. Everything else fades to 16%. Picking also flies the camera to the model. |
| **Filter** | Non-matching models fade. In "hide" mode they vanish and rows glide closed. The year slider also zooms the chart to its years. |
| **Spacing switch** | Every node morphs to its new position, keeping the same date in the middle (0.7s). |
| **Expand "Other labs"** | Rows glide open and the view scrolls to them. |
| **Reduced motion** | Cuts replace every tween. The growth animation is skipped, Play shows everything at once, and the orb holds still. |

Tokens are in `src/lib/motion.ts`: `ease.out` = `[0.16, 1, 0.3, 1]` and the springs `snappy` and `panel`.

## 4. Performance rules

These were measured on a laptop GPU (Intel Iris Xe) at 1440×900. At full speed, panning runs at 60 fps, zooming at 55, hovering at 59, and the spacing morph at 46. With the CPU throttled 4×, panning and hovering hold about 25 fps.

1. **No `backdrop-filter`.** Blurred panels over a starfield with any animation re-blur on every frame. Measured without a GPU, it cost about 60ms a frame even at idle.
2. **Continuous animations live in their own layer.** The travelling light and the breathing ring are drawn in an overlay SVG (`will-change: transform`), so they repaint a few paths instead of the whole chart.
3. **Overviews don't rebuild on camera moves.** The histogram and minimap dots are memoized; a pan or zoom only moves the viewport box.
4. **One animation at a time.** Node spacing updates when a zoom settles. Tweening it during the zoom would render the chart twice a frame.
5. The orb art is capped at 30 fps and pauses when off screen. HTML animates only transform and opacity.

## 5. Architecture

| Route | What it is |
|---|---|
| `/` | The timeline: title and stats, filters, the chart, the record panel and the bottom bar |
| `/explore` | The same filters and panel over a sortable table of every model |
| `/story` | The scroll story: eight chapters beside a sticky chart |
| `/models/[id]` | A static record page for each model |
| `/about` | Methodology and sourcing policy |
| `/data/models.json` | The full dataset as static JSON |

- **URL state:** filters and the picked model live in the query string (`src/lib/filters.ts`). The header search updates it in place on the chart pages and navigates to `/?model=…` elsewhere.
- **Charting:** D3 provides the scales and the zoom camera, and React renders the SVG. The time scale is piecewise-linear by year (`timescale.ts`), and the camera applies on top of it.
- **Tested logic:** `timescale.ts`, `rows.ts`, `layout.ts` (slots), `labels.ts`, `histogram.ts` and `stats.ts` have unit tests. The flows (search, filters, lab focus, spacing switch, Play, citations) have end-to-end tests.
