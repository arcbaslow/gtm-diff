import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { diffExports } from '../../src/core/diff.js';
import { loadGtmExport } from '../../src/core/parser.js';
import { renderMarkdown } from '../../src/reporters/markdown.js';
import { renderJson, type JsonReportV1 } from '../../src/reporters/json.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const before = 'test/fixtures/minimal-before.json';
const after = 'test/fixtures/minimal-after.json';

// Some cases start several CLI processes. Keep each process bounded below,
// but allow cold starts to finish without Vitest's shorter default racing them.
vi.setConfig({ testTimeout: 60_000 });

function cli(...args: string[]) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'bin/dev.js', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    timeout: 15000,
  });
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  return result;
}

describe('diff command contract', () => {
  it.each([
    { a: before, b: after, status: 1, changed: true, complete: true },
    { a: before, b: before, status: 0, changed: false, complete: true },
    {
      a: 'test/fixtures/metadata-before.json',
      b: 'test/fixtures/metadata-after.json',
      status: 1,
      changed: true,
      complete: true,
    },
    {
      a: 'test/fixtures/coverage-before.json',
      b: 'test/fixtures/coverage-after.json',
      status: 0,
      changed: false,
      complete: false,
    },
  ])('writes only JSON to stdout for $a and $b', ({ a, b, status, changed, complete }) => {
    const result = cli('diff', a, b, '--format', 'json', '--exit-code');
    expect(result.status).toBe(status);
    expect(result.stderr).toBe('');
    const report = JSON.parse(result.stdout) as JsonReportV1;
    expect(report.schemaVersion).toBe(1);
    expect(report.hasChanges).toBe(changed);
    expect(report.coverage.complete).toBe(complete);
    expect(result.stdout).not.toContain('\u001b');
  });

  it('keeps JSON differences successful by default', () => {
    const result = cli('diff', before, after, '--format', 'json', '--no-color');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect((JSON.parse(result.stdout) as JsonReportV1).hasChanges).toBe(true);
  });

  it.each([
    {
      a: 'test/fixtures/json-nonfinite-before.json',
      b: 'test/fixtures/json-nonfinite-after.json',
      extra: [],
      message: 'JSON-compatible values and finite numbers',
    },
    {
      a: before,
      b: 'test/fixtures/coverage-after.json',
      extra: ['--strict'],
      message: 'Incomplete comparison',
    },
    { a: before, b: 'test/fixtures/invalid-json.json', extra: [], message: 'Invalid JSON' },
    { a: before, b: after, extra: ['--output', 'test/fixtures'], message: 'fixtures' },
  ])('keeps JSON command errors on stderr: $message', ({ a, b, extra, message }) => {
    const result = cli('diff', a, b, '--format', 'json', ...extra);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain(message);
  });

  it('returns zero for parameter map permutations and relocated trigger references', () => {
    const result = cli(
      'diff',
      'test/fixtures/parameter-locations-before.json',
      'test/fixtures/parameter-locations-after.json',
      '--strict',
      '--exit-code',
      '--no-color',
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('No changes.');
  });

  it('accepts all documented resource collections in strict mode and counts their changes', () => {
    const before = 'test/fixtures/resources-before.json';
    const after = 'test/fixtures/resources-after.json';
    const changed = cli('diff', before, after, '--strict', '--exit-code', '--no-color');
    expect(changed.status).toBe(1);
    expect(changed.stderr).toBe('');
    expect(changed.stdout).toContain('~5 modified');
    expect(changed.stdout).not.toContain('Incomplete comparison');
    expect(cli('diff', before, before, '--strict', '--exit-code').status).toBe(0);
  });

  it('warns about incomplete comparisons by default and rejects them in strict mode', () => {
    const args = [
      'diff',
      'test/fixtures/coverage-before.json',
      'test/fixtures/coverage-after.json',
    ];
    const permissive = cli(...args, '--exit-code', '--no-color');
    expect(permissive.status).toBe(0);
    expect(permissive.stdout).toContain('Incomplete comparison');
    expect(permissive.stdout).not.toContain('No changes.');
    const strict = cli(...args, '--strict', '--exit-code');
    expect(strict.status).toBe(2);
    expect(strict.stdout).toBe('');
    expect(strict.stderr).toContain('Incomplete comparison');
    expect(strict.stderr).not.toContain('\u001b');
    expect(strict.stderr).not.toContain('\u0085');
    expect(cli('diff', before, after, '--strict', '--exit-code').status).toBe(1);
  });

  it.each(['console', 'json'])(
    'does not overwrite a %s output file when strict coverage fails',
    async (format) => {
      const directory = await mkdtemp(join(tmpdir(), 'gtm-diff-strict-'));
      const output = join(directory, 'report.md');
      try {
        await writeFile(output, 'Keep this report', 'utf8');
        const result = cli(
          'diff',
          before,
          'test/fixtures/coverage-after.json',
          '--strict',
          '--format',
          format,
          '--output',
          output,
        );
        expect(result.status).toBe(2);
        expect(result.stdout).toBe('');
        expect(result.stderr).toContain('Incomplete comparison');
        expect(await readFile(output, 'utf8')).toBe('Keep this report');
      } finally {
        await rm(output, { force: true });
        await rmdir(directory);
      }
    },
  );

  it('returns zero by default even with changes', () => {
    const result = cli('diff', before, after, '--no-color');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('~2 modified');
    expect(result.stderr).toBe('');
  });

  it('returns zero when unchanged and one for detected changes with --exit-code', () => {
    expect(cli('diff', before, before, '--exit-code').status).toBe(0);
    const changed = cli('diff', before, after, '--exit-code', '--no-color');
    expect(changed.status).toBe(1);
    expect(changed.stderr).toBe('');
    expect(changed.stdout).toMatchSnapshot();
  });

  it('counts metadata-only differences for --exit-code', () => {
    const result = cli(
      'diff',
      'test/fixtures/metadata-before.json',
      'test/fixtures/metadata-after.json',
      '--exit-code',
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Container metadata');
    expect(result.stdout).not.toContain('No changes.');
  });

  it.each([
    { args: [before], message: 'required' },
    { args: [before, after, '--unknown'], message: '--unknown' },
    { args: [before, after, '--format', 'xml'], message: '--format=xml' },
    { args: ['missing-before.json', 'missing-after.json'], message: 'Could not read file' },
    { args: [before, 'test/fixtures/invalid-json.json'], message: 'Invalid JSON' },
    { args: [before, 'test/fixtures/malformed-entry-after.json'], message: 'tag[0]' },
    { args: [before, 'test/fixtures/depth-limit-after.json'], message: 'nesting levels' },
    { args: [before, after, '--output', 'test/fixtures'], message: 'fixtures' },
  ])('returns two for command, input or output errors: $message', ({ args, message }) => {
    const result = cli('diff', ...args);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain(message);
    expect(result.stdout).toBe('');
  });

  it('reports the before-file error first when both files are missing', () => {
    const result = cli('diff', 'missing-before.json', 'missing-after.json');
    expect(result.stderr).toContain('missing-before.json');
    expect(result.stderr).not.toContain('missing-after.json');
  });

  it('sanitizes error text before it reaches the terminal', () => {
    const result = cli('diff', before, after, '--format', 'bad\u001b[2A\u0085');
    expect(result.status).toBe(2);
    expect(result.stderr).not.toContain('\u001b');
    expect(result.stderr).not.toContain('\u0085');
  });

  it.each([
    { format: 'markdown', render: renderMarkdown },
    { format: 'json', render: renderJson },
  ])('writes the full $format report before returning one', async ({ format, render }) => {
    const directory = await mkdtemp(join(tmpdir(), 'gtm-diff-cli-'));
    const output = join(directory, 'report\u0085.md');
    try {
      const result = cli(
        'diff',
        before,
        after,
        '--format',
        format,
        '--output',
        output,
        '--exit-code',
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toBe('');
      expect(result.stdout.trim()).toBe(
        `Wrote ${format} report to ${join(directory, 'report.md')}`,
      );
      const a = await loadGtmExport(join(root, before));
      const b = await loadGtmExport(join(root, after));
      expect(await readFile(output, 'utf8')).toBe(
        render(diffExports(a, b, { before: 'minimal-before.json', after: 'minimal-after.json' })),
      );
    } finally {
      await rm(output, { force: true });
      await rmdir(directory);
    }
  });

  it('keeps help successful', () => {
    const result = cli('diff', '--help');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('USAGE');
  });
});
