import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports, diffNormalized } from '../../src/core/diff.js';
import { normalizeExport } from '../../src/core/normalize.js';
import { GtmParseError, loadGtmExport, validateGtmExport } from '../../src/core/parser.js';
import type { GtmExport } from '../../src/types/gtm.js';

const fixture = (name: string) =>
  fileURLToPath(new URL(`../fixtures/${name}.json`, import.meta.url));
const wrap = (cv: Record<string, unknown>) => ({
  containerVersion: { container: { name: 'Test' }, ...cv },
});

describe('input regressions', () => {
  it('rejects the duplicate-identity fixture pair instead of hiding the first edit', async () => {
    for (const side of ['before', 'after']) {
      const path = fixture(`duplicate-identity-${side}`);
      await expect(loadGtmExport(path)).rejects.toThrow(/tag\[1\].*Duplicate identity/);
      const raw = JSON.parse(await readFile(path, 'utf8')) as GtmExport;
      expect(() => normalizeExport(raw)).toThrow(GtmParseError);
    }
  });

  it('rejects a null tag during loading with a precise location', async () => {
    await expect(loadGtmExport(fixture('malformed-entry-before'))).resolves.toBeDefined();
    await expect(loadGtmExport(fixture('malformed-entry-after'))).rejects.toThrow(
      /tag\[0\].*object/,
    );
  });

  it('compares prototype-named built-ins as ordinary identities', async () => {
    const before = await loadGtmExport(fixture('prototype-identity-before'));
    const after = await loadGtmExport(fixture('prototype-identity-after'));
    const diff = diffExports(before, after);
    expect(diff.summary.added).toBe(2);
    expect(diff.kinds[4]!.added.map((c) => c.key)).toEqual(['__proto__', 'constructor']);
    expect(diff).toMatchSnapshot();
    after.containerVersion.builtInVariable!.reverse();
    expect(diffExports(before, after)).toEqual(diff);
  });

  it('handles own prototype keys in nested data and direct normalized library inputs', () => {
    const before = normalizeExport(wrap({}) as GtmExport);
    const after = normalizeExport(wrap({}) as GtmExport);
    before.container = {};
    after.container = JSON.parse(
      '{"__proto__":{"polluted":"yes"},"constructor":"data","toString":"data"}',
    ) as Record<string, unknown>;
    const diff = diffNormalized(before, after, { before: 'a', after: 'b' });
    expect(diff.containerMeta.map((d) => [d.type, d.path])).toEqual([
      ['CREATE', ['__proto__']],
      ['CREATE', ['constructor']],
      ['CREATE', ['toString']],
    ]);
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });

  it.each([
    { tag: ['text'] },
    { tag: [{ name: 42, type: 'html' }] },
    { tag: [{ name: 'T' }] },
    { builtInVariable: [{ type: 'pageUrl', name: [] }] },
    { tag: [{ name: 'T', type: 'html', firingTriggerId: '1' }] },
    { tag: [{ name: 'T', type: 'html', parentFolderId: 1 }] },
    { tag: [{ name: 'T', type: 'html', parameter: [null] }] },
    { tag: [{ name: 'T', type: 'html', parameter: [{ type: 'list', key: 'x', list: {} }] }] },
    {
      tag: [
        {
          name: 'T',
          type: 'html',
          parameter: [{ type: 'map', key: 'x', map: [{ type: 'template' }] }],
        },
      ],
    },
    { tag: [{ name: 'T', type: 'html', parameter: [{ type: 'template', key: 'x', value: 1 }] }] },
    { tag: [{ name: 'T', type: 'html', monitoringMetadata: 'bad' }] },
    { trigger: [{ name: 'T', type: 'customEvent', filter: [null] }] },
    { trigger: [{ name: 'T', type: 'customEvent', filter: [{ type: 'equals' }] }] },
    { variable: [{ name: 'V', type: 'c', enablingTriggerId: [1] }] },
  ])('rejects malformed consumed shapes: %j', (cv) => {
    expect(() => validateGtmExport(wrap(cv), 'fixture')).toThrow(GtmParseError);
    expect(() => normalizeExport(wrap(cv) as GtmExport)).toThrow(GtmParseError);
  });

  it.each([
    {
      tag: [
        { name: 'b::c', type: 'a' },
        { name: 'c', type: 'a::b' },
      ],
    },
    { builtInVariable: [{ type: 'pageUrl' }, { type: 'pageUrl' }] },
    { folder: [{ name: 'F' }, { name: 'F' }] },
    {
      trigger: [
        { name: 'A', type: 'pageview', triggerId: '1' },
        { name: 'B', type: 'pageview', triggerId: '1' },
      ],
    },
    {
      tag: [
        {
          name: 'T',
          type: 'html',
          parameter: [
            { type: 'template', key: 'x' },
            { type: 'template', key: 'x' },
          ],
        },
      ],
    },
  ])('rejects ambiguous keys or source IDs: %j', (cv) => {
    expect(() => validateGtmExport(wrap(cv), 'fixture')).toThrow(GtmParseError);
  });

  it('keeps renames as removed plus added', () => {
    const before = wrap({ tag: [{ name: 'Old', type: 'html', tagId: '1' }] }) as GtmExport;
    const after = wrap({ tag: [{ name: 'New', type: 'html', tagId: '1' }] }) as GtmExport;
    expect(diffExports(before, after).summary).toEqual({
      added: 1,
      removed: 1,
      modified: 0,
      unchanged: 0,
    });
  });
});
