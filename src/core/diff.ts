import microdiff, { type Difference } from 'microdiff';
import type { EntityKind, GtmExport } from '../types/gtm.js';
import { normalizeExport, type NormalizedContainer, type NormalizedEntity } from './normalize.js';

export type EntityChange =
  | { status: 'added'; kind: EntityKind; key: string; entity: NormalizedEntity }
  | { status: 'removed'; kind: EntityKind; key: string; entity: NormalizedEntity }
  | {
      status: 'modified';
      kind: EntityKind;
      key: string;
      before: NormalizedEntity;
      after: NormalizedEntity;
      fieldDiffs: Difference[];
    };

export type KindDiff = {
  kind: EntityKind;
  added: EntityChange[];
  removed: EntityChange[];
  modified: EntityChange[];
  unchanged: number;
};

export type ContainerDiff = {
  source: { label: string };
  target: { label: string };
  containerMeta: Difference[];
  kinds: KindDiff[];
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
};

const KINDS: EntityKind[] = ['tag', 'trigger', 'variable', 'folder', 'builtInVariable'];

export function diffExports(
  before: GtmExport,
  after: GtmExport,
  labels: { before: string; after: string } = { before: 'before', after: 'after' },
): ContainerDiff {
  const a = normalizeExport(before);
  const b = normalizeExport(after);
  return diffNormalized(a, b, labels);
}

export function diffNormalized(
  before: NormalizedContainer,
  after: NormalizedContainer,
  labels: { before: string; after: string },
): ContainerDiff {
  const kinds: KindDiff[] = KINDS.map((kind) => diffKind(kind, before[kind], after[kind]));

  const summary = kinds.reduce(
    (acc, k) => ({
      added: acc.added + k.added.length,
      removed: acc.removed + k.removed.length,
      modified: acc.modified + k.modified.length,
      unchanged: acc.unchanged + k.unchanged,
    }),
    { added: 0, removed: 0, modified: 0, unchanged: 0 },
  );

  const containerMeta = microdiff(before.container, after.container);

  return {
    source: { label: labels.before },
    target: { label: labels.after },
    containerMeta,
    kinds,
    summary,
  };
}

function diffKind(
  kind: EntityKind,
  before: Record<string, NormalizedEntity>,
  after: Record<string, NormalizedEntity>,
): KindDiff {
  const added: EntityChange[] = [];
  const removed: EntityChange[] = [];
  const modified: EntityChange[] = [];
  let unchanged = 0;

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeEntity = before[key];
    const afterEntity = after[key];

    if (!beforeEntity && afterEntity) {
      added.push({ status: 'added', kind, key, entity: afterEntity });
      continue;
    }
    if (beforeEntity && !afterEntity) {
      removed.push({ status: 'removed', kind, key, entity: beforeEntity });
      continue;
    }
    if (!beforeEntity || !afterEntity) continue;

    const fieldDiffs = microdiff(beforeEntity, afterEntity);
    if (fieldDiffs.length === 0) {
      unchanged++;
    } else {
      modified.push({
        status: 'modified',
        kind,
        key,
        before: beforeEntity,
        after: afterEntity,
        fieldDiffs,
      });
    }
  }

  const byKey = (x: EntityChange, y: EntityChange) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0);
  added.sort(byKey);
  removed.sort(byKey);
  modified.sort(byKey);

  return { kind, added, removed, modified, unchanged };
}

export function hasChanges(diff: ContainerDiff): boolean {
  return (
    diff.summary.added > 0 ||
    diff.summary.removed > 0 ||
    diff.summary.modified > 0 ||
    diff.containerMeta.length > 0
  );
}
