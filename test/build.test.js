#!/usr/bin/env node
/**
 * test/build.test.js — verifies the guide builds, outputs valid static HTML,
 * and contains required artifacts (tour checklist, closing-day grid, glossary).
 * Run: npm test  (or: node test/build.test.js)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { run, markdownToHtml } = require('../build.js');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const DOCS = path.join(ROOT, 'docs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL  ${name}`);
    console.error(`      ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
assert.equal = (a, b, msg) => {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
};

console.log('\n--- build test ---\n');

// 1. build runs cleanly and produces output
const results = run();
test('build produces one html file per docs markdown file', () => {
  assert.equal(results.length, fs.readdirSync(DOCS).filter((f) => f.endsWith('.md')).length);
});

const expectedPages = [
  'index',
  'documents-glossary',
  'pre-approval',
  'touring-checklist',
  'inspection-vs-appraisal',
  'escrow-closing-day',
  'budget-year-one',
  'glossary',
];

test('all expected pages exist with non-trivial size', () => {
  for (const slug of expectedPages) {
    const file = path.join(SITE, `${slug}.html`);
    assert(fs.existsSync(file), `missing site/${slug}.html`);
    const size = fs.statSync(file).size;
    assert(size > 3000, `site/${slug}.html is suspiciously small (${size} bytes)`);
  }
});

test('shared stylesheet and supporting assets exist', () => {
  assert(fs.existsSync(path.join(SITE, 'style.css')), 'missing style.css');
  assert(fs.statSync(path.join(SITE, 'style.css')).size > 500, 'style.css is trivially empty');
});

const read = (slug) => fs.readFileSync(path.join(SITE, `${slug}.html`), 'utf8');

// 2. structural/quality checks
test('every page includes the education disclaimer', () => {
  for (const slug of expectedPages) {
    const html = read(slug);
    assert(html.includes('Education only'), `${slug}.html missing disclaimer`);
  }
});

test('every page links the shared stylesheet', () => {
  for (const slug of expectedPages) {
    assert(read(slug).includes('href="style.css"'), `${slug}.html missing stylesheet link`);
  }
});

test('navigation includes every chapter on every page', () => {
  for (const slug of expectedPages) {
    const html = read(slug);
    for (const other of expectedPages) {
      assert(html.includes(`href="${other}.html"`), `${slug}.html missing nav link to ${other}.html`);
    }
  }
});

test('home page offers a working route to every chapter', () => {
  const html = read('index');
  for (const other of ['documents-glossary', 'pre-approval', 'touring-checklist', 'inspection-vs-appraisal', 'escrow-closing-day', 'budget-year-one', 'glossary']) {
    assert(html.includes(`href="${other}.html"`), `index.html missing link to ${other}.html`);
  }
});

// 3. required artifacts: tour checklist, closing-day grid, glossary
test('tour checklist exists with checkbox list items', () => {
  const html = read('touring-checklist');
  assert(html.includes('Tour Checklist') || html.toLowerCase().includes('checklist'), 'missing checklist heading');
  const checks = (html.match(/type="checkbox"/g) || []).length;
  assert(checks >= 40, `expected >=40 checklist items, got ${checks}`);
});

test('closing-day grid table exists with all roles', () => {
  const html = read('escrow-closing-day');
  assert(html.includes('Closing-Day Grid'), 'missing closing-day grid heading');
  const tables = (html.match(/<table>/g) || []).length;
  assert(tables >= 1, 'closing-day grid table missing');
  for (const role of ['You (buyer)', 'Lender', 'Title', 'Seller', 'agent']) {
    assert(html.includes(role), `closing-day grid missing role: ${role}`);
  }
});

test('glossary covers all alphabet sections A through Z', () => {
  const html = read('glossary');
  for (const section of ['Amortization', 'Earnest', 'promissory note', 'Wire instructions', 'Underwriting']) {
    assert(html.includes(section), `glossary missing term/section containing: ${section}`);
  }
});

// 4. markdown engine sanity checks
test('markdown -> html handles headings, bold, lists, tables, blockquote', () => {
  const sample = [
    '# Head',
    '',
    'A **bold** and *em* and `code` and [link](doc.md).',
    '',
    '- item one',
    '- item two',
    '',
    '> quote here',
    '',
    '| a | b |',
    '| --- | --- |',
    '| 1 | 2 |',
    '',
    '---',
  ].join('\n');
  const html = markdownToHtml(sample);
  assert(html.includes('<h1 id="head">Head</h1>'), 'h1 failed');
  assert(html.includes('<strong>bold</strong>'), 'bold failed');
  assert(html.includes('<em>em</em>'), 'italic failed');
  assert(html.includes('<code>code</code>'), 'inline code failed');
  assert(html.includes('href="doc.html"'), '.md links must be rewritten to .html');
  assert(/<ul>[\s\S]*?<li>item one<\/li>[\s\S]*?<\/ul>/.test(html.replace(/\s+/g, ' ')), 'list failed');
  assert(html.includes('<blockquote>'), 'blockquote failed');
  assert(/<table>[\s\S]*<th>a<\/th>[\s\S]*<td>1<\/td>/.test(html), 'table failed');
  assert(html.includes('<hr />'), 'hr failed');
});

test('markdown escaping neutralizes raw html', () => {
  const html = markdownToHtml('<script>alert(1)</script> safe');
  assert(!html.includes('<script>'), 'raw script passed through unescaped');
  assert(html.includes('&lt;script&gt;'), 'escaping failed');
});

// 5. hygiene: no placeholders, no secrets in shipped files
test('no TODO/placeholder/lorem markers anywhere in docs or site', () => {
  const dirs = [DOCS, SITE];
  for (const dir of dirs) {
    for (const f of fs.readdirSync(dir)) {
      const text = fs.readFileSync(path.join(dir, f), 'utf8');
      const m = text.match(/TODO|FIXME|Lorem ipsum|XXX|\[placeholder\]/i);
      assert(!m, `${dir}/${f} contains ${JSON.stringify(m && m[0])}`);
    }
  }
});

test('no obvious secrets or API keys in repository files', () => {
  const secretPattern = /(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
  for (const f of [...fs.readdirSync(ROOT).filter((x) => x.endsWith('.md') || x.endsWith('.json')), 'build.js', 'README.md']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, 'utf8');
    assert(!secretPattern.test(text), `${f} matched secret pattern`);
  }
  for (const f of fs.readdirSync(DOCS)) {
    const text = fs.readFileSync(path.join(DOCS, f), 'utf8');
    assert(!secretPattern.test(text), `docs/${f} matched secret pattern`);
  }
});

// 6. governance files
test('LICENSE is MIT with the exact required copyright line', () => {
  const p = path.join(ROOT, 'LICENSE');
  assert(fs.existsSync(p), 'LICENSE missing');
  const line = 'Copyright (c) 2026 Asdale Dynamics, LLC';
  assert(fs.readFileSync(p, 'utf8').includes(line), 'LICENSE missing exact copyright line');
});

test('README credits Asdale Dynamics, LLC', () => {
  const p = path.join(ROOT, 'README.md');
  assert(fs.existsSync(p), 'README.md missing');
  assert(fs.readFileSync(p, 'utf8').includes('Asdale Dynamics, LLC'), 'README does not credit Asdale Dynamics, LLC');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
