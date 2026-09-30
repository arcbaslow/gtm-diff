import type { Difference } from 'microdiff';
import { canonicalize } from '../core/canonical.js';
import { hasChanges, type ContainerDiff, type EntityChange } from '../core/diff.js';
import type { NormalizedEntity } from '../core/normalize.js';
import type { EntityKind } from '../types/gtm.js';
import { sanitizeLabel } from './shared.js';

/** Public wire types; do not expose the diff dependency's value types. */
export type JsonFieldChange =
  | { type: 'CREATE'; path: (string | number)[]; value: unknown }
  | { type: 'REMOVE'; path: (string | number)[]; oldValue: unknown }
  | { type: 'CHANGE'; path: (string | number)[]; oldValue: unknown; value: unknown };

export type JsonEntityChange = { kind: EntityKind; key: string } & (
  | { status: 'added' | 'removed'; entity: NormalizedEntity }
  | {
      status: 'modified';
      before: NormalizedEntity;
      after: NormalizedEntity;
      fieldDiffs: JsonFieldChange[];
    }
);

export type JsonReportV1 = {
  schemaVersion: 1;
  source: { label: string };
  target: { label: string };
  hasChanges: boolean;
  coverage: { complete: boolean; omittedFields: { before: string[]; after: string[] } };
  summary: { added: number; removed: number; modified: number; unchanged: number };
  containerMeta: JsonFieldChange[];
  kinds: {
    kind: EntityKind;
    added: JsonEntityChange[];
    removed: JsonEntityChange[];
    modified: JsonEntityChange[];
    unchanged: number;
  }[];
};

/** Serialize normalized comparison data, never an executable GTM plan. */
export function renderJson(diff: ContainerDiff): string {
  const omittedFields = {
    before: [...(diff.omittedFields?.before ?? [])].sort(),
    after: [...(diff.omittedFields?.after ?? [])].sort(),
  };
  const report: JsonReportV1 = {
    schemaVersion: 1,
    source: { label: sanitizeLabel(diff.source.label) },
    target: { label: sanitizeLabel(diff.target.label) },
    hasChanges: hasChanges(diff),
    coverage: {
      complete: omittedFields.before.length + omittedFields.after.length === 0,
      omittedFields,
    },
    summary: {
      added: diff.summary.added,
      removed: diff.summary.removed,
      modified: diff.summary.modified,
      unchanged: diff.summary.unchanged,
    },
    containerMeta: diff.containerMeta.map(fieldChange),
    kinds: diff.kinds.map((kind) => ({
      kind: kind.kind,
      added: kind.added.map(entityChange),
      removed: kind.removed.map(entityChange),
      modified: kind.modified.map(entityChange),
      unchanged: kind.unchanged,
    })),
  };
  const json = JSON.stringify(
    canonicalize(report),
    (_key, value: unknown) => {
      if (
        value === undefined ||
        typeof value === 'bigint' ||
        typeof value === 'function' ||
        typeof value === 'symbol' ||
        (typeof value === 'number' && !Number.isFinite(value))
      ) {
        throw new Error('JSON reports require JSON-compatible values and finite numbers.');
      }
      return value;
    },
    2,
  ).replace(
    /[<>&'\u007f-\u009f\u2028\u2029]/g,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`,
  );
  // Encode controls before sanitizing: paths, keys and values round-trip exactly.
  // Only JSON-generated indentation/newlines survive this output boundary.
  return json.split('\n').map(sanitizeLabel).join('\n');
}

function fieldChange(change: Difference): JsonFieldChange {
  const path = [...change.path];
  switch (change.type) {
    case 'CREATE':
      return { type: 'CREATE', path, value: change.value };
    case 'REMOVE':
      return { type: 'REMOVE', path, oldValue: change.oldValue };
    case 'CHANGE':
      return { type: 'CHANGE', path, oldValue: change.oldValue, value: change.value };
  }
}

function entityChange(change: EntityChange): JsonEntityChange {
  const identity = { kind: change.kind, key: change.key };
  if (change.status === 'modified') {
    return {
      ...identity,
      status: 'modified',
      before: change.before,
      after: change.after,
      fieldDiffs: change.fieldDiffs.map(fieldChange),
    };
  }
  return { ...identity, status: change.status, entity: change.entity };
}
