import { mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports, diffNormalized } from '../../src/core/diff.js';
import { loadGtmExport, validateGtmExport } from '../../src/core/parser.js';
import { normalizeExport } from '../../src/core/normalize.js';
import { MAX_EXPORT_BYTES, MAX_INPUT_DEPTH, MAX_INPUT_NODES } from '../../src/core/input-limits.js';
import { renderJson } from '../../src/reporters/json.js';
import { ENTITY_KINDS, type GtmExport } from '../../src/types/gtm.js';

const fixture = (name: string) =>
  fileURLToPath(new URL(`../fixtures/${name}.json`, import.meta.url));

describe('bounded inputs', () => {
  it('keeps JSON bytes stable across generated object and entity permutations', async () => {
    const a = await loadGtmExport(fixture('resources-before'));
    const b = await loadGtmExport(fixture('resources-after'));
    const expected = renderJson(diffExports(a, b));
    for (let seed = 1; seed <= 16; seed++) {
      let state = seed;
      const shuffle = <T>(values: T[]): T[] => {
        const result = [...values];
        for (let i = result.length - 1; i > 0; i--) {
          state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
          const j = state % (i + 1);
          [result[i], result[j]] = [result[j]!, result[i]!];
        }
        return result;
      };
      const permute = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(permute);
        if (value !== null && typeof value === 'object') {
          return Object.fromEntries(
            shuffle(Object.entries(value)).map(([k, v]) => [k, permute(v)]),
          );
        }
        return value;
      };
      const inputs = [a, b].map((input) => {
        const result = permute(input) as GtmExport;
        for (const kind of ENTITY_KINDS) {
          const entities = result.containerVersion[kind];
          if (entities)
            Object.defineProperty(result.containerVersion, kind, {
              value: shuffle<unknown>(entities),
            });
        }
        return result;
      });
      expect(renderJson(diffExports(inputs[0]!, inputs[1]!))).toBe(expected);
    }
  });

  it('accepts the depth fixture before and rejects excessive unknown-field nesting after', async () => {
    const before = await loadGtmExport(fixture('depth-limit-before'));
    await expect(loadGtmExport(fixture('depth-limit-after'))).rejects.toThrow('nesting levels');
    const after: unknown = JSON.parse(await readFile(fixture('depth-limit-after'), 'utf8'));
    expect(() => validateGtmExport(after, 'fixture')).toThrow('nesting levels');
    expect(renderJson(diffExports(before, before))).toMatchSnapshot();
  });

  it('accepts a leading BOM and preserves embedded BOM characters', async () => {
    const a = await loadGtmExport(fixture('bom-before'));
    const b = await loadGtmExport(fixture('bom-after'));
    expect(a).toEqual(b);
    expect(b.containerVersion.container.name).toBe('BOM \uFEFF data');
    expect(diffExports(a, b).containerMeta).toEqual([]);
  });

  it('checks depth boundaries before recursive normalization and also bounds normalized input', async () => {
    const makeNested = (depth: number): unknown => {
      let value: unknown = null;
      for (let index = 0; index < depth; index++) value = { nested: value };
      return value;
    };
    const before = await loadGtmExport(fixture('depth-limit-before'));
    before.containerVersion.container['extension'] = makeNested(MAX_INPUT_DEPTH - 3);
    expect(() => normalizeExport(before)).not.toThrow();
    before.containerVersion.container['extension'] = makeNested(MAX_INPUT_DEPTH - 2);
    expect(() => normalizeExport(before)).toThrow('nesting levels');
    const normalized = normalizeExport(await loadGtmExport(fixture('depth-limit-before')));
    normalized.container['extension'] = makeNested(MAX_INPUT_DEPTH);
    expect(() => diffNormalized(normalized, normalized, { before: 'a', after: 'b' })).toThrow(
      'nesting levels',
    );
    normalized.container['extension'] = normalized;
    expect(() => diffNormalized(normalized, normalized, { before: 'a', after: 'b' })).toThrow(
      'nesting levels',
    );
  });

  it('bounds broad data before normalizing it', async () => {
    const before = await loadGtmExport(fixture('depth-limit-before'));
    before.containerVersion.container['extension'] = Array(MAX_INPUT_NODES).fill(null);
    expect(() => normalizeExport(before)).toThrow('values');
  });

  it('counts UTF-8 bytes and stops at the file limit', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gtm-diff-limits-'));
    const path = join(directory, 'large.json');
    try {
      const raw = await readFile(fixture('depth-limit-before'));
      // Trailing JSON whitespace permits an exact boundary without a huge entity.
      await writeFile(path, Buffer.concat([raw, Buffer.alloc(MAX_EXPORT_BYTES - raw.length, 32)]));
      await expect(loadGtmExport(path)).resolves.toBeDefined();
      await writeFile(path, Buffer.alloc(MAX_EXPORT_BYTES + 1, 32));
      await expect(loadGtmExport(path)).rejects.toThrow('Export exceeds');
    } finally {
      await rm(path, { force: true });
      await rmdir(directory);
    }
  }, 30_000);
});
