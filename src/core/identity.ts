import type { GtmBuiltInVariable, GtmEntity } from '../types/gtm.js';

/** Match authored entities by type and name, never by their environment IDs. */
export function identityKey(e: GtmEntity): string {
  const name = e.name ?? '<unnamed>';
  const type = e['type'] ?? '<no-type>';
  return `${type}::${name}`;
}

export function builtInIdentity(b: GtmBuiltInVariable): string {
  return b.type;
}
