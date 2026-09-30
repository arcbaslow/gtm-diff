import type {
  GtmBuiltInVariable,
  GtmContainerVersion,
  GtmExport,
  GtmFolder,
  GtmParameter,
  GtmTag,
  GtmTrigger,
  GtmVariable,
} from '../types/gtm.js';
import { canonicalize } from './canonical.js';
import { builtInIdentity, identityKey } from './identity.js';
import { validateGtmExport } from './parser.js';

export { builtInIdentity, identityKey } from './identity.js';

/**
 * Fields stripped from every entity before diffing. These are either assigned
 * by GTM on write (IDs, fingerprints, paths, urls) or describe the export
 * environment (exportTime). They are never under the author's control, so
 * comparing them generates noise.
 */
const VOLATILE_FIELDS = [
  'accountId',
  'containerId',
  'workspaceId',
  'path',
  'tagManagerUrl',
  'fingerprint',
  'tagId',
  'triggerId',
  'variableId',
  'folderId',
  'containerVersionId',
] as const;

type ReferenceIndex = {
  triggerIdToName: Map<string, string>;
  folderIdToName: Map<string, string>;
  tagIdToName: Map<string, string>;
};

export type NormalizedContainer = {
  container: Record<string, unknown>;
  tag: Record<string, NormalizedEntity>;
  trigger: Record<string, NormalizedEntity>;
  variable: Record<string, NormalizedEntity>;
  folder: Record<string, NormalizedEntity>;
  builtInVariable: Record<string, NormalizedEntity>;
};

export type NormalizedEntity = Record<string, unknown>;

export function buildReferenceIndex(cv: GtmContainerVersion): ReferenceIndex {
  const triggerIdToName = new Map<string, string>();
  for (const t of cv.trigger ?? []) {
    if (t.triggerId) triggerIdToName.set(t.triggerId, t.name);
  }
  const folderIdToName = new Map<string, string>();
  for (const f of cv.folder ?? []) {
    if (f.folderId) folderIdToName.set(f.folderId, f.name);
  }
  const tagIdToName = new Map<string, string>();
  for (const t of cv.tag ?? []) {
    if (t.tagId) tagIdToName.set(t.tagId, t.name);
  }
  return { triggerIdToName, folderIdToName, tagIdToName };
}

export function normalizeExport(exp: GtmExport): NormalizedContainer {
  validateGtmExport(exp, 'input');
  const cv = exp.containerVersion;
  const refs = buildReferenceIndex(cv);

  const result: NormalizedContainer = {
    container: stripVolatile(cv.container as unknown as Record<string, unknown>),
    tag: Object.create(null) as Record<string, NormalizedEntity>,
    trigger: Object.create(null) as Record<string, NormalizedEntity>,
    variable: Object.create(null) as Record<string, NormalizedEntity>,
    folder: Object.create(null) as Record<string, NormalizedEntity>,
    builtInVariable: Object.create(null) as Record<string, NormalizedEntity>,
  };

  for (const t of cv.tag ?? []) {
    result.tag[identityKey(t)] = normalizeTag(t, refs);
  }
  for (const t of cv.trigger ?? []) {
    result.trigger[identityKey(t)] = normalizeTrigger(t, refs);
  }
  for (const v of cv.variable ?? []) {
    result.variable[identityKey(v)] = normalizeVariable(v, refs);
  }
  for (const f of cv.folder ?? []) {
    result.folder[identityKey(f)] = normalizeFolder(f);
  }
  for (const b of cv.builtInVariable ?? []) {
    result.builtInVariable[builtInIdentity(b)] = normalizeBuiltIn(b);
  }

  return canonicalize(result) as NormalizedContainer;
}

function normalizeTag(tag: GtmTag, refs: ReferenceIndex): NormalizedEntity {
  const out = stripVolatile(tag as unknown as Record<string, unknown>);
  if (tag.parameter) out['parameter'] = normalizeParameters(tag.parameter);
  if (tag.firingTriggerId) {
    out['firingTriggerNames'] = resolveTriggerNames(tag.firingTriggerId, refs);
    delete out['firingTriggerId'];
  }
  if (tag.blockingTriggerId) {
    out['blockingTriggerNames'] = resolveTriggerNames(tag.blockingTriggerId, refs);
    delete out['blockingTriggerId'];
  }
  if (tag.parentFolderId) {
    out['parentFolderName'] = refs.folderIdToName.get(tag.parentFolderId) ?? tag.parentFolderId;
    delete out['parentFolderId'];
  }
  if (tag.monitoringMetadata) {
    out['monitoringMetadata'] = normalizeParameter(tag.monitoringMetadata);
  }
  return out;
}

