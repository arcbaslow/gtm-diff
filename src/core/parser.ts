import { readFile } from 'node:fs/promises';
import type { GtmBuiltInVariable, GtmEntity, GtmExport, GtmGtagConfig } from '../types/gtm.js';
import { ENTITY_KINDS } from '../types/gtm.js';
import { builtInIdentity, gtagConfigIdentity, identityKey } from './identity.js';

export class GtmParseError extends Error {
  constructor(
    message: string,
    public readonly source: string,
  ) {
    super(`${message} (source: ${source})`);
    this.name = 'GtmParseError';
  }
}

/**
 * Load and parse a GTM container export from disk.
 *
 * A GTM export is produced by "Admin → Export Container" in the GTM UI or by
 * the GTM API. Minimum shape we require: a top-level `containerVersion` with
 * a `container` object. Every other array (tag, trigger, variable, ...) is
 * optional because empty containers omit them entirely.
 */
export async function loadGtmExport(path: string): Promise<GtmExport> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new GtmParseError(`Could not read file: ${reason}`, path);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new GtmParseError(`Invalid JSON: ${reason}`, path);
  }

  return validateGtmExport(json, path);
}

export function validateGtmExport(value: unknown, source: string): GtmExport {
  function fail(path: string, reason: string): never {
    throw new GtmParseError(`${path}: ${reason}`, source);
  }
  function object(value: unknown, path: string): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      fail(path, 'Must be an object');
    }
    return value as Record<string, unknown>;
  }
  function string(value: unknown, path: string): asserts value is string {
    if (typeof value !== 'string') fail(path, 'Must be a string');
  }
  function optionalString(obj: Record<string, unknown>, key: string, path: string): void {
    if (obj[key] !== undefined) string(obj[key], `${path}.${key}`);
  }
  function array(value: unknown, path: string): unknown[] {
    if (!Array.isArray(value)) fail(path, 'Must be an array');
    return value;
  }
  function parameter(value: unknown, path: string): void {
    const p = object(value, path);
    string(p['type'], `${path}.type`);
    optionalString(p, 'key', path);
    optionalString(p, 'value', path);
    if (p['isWeakReference'] !== undefined && typeof p['isWeakReference'] !== 'boolean') {
      fail(`${path}.isWeakReference`, 'Must be a boolean');
    }
    if (p['list'] !== undefined) parameters(p['list'], `${path}.list`, false);
    if (p['map'] !== undefined) parameters(p['map'], `${path}.map`, true);
  }
  function parameters(value: unknown, path: string, keyed = true): void {
    const seen = new Set<string>();
    array(value, path).forEach((item, index) => {
      const at = `${path}[${index}]`;
      parameter(item, at);
      if (keyed) {
        const key = (item as Record<string, unknown>)['key'];
        string(key, `${at}.key`);
        if (seen.has(key)) fail(at, 'Duplicate parameter key');
        seen.add(key);
      }
    });
  }
  function conditions(value: unknown, path: string): void {
    array(value, path).forEach((item, i) => {
      const at = `${path}[${i}]`;
      const condition = object(item, at);
      string(condition['type'], `${at}.type`);
      parameters(condition['parameter'], `${at}.parameter`);
    });
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new GtmParseError('Top-level value must be an object', source);
  }

  const obj = value as Record<string, unknown>;
  const cv = obj['containerVersion'];
  if (!cv || typeof cv !== 'object' || Array.isArray(cv)) {
    throw new GtmParseError(
      'Missing `containerVersion` — this does not look like a GTM export',
      source,
    );
  }

  const container = (cv as Record<string, unknown>)['container'];
  if (!container || typeof container !== 'object' || Array.isArray(container)) {
    throw new GtmParseError('Missing `containerVersion.container`', source);
  }

  for (const key of ENTITY_KINDS) {
    const arr = (cv as Record<string, unknown>)[key];
    if (arr !== undefined && !Array.isArray(arr)) {
      throw new GtmParseError(`\`containerVersion.${key}\` must be an array if present`, source);
    }
    const identities = new Set<string>();
    const ids = new Set<string>();
    for (const [index, value] of (arr ?? []).entries()) {
      const path = `containerVersion.${key}[${index}]`;
      const entity = object(value, path);
      if (key !== 'builtInVariable' && key !== 'gtagConfig') string(entity['name'], `${path}.name`);
      else optionalString(entity, 'name', path);
      if (key !== 'folder' && key !== 'customTemplate' && key !== 'zone')
        string(entity['type'], `${path}.type`);
      else optionalString(entity, 'type', path);
      if (key === 'gtagConfig') {
        string(entity['gtagConfigId'], `${path}.gtagConfigId`);
        if (entity['gtagConfigId'].length === 0) fail(`${path}.gtagConfigId`, 'Must not be empty');
      }
      const identity =
        key === 'builtInVariable'
          ? builtInIdentity(entity as GtmBuiltInVariable)
          : key === 'gtagConfig'
            ? gtagConfigIdentity(entity as GtmGtagConfig)
            : identityKey(entity as GtmEntity);
      if (identities.has(identity)) fail(path, 'Duplicate identity or ambiguous type/name key');
      identities.add(identity);
      const idKey = key === 'customTemplate' ? 'templateId' : `${key}Id`;
      optionalString(entity, idKey, path);
      const id = entity[idKey];
      if (typeof id === 'string') {
        if (ids.has(id)) fail(`${path}.${idKey}`, 'Duplicate source ID');
        ids.add(id);
      }
      optionalString(entity, 'parentFolderId', path);
      for (const ref of [
        'firingTriggerId',
        'blockingTriggerId',
        'enablingTriggerId',
        'disablingTriggerId',
      ]) {
        if (entity[ref] !== undefined) {
          array(entity[ref], `${path}.${ref}`).forEach((id, i) =>
            string(id, `${path}.${ref}[${i}]`),
          );
        }
      }
      if (entity['parameter'] !== undefined) parameters(entity['parameter'], `${path}.parameter`);
      if (key === 'tag' && entity['monitoringMetadata'] !== undefined) {
        parameter(entity['monitoringMetadata'], `${path}.monitoringMetadata`);
      }
      if (key === 'trigger') {
        for (const field of ['filter', 'customEventFilter', 'autoEventFilter']) {
          if (entity[field] === undefined) continue;
          conditions(entity[field], `${path}.${field}`);
        }
      }
      if (
        key === 'client' &&
        entity['priority'] !== undefined &&
        !Number.isInteger(entity['priority'])
      ) {
        fail(`${path}.priority`, 'Must be an integer');
      }
      if (key === 'customTemplate') optionalString(entity, 'templateData', path);
      if (key === 'zone' && entity['boundary'] !== undefined) {
        const boundary = object(entity['boundary'], `${path}.boundary`);
        if (boundary['condition'] !== undefined)
          conditions(boundary['condition'], `${path}.boundary.condition`);
        if (boundary['customEvaluationTriggerId'] !== undefined) {
          array(
            boundary['customEvaluationTriggerId'],
            `${path}.boundary.customEvaluationTriggerId`,
          ).forEach((id, i) => string(id, `${path}.boundary.customEvaluationTriggerId[${i}]`));
        }
      }
    }
  }

  return value as GtmExport;
}
