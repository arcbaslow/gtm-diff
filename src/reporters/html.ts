import type { ContainerDiff, KindDiff } from '../core/diff.js';
import { displayIdentity, formatPath, formatValue, KIND_LABELS } from './shared.js';

/**
 * Self-contained HTML report. No external CSS, no JS. Opens in any browser,
 * attaches cleanly to CI artifacts.
 */
export function renderHtml(diff: ContainerDiff): string {
  const { added, removed, modified } = diff.summary;
  const body = [
    `<h1>GTM diff: <code>${escapeHtml(diff.source.label)}</code> → <code>${escapeHtml(diff.target.label)}</code></h1>`,
    renderSummary(diff),
    ...(diff.containerMeta.length > 0
      ? [
          '<h2>Container metadata</h2>',
          '<pre class="diff">',
          diff.containerMeta.map(renderUnifiedDiffLineHtml).join('\n'),
          '</pre>',
        ]
      : []),
    ...diff.kinds.flatMap((kind) =>
      kind.added.length + kind.removed.length + kind.modified.length === 0
        ? []
        : renderKindHtml(kind),
    ),
    added + removed + modified === 0 && diff.containerMeta.length === 0
      ? '<p><em>No changes.</em></p>'
      : '',
  ].join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>GTM diff</title>
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

function renderSummary(diff: ContainerDiff): string {
  const { added, removed, modified, unchanged } = diff.summary;
  const rows = [
    `<tr><th>Total</th><td class="add">${added}</td><td class="rem">${removed}</td><td class="mod">${modified}</td><td class="unchanged">${unchanged}</td></tr>`,
    ...diff.kinds.map(
      (k) =>
        `<tr><th>${escapeHtml(KIND_LABELS[k.kind].plural)}</th><td class="add">${k.added.length}</td><td class="rem">${k.removed.length}</td><td class="mod">${k.modified.length}</td><td class="unchanged">${k.unchanged}</td></tr>`,
    ),
  ].join('\n');
  return `<table class="summary">
<thead><tr><th></th><th>Added</th><th>Removed</th><th>Modified</th><th>Unchanged</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

function renderKindHtml(kind: KindDiff): string[] {
  const out: string[] = [];
  out.push(`<h2>${escapeHtml(capitalize(KIND_LABELS[kind.kind].plural))}</h2>`);

  if (kind.added.length > 0) {
    out.push('<h3 class="add">Added</h3><ul>');
    for (const c of kind.added) {
      const { type, name } = displayIdentity(c);
      out.push(`<li><strong>${escapeHtml(name)}</strong> <code>${escapeHtml(type)}</code></li>`);
    }
    out.push('</ul>');
  }
  if (kind.removed.length > 0) {
    out.push('<h3 class="rem">Removed</h3><ul>');
    for (const c of kind.removed) {
      const { type, name } = displayIdentity(c);
      out.push(`<li><strong>${escapeHtml(name)}</strong> <code>${escapeHtml(type)}</code></li>`);
    }
    out.push('</ul>');
  }
  if (kind.modified.length > 0) {
    out.push('<h3 class="mod">Modified</h3>');
    for (const c of kind.modified) {
      if (c.status !== 'modified') continue;
      const { type, name } = displayIdentity(c);
      out.push('<details>');
      out.push(
        `<summary><strong>${escapeHtml(name)}</strong> <code>${escapeHtml(type)}</code> — ${c.fieldDiffs.length} field change${c.fieldDiffs.length === 1 ? '' : 's'}</summary>`,
      );
      out.push('<pre class="diff">');
      out.push(c.fieldDiffs.map(renderUnifiedDiffLineHtml).join('\n'));
      out.push('</pre>');
      out.push('</details>');
    }
  }
  return out;
}

function renderUnifiedDiffLineHtml(d: {
  type: string;
  path: ReadonlyArray<string | number>;
  value?: unknown;
  oldValue?: unknown;
}): string {
  const path = escapeHtml(formatPath(d.path));
  if (d.type === 'CREATE') {
    return `<span class="add">+ ${path} = ${escapeHtml(formatValue(d.value))}</span>`;
  }
  if (d.type === 'REMOVE') {
    return `<span class="rem">- ${path} (was ${escapeHtml(formatValue(d.oldValue))})</span>`;
  }
  return `<span class="mod">~ ${path}: ${escapeHtml(formatValue(d.oldValue))} → ${escapeHtml(formatValue(d.value))}</span>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

const STYLE = `
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 1000px; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; }
  h2 { margin-top: 2rem; border-bottom: 1px solid #888; padding-bottom: .25rem; }
  h3 { margin-top: 1rem; }
  table.summary { border-collapse: collapse; margin: 1rem 0; }
  table.summary th, table.summary td { padding: .25rem .75rem; border: 1px solid #888; text-align: right; }
  table.summary th { text-align: left; }
  pre.diff { background: rgba(128,128,128,.08); padding: .5rem; border-radius: 4px; overflow-x: auto; font-size: .85rem; line-height: 1.4; }
  .add { color: #2e7d32; }
  .rem { color: #c62828; }
  .mod { color: #b26a00; }
  .unchanged { color: #888; }
  details { margin: .25rem 0; }
  summary { cursor: pointer; }
  code { background: rgba(128,128,128,.15); padding: .1em .3em; border-radius: 3px; font-size: .9em; }
`;
