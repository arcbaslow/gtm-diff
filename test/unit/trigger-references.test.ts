import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports, hasChanges } from '../../src/core/diff.js';
import { normalizeExport } from '../../src/core/normalize.js';
import { loadGtmExport } from '../../src/core/parser.js';
import { renderConsole } from '../../src/reporters/console.js';
import { renderMarkdown } from '../../src/reporters/markdown.js';
import { renderHtml } from '../../src/reporters/html.js';
import { renderJson } from '../../src/reporters/json.js';

const load = (side: string) =>
  loadGtmExport(
    fileURLToPath(new URL(`../fixtures/trigger-references-${side}.json`, import.meta.url)),
  );

describe('trigger reference lists', () => {
  it.each(['firingTriggerId', 'blockingTriggerId'] as const)(
    'detects same-name retargeting in %s and prints both typed identities',
    async (field) => {
      const before = await load('before');
      const after = await load('after');
      for (const exp of [before, after]) {
        const tag = exp.containerVersion.tag![0]!;
        const ids = tag.firingTriggerId!;
        delete tag.firingTriggerId;
        tag[field] = ids;
      }
      const diff = diffExports(before, after);
      expect(diff.summary).toEqual({ added: 0, removed: 0, modified: 1, unchanged: 2 });
      const tag = diff.kinds.find((kind) => kind.kind === 'tag')!.modified[0]!;
      expect(tag.key).toBe('html::Checkout tag');
      const key = field.replace('Id', 'Names');
      expect(tag).toMatchObject({
        before: { [key]: [{ trigger: { type: 'pageview', name: 'Checkout' } }] },
        after: { [key]: [{ trigger: { type: 'customEvent', name: 'Checkout' } }] },
      });
      for (const report of [
        renderConsole(diff, { color: false }),
        renderMarkdown(diff),
        renderHtml(diff),
      ]) {
        expect(report).toContain('Checkout (pageview)');
        expect(report).toContain('Checkout (customEvent)');
      }
      const json = JSON.parse(renderJson(diff)) as { schemaVersion: number; kinds: unknown[] };
      expect(json.schemaVersion).toBe(1);
      expect(json.kinds).toEqual(diff.kinds);
    },
  );

  it('keeps the same typed target unchanged across source ID changes', async () => {
    const before = await load('before');
    const after = structuredClone(before);
    after.containerVersion.trigger![0]!.triggerId = '101';
    after.containerVersion.tag![0]!.firingTriggerId = ['101'];
    expect(hasChanges(diffExports(before, after))).toBe(false);
    expect(diffExports(before, after).kinds[0]!.unchanged).toBe(1);
  });

  it('keeps unresolved IDs explicit and distinct from resolved names', async () => {
    const before = await load('before');
    before.containerVersion.tag![0]!.firingTriggerId = ['missing'];
    before.containerVersion.trigger![0]!.name = '<unresolved:missing>';
    expect(normalizeExport(before).tag['html::Checkout tag']).toMatchObject({
      firingTriggerNames: [{ unresolvedTriggerId: 'missing' }],
    });
    expect(hasChanges(diffExports(before, structuredClone(before)))).toBe(false);
    const after = structuredClone(before);
    after.containerVersion.tag![0]!.firingTriggerId = ['1'];
    expect(diffExports(before, after).summary.modified).toBe(1);
    after.containerVersion.tag![0]!.firingTriggerId = ['another-missing'];
    const diff = diffExports(before, after);
    expect(diff.summary.modified).toBe(1);
    expect(renderConsole(diff, { color: false })).toContain('<unresolved:missing>');
  });

  it('sorts complete identities deterministically across trigger and reference permutations', async () => {
    const before = await load('before');
    before.containerVersion.tag![0]!.firingTriggerId = ['1', 'missing', '2'];
    const after = structuredClone(before);
    after.containerVersion.tag![0]!.firingTriggerId!.reverse();
    after.containerVersion.trigger!.reverse();
    expect(normalizeExport(after)).toEqual(normalizeExport(before));
    expect(
      normalizeExport(after).tag['html::Checkout tag']!['firingTriggerNames'],
    ).toMatchSnapshot();
    expect(hasChanges(diffExports(before, after))).toBe(false);
  });

  it.each(['disablingTriggerId', 'enablingTriggerId'] as const)(
    'distinguishes same-name targets in variable %s',
    async (field) => {
      const before = await load('before');
      before.containerVersion.variable = [{ name: 'Variable', type: 'c', [field]: ['1'] }];
      const after = structuredClone(before);
      after.containerVersion.variable![0]![field] = ['2'];
      expect(
        diffExports(before, after).kinds.find((kind) => kind.kind === 'variable')!.modified,
      ).toHaveLength(1);
    },
  );

  it('distinguishes same-name targets in zone boundary evaluations', async () => {
    const before = await load('before');
    before.containerVersion.zone = [
      { name: 'Zone', boundary: { customEvaluationTriggerId: ['1'] } },
    ];
    const after = structuredClone(before);
    after.containerVersion.zone![0]!.boundary!.customEvaluationTriggerId = ['2'];
    expect(
      diffExports(before, after).kinds.find((kind) => kind.kind === 'zone')!.modified,
    ).toHaveLength(1);
  });

  it('escapes typed reference names and types in human reports', async () => {
    const before = await load('before');
    const after = await load('after');
    const hostile = '<script>\u001b\u0085\n```';
    after.containerVersion.trigger![1]!.name = hostile;
    after.containerVersion.trigger![1]!.type = hostile;
    const diff = diffExports(before, after);
    for (const report of [
      renderConsole(diff, { color: false }),
      renderMarkdown(diff),
      renderHtml(diff),
    ]) {
      expect(report).not.toContain('\u001b');
      expect(report).not.toContain('\u0085');
    }
    expect(renderHtml(diff)).not.toContain('<script>');
    expect(renderHtml(diff)).toContain('&lt;script&gt;');
    expect(
      renderMarkdown(diff)
        .split('\n')
        .filter((line) => line === '```'),
    ).toHaveLength(1);
  });

  it('keeps reference structures distinct from authored strings in JSON when full human labels match', async () => {
    const before = await load('before');
    const after = structuredClone(before);
    after.containerVersion.tag!.push({
      name: 'Labels',
      type: 'html',
      firingTriggerId: ['missing'],
      parameter: [
        { key: 'literal', type: 'template', value: '<unresolved:missing>' },
        { key: 'reference', type: 'triggerReference', value: 'missing' },
      ],
    });
    const diff = diffExports(before, after);
    for (const report of [renderMarkdown(diff, { full: true }), renderHtml(diff, { full: true })]) {
      const text = report.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
      expect(text).toContain('"firingTriggerNames": [\n    "<unresolved:missing>"\n  ]');
      expect(text.match(/"value": "<unresolved:missing>"/g)).toHaveLength(2);
    }
    const json = JSON.parse(renderJson(diff)) as { kinds: Array<{ added: unknown[] }> };
    expect(json.kinds[0]!.added[0]).toMatchObject({
      entity: {
        firingTriggerNames: [{ unresolvedTriggerId: 'missing' }],
        parameter: [
          { key: 'literal', value: '<unresolved:missing>' },
          { key: 'reference', value: { unresolvedTriggerId: 'missing' } },
        ],
      },
    });
  });

  it('renders reference-shaped unknown extension fields as ordinary JSON in changes and full details', async () => {
    const before = await load('before');
    before.containerVersion.tag![0]!['extension'] = { unresolvedTriggerId: 'missing' };
    const after = structuredClone(before);
    after.containerVersion.tag![0]!['extension'] = '<unresolved:missing>';
    after.containerVersion.tag!.push({
      name: 'Extensions',
      type: 'html',
      extension: {
        firingTriggerNames: [{ trigger: { type: 'pageview', name: 'Checkout' } }],
        parameter: [{ type: 'triggerReference', value: { unresolvedTriggerId: 'missing' } }],
      },
    });
    const diff = diffExports(before, after);
    for (const report of [
      renderConsole(diff, { color: false }),
      renderMarkdown(diff, { full: true }),
      renderHtml(diff, { full: true }),
    ]) {
      const text = report.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
      expect(text).toContain('extension: {\n  "unresolvedTriggerId": "missing"\n}');
      expect(text).toContain('"<unresolved:missing>"');
    }
    for (const report of [renderMarkdown(diff, { full: true }), renderHtml(diff, { full: true })]) {
      const text = report.replaceAll('&quot;', '"');
      expect(text).toContain('"trigger": {');
      expect(text).toContain('"unresolvedTriggerId": "missing"');
      expect(text).not.toContain('Checkout (pageview)');
    }
  });
});
