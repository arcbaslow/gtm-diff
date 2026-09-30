import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports, hasChanges } from '../../src/core/diff.js';
import { loadGtmExport } from '../../src/core/parser.js';
import { renderConsole } from '../../src/reporters/console.js';
import { renderHtml } from '../../src/reporters/html.js';
import { renderJson } from '../../src/reporters/json.js';
import { renderMarkdown } from '../../src/reporters/markdown.js';
import type { GtmExport } from '../../src/types/gtm.js';

async function pair(name: string) {
  return Promise.all(
    ['before', 'after'].map((side) =>
      loadGtmExport(fileURLToPath(new URL(`../fixtures/${name}-${side}.json`, import.meta.url))),
    ),
  );
}

describe('list order regression', () => {
  it('reports authored order changes in unknown lists with stable field ordering', async () => {
    const [before, after] = await pair('list-order');
    const diff = diffExports(before!, after!);
    expect(hasChanges(diff)).toBe(true);
    expect(diff.summary.modified).toBe(1);
    expect(renderConsole(diff, { color: false })).toMatchSnapshot();
    expect(renderConsole(diffExports(before!, after!), { color: false })).toBe(
      renderConsole(diff, { color: false }),
    );
  });

  it.each(['items', 'eventParameters', undefined])('preserves lists keyed %s', async (key) => {
    const [before, after] = await pair('list-order');
    for (const exp of [before!, after!]) {
      const parameter = exp.containerVersion.variable![0]!.parameter![0]!;
      // A keyless nested list is valid even though top-level parameters have keys.
      parameter.list = [
        { type: 'list', ...(key === undefined ? {} : { key }), list: parameter.list! },
      ];
    }
    expect(hasChanges(diffExports(before!, after!))).toBe(true);
  });
});

describe('canonical normalization', () => {
  it('ignores condition permutations using all nested parameter values', async () => {
    const [before, after] = await pair('condition-order');
    const diff = diffExports(before!, after!);
    expect(hasChanges(diff)).toBe(false);
    expect(diff).toMatchSnapshot();
  });

  it('retains unknown parameter and condition fields', async () => {
    const [before, after] = await pair('unknown-fields');
    const diff = diffExports(before!, after!);
    expect(diff.summary.modified).toBe(2);
    expect(diff.kinds.flatMap((kind) => kind.modified)).toMatchSnapshot();
  });

  it('renders identical snapshots across object, entity and map permutations', async () => {
    const [before, after] = await pair('object-order');
    const permute = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(permute);
      if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
          Object.entries(value)
            .reverse()
            .map(([k, v]) => [k, permute(v)]),
        );
      }
      return value;
    };
    const a = permute(before) as GtmExport;
    const b = permute(after) as GtmExport;
    for (const exp of [a, b]) {
      exp.containerVersion.tag!.reverse();
      for (const tag of exp.containerVersion.tag!) {
        tag.parameter?.reverse();
        tag.parameter?.forEach((p) => p.map?.reverse());
      }
    }
    const original = diffExports(before!, after!);
    const reordered = diffExports(a, b);
    for (const render of [
      renderMarkdown,
      renderHtml,
      (diff: typeof original) => renderConsole(diff, { color: false }),
      renderJson,
    ]) {
      expect(render(reordered)).toBe(render(original));
      expect(render(original)).toMatchSnapshot();
    }
  });
});
