import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports } from '../../src/core/diff.js';
import { loadGtmExport } from '../../src/core/parser.js';
import { renderHtml } from '../../src/reporters/html.js';
import { COMMENT_MARKER, renderMarkdown } from '../../src/reporters/markdown.js';

async function diff(name: string) {
  const load = (side: string) =>
    loadGtmExport(fileURLToPath(new URL(`../fixtures/${name}-${side}.json`, import.meta.url)));
  return diffExports(await load('before'), await load('after'));
}

describe('report details and comment budgets', () => {
  it('adds escaped full configurations only when requested', async () => {
    const data = await diff('reporter-hostile');
    for (const render of [renderMarkdown, renderHtml]) {
      expect(render(data)).not.toContain('Full normalized configuration');
      const full = render(data, { full: true });
      expect(full).toContain('Full normalized configuration');
      expect(full).toContain('&lt;img');
      // Markdown code fences are inert text; its HTML fragments must be escaped.
      const htmlContext =
        render === renderMarkdown ? full.replace(/```diff\n[\s\S]*?\n```/g, '') : full;
      expect(htmlContext).not.toContain('<img');
      expect(htmlContext).not.toContain('<script>');
      expect(full).not.toMatch(/[\u001b\u0085\u009b\u2028]/);
      expect(full).toMatchSnapshot();
    }
  });

  it('does not truncate nested metadata or entity values in full mode', async () => {
    const data = await diff('json-report');
    const value = { content: 'x'.repeat(400), end: 'end of the value' };
    data.containerMeta.push({ type: 'CREATE', path: ['large'], value });
    const change = data.kinds[0]!.modified[0]!;
    if (change.status !== 'modified') throw new Error('Expected modified entity');
    change.fieldDiffs.push({ type: 'CREATE', path: ['large'], value });
    for (const render of [renderMarkdown, renderHtml]) {
      expect(render(data)).not.toContain('end of the value');
      expect(render(data, { full: true }).match(/end of the value/g)).toHaveLength(2);
      expect(render(data, { full: true })).toContain('keep the full removed entity');
      expect(render(data, { full: true })).toContain('keep the full added entity');
    }
  });

  it('keeps complete Markdown when it fits exactly, counting UTF-8 bytes', async () => {
    const data = await diff('minimal');
    data.source.label = 'Источник';
    const complete = renderMarkdown(data, { maxBytes: 100_000 });
    const size = Buffer.byteLength(complete);
    expect(renderMarkdown(data, { maxBytes: size })).toBe(complete);
    expect(renderMarkdown(data, { maxBytes: size - 1 })).toContain('details omitted');
    expect(complete.startsWith(COMMENT_MARKER + '\n')).toBe(true);
  });

  it('returns a complete bounded summary with coverage and an escaped artifact link', async () => {
    const data = await diff('coverage');
    data.source.label = '界'.repeat(2000);
    const report = renderMarkdown(data, {
      full: true,
      maxBytes: 1024,
      artifactUrl: 'https://example.invalid/report?a=1&b=2',
    });
    expect(Buffer.byteLength(report)).toBeLessThanOrEqual(1024);
    expect(report).toContain('Coverage: incomplete');
    expect(report).toContain('Source labels and details omitted');
    expect(report).toContain('a=1&amp;b=2');
    expect(report).not.toContain('<details>');
    expect(report).not.toContain('```');
    expect(report).toMatchSnapshot();
  });

  it.each([
    'javascript:alert(1)',
    'http://example.invalid',
    'https://user:pass@example.invalid',
    'https://example.invalid/\nunsafe',
  ])('rejects unsafe artifact URLs: %s', async (artifactUrl) => {
    const data = await diff('minimal');
    expect(() => renderMarkdown(data, { maxBytes: 1024, artifactUrl })).toThrow();
  });

  it('rejects invalid byte budgets and artifact links that cannot fit', async () => {
    const data = await diff('minimal');
    for (const maxBytes of [0, 1023, 1024.5, Infinity]) {
      expect(() => renderMarkdown(data, { maxBytes })).toThrow('integer of at least 1024');
    }
    expect(() => renderMarkdown(data, { artifactUrl: 'https://example.invalid' })).toThrow(
      'requires maxBytes',
    );
    expect(() =>
      renderMarkdown(data, {
        maxBytes: 1024,
        artifactUrl: 'https://example.invalid/' + 'x'.repeat(2000),
      }),
    ).toThrow('too long');
  });
});