function normalizeTrigger(trigger: GtmTrigger, refs: ReferenceIndex): NormalizedEntity {
  const out = stripVolatile(trigger as unknown as Record<string, unknown>);
  if (trigger.filter) out['filter'] = normalizeConditions(trigger.filter);
  if (trigger.customEventFilter) {
    out['customEventFilter'] = normalizeConditions(trigger.customEventFilter);
  }
  if (trigger.autoEventFilter)
    out['autoEventFilter'] = normalizeConditions(trigger.autoEventFilter);
  if (trigger.parameter) out['parameter'] = normalizeParameters(trigger.parameter);
  if (trigger.parentFolderId) {
    out['parentFolderName'] =
      refs.folderIdToName.get(trigger.parentFolderId) ?? trigger.parentFolderId;
    delete out['parentFolderId'];
  }
  return out;
}

function normalizeVariable(variable: GtmVariable, refs: ReferenceIndex): NormalizedEntity {
  const out = stripVolatile(variable as unknown as Record<string, unknown>);
  if (variable.parameter) out['parameter'] = normalizeParameters(variable.parameter);
  if (variable.disablingTriggerId) {
    out['disablingTriggerNames'] = resolveTriggerNames(variable.disablingTriggerId, refs);
    delete out['disablingTriggerId'];
  }
  if (variable.enablingTriggerId) {
    out['enablingTriggerNames'] = resolveTriggerNames(variable.enablingTriggerId, refs);
    delete out['enablingTriggerId'];
  }
  if (variable.parentFolderId) {
    out['parentFolderName'] =
      refs.folderIdToName.get(variable.parentFolderId) ?? variable.parentFolderId;
    delete out['parentFolderId'];
  }
  return out;
}

function normalizeFolder(folder: GtmFolder): NormalizedEntity {
  return stripVolatile(folder as unknown as Record<string, unknown>);
}

function normalizeBuiltIn(b: GtmBuiltInVariable): NormalizedEntity {
  return stripVolatile(b as unknown as Record<string, unknown>);
}

function resolveTriggerNames(ids: string[], refs: ReferenceIndex): string[] {
  const names = ids.map((id) => refs.triggerIdToName.get(id) ?? `<unresolved:${id}>`);
  names.sort();
  return names;
}

function normalizeConditions(conditions: Array<{ type: string; parameter: GtmParameter[] }>) {
  const normalized = conditions.map((c) => ({
    ...c,
    parameter: normalizeParameters(c.parameter),
  }));
  normalized.sort((a, b) => {
    const ak = stableKey(a);
    const bk = stableKey(b);
    return ak < bk ? -1 : ak > bk ? 1 : 0;
  });
  return normalized;
}

function normalizeParameters(params: GtmParameter[]): GtmParameter[] {
  const out = params.map((p) => normalizeParameter(p));
  out.sort((a, b) => {
    const ak = a.key ?? '';
    const bk = b.key ?? '';
    if (ak < bk) return -1;
    if (ak > bk) return 1;
    const at = a.type ?? '';
    const bt = b.type ?? '';
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
  return out;
}

function normalizeParameter(p: GtmParameter): GtmParameter {
  const out: GtmParameter = { ...p };

  if (p.list) {
    // Lists are positional, including unknown and keyless template parameters.
    // Only keyed parameter/map collections are safe to sort generically.
    out.list = p.list.map((item) => normalizeParameter(item));
  }
  if (p.map) {
    const map = p.map.map((item) => normalizeParameter(item));
    map.sort((a, b) => {
      const ak = a.key ?? '';
      const bk = b.key ?? '';
      return ak < bk ? -1 : ak > bk ? 1 : 0;
    });
    out.map = map;
  }
  return out;
}

function stripVolatile(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...obj };
  for (const key of VOLATILE_FIELDS) {
    delete out[key];
  }
  return out;
}

function stableKey(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
