# home-buying-calm-guide

A first-time home buyer's manual in plain English — what each document means, pre-approval without panic, touring with a checklist instead of vibes, inspection vs. appraisal decoded, escrow and closing day step-by-step, and budgeting for the first year of repairs.

**Education only.** Nothing in this guide is financial, legal, tax, or medical advice. Consult licensed professionals for advice specific to your situation.

## What's inside

- **docs/** — the manual in Markdown (8 chapters):
  - `index.md` — how to use the manual
  - `documents-glossary.md` — every document in a home purchase, decoded
  - `pre-approval.md` — pre-approval without panic (with document checklist)
  - `touring-checklist.md` — the printable house-tour checklist (80+ items, with triage table)
  - `inspection-vs-appraisal.md` — the two most-confused events, side by side
  - `escrow-closing-day.md` — week-by-week escrow timeline plus the **Closing-Day Grid**
  - `budget-year-one.md` — first-year repair budgeting (1% rule, sample budget, worksheet)
  - `glossary.md` — A–Z glossary of every term you'll meet
- **build.js** — zero-dependency Node script that converts the Markdown into a static HTML site
- **site/** — generated output (`index.html`, one page per chapter, `style.css`)
- **test/build.test.js** — build verification tests

## Build and test (local-first, no network needed)

Requires Node 18+ (no npm packages are installed; there are zero dependencies).

```bash
node build.js      # builds site/ from docs/
npm test           # builds and verifies output (npm run test)
```

Or the full cycle:

```bash
npm run build && npm test
```

The site is plain static HTML/CSS. Open `site/index.html` in any browser — no server required. Nothing is published or deployed by this project; the generated `robots.txt` asks crawlers to stay away, since it's built for local reading.

## Design notes

- **Plain English, never condescending:** the same warm, step-by-step tone used across Asdale Dynamics guides.
- **Local-first:** content lives in Markdown, builds offline, no telemetry, no external services, no fonts or scripts loaded from CDNs.
- **Tested:** the test suite verifies the build output, required artifacts (tour checklist, closing-day grid, glossary), the education disclaimer on every page, escaping of raw HTML, absence of placeholder text, and presence of the LICENSE/README governance files.

## Credit

Built and maintained by **Asdale Dynamics, LLC** — beginner-friendly AI education, books, and practical tools, exploring topics like a friend would. Related project: [car-buying-calm-guide](../car-buying-calm-guide), which covers the car-dealership version of the same "big purchase, plain English" approach. More at [dylanasdale.github.io](https://dylanasdale.github.io).

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Asdale Dynamics, LLC.
