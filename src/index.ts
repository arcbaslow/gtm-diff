/**
 * Public library entry point. Lets users import the diff engine programmatically
 * without shelling out to the CLI — e.g. for custom CI integrations or editor
 * plugins that want to render diffs in their own UI.
 */
export { diffExports, diffNormalized, hasChanges } from './core/diff.js';
export type { ContainerDiff, EntityChange, KindDiff } from './core/diff.js';
export { GtmParseError, loadGtmExport, validateGtmExport } from './core/parser.js';
export { normalizeExport, identityKey, buildReferenceIndex } from './core/normalize.js';
export type { NormalizedContainer, NormalizedEntity } from './core/normalize.js';
export { renderConsole } from './reporters/console.js';
export { renderMarkdown } from './reporters/markdown.js';
export { renderHtml } from './reporters/html.js';
export type {
  EntityKind,
  GtmExport,
  GtmContainerVersion,
  GtmTag,
  GtmTrigger,
  GtmVariable,
  GtmFolder,
  GtmBuiltInVariable,
  GtmParameter,
  GtmCondition,
} from './types/gtm.js';
