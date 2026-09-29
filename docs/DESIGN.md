# Design: the Atlas

This document defines the visual system and motion rules for AI Model Evolution. It is for anyone adding UI or animation to this repo.

## Direction and why

An earlier iteration used the common "AI product" look: a near-black background, cyan-to-violet gradients, glowing nodes, glass panels and particle fields. It read as generic, and a dark neon LLM family tree already exists that looks almost the same. We rebuilt the design from the sites people cite as the best timeline and data work:

| Reference | What we took from it |
|---|---|
| **Epoch AI**, *Notable AI Models* | A plain title with an "Updated" line. Graph/Table tabs. Direct labels on points. A tinted band for the recent era. |
| **Our World in Data** grapher | A serif title and a plain-language subtitle. A time slider with a **Play** button. A visible source line, plus Download and Share. |
| **Information is Beautiful**, *Major LLMs* | Labels next to the data instead of a legend to decode. Annotated reference lines. Color only for categories. |
| **Evolution of the Web** (Google/Hyperakt) | Each organization is a colored line ("track") running through time, with releases as stations on it. |
| **Histography** | One strong idea: every event is a dot, and density over time becomes the picture. |
| **The Pudding** | An editorial voice, confident serif headlines, and a sticky chart that scroll steps through. |

The result is an **atlas**, not a dashboard: a light page, confident editorial type, data drawn in flat print colors, and written annotations. Motion exists to show time passing.

## 1. Visual system

### Color

There is one light theme. Tokens live in `src/app/globals.css`.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#faf9f6` | Page background (warm off-white) |
| `--card` | `#ffffff` | The chart module, panels, dialogs |
| `--paper-2` | `#f2f0ea` | Subtle fills: table headers, hovered rows |
| `--ink` / `--ink-2` / `--ink-3` | `#1b1a17` / `#57544d` / `#8a867d` | Primary, secondary and tertiary text |
| `--rule` / `--rule-2` | `#e5e1d8` / `#cfc9bd` | Hairlines, and lineage lines at rest |
| `--accent` | `#c8391f` | Vermilion. "Today", kickers, the play cursor |
| `--highlight` | `#fbe7a1` | Highlighter yellow for the story's era band |
| `--focus` | `#1d4ed8` | Keyboard focus ring |

- **Lab colors** live in `data/organizations.yaml`. They are flat, mid-dark print colors chosen to read on white.
- **Text is always ink.** Labels are never colored; the dot carries the color, as on Information is Beautiful and Epoch.
- **Never used:** gradients on text or buttons, glows, `backdrop-filter`, and particle or noise backgrounds.

### Typography

| Role | Face | Style |
|---|---|---|
| Headlines, story, record titles | **Newsreader** (optical size) | 500–600, `opsz` follows the size, tracking −0.02em at display sizes |
| Long-form text (story, about) | Newsreader | 18–20px / 1.6 |
| UI, labels, tables | Geist Sans | 12–14px; tabular figures for numbers |
| Kickers | Geist Sans | 12px, uppercase, 0.08em tracking, 600, `--accent` |

Monospace is not used for decoration.

### The chart's encoding

- **Tracks:** one row per lab. A thin track line in the lab's color runs from its first release to its last.
- **Stations:** a dot per release, at its release date. A filled dot means open weights; a ring means closed. Dots that would overlap stack into sub-rows.
- **Labels:** labels are placed where there is room, in priority order: story milestones first, then family roots, then the newest models. Every label has a paper-colored halo so it reads over lines. Hover or zoom reveals the rest. This replaces pills and staircases.
- **Lineage:** hairline curves at rest. Successor lines are solid, derived dashed, distilled dotted, and "builds on" faint. On hover or selection, the lineage redraws in the child's lab color and everything else fades.
- **Annotations:** a written track above the chart marks the turning points (ChatGPT, LLaMA, o1, DeepSeek-R1…), with dashed rules through the lanes.
- **Today:** a vermilion rule labeled "Today".

## 2. Motion

**Principle:** motion shows time, relationships, or where you are. It never decorates.

| Moment | Behavior |
|---|---|
| **First load: growth** (≈1.8s, once per page load) | A cursor sweeps from 2017 to today. Tracks extend and dots pop in as it passes, and labels appear as they find room. |
| **Play** (OWID-style) | Replays history in about 14 seconds with a running year counter. It can be paused or scrubbed on the navigator. |
| **Hover** | The dot grows 1.35× with a soft ring in its lab color. Its lineage redraws and the rest fades to 15%. |
| **Select** | The camera eases to the model (0.6s). A ring pulses once and the record panel slides in. |
| **Filter** | Non-matching models fade. In "hide" mode they shrink away and rows glide into their new packing. |
| **Story** | A sticky chart's highlighter band glides between chapter eras as you scroll. Key models get labels. |
| **Reduced motion** | Cuts replace every tween. The growth animation and Play are skipped or instant. |

**Tokens** (`src/lib/motion.ts`):
- Easing: `ease.out` = `[0.16, 1, 0.3, 1]`, `ease.inOut` = `[0.65, 0, 0.35, 1]`.
- Springs: `snappy` for toggles and highlights, `panel` for the record panel.
- Performance: nothing animates a filter, shadow or blur per frame, and HTML animations use transform and opacity only. Label placement is recomputed per camera frame, which costs under 1 ms for 150 models.

## 3. Architecture

| Route | What it is |
|---|---|
| `/` | Masthead, the embedded chart module, the scroll story, and a methodology note |
| `/explore` | The same module, full screen, for deep links (`?model=`, filters, view) |
| `/models/[id]` | A static record page for each model |
| `/about` | Methodology and sourcing policy |
| `/data/models.json` | The full dataset as static JSON, the target of "Download data" |

- **Charting:** D3 provides scales, ticks and the zoom camera; React owns the DOM. Motion (Framer Motion) handles UI transitions.
- **Label placement:** a greedy, priority-ordered placement in `src/lib/labels.ts`, unit tested.
