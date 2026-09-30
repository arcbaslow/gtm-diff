import type { EntityKind } from '../types/gtm.js';

// Explicit schema paths: do not infer Parameters from arbitrary export objects.
// Shared by validation and normalization so newly consumed paths are validated.
export const SINGLE_PARAMETER_PATHS: Partial<
  Record<EntityKind, readonly (readonly [string] | readonly [string, string])[]>
> = {
  tag: [['priority'], ['monitoringMetadata'], ['consentSettings', 'consentType']],
  trigger: [
    ['waitForTags'],
    ['waitForTagsTimeout'],
    ['checkValidation'],
    ['uniqueTriggerId'],
    ['eventName'],
    ['interval'],
    ['limit'],
    ['selector'],
    ['intervalSeconds'],
    ['maxTimerLengthSeconds'],
    ['verticalScrollPercentageList'],
    ['horizontalScrollPercentageList'],
    ['visibilitySelector'],
    ['visiblePercentageMin'],
    ['visiblePercentageMax'],
    ['continuousTimeMinMilliseconds'],
    ['totalTimeMinMilliseconds'],
  ],
  variable: [
    ['formatValue', 'convertNullToValue'],
    ['formatValue', 'convertUndefinedToValue'],
    ['formatValue', 'convertTrueToValue'],
    ['formatValue', 'convertFalseToValue'],
  ],
};

export function isTriggerReference(type: string): boolean {
  return (
    type === 'triggerReference' || type === 'trigger_reference' || type === 'TRIGGER_REFERENCE'
  );
}
