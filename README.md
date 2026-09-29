# AI Model Evolution

An interactive, sourced atlas of AI models from the Transformer in 2017 to today. It shows what was released, when, by whom, what it can do, and how each model descends from earlier ones.

- **Timeline:** each lab is a track and each release a dot on its announcement date. Lineage lines connect successors, fine-tunes and distillations. Annotations mark the turning points.
- **Play** replays history from 2017. You can also search (⌘K), filter by lab, type, modality, openness and year, or switch to a sortable table.
- **Records:** every model has a record page. Each fact in it is cited, and the numbered sources are listed at the end.
- **Story:** a scroll-driven story walks through eight eras.
- **Data:** the whole dataset downloads as JSON from `/data/models.json`.

The visual system and motion rules, and the reference sites they're based on, are in [docs/DESIGN.md](docs/DESIGN.md).

> **Data status:** all 132 records are **drafts**. An AI assistant compiled them from primary sources, and no person has reviewed them yet. Sources that were fetched and checked carry an `accessed` date. See [the methodology page](src/app/about/page.tsx).

## Getting started

Requires Node 20.9+ (Node 24 recommended).

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run build` | Builds a fully static site into `out/`. Any static host works. |
| `npm start` | Serves `out/` locally. |
| `npm run validate` | Validates every data file: schema, citations, relations, dates, cycles. |
| `npm run schema` | Regenerates `schema/*.schema.json` from the Zod schemas. |
| `npm test` | Runs the unit tests (Vitest). |
| `npm run test:e2e` | Runs the end-to-end tests (Playwright) against `out/`. Run `npm run build` first. |
| `npm run check` | Runs validate, typecheck, lint and unit tests together. CI runs these, then the build and e2e tests. |

## Adding or correcting a model

Each model is one YAML file in `data/models/<lab>/<id>.yaml`. Your editor can validate it against `schema/model.schema.json`. Here's a shortened example:

```yaml
id: llama-2
name: Llama 2
org: meta
family: Llama
releaseDate: 2023-07-18          # YYYY, YYYY-MM or YYYY-MM-DD
type: llm                        # llm | reasoning | multimodal | image | video | audio | embedding | code
modalities: {input: [text], output: [text]}
openness: open-weights           # closed | open-weights | open-source
license: Llama 2 Community License
architecture: Decoder-only transformer
parameters: {disclosed: true, total: 70e9}
contextWindow: 4096
summary: >-
  LLaMA's successor, released for commercial use...
variants:
  - name: Llama 2 7B
    parameters: {disclosed: true, total: 7e9}
relations:
  - target: llama                # the older model's id
    type: successor-of           # successor-of | derived-from | distilled-from | inspired-by
sources:
  - id: blog
    url: https://ai.meta.com/blog/llama-2/
    title: Meta and Microsoft Introduce the Next Generation of Llama
    publisher: Meta AI
    accessed: 2026-09-30         # only once you've opened the source and checked it
citations:                       # field -> source ids
  releaseDate: [blog]
  org: [blog]
  openness: [blog]
  parameters: [blog]
status: draft                    # verified only after a person checks every claim
updated: 2026-09-30
```

`npm run validate` (and the build) enforces these rules:
- Release date, lab and openness are cited, and so are parameters when they're disclosed.
- Every citation and relation resolves to a real source or model.
- No model is dated before a model it succeeds or derives from, and the lineage has no cycles.
- Every source of a `verified` record has an `accessed` date.

Labs, with their colors and row order, are in `data/organizations.yaml`.

## How it's built

| Area | Where |
|---|---|
| Framework | Next.js 16 (App Router, `output: "export"`), TypeScript, Tailwind CSS 4. Pages are generated at build time from the YAML data. |
| Chart | D3 provides scales, ticks and the zoom camera; React renders the SVG (`src/components/timeline/`). Direct labels are placed by a small greedy algorithm (`src/lib/labels.ts`). |
| Motion | Motion (Framer Motion) animates the UI. CSS and a single rAF loop animate the chart. Everything respects `prefers-reduced-motion`. |
| Data | Loading (`src/lib/data.ts`), schema (`src/lib/schema.ts`) and cross-file validation (`src/lib/validate.ts`) are shared by the site, the validator script and the tests. |
| URL state | Filters, view and the selected model live in the query string, so any view can be shared (`src/lib/filters.ts`). |

When you build on Windows, `scripts/fix-export-segments.ts` runs after `next build`. It works around a Next.js static-export bug that writes the client router's prefetch files into nested folders instead of dot-joined names. On other platforms it does nothing.

## Roadmap

- An extraction pipeline that watches papers, repositories and announcements, then opens a pull request with a sourced `draft` record for each new release.
- Human review, to promote records to `verified`.
- Compare mode, a mini-graph of each model's lineage, and share images for each model.
