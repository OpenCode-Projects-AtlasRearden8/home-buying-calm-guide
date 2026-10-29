#!/usr/bin/env node
/**
 * build.js — static site generator for home-buying-calm-guide
 * Converts docs/*.md into site/*.html with a shared stylesheet.
 * Zero dependencies. Runs fully offline/local.
 *
 * Usage: node build.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DOCS_DIR = path.join(ROOT, 'docs');
const SITE_DIR = path.join(ROOT, 'site');

const SITE_TITLE = 'Home Buying, Calm';
const SITE_TAGLINE = 'A first-time home buyer\'s manual in plain English';
const CREDIT = 'An Asdale Dynamics, LLC project';

const DISCLAIMER =
  'Education only. This guide is not financial, legal, tax, or medical advice. ' +
  'Consult licensed professionals for advice specific to your situation.';

/* ---------------- markdown -> html ---------------- */

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    return `<a href="${linkMarkdownToHtml(href)}">${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
  return s;
}

function linkMarkdownToHtml(href) {
  if (/^https?:|^mailto:|^#/.test(href)) return href;
  if (href.endsWith('.html')) return href;
  if (href.endsWith('.md')) return href.replace(/\.md$/, '.html');
  return href;
}

/** Convert a markdown string (heading subset: h1-h4, paragraphs, ul/ol,
 *  checkbox lists, blockquotes, tables, hr, inline code/bold/italic/links). */
function markdownToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  let inList = null; // 'ul' | 'ol'
  let listItems = [];

  const closeList = () => {
    if (inList && listItems.length) out.push(`<${inList}>\n${listItems.join('\n')}\n</${inList}>`);
    inList = null;
    listItems = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      closeList();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // closing fence
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // horizontal rule
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      closeList();
      out.push('<hr />');
      i++;
      continue;
    }

    // heading
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      const raw = h[2].trim();
      const id = raw.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      out.push(`<h${level} id="${id}">${inline(raw)}</h${level}>`);
      i++;
      continue;
    }

    // table
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:\-|]+\|\s*$/.test(lines[i + 1])) {
      closeList();
      const parseRow = (r) => r.trim().replace(/^\||\|\s*$/g, '').split('|').map((c) => c.trim());
      const headers = parseRow(line);
      i += 2;
      const body = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) {
        body.push(parseRow(lines[i]));
        i++;
      }
      const html =
        '<table>\n<thead>\n<tr>\n' +
        headers.map((c) => `<th>${inline(c)}</th>`).join('\n') +
        '\n</tr>\n</thead>\n<tbody>\n' +
        body
          .map(
            (row) =>
              '<tr>\n' +
              row
                .map((c) => {
                  const m = c.match(/^☐\s*(.*)$/);
                  if (m) return `<td><input type="checkbox" disabled /> ${inline(m[1])}</td>`;
                  return `<td>${inline(c)}</td>`;
                })
                .join('\n') +
              '\n</tr>'
          )
          .join('\n') +
        '\n</tbody>\n</table>';
      out.push(html);
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      closeList();
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote><p>${inline(buf.join(' '))}</p></blockquote>`);
      continue;
    }

    // list item (checkbox, ordered, unordered)
    const checkbox = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/);
    const unordered = line.match(/^\s*[-*]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (checkbox || unordered || ordered) {
      const kind = ordered ? 'ol' : 'ul';
      if (inList !== kind) closeList();
      inList = kind;
      const item = inline((checkbox ? checkbox[2] : (unordered || ordered)[1]).replace(/\\/g, ''));
      listItems.push(
        checkbox
          ? `<li class="check"><input type="checkbox" disabled /> ${item}</li>`
          : `<li>${item}</li>`
      );
      i++;
      continue;
    }

    // blank line
    if (/^\s*$/.test(line)) {
      closeList();
      i++;
      continue;
    }

    // paragraph (gather until blank/structure)
    closeList();
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,4}\s|>\s?|\s*[-*]\s+|\s*\d+\.\s+\S|\||-{3,})/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  closeList();
  return out.join('\n');
}

/* ---------------- site assembly ---------------- */

function extractTitle(md, fallback) {
  const h1 = md.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : fallback;
}

