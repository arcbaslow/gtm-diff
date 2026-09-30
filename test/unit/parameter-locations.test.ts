import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports, hasChanges } from '../../src/core/diff.js';
import { loadGtmExport, validateGtmExport } from '../../src/core/parser.js';
import { normalizeExport } from '../../src/core/normalize.js';
import type { GtmParameter } from '../../src/types/gtm.js';
import { renderConsole } from '../../src/reporters/console.js';
import { renderMarkdown } from '../../src/reporters/markdown.js';
import { renderHtml } from '../../src/reporters/html.js';

const load = (side: string) =>
  loadGtmExport(
    fileURLToPath(new URL(`../fixtures/parameter-locations-${side}.json`, import.meta.url)),
  );

describe('Parameter locations', () => {
  it('ignores keyed-map order and trigger ID relocation in documented Parameter locations', async () => {
    const diff = diffExports(await load('before'), await load('after'));
    expect(hasChanges(diff)).toBe(false);
    expect([
      renderConsole(diff, { color: false }),
      renderMarkdown(diff),
      renderHtml(diff),
    ]).toMatchSnapshot();
  });

  const locations = [
    ...[
      'waitForTags',
      'waitForTagsTimeout',
      'checkValidation',
      'uniqueTriggerId',
      'eventName',
      'interval',
      'limit',
      'selector',
      'intervalSeconds',
      'maxTimerLengthSeconds',
      'verticalScrollPercentageList',
      'horizontalScrollPercentageList',
      'visibilitySelector',
      'visiblePercentageMin',
      'visiblePercentageMax',
      'continuousTimeMinMilliseconds',
      'totalTimeMinMilliseconds',
    ].map((field) => ({ kind: 'trigger', path: [field] })),
    ...['priority', 'monitoringMetadata'].map((field) => ({ kind: 'tag', path: [field] })),
    { kind: 'tag', path: ['consentSettings', 'consentType'] },
    ...[
      'convertNullToValue',
      'convertUndefinedToValue',
      'convertTrueToValue',
      'convertFalseToValue',
    ].map((field) => ({ kind: 'variable', path: ['formatValue', field] })),
  ];

  it.each(locations)(
    'normalizes and validates the documented singleton $kind.$path',
    ({ kind, path }) => {
      const parameter: GtmParameter = {
        type: 'map',
        extension: 'keep',
        map: [
          { type: 'template', key: 'z', value: 'z' },
          { type: 'template', key: 'a', value: 'a' },
        ],
      };
      const wrap = (value: unknown) => ({
        containerVersion: {
          container: { name: 'Singletons' },
          [kind]: [
            {
              name: 'Entity',
              type: 'example',
              [path[0]!]:
                path.length === 1 ? value : { [path[1]!]: value, extension: 'keep wrapper' },
            },
          ],
        },
      });
      const before = validateGtmExport(wrap(parameter), 'fixture');
      const reordered = { ...parameter, map: [...parameter.map!].reverse() };
      expect(hasChanges(diffExports(before, validateGtmExport(wrap(reordered), 'fixture')))).toBe(
        false,
      );
      const changed = { ...parameter, extension: 'changed' };
      expect(
        diffExports(before, validateGtmExport(wrap(changed), 'fixture')).summary.modified,
      ).toBe(1);
      for (const malformed of [null, 'bad', { type: 'map', map: [{ type: 'template' }] }]) {
        expect(() => validateGtmExport(wrap(malformed), 'fixture')).toThrow(path.join('.'));
      }
    },
  );

  it.each(['triggerReference', 'trigger_reference', 'TRIGGER_REFERENCE'])(
    'resolves %s recursively without converting ordinary or tag-reference strings',
    (type) => {
      const wrap = (id: string) =>
        validateGtmExport(
          {
            containerVersion: {
              container: { name: 'References' },
              trigger: [{ triggerId: id, type: 'customEvent', name: 'Ready' }],
              tag: [
                {
                  name: 'Tag',
                  type: 'html',
                  parameter: [
                    {
                      type: 'map',
                      key: 'nested',
                      map: [
                        {
                          type: 'list',
                          key: 'refs',
                          list: [{ type, value: id, isWeakReference: true }],
                        },
                      ],
                    },
                    { type: 'tagReference', key: 'tag', value: '123' },
                    { type: 'template', key: 'literal', value: '123' },
                  ],
                  extension: { type, value: '123' },
                },
              ],
            },
          },
          'fixture',
        );
      const before = wrap('1');
      const after = wrap('101');
      expect(hasChanges(diffExports(before, after))).toBe(false);
      expect(normalizeExport(after).tag['html::Tag']).toMatchObject({
        parameter: [
          { key: 'literal', value: '123' },
          {
            key: 'nested',
            map: [
              {
                key: 'refs',
                list: [
                  {
                    type,
                    value: { trigger: { type: 'customEvent', name: 'Ready' } },
                    isWeakReference: true,
                  },
                ],
              },
            ],
          },
          { key: 'tag', value: '123' },
        ],
        extension: { type, value: '123' },
      });
    },
  );

  it.each(['tag', 'trigger', 'variable', 'client', 'transformation', 'gtagConfig', 'zone'])(
    'resolves references in existing parameter or condition arrays on %s',
    (kind) => {
      const wrap = (id: string) => {
        const parameter = [{ type: 'triggerReference', key: 'ref', value: id }];
        const entity =
          kind === 'zone'
            ? { name: 'Entity', boundary: { condition: [{ type: 'equals', parameter }] } }
            : {
                name: 'Entity',
                type: 'example',
                gtagConfigId: 'config',
                parameter,
                ...(kind === 'trigger'
                  ? {
                      filter: [{ type: 'equals', parameter }],
                      customEventFilter: [{ type: 'equals', parameter }],
                      autoEventFilter: [{ type: 'equals', parameter }],
                    }
                  : {}),
              };
        const reference = { triggerId: id, name: 'Referenced', type: 'customEvent' };
        return validateGtmExport(
          {
            containerVersion: {
              container: {},
              [kind]: [entity],
              trigger: kind === 'trigger' ? [reference, entity] : [reference],
            },
          },
          'fixture',
        );
      };
      expect(hasChanges(diffExports(wrap('1'), wrap('101')))).toBe(false);
    },
  );

  it('distinguishes targets with the same name and leaves missing or built-in IDs explicit', () => {
    const wrap = (id: string) =>
      validateGtmExport(
        {
          containerVersion: {
            container: {},
            trigger: [
              { triggerId: '1', type: 'customEvent', name: 'Same' },
              { triggerId: '2', type: 'timer', name: 'Same' },
              { triggerId: '3', type: 'customEvent', name: '<unresolved:missing>' },
            ],
            tag: [
              {
                name: 'Tag',
                type: 'html',
                parameter: [{ type: 'triggerReference', key: 'ref', value: id }],
              },
            ],
          },
        },
        'fixture',
      );
    expect(diffExports(wrap('1'), wrap('2')).summary.modified).toBe(1);
    expect(diffExports(wrap('missing'), wrap('3')).summary.modified).toBe(1);
    expect(diffExports(wrap('2147479553'), wrap('missing')).summary.modified).toBe(1);
    expect(normalizeExport(wrap('2147479553')).tag['html::Tag']?.['parameter']).toEqual([
      { type: 'triggerReference', key: 'ref', value: { unresolvedTriggerId: '2147479553' } },
    ]);
    expect(hasChanges(diffExports(wrap('missing'), wrap('missing')))).toBe(false);
  });

  it('reports real consent, priority, trigger and conversion changes without changing inputs', async () => {
    const before = await load('before');
    const untouched = structuredClone(before);
    const after = structuredClone(before);
    after.containerVersion.tag![0]!.priority = { type: 'integer', value: '5' };
    after.containerVersion.tag![0]!.consentSettings!.consentStatus = 'notNeeded';
    after.containerVersion.tag![0]!.consentSettings!.consentType!.list!.reverse();
    after.containerVersion.trigger![1]!.eventName = { type: 'template', value: 'new event' };
    after.containerVersion.variable![0]!.formatValue!.convertNullToValue = {
      type: 'template',
      value: 'new value',
    };
    const diff = diffExports(before, after);
    expect(diff.summary.modified).toBe(3);
    const tagChange = diff.kinds.find((k) => k.kind === 'tag')!.modified[0]!;
    expect(
      tagChange.status === 'modified' &&
        tagChange.fieldDiffs.some(
          (d) => d.path.join('.') === 'consentSettings.consentType.list.0.value',
        ),
    ).toBe(true);
    expect(before).toEqual(untouched);
    expect([
      renderConsole(diff, { color: false }),
      renderMarkdown(diff),
      renderHtml(diff),
    ]).toMatchSnapshot();
    const reordered = validateGtmExport(reverseKeys(after), 'permutation');
    expect(diffExports(before, reordered)).toEqual(diff);
  });

  it('escapes resolved and unresolved reference values and keeps fences intact', async () => {
    const before = await load('before');
    const after = structuredClone(before);
    const hostile = '<script>alert(1)</script>\u001b\u0085\n```';
    after.containerVersion.trigger![0]!.name = hostile;
    after.containerVersion.tag![0]!.parameter!.push({
      key: 'missing',
      type: 'TRIGGER_REFERENCE',
      value: hostile,
    });
    const diff = diffExports(before, after);
    for (const report of [
      renderConsole(diff, { color: false }),
      renderMarkdown(diff),
      renderHtml(diff),
    ]) {
      expect(report).not.toContain('\u001b');
      expect(report).not.toContain('\u0085');
    }
    const html = renderHtml(diff);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    const markdown = renderMarkdown(diff);
    expect(markdown.split('\n').filter((line) => line === '```diff')).toHaveLength(3);
    expect(markdown.split('\n').filter((line) => line === '```')).toHaveLength(3);
  });

  it('rejects missing trigger-reference values and malformed nested wrappers', () => {
    for (const value of [undefined, null, 1]) {
      expect(() =>
        validateGtmExport(
          {
            containerVersion: {
              container: {},
              tag: [
                {
                  name: 'T',
                  type: 'html',
                  parameter: [{ key: 'ref', type: 'triggerReference', value }],
                },
              ],
            },
          },
          'fixture',
        ),
      ).toThrow('parameter[0].value');
    }
    for (const [kind, field] of [
      ['tag', 'consentSettings'],
      ['variable', 'formatValue'],
    ]) {
      expect(() =>
        validateGtmExport(
          {
            containerVersion: {
              container: {},
              [kind!]: [{ name: 'Entity', type: 'example', [field!]: [] }],
            },
          },
          'fixture',
        ),
      ).toThrow(field!);
    }
  });
});

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
