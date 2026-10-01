import type { ContainerDiff, KindDiff } from '../core/diff.js';
import {
  coverageNotice,
  displayIdentity,
  escapeHtml,
  formatPath,
  formatValue,
  KIND_LABELS,
  sanitizeLabel,
} from './shared.js';

/**
 * Markdown reporter. Designed to be posted as a PR comment. Uses collapsible
 * `<details>` blocks so reviewers see the summary by default and can drill
 * into field-level diffs on demand.
 */
export type MarkdownReportOptions = {
  full?: boolean | undefined;
  maxBytes?: number | undefined;
  artifactUrl?: string | undefined;
};

export const COMMENT_MARKER = '<!-- gtm-diff:report:v1 -->';

export function renderMarkdown(diff: ContainerDiff, options: MarkdownReportOptions = {}): string {
  const lines: string[] = [];
  lines.push(
    `# GTM diff: <code>${escapeHtml(sanitizeLabel(diff.source.label))}</code> → <code>${escapeHtml(sanitizeLabel(diff.target.label))}</code>`,
  );
  lines.push('');

  if (diff.omittedFields) lines.push(`<p>${escapeHtml(coverageNotice(diff))}</p>`, '');

  const { added, removed, modified, unchanged } = diff.summary;
  lines.push('| | Added | Removed | Modified | Unchanged |');
  lines.push('|---|---:|---:|---:|---:|');
  lines.push(`| Total | ${added} | ${removed} | ${modified} | ${unchanged} |`);
  for (const kind of diff.kinds) {
    lines.push(
      `| ${KIND_LABELS[kind.kind].plural} | ${kind.added.length} | ${kind.removed.length} | ${kind.modified.length} | ${kind.unchanged} |`,
    );
  }
  lines.push('');

  if (diff.containerMeta.length > 0) {
    lines.push('## Container metadata');
    lines.push('');
    lines.push('```diff');
    for (const d of diff.containerMeta) {
      lines.push(renderUnifiedDiffLine(d, options.full));
    }
    lines.push('```');
    lines.push('');
  }

  for (const kind of diff.kinds) {
    if (kind.added.length + kind.removed.length + kind.modified.length === 0) continue;
    renderKindMarkdown(kind, lines, options.full);
  }

  if (added + removed + modified === 0 && diff.containerMeta.length === 0) {
    lines.push(diff.omittedFields ? '_No changes in compared fields._' : '_No changes._');
  }

  return boundComment(diff, lines.join('\n') + '\n', options);
}

function renderKindMarkdown(kind: KindDiff, lines: string[], full = false): void {
  lines.push(`## ${capitalize(KIND_LABELS[kind.kind].plural)}`);
  lines.push('');

  if (kind.added.length > 0) {
    lines.push('### Added');
    for (const change of kind.added) {
      const { type, name } = displayIdentity(change);
      lines.push(`- **${escapeMd(escapeHtml(name))}** <code>${escapeHtml(type)}</code>`);
      if (full && change.status === 'added') lines.push(entityDetails(change.entity));
    }
    lines.push('');
  }

  if (kind.removed.length > 0) {
    lines.push('### Removed');
    for (const change of kind.removed) {
      const { type, name } = displayIdentity(change);
      lines.push(`- **${escapeMd(escapeHtml(name))}** <code>${escapeHtml(type)}</code>`);
      if (full && change.status === 'removed') lines.push(entityDetails(change.entity));
    }
    lines.push('');
  }

  if (kind.modified.length > 0) {
    lines.push('### Modified');
    for (const change of kind.modified) {
      if (change.status !== 'modified') continue;
      const { type, name } = displayIdentity(change);
      lines.push('<details>');
      lines.push(
        `<summary><strong>${escapeHtml(name)}</strong> <code>${escapeHtml(type)}</code> — ${change.fieldDiffs.length} field change${change.fieldDiffs.length === 1 ? '' : 's'}</summary>`,
      );
      lines.push('');
      lines.push('```diff');
      for (const d of change.fieldDiffs) {
        lines.push(renderUnifiedDiffLine(d, full));
      }
      lines.push('```');
      lines.push('');
      lines.push('</details>');
    }
    lines.push('');
  }
}

function renderUnifiedDiffLine(
  d: {
    type: string;
    path: ReadonlyArray<string | number>;
    value?: unknown;
    oldValue?: unknown;
  },
  full = false,
): string {
  const path = formatPath(d.path);
  if (d.type === 'CREATE') return `+ ${path} = ${formatValue(d.value, full)}`;
  if (d.type === 'REMOVE') return `- ${path} (was ${formatValue(d.oldValue, full)})`;
  return `~ ${path}: ${formatValue(d.oldValue, full)} → ${formatValue(d.value, full)}`;
}

function entityDetails(entity: Record<string, unknown>): string {
  return `\n<details><summary>Full normalized configuration</summary>\n<pre>${escapeHtml(formatValue(entity, true))}</pre>\n</details>\n`;
}

function boundComment(diff: ContainerDiff, body: string, options: MarkdownReportOptions): string {
  if (options.maxBytes === undefined) {
    if (options.artifactUrl !== undefined) throw new Error('artifactUrl requires maxBytes.');
    return body;
  }
  if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 1024) {
    throw new Error('Markdown maxBytes must be an integer of at least 1024.');
  }
  let footer = '';
  if (options.artifactUrl !== undefined) {
    const url = new URL(options.artifactUrl);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      sanitizeLabel(options.artifactUrl) !== options.artifactUrl
    ) {
      throw new Error('The artifact URL must be HTTPS without credentials or controls.');
    }
    footer = `\n<p><a href="${escapeHtml(url.href)}">Full report artifact</a></p>\n`;
  }
  const complete = `${COMMENT_MARKER}\n${body}${footer}`;
  if (Buffer.byteLength(complete, 'utf8') <= options.maxBytes) return complete;
  const summary = diff.summary;
  const compact =
    `${COMMENT_MARKER}\n# GTM diff\n\n` +
    `Added: ${summary.added}; removed: ${summary.removed}; modified: ${summary.modified}; unchanged: ${summary.unchanged}.\n\n` +
    `Container metadata changes: ${diff.containerMeta.length}. Coverage: ${diff.omittedFields ? 'incomplete' : 'complete under the comparison policy'}.\n\n` +
    `Source labels and details omitted: the full report exceeds ${options.maxBytes} UTF-8 bytes. Generate an unbounded report for the full comparison.\n` +
    footer;
  if (Buffer.byteLength(compact, 'utf8') > options.maxBytes) {
    throw new Error('The artifact URL is too long for the Markdown byte budget.');
  }
  return compact;
}

function escapeMd(s: string): string {
  return s.replace(/[\\`*_{}[\]()#+\-.!|<>]/g, (m) => `\\${m}`);
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}