function buildPageHtml(title, bodyHtml, activeSlug, allPages) {
  const nav = allPages
    .map(
      (p) =>
        `<li><a href="${p.slug}.html"${p.slug === activeSlug ? ' class="active" aria-current="page"' : ''}>${p.title}</a></li>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="${escapeHtml(title)} — ${SITE_TAGLINE}. Education only, never financial advice." />
<title>${escapeHtml(title)} · ${SITE_TITLE}</title>
<link rel="stylesheet" href="style.css" />
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <p class="brand"><a href="index.html">${SITE_TITLE}</a></p>
    <p class="tagline">${SITE_TAGLINE}</p>
  </div>
</header>
<div class="wrap layout">
  <nav aria-label="Chapters" class="side">
    <h2>Chapters</h2>
    <ul>
${nav}
    </ul>
    <p class="credit">${CREDIT}</p>
  </nav>
  <main id="main" class="content">
${bodyHtml}
    <hr />
    <p class="disclaimer">${DISCLAIMER}</p>
    <p class="pager">
      ${
        (function () {
          const idx = allPages.findIndex((p) => p.slug === activeSlug);
          const prev = allPages[idx - 1];
          const next = allPages[idx + 1];
          const parts = [];
          if (prev) parts.push(`<a href="${prev.slug}.html">← ${prev.title}</a>`);
          if (next) parts.push(`<a href="${next.slug}.html">${next.title} →</a>`);
          return parts.join(' · ') || '';
        })()
      }
    </p>
  </main>
</div>
<footer class="site-footer">
  <div class="wrap">
    <p>${CREDIT} · MIT licensed · <a href="https://github.com/dylanasdale">dylanasdale.github.io</a></p>
  </div>
</footer>
</body>
</html>
`;
}

function buildCss() {
  return `/* home-buying-calm-guide — warm, calm, readable. MIT licensed. */
:root {
  --bg: #faf7f2;
  --paper: #ffffff;
  --ink: #33413e;
  --muted: #6b7a76;
  --accent: #3e7c6c;
  --accent-soft: #e3efeb;
  --line: #e4ded4;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 17px/1.65 Georgia, "Times New Roman", serif;
}
a { color: var(--accent); }
code {
  font: 0.85em/1.4 "SFMono-Regular", Consolas, monospace;
  background: var(--accent-soft);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
pre code { display: block; padding: 0.9em; overflow-x: auto; }
.wrap { max-width: 1060px; margin: 0 auto; padding: 0 1.2rem; }
.skip { position: absolute; left: -999px; }
.skip:focus { left: 1rem; top: 1rem; background: var(--paper); padding: 0.5rem; }

.site-header { background: var(--accent); color: #fff; padding: 1.4rem 0 1.2rem; }
.site-header .brand { margin: 0; font-size: 1.5rem; font-family: Verdana, sans-serif; }
.site-header .brand a { color: #fff; text-decoration: none; }
.site-header .tagline { margin: 0.15rem 0 0; color: var(--accent-soft); }

.layout { display: flex; gap: 2rem; padding-top: 2rem; padding-bottom: 3rem; align-items: flex-start; }
.side {
  flex: 0 0 240px;
  font-family: Verdana, sans-serif;
  font-size: 0.82rem;
  border-right: 1px solid var(--line);
  padding-right: 1.4rem;
}
.side h2 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 0.6rem; }
.side ul { list-style: none; margin: 0; padding: 0; }
.side a { display: block; padding: 0.28rem 0.5rem; border-radius: 6px; text-decoration: none; }
.side a:hover { background: var(--accent-soft); }
.side a.active { background: var(--accent); color: #fff; }
.credit { color: var(--muted); margin-top: 1.2rem; }
.content { flex: 1; min-width: 0; }
.content h1 { font-family: Verdana, sans-serif; font-size: 1.65rem; line-height: 1.25; margin: 0 0 1rem; }
.content h2 { font-family: Verdana, sans-serif; font-size: 1.2rem; margin-top: 2rem; border-bottom: 1px solid var(--line); padding-bottom: 0.3rem; }
.content h3 { font-family: Verdana, sans-serif; font-size: 1rem; margin-top: 1.5rem; }
blockquote {
  margin: 1.2rem 0;
  padding: 0.8rem 1.1rem;
  background: var(--accent-soft);
  border-left: 4px solid var(--accent);
  border-radius: 0 8px 8px 0;
}
blockquote p { margin: 0; }
table { border-collapse: collapse; width: 100%; margin: 1.2rem 0; font-size: 0.92rem; }
th, td { border: 1px solid var(--line); padding: 0.5rem 0.65rem; text-align: left; vertical-align: top; }
th { background: var(--accent-soft); font-family: Verdana, sans-serif; font-size: 0.78rem; }
tr:nth-child(even) td { background: #fafaf7; }
li.check { list-style: none; margin-left: -1.4rem; }
ul > li.check { padding-left: 0.1rem; }
input[type="checkbox"] { accent-color: var(--accent); margin-right: 0.35rem; }
.disclaimer {
  font-size: 0.82rem; color: var(--muted);
  background: var(--accent-soft); border-radius: 8px;
  padding: 0.7rem 0.9rem;
}
.pager { display: flex; gap: 1rem; flex-wrap: wrap; font-family: Verdana, sans-serif; font-size: 0.82rem; }
.site-footer { background: var(--ink); color: var(--accent-soft); padding: 1.2rem 0; font-size: 0.85rem; }
.site-footer a { color: #fff; }

@media (max-width: 760px) {
  .layout { flex-direction: column; }
  .side { border-right: 0; padding-right: 0; flex-basis: auto; width: 100%; }
}
`;
}

/* ---------------- build ---------------- */

function run() {
  const pages = [];
  const files = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();

  // read all markdown, gather titles + slugs so nav can link everyone
  const sources = files.map((f) => {
    const slug = f.replace(/\.md$/, '');
    const md = fs.readFileSync(path.join(DOCS_DIR, f), 'utf8');
    return { slug, md, title: extractTitle(md, slug) };
  });

  for (const src of sources) {
    const bodyHtml = markdownToHtml(src.md);
    pages.push({
      slug: src.slug,
      title: src.title,
      html: buildPageHtml(src.title, bodyHtml, src.slug, sources),
    });
  }

  fs.rmSync(SITE_DIR, { recursive: true, force: true });
  fs.mkdirSync(SITE_DIR, { recursive: true });
  for (const p of pages) {
    fs.writeFileSync(path.join(SITE_DIR, `${p.slug}.html`), p.html);
  }
  fs.writeFileSync(path.join(SITE_DIR, 'style.css'), buildCss());
  fs.writeFileSync(
    path.join(SITE_DIR, 'robots.txt'),
    '# local-first build; not published anywhere\nUser-agent: *\nDisallow: /\n'
  );

  return pages.map((p) => ({ slug: p.slug, bytes: fs.statSync(path.join(SITE_DIR, `${p.slug}.html`)).size }));
}

module.exports = { run, markdownToHtml, inline, escapeHtml, linkMarkdownToHtml };

if (require.main === module) {
  const results = run();
  for (const r of results) console.log(`  built ${r.slug}.html (${r.bytes} bytes)`);
  console.log(`Done: ${results.length} page(s) in site/`);
}
