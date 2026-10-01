import type { ContainerDiff, EntityChange } from '../core/diff.js';
import type { EntityKind } from '../types/gtm.js';

export const KIND_LABELS: Record<EntityKind, { singular: string; plural: string }> = {
  tag: { singular: 'tag', plural: 'tags' },
  trigger: { singular: 'trigger', plural: 'triggers' },
  variable: { singular: 'variable', plural: 'variables' },
  folder: { singular: 'folder', plural: 'folders' },
  builtInVariable: { singular: 'built-in variable', plural: 'built-in variables' },
  client: { singular: 'client', plural: 'clients' },
  transformation: { singular: 'transformation', plural: 'transformations' },
  customTemplate: { singular: 'custom template', plural: 'custom templates' },
  zone: { singular: 'zone', plural: 'zones' },
  gtagConfig: { singular: 'Google tag config', plural: 'Google tag configs' },
};

/** Safe plain text; HTML contexts must additionally use escapeHtml. */
export function coverageNotice(diff: ContainerDiff): string {
  if (!diff.omittedFields) return '';
  const fields = (keys: string[]) => keys.map((key) => formatPath([key])).join(', ') || 'none';
  return `Incomplete comparison: omitted containerVersion fields (before: ${fields(diff.omittedFields.before)}; after: ${fields(diff.omittedFields.after)}).`;
}

/**
 * Drop C0/C1 control characters from a label.
 *
 * Entity names come out of the container export, which is authored by whoever
 * can edit the GTM container. A name carrying ESC sequences can move the cursor
 * and overwrite lines the console reporter already printed, which would let one
 * change conceal another in the very output you are reviewing. Newlines break
 * the line-oriented console and markdown reporters the same way.
 *
 * Values use JSON escaping plus visible escapes for C1 and Unicode line
 * separators. JSON.stringify alone does not escape those characters.
 *
 * Done by codepoint rather than a regex so no control characters appear in this
 * source file.
 */
export function sanitizeLabel(s: string): string {
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f) || cp === 0x2028 || cp === 0x2029) continue;
    out += ch;
  }
  return out;
}

export function splitIdentityKey(key: string): { type: string; name: string } {
  const idx = key.indexOf('::');
  if (idx === -1) return { type: '', name: sanitizeLabel(key) };
  return { type: sanitizeLabel(key.slice(0, idx)), name: sanitizeLabel(key.slice(idx + 2)) };
}

/**
 * Human label + type: `type::name` for named entities, `type::gtagConfigId`
 * for Google tag configs, and a bare type string for built-in variables.
 */
export function displayIdentity(change: EntityChange): { name: string; type: string } {
  if (change.kind === 'builtInVariable') {
    const entity =
      change.status === 'removed'
        ? change.entity
        : change.status === 'added'
          ? change.entity
          : change.after;
    const displayName = (entity['name'] as string | undefined) ?? change.key;
    return { name: sanitizeLabel(displayName), type: sanitizeLabel(change.key) };
  }
  return splitIdentityKey(change.key);
}

export function formatPath(path: ReadonlyArray<string | number>): string {
  let out = '';
  for (const segment of path) {
    if (typeof segment === 'number') {
      out += `[${segment}]`;
    } else if (/^[A-Za-z_$][\w$]*$/.test(segment)) {
      out += out === '' ? segment : `.${segment}`;
    } else {
      out += `[${safeJson(segment)}]`;
    }
  }
  return sanitizeLabel(out) || '(root)';
}

export function formatValue(value: unknown, full = false): string {
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return safeJson(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return String(value);
  }
  const json = safeJson(value, 2);
  return !full && json.length > 200 ? `${json.slice(0, 200)}…` : json;
}

function safeJson(value: unknown, space?: number): string {
  const json = JSON.stringify(value, null, space).replace(
    /[\u007f-\u009f\u2028\u2029]/g,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
  // Only JSON's generated indentation/newlines survive; strings stay inert.
  return json.split('\n').map(sanitizeLabel).join('\n');
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
