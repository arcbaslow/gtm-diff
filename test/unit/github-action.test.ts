import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  actionBoolean,
  runAction,
  type ActionOptions,
} from '../../src/integrations/github-action.js';
import type { JsonReportV1 } from '../../src/reporters/json.js';

const directories: string[] = [];
const fixture = (name: string) =>
  fileURLToPath(new URL(`../fixtures/${name}.json`, import.meta.url));
async function options(name = 'minimal'): Promise<ActionOptions> {
  const directory = await mkdtemp(join(tmpdir(), 'gtm-diff-action-'));
  directories.push(directory);
  return {
    before: fixture(`${name}-before`),
    after: fixture(`${name}-after`),
    tempDirectory: directory,
    outputFile: join(directory, 'outputs'),
    summaryFile: join(directory, 'summary'),
    strict: true,
    details: false,
    failOnChange: false,
  };
}
afterEach(async () => {
  for (const directory of directories.splice(0)) {
    expect(resolve(directory).startsWith(resolve(tmpdir()) + sep + 'gtm-diff-action-')).toBe(true);
    await rm(directory, { recursive: true, force: true });
  }
});

describe('offline GitHub Action adapter', () => {
  it('exports reports and only aggregate data in the job summary', async () => {
    const config = await options('reporter-hostile');
    expect(await runAction(config)).toBe(0);
    const output = await readFile(config.outputFile, 'utf8');
    const values = Object.fromEntries(
      output
        .trimEnd()
        .split('\n')
        .map((line) => {
          const separator = line.indexOf('=');
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    );
    expect(values['has-changes']).toBe('true');
    expect(values['complete']).toBe('true');
    expect(values['exit-code']).toBe('1');
    const report = JSON.parse(await readFile(values['report-json']!, 'utf8')) as JsonReportV1;
    expect(report.schemaVersion).toBe(1);
    expect(report.hasChanges).toBe(true);
    expect(await readFile(values['report-html']!, 'utf8')).not.toContain('<img');
    expect(await readFile(values['report-markdown']!, 'utf8')).toContain('# GTM diff');
    expect(await readFile(values['report-comment']!, 'utf8')).toContain(
      '<!-- gtm-diff:report:v1 -->',
    );
    const summary = await readFile(config.summaryFile!, 'utf8');
    expect(summary).not.toContain('<img');
    expect(summary).not.toContain('alert');
    expect(summary).toMatchSnapshot();
  });

  it('writes reports before optionally failing on changes and allows repeated runs without stale output', async () => {
    const config = await options();
    config.failOnChange = true;
    expect(await runAction(config)).toBe(1);
    config.after = config.before;
    expect(await runAction(config)).toBe(0);
    const output = await readFile(config.outputFile, 'utf8');
    expect(output).toContain('has-changes=false');
    const reportDirectories = (await readdir(config.tempDirectory)).filter((name) =>
      name.startsWith('gtm-diff-'),
    );
    expect(reportDirectories).toHaveLength(2);
  });

  it('rejects incomplete coverage without creating reports, then supports explicit permissive mode', async () => {
    const config = await options('coverage');
    await expect(runAction(config)).rejects.toThrow('Incomplete comparison');
    expect(await readdir(config.tempDirectory)).toEqual([]);
    config.strict = false;
    config.summaryFile = undefined;
    expect(await runAction(config)).toBe(0);
    expect(await readFile(config.outputFile, 'utf8')).toContain('complete=false');
    expect(await readdir(config.tempDirectory)).not.toContain('summary');
  });

  it('does not emit success outputs for malformed or unrenderable input', async () => {
    for (const name of ['malformed-entry', 'json-nonfinite']) {
      const config = await options(name);
      await expect(runAction(config)).rejects.toThrow();
      expect(await readdir(config.tempDirectory)).toEqual([]);
    }
  });

  it('rejects output-protocol controls in the temporary root', async () => {
    const config = await options();
    config.tempDirectory += '\nforged=true';
    await expect(runAction(config)).rejects.toThrow('control characters');
  });

  it('parses boolean inputs explicitly', () => {
    expect(actionBoolean(undefined, true)).toBe(true);
    expect(actionBoolean('false', true)).toBe(false);
    expect(actionBoolean('true', false)).toBe(true);
    expect(() => actionBoolean('yes', false)).toThrow('true or false');
  });
});
