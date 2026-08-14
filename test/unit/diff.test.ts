import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports, hasChanges } from '../../src/core/diff.js';
import { loadGtmExport } from '../../src/core/parser.js';

const BEFORE = fileURLToPath(new URL('../fixtures/minimal-before.json', import.meta.url));
const AFTER = fileURLToPath(new URL('../fixtures/minimal-after.json', import.meta.url));

describe('diffExports', () => {
  it('detects added, removed, modified across the fixture pair', async () => {
    const before = await loadGtmExport(BEFORE);
    const after = await loadGtmExport(AFTER);
    const diff = diffExports(before, after);

    const tags = diff.kinds.find((k) => k.kind === 'tag')!;
    expect(tags.added.map((c) => c.key)).toEqual(['html::Meta Pixel']);
    expect(tags.removed.map((c) => c.key)).toEqual(['html::Old Pixel']);
    expect(tags.modified.map((c) => c.key)).toEqual(['gaawe::GA4 - Page View']);
  });

  it('detects an added built-in variable', async () => {
    const before = await loadGtmExport(BEFORE);
    const after = await loadGtmExport(AFTER);
    const diff = diffExports(before, after);

    const biv = diff.kinds.find((k) => k.kind === 'builtInVariable')!;
    expect(biv.added.map((c) => c.key)).toEqual(['pagePath']);
    expect(biv.removed).toHaveLength(0);
  });

  it('detects a modified variable (GA4 Config measurementId)', async () => {
    const before = await loadGtmExport(BEFORE);
    const after = await loadGtmExport(AFTER);
    const diff = diffExports(before, after);

    const vars = diff.kinds.find((k) => k.kind === 'variable')!;
    expect(vars.modified.map((c) => c.key)).toEqual(['gtcs::GA4 Config']);
  });

  it('ignores volatile fields: trigger rename of id alone, parameter reordering', async () => {
    const before = await loadGtmExport(BEFORE);
    const after = await loadGtmExport(AFTER);
    const diff = diffExports(before, after);

    const triggers = diff.kinds.find((k) => k.kind === 'trigger')!;
    expect(triggers.added).toHaveLength(0);
    expect(triggers.removed).toHaveLength(0);
    expect(triggers.modified).toHaveLength(0);
    expect(triggers.unchanged).toBe(1);
  });

  it('reports field-level diffs for modified entities', async () => {
    const before = await loadGtmExport(BEFORE);
    const after = await loadGtmExport(AFTER);
    const diff = diffExports(before, after);

    const modifiedTag = diff.kinds
      .find((k) => k.kind === 'tag')!
      .modified.find((c) => c.key === 'gaawe::GA4 - Page View')!;
    expect(modifiedTag.status).toBe('modified');
    if (modifiedTag.status === 'modified') {
      expect(modifiedTag.fieldDiffs.length).toBeGreaterThan(0);
    }
  });

  it('reports a positive summary when there are changes', async () => {
    const before = await loadGtmExport(BEFORE);
    const after = await loadGtmExport(AFTER);
    const diff = diffExports(before, after);

    expect(hasChanges(diff)).toBe(true);
    expect(diff.summary.added).toBeGreaterThan(0);
    expect(diff.summary.removed).toBeGreaterThan(0);
    expect(diff.summary.modified).toBeGreaterThan(0);
  });

  it('returns no changes when comparing an export to itself', async () => {
    const before = await loadGtmExport(BEFORE);
    const diff = diffExports(before, before);
    expect(hasChanges(diff)).toBe(false);
    expect(diff.summary.added).toBe(0);
    expect(diff.summary.removed).toBe(0);
    expect(diff.summary.modified).toBe(0);
  });
});
