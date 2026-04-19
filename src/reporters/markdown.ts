import type { ContainerDiff, KindDiff } from '../core/diff.js';
import { displayIdentity, formatPath, formatValue, KIND_LABELS } from './shared.js';

/**
 * Markdown reporter. Designed to be posted as a PR comment. Uses collapsible
 * `<details>` blocks so reviewers see the summary by default and can drill
 * into field-level diffs on demand.
 */
export function renderMarkdown(diff: ContainerDiff): string {
  const lines: string[] = [];
  lines.push(`# GTM diff: \`${diff.source.label}\` → \`${diff.target.label}\``);
  lines.push('');

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
      lines.push(renderUnifiedDiffLine(d));
    }
    lines.push('```');
    lines.push('');
  }

  for (const kind of diff.kinds) {
    if (kind.added.length + kind.removed.length + kind.modified.length === 0) continue;
    renderKindMarkdown(kind, lines);
  }

  if (added + removed + modified === 0 && diff.containerMeta.length === 0) {
    lines.push('_No changes._');
  }

  return lines.join('\n') + '\n';
}

function renderKindMarkdown(kind: KindDiff, lines: string[]): void {
  lines.push(`## ${capitalize(KIND_LABELS[kind.kind].plural)}`);
  lines.push('');

  if (kind.added.length > 0) {
    lines.push('### Added');
    for (const change of kind.added) {
      const { type, name } = displayIdentity(change);
      lines.push(`- **${escapeMd(name)}** \`${escapeMd(type)}\``);
    }
    lines.push('');
  }

  if (kind.removed.length > 0) {
    lines.push('### Removed');
    for (const change of kind.removed) {
      const { type, name } = displayIdentity(change);
      lines.push(`- **${escapeMd(name)}** \`${escapeMd(type)}\``);
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
        `<summary><strong>${escapeMd(name)}</strong> <code>${escapeMd(type)}</code> — ${change.fieldDiffs.length} field change${change.fieldDiffs.length === 1 ? '' : 's'}</summary>`,
      );
      lines.push('');
      lines.push('```diff');
      for (const d of change.fieldDiffs) {
        lines.push(renderUnifiedDiffLine(d));
      }
      lines.push('```');
      lines.push('');
      lines.push('</details>');
    }
    lines.push('');
  }
}

function renderUnifiedDiffLine(d: {
  type: string;
  path: ReadonlyArray<string | number>;
  value?: unknown;
  oldValue?: unknown;
}): string {
  const path = formatPath(d.path);
  if (d.type === 'CREATE') return `+ ${path} = ${formatValue(d.value)}`;
  if (d.type === 'REMOVE') return `- ${path} (was ${formatValue(d.oldValue)})`;
  return `~ ${path}: ${formatValue(d.oldValue)} → ${formatValue(d.value)}`;
}

function escapeMd(s: string): string {
  return s.replace(/[\\`*_{}[\]()#+\-.!|<>]/g, (m) => `\\${m}`);
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}
