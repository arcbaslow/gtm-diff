import { appendFile, mkdtemp, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { diffExports, hasChanges } from '../core/diff.js';
import { loadGtmExport } from '../core/parser.js';
import { renderHtml } from '../reporters/html.js';
import { renderJson } from '../reporters/json.js';
import { renderMarkdown } from '../reporters/markdown.js';
import { coverageNotice, sanitizeLabel } from '../reporters/shared.js';

export type ActionOptions = {
  before: string;
  after: string;
  tempDirectory: string;
  outputFile: string;
  summaryFile?: string | undefined;
  strict: boolean;
  details: boolean;
  failOnChange: boolean;
};

/** Local Action adapter. Installation/upload belong to the caller's workflow. */
export async function runAction(options: ActionOptions): Promise<0 | 1> {
  const temporaryRoot = resolve(options.tempDirectory);
  if (sanitizeLabel(temporaryRoot) !== temporaryRoot) {
    throw new Error('The Action temporary directory must not contain control characters.');
  }
  const before = await loadGtmExport(options.before);
  const after = await loadGtmExport(options.after);
  const diff = diffExports(before, after, {
    before: basename(options.before),
    after: basename(options.after),
  });
  if (options.strict && diff.omittedFields) throw new Error(coverageNotice(diff));
  const reports = {
    json: renderJson(diff),
    markdown: renderMarkdown(diff, { full: options.details }),
    html: renderHtml(diff, { full: options.details }),
    comment: renderMarkdown(diff, { full: options.details, maxBytes: 60_000 }),
  };
  // A fresh directory prevents stale reports from a previous comparison being exported.
  const directory = await mkdtemp(join(temporaryRoot, 'gtm-diff-'));
  const paths = {
    json: join(directory, 'diff.json'),
    markdown: join(directory, 'diff.md'),
    html: join(directory, 'diff.html'),
    comment: join(directory, 'comment.md'),
  };
  for (const format of ['json', 'markdown', 'html', 'comment'] as const) {
    await writeFile(paths[format], reports[format], 'utf8');
  }
  const changed = hasChanges(diff);
  if (options.summaryFile) {
    const { added, removed, modified, unchanged } = diff.summary;
    await appendFile(
      options.summaryFile,
      `## GTM diff\n\nAdded: ${added}; removed: ${removed}; modified: ${modified}; unchanged: ${unchanged}.\n\n` +
        `Container metadata changes: ${diff.containerMeta.length}. Coverage: ${diff.omittedFields ? 'incomplete' : 'complete under the comparison policy'}.\n`,
      'utf8',
    );
  }
  await appendFile(
    options.outputFile,
    [
      `has-changes=${changed}`,
      `complete=${!diff.omittedFields}`,
      `exit-code=${changed ? 1 : 0}`,
      `report-directory=${directory}`,
      `report-json=${paths.json}`,
      `report-markdown=${paths.markdown}`,
      `report-html=${paths.html}`,
      `report-comment=${paths.comment}`,
      '',
    ].join('\n'),
    'utf8',
  );
  return options.failOnChange && changed ? 1 : 0;
}

export function actionBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('Action boolean inputs must be true or false.');
}
