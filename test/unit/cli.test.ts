import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diffExports } from '../../src/core/diff.js';
import { loadGtmExport } from '../../src/core/parser.js';
import { renderMarkdown } from '../../src/reporters/markdown.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const before = 'test/fixtures/minimal-before.json';
const after = 'test/fixtures/minimal-after.json';

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

  it('does not overwrite an output file when strict coverage fails', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gtm-diff-strict-'));
    const output = join(directory, 'report.md');
    try {
      await writeFile(output, 'Keep this report', 'utf8');
      const result = cli(
        'diff',
        before,
        'test/fixtures/coverage-after.json',
        '--strict',
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
  });

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

  it('writes the full selected report before returning one', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gtm-diff-cli-'));
    const output = join(directory, 'report\u0085.md');
    try {
      const result = cli(
        'diff',
        before,
        after,
        '--format',
        'markdown',
        '--output',
        output,
        '--exit-code',
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toBe('');
      expect(result.stdout.trim()).toBe(`Wrote markdown report to ${join(directory, 'report.md')}`);
      const a = await loadGtmExport(join(root, before));
      const b = await loadGtmExport(join(root, after));
      expect(await readFile(output, 'utf8')).toBe(
        renderMarkdown(
          diffExports(a, b, { before: 'minimal-before.json', after: 'minimal-after.json' }),
        ),
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
