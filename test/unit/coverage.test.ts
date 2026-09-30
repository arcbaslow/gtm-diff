import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports, hasChanges } from '../../src/core/diff.js';
import { loadGtmExport, validateGtmExport } from '../../src/core/parser.js';
import { renderConsole } from '../../src/reporters/console.js';
import { renderMarkdown } from '../../src/reporters/markdown.js';
import { renderHtml } from '../../src/reporters/html.js';

const fixture = (name: string) =>
  loadGtmExport(fileURLToPath(new URL(`../fixtures/${name}.json`, import.meta.url)));

describe('comparison coverage', () => {
  it('reports omitted fields without claiming a complete clean comparison', async () => {
    const before = await fixture('coverage-before');
    const after = await fixture('coverage-after');
    const diff = diffExports(before, after);
    expect(diff.omittedFields).toEqual({
      before: ['<img src=x onerror=alert(1)>`\u001b\u0085', 'futureResource'],
      after: ['<img src=x onerror=alert(1)>`\u001b\u0085', 'futureResource'],
    });
    expect(hasChanges(diff)).toBe(false);
    const reports = [renderConsole(diff, { color: false }), renderMarkdown(diff), renderHtml(diff)];
    for (const report of reports) {
      expect(report).toContain('Incomplete comparison');
      expect(report).toContain('No changes in compared fields.');
      expect(report).not.toContain('\u001b');
      expect(report).not.toContain('\u0085');
    }
    expect(reports[1]).not.toContain('<img');
    expect(reports[2]).not.toContain('<img');
    const reversed = {
      ...before,
      containerVersion: Object.fromEntries(Object.entries(before.containerVersion).reverse()),
    };
    expect(diffExports(validateGtmExport(reversed, 'permutation'), after)).toEqual(diff);
    expect(reports).toMatchSnapshot();
  });

  it('ignores documented version metadata and empty unknown collections', () => {
    const exp = validateGtmExport(
      {
        containerVersion: {
          container: {},
          name: 'Version',
          description: 'Note',
          deleted: false,
          fingerprint: '1',
          futureResource: [],
        },
      },
      'fixture',
    );
    expect(diffExports(exp, exp).omittedFields).toBeUndefined();
  });

  it('reports unknown scalar, null, object and nonempty array fields on either side', () => {
    const before = validateGtmExport(
      { containerVersion: { container: {}, z: null, a: false, m: {}, b: [1] } },
      'fixture',
    );
    const after = validateGtmExport({ containerVersion: { container: {} } }, 'fixture');
    expect(diffExports(before, after).omittedFields).toEqual({
      before: ['a', 'b', 'm', 'z'],
      after: [],
    });
  });
});
