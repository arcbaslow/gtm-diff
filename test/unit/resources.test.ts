import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports, diffNormalized, hasChanges } from '../../src/core/diff.js';
import { normalizeExport } from '../../src/core/normalize.js';
import { loadGtmExport, validateGtmExport } from '../../src/core/parser.js';
import { renderConsole } from '../../src/reporters/console.js';
import { renderMarkdown } from '../../src/reporters/markdown.js';
import { renderHtml } from '../../src/reporters/html.js';

const kinds = ['client', 'transformation', 'customTemplate', 'zone', 'gtagConfig'] as const;
const ids = ['clientId', 'transformationId', 'templateId', 'zoneId', 'gtagConfigId'];
const load = (side: string) =>
  loadGtmExport(fileURLToPath(new URL(`../fixtures/resources-${side}.json`, import.meta.url)));

function wrap(fields: Record<string, unknown>) {
  return validateGtmExport(
    { containerVersion: { container: { name: 'Resources' }, ...fields } },
    'fixture',
  );
}

function entity(kind: (typeof kinds)[number], overrides: Record<string, unknown> = {}) {
  const id = ids[kinds.indexOf(kind)]!;
  return {
    ...(kind === 'gtagConfig' ? {} : { name: 'Resource' }),
    ...(['client', 'transformation', 'gtagConfig'].includes(kind) ? { type: 'example' } : {}),
    [id]: '1',
    ...overrides,
  };
}

function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, item]) => [key, reverseKeys(item)]),
    );
  return value;
}

