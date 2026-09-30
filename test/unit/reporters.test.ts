import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports } from '../../src/core/diff.js';
import { loadGtmExport } from '../../src/core/parser.js';
import { renderConsole } from '../../src/reporters/console.js';
import { renderHtml } from '../../src/reporters/html.js';
import { renderMarkdown } from '../../src/reporters/markdown.js';
import {
  formatPath,
  formatValue,
  sanitizeLabel,
  splitIdentityKey,
} from '../../src/reporters/shared.js';

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

  it('escapes HTML in entity names, not just values', async () => {
    // Entity names are attacker-controllable by anyone who can edit the
    // container, and they take a different code path to the report than
    // field values do. A diff report is exactly the artifact a reviewer
    // opens in a browser without thinking about it.
    const before = await loadGtmExport(BEFORE);
    const after = await loadGtmExport(AFTER);
    const diff = diffExports(before, after);
    const tagDiff = diff.kinds.find((k) => k.kind === 'tag')!;
    const change = tagDiff.added[0] ?? tagDiff.removed[0] ?? tagDiff.modified[0]!;
    change.key = 'html::<img src=x onerror=alert(1)>';

    const html = renderHtml(diff);
    const body = html.slice(html.indexOf('<body>'));
    expect(body).not.toContain('<img src=x');
    expect(body).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('sanitizeLabel', () => {
  it('drops control characters that could rewrite terminal output', () => {
    const esc = String.fromCharCode(0x1b);
    // A name like this lets one entity's line move the cursor up and paint
    // over another entity's line, hiding a change in a review tool.
    expect(sanitizeLabel(`Meta Pixel${esc}[2A${esc}[2K`)).toBe('Meta Pixel[2A[2K');
    expect(sanitizeLabel('two\nlines')).toBe('twolines');
    expect(sanitizeLabel(`del${String.fromCharCode(0x7f)}`)).toBe('del');
  });

  it('leaves ordinary and non-ASCII names alone', () => {
    expect(sanitizeLabel('GA4 - Page View')).toBe('GA4 - Page View');
    expect(sanitizeLabel('Тег — Метрика')).toBe('Тег — Метрика');
  });
});

describe('displayIdentity', () => {
  it('strips control characters out of both name and type', () => {
    const esc = String.fromCharCode(0x1b);
    const { type, name } = splitIdentityKey(`ht${esc}ml::Meta${esc}[31m Pixel`);
    expect(type).toBe('html');
    expect(name).toBe('Meta[31m Pixel');
  });
});

describe('hostile reporter fixture pair', () => {
  async function hostileDiff() {
    const before = await loadGtmExport(
      fileURLToPath(new URL('../fixtures/reporter-hostile-before.json', import.meta.url)),
    );
    const after = await loadGtmExport(
      fileURLToPath(new URL('../fixtures/reporter-hostile-after.json', import.meta.url)),
    );
    return diffExports(before, after, {
      before: before.containerVersion.container.name,
      after: after.containerVersion.container.name,
    });
  }

  it('sanitizes source labels and visibly escapes controls in paths and values', async () => {
    const text = renderConsole(await hostileDiff(), { color: false });
    for (const cp of [0x1b, 0x85, 0x9b, 0x2028])
      expect(text).not.toContain(String.fromCharCode(cp));
    expect(text).toContain('\\u009b');
    expect(text).toContain('\\u0085');
    expect(text).toContain('\\u2028');
    expect(text).toMatchSnapshot();
  });

  it('uses HTML escaping in Markdown summaries and safe source/type labels', async () => {
    const md = renderMarkdown(await hostileDiff());
    const summaries = md
      .split('\n')
      .filter((line) => line.startsWith('<summary>'))
      .join('\n');
    expect(summaries).not.toContain('<img');
    expect(summaries).toContain('&lt;img');
    expect(summaries).toContain('&amp;');
    expect(md.split('\n')[0]).toBe(
      '# GTM diff: <code>`&lt;&amp;&quot;&#39;&gt;[2A</code> → <code>`&lt;&amp;&quot;&#39;&gt;[2A</code>',
    );
    expect(md).toContain('<code>html`&lt;b&gt;&amp;</code>');
    expect(md.split('\n').filter((line) => line === '```')).toHaveLength(3);
    expect(md).toMatchSnapshot();
  });

  it('escapes every HTML data context including metadata, paths, names, types and labels', async () => {
    const html = renderHtml(await hostileDiff());
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;');
    expect(html).toContain('&#39;');
    expect(html).toMatchSnapshot();
  });

  it('visibly encodes C1 characters rather than erasing value differences', () => {
    expect(formatValue('a\u009bb')).toBe('"a\\u009bb"');
    expect(formatValue({ nested: 'a\u0085b' })).toContain('a\\u0085b');
    expect(formatPath(['a\u009bb'])).toBe('["a\\u009bb"]');
    expect(sanitizeLabel('one\u2028two\u2029three')).toBe('onetwothree');
  });
});
