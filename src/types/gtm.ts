/**
 * GTM container export schema, based on the Google Tag Manager API v2
 * ContainerVersion resource:
 * https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.versions
 *
 * Only the fields we read are typed. Unknown fields are preserved as `unknown`
 * via index signatures. All ten documented entity collections are compared;
 * unknown version-level fields are reported as omitted.
 */

export type GtmParameter = {
  type: string;
  key?: string;
  value?: string;
  list?: GtmParameter[];
  map?: GtmParameter[];
  isWeakReference?: boolean;
  [key: string]: unknown;
};

export type GtmCondition = {
  type: string;
  parameter: GtmParameter[];
  [key: string]: unknown;
};

export type GtmTag = {
  accountId?: string;
  containerId?: string;
  tagId?: string;
  workspaceId?: string;
  path?: string;
  tagManagerUrl?: string;
  fingerprint?: string;
  name: string;
  type: string;
  parameter?: GtmParameter[];
  firingTriggerId?: string[];
  blockingTriggerId?: string[];
  tagFiringOption?: string;
  monitoringMetadata?: GtmParameter;
  consentSettings?: Record<string, unknown>;
  parentFolderId?: string;
  priority?: GtmParameter;
  notes?: string;
  paused?: boolean;
  liveOnly?: boolean;
  setupTag?: Array<{ tagName: string; stopOnSetupFailure?: boolean }>;
  teardownTag?: Array<{ tagName: string; stopTeardownOnFailure?: boolean }>;
  [key: string]: unknown;
};

export type GtmTrigger = {
  accountId?: string;
  containerId?: string;
  triggerId?: string;
  workspaceId?: string;
  path?: string;
  tagManagerUrl?: string;
  fingerprint?: string;
  name: string;
  type: string;
  filter?: GtmCondition[];
  customEventFilter?: GtmCondition[];
  autoEventFilter?: GtmCondition[];
  waitForTags?: GtmParameter;
  waitForTagsTimeout?: GtmParameter;
  checkValidation?: GtmParameter;
  parameter?: GtmParameter[];
  uniqueTriggerId?: GtmParameter;
  parentFolderId?: string;
  notes?: string;
  eventName?: GtmParameter;
  visibilitySelector?: GtmParameter;
  visiblePercentageMin?: GtmParameter;
  visiblePercentageMax?: GtmParameter;
  interval?: GtmParameter;
  intervalSeconds?: GtmParameter;
  maxTimerLengthSeconds?: GtmParameter;
  verticalScrollPercentageList?: GtmParameter;
  horizontalScrollPercentageList?: GtmParameter;
  selector?: GtmParameter;
  continuousTimeMinMilliseconds?: GtmParameter;
  totalTimeMinMilliseconds?: GtmParameter;
  limit?: GtmParameter;
  [key: string]: unknown;
};

export type GtmVariable = {
  accountId?: string;
  containerId?: string;
  variableId?: string;
  workspaceId?: string;
  path?: string;
  tagManagerUrl?: string;
  fingerprint?: string;
  name: string;
  type: string;
  parameter?: GtmParameter[];
  scheduleStartMs?: string;
  scheduleEndMs?: string;
  formatValue?: Record<string, unknown>;
  disablingTriggerId?: string[];
  enablingTriggerId?: string[];
  parentFolderId?: string;
  notes?: string;
  [key: string]: unknown;
};

export type GtmFolder = {
  accountId?: string;
  containerId?: string;
  folderId?: string;
  workspaceId?: string;
  path?: string;
  tagManagerUrl?: string;
  fingerprint?: string;
  name: string;
  notes?: string;
  [key: string]: unknown;
};

export type GtmBuiltInVariable = {
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  path?: string;
  name?: string;
  type: string;
  [key: string]: unknown;
};

export type GtmContainerMeta = {
  accountId?: string;
  containerId?: string;
  name: string;
  publicId?: string;
  usageContext?: string[];
  domainName?: string[];
  notes?: string;
  fingerprint?: string;
  tagManagerUrl?: string;
  path?: string;
  [key: string]: unknown;
};

type GtmResourceMetadata = {
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  path?: string;
  tagManagerUrl?: string;
  fingerprint?: string;
};

export type GtmClient = GtmResourceMetadata & {
  clientId?: string;
  name: string;
  type: string;
  parameter?: GtmParameter[];
  priority?: number;
  parentFolderId?: string;
  notes?: string;
  [key: string]: unknown;
};

export type GtmTransformation = GtmResourceMetadata & {
  transformationId?: string;
  name: string;
  type: string;
  parameter?: GtmParameter[];
  parentFolderId?: string;
  notes?: string;
  [key: string]: unknown;
};

export type GtmCustomTemplate = GtmResourceMetadata & {
  templateId?: string;
  name: string;
  templateData?: string;
  galleryReference?: {
    host?: string;
    owner?: string;
    repository?: string;
    version?: string;
    isModified?: boolean;
    signature?: string;
    templateDeveloperId?: string;
    galleryTemplateId?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type GtmZone = GtmResourceMetadata & {
  zoneId?: string;
  name: string;
  notes?: string;
  childContainer?: Array<{ publicId?: string; nickname?: string; [key: string]: unknown }>;
  boundary?: {
    condition?: GtmCondition[];
    customEvaluationTriggerId?: string[];
    [key: string]: unknown;
  };
  typeRestriction?: {
    enable?: boolean;
    whitelistedTypeId?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/** No authored name is documented; the source ID is required for identity. */
export type GtmGtagConfig = GtmResourceMetadata & {
  gtagConfigId: string;
  type: string;
  parameter?: GtmParameter[];
  [key: string]: unknown;
};

export type GtmContainerVersion = {
  path?: string;
  accountId?: string;
  containerId?: string;
  containerVersionId?: string;
  name?: string;
  deleted?: boolean;
  description?: string;
  fingerprint?: string;
  tagManagerUrl?: string;
  container: GtmContainerMeta;
  tag?: GtmTag[];
  trigger?: GtmTrigger[];
  variable?: GtmVariable[];
  folder?: GtmFolder[];
  builtInVariable?: GtmBuiltInVariable[];
  customTemplate?: GtmCustomTemplate[];
  zone?: GtmZone[];
  client?: GtmClient[];
  transformation?: GtmTransformation[];
  gtagConfig?: GtmGtagConfig[];
  [key: string]: unknown;
};

export type GtmExport = {
  exportFormatVersion?: number;
  exportTime?: string;
  containerVersion: GtmContainerVersion;
};

/**
 * The kinds of entities we diff. Matches the keys on `GtmContainerVersion`
 * minus the container metadata itself.
 */
export const ENTITY_KINDS = [
  'tag',
  'trigger',
  'variable',
  'folder',
  'builtInVariable',
  'client',
  'transformation',
  'customTemplate',
  'zone',
  'gtagConfig',
] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export type GtmEntity =
  | GtmTag
  | GtmTrigger
  | GtmVariable
  | GtmFolder
  | GtmBuiltInVariable
  | GtmClient
  | GtmTransformation
  | GtmCustomTemplate
  | GtmZone
  | GtmGtagConfig;