describe('remaining container resources', () => {
  it('detects real changes in all five collections instead of omitting them', async () => {
    const diff = diffExports(await load('before'), await load('after'));
    expect(diff.omittedFields).toBeUndefined();
    expect(diff.summary).toEqual({ added: 0, removed: 0, modified: 5, unchanged: 2 });
    for (const kind of kinds)
      expect(diff.kinds.find((k) => k.kind === kind)?.modified).toHaveLength(1);
    expect(diff).toMatchSnapshot();
  });

  it('ignores source IDs and resolves folders and zone evaluation triggers across exports', async () => {
    const before = await load('before');
    const after = structuredClone(before);
    after.containerVersion.folder![0]!.folderId = '101';
    after.containerVersion.trigger![0]!.triggerId = '102';
    after.containerVersion.client![0]!.parentFolderId = '101';
    after.containerVersion.transformation![0]!.parentFolderId = '101';
    after.containerVersion.zone![0]!.boundary!.customEvaluationTriggerId = ['102'];
    for (const [i, kind] of kinds.entries()) {
      const item = after.containerVersion[kind]![0]!;
      if (kind !== 'gtagConfig') item[ids[i]!] = 'renumbered';
      item.fingerprint = 'new';
      item.path = 'accounts/new/containers/new';
      item.accountId = 'new';
      item.containerId = 'new';
      item.workspaceId = 'new';
      item.tagManagerUrl = 'https://example.invalid/unused';
    }
    const diff = diffExports(before, after);
    expect(hasChanges(diff)).toBe(false);
    expect(diff.summary.unchanged).toBe(7);
    expect(normalizeExport(after).zone?.['<no-type>::Site zone']?.['boundary']).toEqual({
      condition: before.containerVersion.zone![0]!.boundary!.condition,
      customEvaluationTriggerNames: ['Allowed'],
    });
  });

  it('keeps report bytes stable across entity, key, keyed-parameter and condition permutations', async () => {
    const before = await load('before');
    const after = await load('after');
    for (const exp of [before, after]) {
      exp.containerVersion.client!.push({
        name: 'Unchanged',
        type: 'ga4',
        parameter: [
          {
            type: 'map',
            key: 'options',
            map: [
              { type: 'template', key: 'z', value: 'z' },
              { type: 'template', key: 'a', value: 'a' },
            ],
          },
          {
            type: 'list',
            key: 'ordered',
            list: [
              { type: 'template', value: 'first' },
              { type: 'template', value: 'second' },
            ],
          },
        ],
      });
      exp.containerVersion.zone![0]!.boundary!.condition!.push({
        type: 'equals',
        parameter: [
          { type: 'template', key: 'arg0', value: 'x' },
          { type: 'template', key: 'arg1', value: 'x' },
        ],
      });
      exp.containerVersion.zone![0]!.boundary!.customEvaluationTriggerId!.push('missing');
    }
    const permutedBefore = validateGtmExport(reverseKeys(before), 'permutation');
    const permutedAfter = validateGtmExport(reverseKeys(after), 'permutation');
    for (const exp of [permutedBefore, permutedAfter]) {
      exp.containerVersion.client!.reverse();
      for (const client of exp.containerVersion.client!) {
        client.parameter!.reverse();
        for (const p of client.parameter!) p.map?.reverse();
      }
      exp.containerVersion.zone![0]!.boundary!.condition!.reverse();
      for (const c of exp.containerVersion.zone![0]!.boundary!.condition!) c.parameter.reverse();
      exp.containerVersion.zone![0]!.boundary!.customEvaluationTriggerId!.reverse();
    }
    const reports = (a: typeof before, b: typeof after) => {
      const diff = diffExports(a, b);
      return [renderConsole(diff, { color: false }), renderMarkdown(diff), renderHtml(diff)];
    };
    expect(reports(permutedBefore, permutedAfter)).toEqual(reports(before, after));
    expect(reports(before, after)).toMatchSnapshot();
  });

  it.each(kinds)(
    'rejects malformed collections, duplicate identities and duplicate source IDs for %s',
    (kind) => {
      expect(() => wrap({ [kind]: {} })).toThrow('must be an array');
      expect(() => wrap({ [kind]: [null] })).toThrow('Must be an object');
      expect(() => wrap({ [kind]: [entity(kind), entity(kind)] })).toThrow('Duplicate identity');
      expect(() =>
        wrap({ [kind]: [entity(kind), entity(kind, { name: 'Other', type: 'other' })] }),
      ).toThrow('Duplicate source ID');
    },
  );

  it.each(kinds)('compares unknown fields, additions, removals and renames for %s', (kind) => {
    const before = wrap({ [kind]: [entity(kind, { extension: { old: true } })] });
    const after = wrap({ [kind]: [entity(kind, { extension: { old: false } })] });
    expect(diffExports(before, after).summary.modified).toBe(1);
    expect(diffExports(wrap({}), before).summary.added).toBe(1);
    expect(diffExports(before, wrap({})).summary.removed).toBe(1);
    const renamed = wrap({
      [kind]: [entity(kind, kind === 'gtagConfig' ? { gtagConfigId: '2' } : { name: 'Renamed' })],
    });
    expect(diffExports(before, renamed).summary).toEqual({
      added: 1,
      removed: 1,
      modified: 0,
      unchanged: 0,
    });
  });

  it.each(kinds)('escapes hostile labels and values in every change status for %s', (kind) => {
    const hostile = '<img src=x onerror=alert(1)>`\u001b\u0085';
    const a = entity(
      kind,
      kind === 'gtagConfig'
        ? { gtagConfigId: hostile, type: hostile }
        : { name: hostile, type: hostile },
    );
    const before = wrap({ [kind]: [{ ...a, notes: 'old' }] });
    const after = wrap({ [kind]: [{ ...a, notes: hostile }] });
    for (const diff of [
      diffExports(wrap({}), after),
      diffExports(before, wrap({})),
      diffExports(before, after),
    ]) {
      const console = renderConsole(diff, { color: false });
      const markdown = renderMarkdown(diff);
      const html = renderHtml(diff);
      for (const report of [console, markdown, html]) {
        expect(report).not.toContain('\u001b');
        expect(report).not.toContain('\u0085');
      }
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
      // Markdown diff values remain inside a fence; HTML label contexts are escaped.
      expect(markdown.split('```diff')[0]).not.toContain('<img');
      expect(markdown).toContain('&lt;img');
    }
  });

  it.each([
    { kind: 'client', fields: { priority: '1' }, path: 'priority' },
    { kind: 'client', fields: { priority: 1.5 }, path: 'priority' },
    {
      kind: 'transformation',
      fields: { parameter: [{ type: 'template', key: 'x', isWeakReference: 'true' }] },
      path: 'isWeakReference',
    },
    { kind: 'customTemplate', fields: { templateData: {} }, path: 'templateData' },
    { kind: 'zone', fields: { boundary: null }, path: 'boundary' },
    { kind: 'zone', fields: { boundary: { condition: [{}] } }, path: 'condition' },
    {
      kind: 'zone',
      fields: { boundary: { customEvaluationTriggerId: [1] } },
      path: 'customEvaluationTriggerId',
    },
    { kind: 'gtagConfig', fields: { gtagConfigId: undefined }, path: 'gtagConfigId' },
    { kind: 'gtagConfig', fields: { gtagConfigId: '' }, path: 'gtagConfigId' },
  ] as const)('rejects malformed $kind.$path', ({ kind, fields, path }) => {
    expect(() => wrap({ [kind]: [entity(kind, fields)] })).toThrow(path);
  });

  it('preserves template text as inert data and retains gallery IDs and signatures', async () => {
    const before = await load('before');
    const after = structuredClone(before);
    const text = 'globalThis.__gtmTemplateExecuted = true; <script>alert(1)</script>';
    after.containerVersion.customTemplate![0]!.templateData = text;
    after.containerVersion.customTemplate![0]!.galleryReference!.galleryTemplateId = 'new';
    const diff = diffExports(before, after);
    expect(Object.hasOwn(globalThis, '__gtmTemplateExecuted')).toBe(false);
    const changes = diff.kinds.find((k) => k.kind === 'customTemplate')!.modified;
    expect(changes).toHaveLength(1);
    expect(renderHtml(diff)).toContain('&lt;script&gt;');
    expect(normalizeExport(after).customTemplate?.['<no-type>::Request template']).toMatchObject({
      templateData: text,
      galleryReference: { signature: 'old', galleryTemplateId: 'new' },
    });
  });

  it('keeps unresolved zone references visible and preserves child and restriction fields', () => {
    const before = wrap({
      zone: [
        entity('zone', {
          boundary: { customEvaluationTriggerId: ['missing'] },
          childContainer: [{ publicId: 'GTM-A', nickname: 'A' }],
          typeRestriction: { enable: true, whitelistedTypeId: ['html'] },
        }),
      ],
    });
    expect(normalizeExport(before).zone?.['<no-type>::Resource']?.['boundary']).toEqual({
      customEvaluationTriggerNames: ['<unresolved:missing>'],
    });
    const after = structuredClone(before);
    after.containerVersion.zone![0]!.childContainer![0]!.publicId = 'GTM-B';
    after.containerVersion.zone![0]!.typeRestriction!.enable = false;
    after.containerVersion.zone![0]!.boundary!.customEvaluationTriggerId = ['other'];
    expect(diffExports(before, after).kinds.find((k) => k.kind === 'zone')?.modified).toHaveLength(
      1,
    );
  });

  it('accepts older normalized library objects with absent new kind maps', () => {
    const old = normalizeExport(wrap({}));
    for (const kind of kinds) delete old[kind];
    expect(
      hasChanges(diffNormalized(old, normalizeExport(wrap({})), { before: 'old', after: 'new' })),
    ).toBe(false);
  });

  it('uses own-property-safe empty maps for older normalized library objects', () => {
    const before = normalizeExport(wrap({}));
    delete before.client;
    const after = normalizeExport(wrap({}));
    after.client = JSON.parse('{"constructor":{"name":"constructor","type":"example"}}') as Record<
      string,
      Record<string, unknown>
    >;
    const diff = diffNormalized(before, after, { before: 'old', after: 'new' });
    expect(diff.summary).toEqual({ added: 1, removed: 0, modified: 0, unchanged: 0 });
  });

  it('keeps multiple Google tag configs of the same type separate by source ID', () => {
    const before = wrap({
      gtagConfig: [entity('gtagConfig'), entity('gtagConfig', { gtagConfigId: '2' })],
    });
    const after = wrap({
      gtagConfig: [
        entity('gtagConfig', {
          gtagConfigId: '2',
          parameter: [{ type: 'boolean', key: 'enabled', value: 'true' }],
        }),
        entity('gtagConfig'),
      ],
    });
    const diff = diffExports(before, after);
    expect(diff.summary).toEqual({ added: 0, removed: 0, modified: 1, unchanged: 1 });
    expect(diff.kinds.find((k) => k.kind === 'gtagConfig')?.modified[0]?.key).toBe('example::2');
  });

  it.each(['client', 'transformation', 'gtagConfig'] as const)(
    'preserves authored parameter list order for %s',
    (kind) => {
      const before = wrap({
        [kind]: [
          entity(kind, {
            parameter: [
              {
                type: 'list',
                key: 'ordered',
                list: [
                  { type: 'template', value: 'first' },
                  { type: 'template', value: 'second' },
                ],
              },
            ],
          }),
        ],
      });
      const after = structuredClone(before);
      after.containerVersion[kind]![0]!.parameter![0]!.list!.reverse();
      expect(diffExports(before, after).summary.modified).toBe(1);
    },
  );
});
