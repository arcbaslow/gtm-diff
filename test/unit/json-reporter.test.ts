import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports, loadGtmExport, renderJson, type JsonReportV1 } from '../../src/index.js';
import { ENTITY_KINDS } from '../../src/types/gtm.js';
import { sanitizeLabel } from '../../src/reporters/shared.js';

async function pair(name: string) {
  const load = (side: string) =>
    loadGtmExport(fileURLToPath(new URL(`../fixtures/${name}-${side}.json`, import.meta.url)));
  return Promise.all([load('before'), load('after')]);
}

function parse(text: string): JsonReportV1 {
  return JSON.parse(text) as JsonReportV1;
}

describe('version 1 JSON report', () => {
  it('includes full entities, typed field paths and values without truncation', async () => {
    const [before, after] = await pair('json-report');
    const diff = diffExports(before!, after!);
    const text = renderJson(diff);
    const report = parse(text);
    expect(report.schemaVersion).toBe(1);
    expect(report.hasChanges).toBe(true);
    expect(report.coverage).toEqual({ complete: true, omittedFields: { before: [], after: [] } });
    expect(report.summary).toEqual({ added: 1, removed: 1, modified: 1, unchanged: 0 });
    expect(report.kinds.map((kind) => kind.kind)).toEqual(ENTITY_KINDS);
    const tags = report.kinds[0]!;
    expect(tags.added[0]).toMatchObject({
      status: 'added',
      key: 'html::Added',
      entity: { notes: 'keep the full added entity', extension: [null, false, 0, 1.5, ''] },
    });
    expect(tags.removed[0]).toMatchObject({
      status: 'removed',
      entity: { notes: 'keep the full removed entity' },
    });
    const modified = tags.modified[0]!;
    expect(modified.status).toBe('modified');
    if (modified.status !== 'modified') throw new Error('Expected a modified tag');
    expect(modified.after['notes']).toBe(after!.containerVersion.tag![0]!.notes);
    expect(String(modified.after['notes']).length).toBeGreaterThan(400);
    expect(modified.after).not.toHaveProperty('tagId');
    expect(modified.after['extension']).toEqual({
      toJSON: 'inert text',
      constructor: 'ordinary key',
      ['__proto__']: { enabled: true },
    });
    expect(modified.fieldDiffs).toContainEqual({ type: 'CREATE', path: ['created'], value: false });
    expect(modified.fieldDiffs).toContainEqual({
      type: 'REMOVE',
      path: ['removed'],
      oldValue: null,
    });
    expect(modified.fieldDiffs).toContainEqual({
      type: 'CHANGE',
      path: ['parameter', 0, 'list', 0, 'value'],
      oldValue: 'first',
      value: 'second',
    });
    expect(report.containerMeta).toContainEqual({
      type: 'CHANGE',
      path: ['notes'],
      oldValue: 'before',
      value: null,
    });
    expect(text).toMatchSnapshot();
    expect(renderJson(diff)).toBe(text);
  });

  it.each(['minimal', 'resources', 'unknown-fields', 'list-order', 'prototype-identity'])(
    'round-trips all normalized data from the %s fixtures',
    async (fixture) => {
      const [before, after] = await pair(fixture);
      const diff = diffExports(before!, after!);
      const original = structuredClone(diff);
      const report = parse(renderJson(diff));
      expect(report.kinds).toEqual(diff.kinds);
      expect(report.containerMeta).toEqual(diff.containerMeta);
      expect(diff).toEqual(original);
    },
  );

  it('encodes every hostile data context reversibly and sanitizes only display labels', async () => {
    const [before, after] = await pair('reporter-hostile');
    const [coverageBefore, coverageAfter] = await pair('coverage');
    for (const [target, source] of [
      [before!, coverageBefore!],
      [after!, coverageAfter!],
    ]) {
      for (const [key, value] of Object.entries(source!.containerVersion)) {
        if (key !== 'container') target!.containerVersion[key] = value;
      }
    }
    const labels = {
      before: before!.containerVersion.container.name,
      after: after!.containerVersion.container.name + '\u2029target',
    };
    const diff = diffExports(before!, after!, labels);
    const text = renderJson(diff);
    const report = parse(text);
    expect(report.source.label).toBe(sanitizeLabel(labels.before));
    expect(report.target.label).toBe(sanitizeLabel(labels.after));
    // Covers added/removed keys and entity strings, modified before/after,
    // field paths/values, metadata paths/values, and omitted field names.
    expect(report.kinds).toEqual(diff.kinds);
    expect(report.containerMeta).toEqual(diff.containerMeta);
    expect(report.coverage).toEqual({ complete: false, omittedFields: diff.omittedFields });
    expect(text).not.toMatch(/[<>&'\u0000-\u0009\u000b-\u001f\u007f-\u009f\u2028\u2029]/);
    expect(text).toContain('\\u003c');
    expect(text).toContain('\\u009b');
    expect(text).toContain('\\u2028');
  });

  it('distinguishes no changes from incomplete coverage and metadata-only changes', async () => {
    const [before] = await pair('minimal');
    const unchanged = parse(renderJson(diffExports(before!, before!)));
    expect(unchanged.hasChanges).toBe(false);
    expect(unchanged.coverage.complete).toBe(true);
    expect(unchanged.summary.unchanged).toBeGreaterThan(0);
    const [a, b] = await pair('coverage');
    const incompleteText = renderJson(diffExports(a!, b!));
    const incomplete = parse(incompleteText);
    expect(incomplete.hasChanges).toBe(false);
    expect(incomplete.coverage.complete).toBe(false);
    expect(incompleteText).toMatchSnapshot();
    const [c, d] = await pair('metadata');
    const metadata = parse(renderJson(diffExports(c!, d!)));
    expect(metadata.hasChanges).toBe(true);
    expect(metadata.summary).toEqual({ added: 0, removed: 0, modified: 0, unchanged: 0 });
    expect(metadata.containerMeta.length).toBeGreaterThan(0);
  });

  it.each([Infinity, -Infinity, NaN, undefined, 1n, Symbol('value')])(
    'rejects non-JSON library values instead of silently losing them: %s',
    async (value) => {
      const [before, after] = await pair('json-report');
      const diff = diffExports(before!, after!);
      diff.containerMeta.push({ type: 'CREATE', path: ['extension'], value });
      expect(() => renderJson(diff)).toThrow('JSON-compatible values and finite numbers');
    },
  );
});
