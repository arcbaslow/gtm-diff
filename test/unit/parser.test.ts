import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GtmParseError, loadGtmExport, validateGtmExport } from '../../src/core/parser.js';

const FIXTURE_BEFORE = fileURLToPath(new URL('../fixtures/minimal-before.json', import.meta.url));

describe('loadGtmExport', () => {
  it('parses a valid GTM export', async () => {
    const exp = await loadGtmExport(FIXTURE_BEFORE);
    expect(exp.containerVersion.container.name).toBe('example.com');
    expect(exp.containerVersion.tag).toHaveLength(2);
  });

  it('throws GtmParseError for a missing file', async () => {
    await expect(loadGtmExport('does-not-exist.json')).rejects.toBeInstanceOf(GtmParseError);
  });
});

describe('validateGtmExport', () => {
  it('accepts a minimum-viable export', () => {
    const input = { containerVersion: { container: { name: 'x' } } };
    expect(validateGtmExport(input, 'test')).toBe(input);
  });

  it('rejects a non-object top level', () => {
    expect(() => validateGtmExport(null, 'test')).toThrow(GtmParseError);
    expect(() => validateGtmExport([], 'test')).toThrow(GtmParseError);
    expect(() => validateGtmExport('string', 'test')).toThrow(GtmParseError);
  });

  it('rejects a missing containerVersion', () => {
    expect(() => validateGtmExport({}, 'test')).toThrow(/containerVersion/);
  });

  it('rejects a missing container', () => {
    expect(() => validateGtmExport({ containerVersion: {} }, 'test')).toThrow(
      /containerVersion\.container/,
    );
  });

  it('rejects non-array tag/trigger/variable fields', () => {
    expect(() =>
      validateGtmExport({ containerVersion: { container: {}, tag: 'nope' } }, 'test'),
    ).toThrow(/tag/);
  });
});

