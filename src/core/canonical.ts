/** Canonicalize JSON object keys without changing array order or invoking export code. */
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    // Own keys such as __proto__ and constructor remain ordinary data.
    const out = Object.create(null) as Record<string, unknown>;
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}
