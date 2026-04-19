import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports } from '../../src/core/diff.js';
import { loadGtmExport } from '../../src/core/parser.js';
import { renderConsole } from '../../src/reporters/console.js';
import { renderHtml } from '../../src/reporters/html.js';
import { renderMarkdown } from '../../src/reporters/markdown.js';

const BEFORE = fileURLToPath(new URL('../fixtures/minimal-before.json', import.meta.url));
const AFTER = fileURLToPath(new URL('../fixtures/minimal-after.json', import.meta.url));

async function loadDiff() {
  const before = await loadGtmExport(BEFORE);
  const after = await loadGtmExport(AFTER);
  return diffExports(before, after, { before: 'before.json', after: 'after.json' });
}

describe('renderConsole', () => {
  it('includes summary counts and every changed entity name', async () => {
    const diff = await loadDiff();
    const out = renderConsole(diff, { color: false });
    expect(out).toContain('before.json → after.json');
    expect(out).toContain('Meta Pixel');
    expect(out).toContain('Old Pixel');
    expect(out).toContain('GA4 - Page View');
    expect(out).toContain('+2 added');
    expect(out).toContain('-1 removed');
    expect(out).toContain('~2 modified');
  });

  it('emits "No changes." when diffing against itself', async () => {
    const before = await loadGtmExport(BEFORE);
    const diff = diffExports(before, before);
    const out = renderConsole(diff, { color: false });
    expect(out).toContain('No changes.');
  });
});

describe('renderMarkdown', () => {
  it('produces a header and summary table', async () => {
    const diff = await loadDiff();
    const md = renderMarkdown(diff);
    expect(md).toContain('# GTM diff');
    expect(md).toContain('| Total |');
    expect(md).toContain('## Tags');
  });

  it('uses collapsible details for modified entities', async () => {
    const diff = await loadDiff();
    const md = renderMarkdown(diff);
    expect(md).toContain('<details>');
    expect(md).toContain('</details>');
  });
});

describe('renderHtml', () => {
  it('returns a full HTML document', async () => {
    const diff = await loadDiff();
    const html = renderHtml(diff);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<title>GTM diff</title>');
    expect(html).toContain('Meta Pixel');
  });

  it('escapes HTML characters that appear inside diff values', async () => {
    const diff = await loadDiff();
    // Inject an HTML-looking value into a modified variable's field diff to
    // prove escaping reaches into the rendered change lines, not just our
    // chrome. Mutating the already-computed diff is fine here — reporters
    // are pure functions of the diff object.
    const varDiff = diff.kinds.find((k) => k.kind === 'variable')!;
    const mod = varDiff.modified[0]!;
    if (mod.status === 'modified') {
      mod.fieldDiffs.push({
        type: 'CHANGE',
        path: ['notes'],
        oldValue: 'plain',
        value: '<script>alert(1)</script>',
      });
    }
    const html = renderHtml(diff);
    const body = html.slice(html.indexOf('<body>'));
    expect(body).not.toMatch(/<script>alert/);
    expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

