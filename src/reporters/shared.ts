import type { ContainerDiff, EntityChange } from '../core/diff.js';
import type { Difference } from 'microdiff';
import type { EntityKind } from '../types/gtm.js';
import { isTriggerReference, SINGLE_PARAMETER_PATHS } from '../core/parameter-fields.js';

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

function triggerReferenceLabel(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object' || Object.keys(value).length !== 1)
    return undefined;
  const ref = value as Record<string, unknown>;
  if (typeof ref['unresolvedTriggerId'] === 'string')
    return `<unresolved:${ref['unresolvedTriggerId']}>`;
  const target = ref['trigger'];
  if (target !== null && typeof target === 'object') {
    const identity = target as Record<string, unknown>;
    if (
      Object.keys(identity).length === 2 &&
      typeof identity['name'] === 'string' &&
      typeof identity['type'] === 'string'
    )
      return `${identity['name']} (${identity['type']})`;
  }
  return undefined;
}

function referenceLabels(entity: Record<string, unknown>, kind: EntityKind): Map<unknown, string> {
  const labels = new Map<unknown, string>();
  const add = (value: unknown) => {
    const label = triggerReferenceLabel(value);
    if (label !== undefined) labels.set(value, label);
  };
  const parameters = (value: unknown) => items(value).forEach(parameter);
  const parameter = (value: unknown): void => {
    const type = property(value, 'type');
    if (typeof type === 'string' && isTriggerReference(type)) add(property(value, 'value'));
    parameters(property(value, 'list'));
    parameters(property(value, 'map'));
  };
  const conditions = (value: unknown) =>
    items(value).forEach((condition) => parameters(property(condition, 'parameter')));
  if (['tag', 'trigger', 'variable', 'client', 'transformation', 'gtagConfig'].includes(kind))
    parameters(entity['parameter']);
  for (const [field, nested] of SINGLE_PARAMETER_PATHS[kind] ?? []) {
    parameter(nested === undefined ? entity[field] : property(entity[field], nested));
  }
  if (kind === 'tag') {
    items(entity['firingTriggerNames']).forEach(add);
    items(entity['blockingTriggerNames']).forEach(add);
  }
  if (kind === 'variable') {
    items(entity['enablingTriggerNames']).forEach(add);
    items(entity['disablingTriggerNames']).forEach(add);
  }
  if (kind === 'trigger') {
    for (const field of ['filter', 'customEventFilter', 'autoEventFilter'])
      conditions(entity[field]);
  }
  if (kind === 'zone') {
    const boundary = entity['boundary'];
    items(property(boundary, 'customEvaluationTriggerNames')).forEach(add);
    conditions(property(boundary, 'condition'));
  }
  return labels;
}

function items(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function property(value: unknown, key: string | number): unknown {
  return value !== null && typeof value === 'object'
    ? (value as Record<string | number, unknown>)[key]
    : undefined;
}

function displayReferences(value: unknown, labels: Map<unknown, string>): unknown {
  if (labels.has(value)) return labels.get(value);
  if (Array.isArray(value)) return value.map((item: unknown) => displayReferences(item, labels));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, displayReferences(item, labels)]),
    );
  }
  return value;
}

export function displayEntity(entity: Record<string, unknown>, kind: EntityKind): unknown {
  return displayReferences(entity, referenceLabels(entity, kind));
}

export function displayFieldDiffs(
  change: Extract<EntityChange, { status: 'modified' }>,
): Difference[] {
  // Show a whole reference instead of separate changes to its identity properties.
  const seen = new Set<string>();
  const beforeLabels = referenceLabels(change.before, change.kind);
  const afterLabels = referenceLabels(change.after, change.kind);
  const diffs = change.fieldDiffs.flatMap((diff) => {
    let before: unknown = change.before;
    let after: unknown = change.after;
    for (let i = 0; i <= diff.path.length; i++) {
      if (beforeLabels.has(before) && afterLabels.has(after)) {
        const path = diff.path.slice(0, i);
        const key = JSON.stringify(path);
        if (seen.has(key)) return [];
        seen.add(key);
        return [{ type: 'CHANGE' as const, path, oldValue: before, value: after }];
      }
      const segment = diff.path[i];
      if (segment === undefined) break;
      before = property(before, segment);
      after = property(after, segment);
    }
    return [diff];
  });
  return diffs.map((diff) => {
    switch (diff.type) {
      case 'CREATE':
        return { ...diff, value: displayReferences(diff.value, afterLabels) };
      case 'REMOVE':
        return { ...diff, oldValue: displayReferences(diff.oldValue, beforeLabels) };
      case 'CHANGE':
        return {
          ...diff,
          oldValue: displayReferences(diff.oldValue, beforeLabels),
          value: displayReferences(diff.value, afterLabels),
        };
    }
  });
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
