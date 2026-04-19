import { describe, expect, it } from 'vitest';
import { identityKey, normalizeExport } from '../../src/core/normalize.js';
import type { GtmExport } from '../../src/types/gtm.js';

describe('normalizeExport', () => {
  it('strips volatile fields and preserves identity', () => {
    const exp = buildExport({
      tag: [
        {
          accountId: '1234',
          containerId: '5678',
          tagId: '42',
          fingerprint: 'abc',
          path: 'accounts/1234/containers/5678/tags/42',
          name: 'A',
          type: 'html',
        },
      ],
    });
    const norm = normalizeExport(exp);
    const entity = norm.tag['html::A'];
    expect(entity).toBeDefined();
    expect(entity!['accountId']).toBeUndefined();
    expect(entity!['tagId']).toBeUndefined();
    expect(entity!['fingerprint']).toBeUndefined();
    expect(entity!['path']).toBeUndefined();
  });

  it('resolves firingTriggerId to names and sorts them', () => {
    const exp = buildExport({
      tag: [{ name: 'T', type: 'html', firingTriggerId: ['200', '100'] }],
      trigger: [
        { triggerId: '100', name: 'B-trigger', type: 'pageview' },
        { triggerId: '200', name: 'A-trigger', type: 'pageview' },
      ],
    });
    const norm = normalizeExport(exp);
    const entity = norm.tag['html::T']!;
    expect(entity['firingTriggerNames']).toEqual(['A-trigger', 'B-trigger']);
    expect(entity['firingTriggerId']).toBeUndefined();
  });

  it('sorts parameters by key so trivial reordering does not show up as a diff', () => {
    const exp = buildExport({
      tag: [
        {
          name: 'T',
          type: 'html',
          parameter: [
            { type: 'template', key: 'z', value: '1' },
            { type: 'template', key: 'a', value: '2' },
          ],
        },
      ],
    });
    const norm = normalizeExport(exp);
    const params = norm.tag['html::T']!['parameter'] as Array<{ key: string }>;
    expect(params.map((p) => p.key)).toEqual(['a', 'z']);
  });

  it('disambiguates entities with same name but different types', () => {
    const exp = buildExport({
      tag: [
        { name: 'pixel', type: 'html' },
        { name: 'pixel', type: 'img' },
      ],
    });
    const norm = normalizeExport(exp);
    expect(norm.tag['html::pixel']).toBeDefined();
    expect(norm.tag['img::pixel']).toBeDefined();
  });

  it('keys built-in variables by type', () => {
    const exp = buildExport({
      builtInVariable: [
        { type: 'pageUrl', name: 'Page URL' },
        { type: 'pageHostname', name: 'Page Hostname' },
      ],
    });
    const norm = normalizeExport(exp);
    expect(norm.builtInVariable['pageUrl']).toBeDefined();
    expect(norm.builtInVariable['pageHostname']).toBeDefined();
  });
});

describe('identityKey', () => {
  it('combines type and name', () => {
    expect(identityKey({ name: 'foo', type: 'html' } as never)).toBe('html::foo');
  });
});

function buildExport(cv: {
  tag?: Array<Record<string, unknown>>;
  trigger?: Array<Record<string, unknown>>;
  variable?: Array<Record<string, unknown>>;
  folder?: Array<Record<string, unknown>>;
  builtInVariable?: Array<Record<string, unknown>>;
}): GtmExport {
  return {
    containerVersion: {
      container: { name: 'test' },
      ...cv,
    },
  } as GtmExport;
}
