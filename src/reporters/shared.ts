import type { EntityChange } from '../core/diff.js';
import type { EntityKind } from '../types/gtm.js';

export const KIND_LABELS: Record<EntityKind, { singular: string; plural: string }> = {
  tag: { singular: 'tag', plural: 'tags' },
  trigger: { singular: 'trigger', plural: 'triggers' },
  variable: { singular: 'variable', plural: 'variables' },
  folder: { singular: 'folder', plural: 'folders' },
  builtInVariable: { singular: 'built-in variable', plural: 'built-in variables' },
};

export function splitIdentityKey(key: string): { type: string; name: string } {
  const idx = key.indexOf('::');
  if (idx === -1) return { type: '', name: key };
  return { type: key.slice(0, idx), name: key.slice(idx + 2) };
}

/**
 * Human label + type for a change, handling the two identity shapes we use:
 * `type::name` for authored entities, and a bare type string for built-in
 * variables (they have no user-assigned name).
 */
export function displayIdentity(change: EntityChange): { name: string; type: string } {
  if (change.kind === 'builtInVariable') {
    const entity = change.status === 'removed' ? change.entity : (change.status === 'added' ? change.entity : change.after);
    const displayName = (entity['name'] as string | undefined) ?? change.key;
    return { name: displayName, type: change.key };
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
      out += `[${JSON.stringify(segment)}]`;
    }
  }
  return out || '(root)';
}

export function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return String(value);
  }
  const json = JSON.stringify(value, null, 2);
  return json.length > 200 ? `${json.slice(0, 200)}…` : json;
}
