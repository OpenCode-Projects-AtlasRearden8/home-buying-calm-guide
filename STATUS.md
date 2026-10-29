# STATUS.md — home-buying-calm-guide

## What was built

A complete, local-first **first-time home buyer's manual** in plain English, with a tested static-site build. Education only — the guide consistently disclaims that it is never financial or legal advice.

### Content (`docs/`, 8 Markdown chapters)

1. `docs/index.md` — how to use the manual, chapter map
2. `docs/documents-glossary.md` — every document in a home purchase decoded (buyer agreement, loan application, purchase agreement, Loan Estimate, Closing Disclosure, note, mortgage, title commitment, inspection report, appraisal report, survey, and a quick-reference table)
3. `docs/pre-approval.md` — pre-approval without panic: pre-qual vs. pre-approval vs. underwritten approval, document-gathering list, credit-inquiry facts, six-step path, red flags, sanity checklist
4. `docs/touring-checklist.md` — the printable house-tour checklist: street/neighborhood, outside, system-by-system rooms, basement/attic, final-sweep photos, a "noticed this → what to do" triage table, and a comparison scoring method
5. `docs/inspection-vs-appraisal.md` — side-by-side comparison, what each experience is like, low-appraisal options, contingency deadlines
6. `docs/escrow-closing-day.md` — week-by-week escrow timeline, closing day step-by-step, the **Closing-Day Grid** (a who-does-what table for signing day), post-closing checklist, calm-over-panic rules
7. `docs/budget-year-one.md` — the four-part real monthly cost, 1–2% repair-fund rule, Year One punch-list priorities, three-account automation plan, sample budget, replacement-cost ladder, fill-in worksheet
8. `docs/glossary.md` — A–Z glossary of 50+ terms

### Build system

- `build.js` — zero-dependency Node (18+) script: converts all `docs/*.md` into `site/*.html` with shared chapter navigation, per-chapter pagination, a warm print-friendly stylesheet (`site/style.css`), education disclaimer on every page, and HTML-escaping of raw markdown input (XSS-safe output).
- Markdown support: headings, paragraphs, bold/italic/inline code, links (`.md` → `.html` rewriting), ordered/unordered/checkbox lists, blockquotes, pipe tables (with checkbox cells → `input type="checkbox"`), fenced code blocks, horizontal rules.
- `site/robots.txt` asks crawlers to stay away — nothing here is meant to be published.

### Tests (`test/build.test.js`, 16 assertions passing)

Verifies: build runs, all 8 pages exist with real content, stylesheet present, disclaimer on every page, full cross-page navigation, homepage routes to every chapter, **tour checklist ≥40 checkbox items**, **Closing-Day Grid table with all roles**, **glossary term coverage**, markdown-engine correctness (headings/bold/italic/code/lists/tables/blockquote/hr/link-rewriting), raw-HTML escaping, no TODO/placeholder/lorem text, no secret patterns, exact LICENSE copyright line, and README credit to Asdale Dynamics, LLC.

## How to run

```bash
node build.js        # build site/ from docs/
npm test             # build + run verification tests
# then open site/index.html in any browser (no server needed)
```

No network, no npm install, no external services. Node 18+ required (tested on Node 20.19.2).

## Verification results

- `node build.js` → builds 8 HTML pages (+ style.css, robots.txt), exit 0.
- `npm test` → **16 passed, 0 failed**.
- Manual spot-checks: tables, checkbox lists (tour checklist via browser-inspectable `input` elements), closing-day grid, and glossary lists render correctly in output HTML; no unescaped raw HTML passes through; links correctly point at same-directory `.html` files.
- Git: repository initialized on branch `main`, single plain commit ("Add first-time home buyer manual with tested static build"), committed as the existing local git identity, no co-author trailers, no push, no remote.

## Governance

- `LICENSE`: MIT, with the exact line `Copyright (c) 2026 Asdale Dynamics, LLC`.
- `README.md`: credits **Asdale Dynamics, LLC**; notes it complements `car-buying-calm-guide`.
- No secrets, API keys, or personal data anywhere in the repo (automated test enforces).

## Known gaps / future work

- Content covers a typical U.S. conventional-loan purchase; state-specific quirks (attorney-closing states, transfer taxes, regional title customs) are noted in passing but not deeply researched.
- No search function or print-optimized single-page "printable pack" in the HTML output (Markdown is the canonical copy; a future build flag could emit one combined printable HTML).
- The markdown engine covers the subset used by these docs (no nested lists, footnotes, or images); extend `build.js` if richer syntax is added later.
- Checklist "printable" experience is CSS-simple rather than a dedicated print stylesheet.
- Tests are build-level (structure/quality), not content-grammar linting.
