import type { GtmBuiltInVariable, GtmEntity, GtmGtagConfig } from '../types/gtm.js';

/** Match authored entities by type and name, never by their environment IDs. */
export function identityKey(e: GtmEntity): string {
  const name = e['name'] ?? '<unnamed>';
  const type = e['type'] ?? '<no-type>';
  return `${type}::${name}`;
}

export function builtInIdentity(b: GtmBuiltInVariable): string {
  return b.type;
}

/** Google tag configs have no documented name; do not guess cross-ID matches. */
export function gtagConfigIdentity(config: GtmGtagConfig): string {
  return `${config.type}::${config.gtagConfigId}`;
}
