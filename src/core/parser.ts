import { readFile } from 'node:fs/promises';
import type { GtmExport } from '../types/gtm.js';

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

  for (const key of ['tag', 'trigger', 'variable', 'folder', 'builtInVariable'] as const) {
    const arr = (cv as Record<string, unknown>)[key];
    if (arr !== undefined && !Array.isArray(arr)) {
      throw new GtmParseError(`\`containerVersion.${key}\` must be an array if present`, source);
    }
  }

  return value as GtmExport;
}
