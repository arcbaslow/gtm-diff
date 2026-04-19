import chalk, { Chalk } from 'chalk';
import type { ContainerDiff, KindDiff } from '../core/diff.js';
import { displayIdentity, formatPath, formatValue, KIND_LABELS } from './shared.js';

export type ConsoleReporterOptions = {
  color?: boolean | undefined;
};

export function renderConsole(diff: ContainerDiff, options: ConsoleReporterOptions = {}): string {
  const c = buildChalk(options.color);
  const lines: string[] = [];

  lines.push(c.bold(`GTM diff: ${diff.source.label} → ${diff.target.label}`));
  lines.push('');

  const { added, removed, modified, unchanged } = diff.summary;
  const summary = [
    c.green(`+${added} added`),
    c.red(`-${removed} removed`),
    c.yellow(`~${modified} modified`),
    c.gray(`${unchanged} unchanged`),
  ].join('  ');
  lines.push(summary);
  lines.push('');

  if (diff.containerMeta.length > 0) {
    lines.push(c.bold('Container metadata'));
    for (const d of diff.containerMeta) {
      lines.push('  ' + renderDifference(d, c));
    }
    lines.push('');
  }

  for (const kind of diff.kinds) {
    if (kind.added.length + kind.removed.length + kind.modified.length === 0) continue;
    lines.push(c.bold(KIND_LABELS[kind.kind].plural.toUpperCase()));
    renderKind(kind, c, lines);
    lines.push('');
  }

  if (added + removed + modified === 0 && diff.containerMeta.length === 0) {
    lines.push(c.green('No changes.'));
  }

  return lines.join('\n');
}

function renderKind(kind: KindDiff, c: ReturnType<typeof buildChalk>, lines: string[]): void {
  for (const change of kind.added) {
    const { name, type } = displayIdentity(change);
    lines.push(`  ${c.green('+')} ${c.green(name)}  ${c.gray(`(${type})`)}`);
  }
  for (const change of kind.removed) {
    const { name, type } = displayIdentity(change);
    lines.push(`  ${c.red('-')} ${c.red(name)}  ${c.gray(`(${type})`)}`);
  }
  for (const change of kind.modified) {
    const { name, type } = displayIdentity(change);
    lines.push(`  ${c.yellow('~')} ${c.yellow(name)}  ${c.gray(`(${type})`)}`);
    if (change.status === 'modified') {
      for (const d of change.fieldDiffs) {
        lines.push('      ' + renderDifference(d, c));
      }
    }
  }
}

function renderDifference(
  d: { type: string; path: ReadonlyArray<string | number>; value?: unknown; oldValue?: unknown },
  c: ReturnType<typeof buildChalk>,
): string {
  const path = c.cyan(formatPath(d.path));
  if (d.type === 'CREATE') {
    return `${c.green('+')} ${path} = ${c.green(formatValue(d.value))}`;
  }
  if (d.type === 'REMOVE') {
    return `${c.red('-')} ${path} (was ${c.red(formatValue(d.oldValue))})`;
  }
  return `${c.yellow('~')} ${path}: ${c.red(formatValue(d.oldValue))} → ${c.green(formatValue(d.value))}`;
}

function buildChalk(color?: boolean) {
  const c = color === false ? new Chalk({ level: 0 }) : chalk;
  return {
    bold: (s: string) => c.bold(s),
    green: (s: string) => c.green(s),
    red: (s: string) => c.red(s),
    yellow: (s: string) => c.yellow(s),
    cyan: (s: string) => c.cyan(s),
    gray: (s: string) => c.gray(s),
  };
}
