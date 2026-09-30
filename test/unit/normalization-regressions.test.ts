import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports, hasChanges } from '../../src/core/diff.js';
import { loadGtmExport } from '../../src/core/parser.js';
import { renderConsole } from '../../src/reporters/console.js';

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
