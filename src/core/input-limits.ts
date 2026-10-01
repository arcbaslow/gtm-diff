/** Fixed resource limits for local exports; no recursive walk before this check. */
export const MAX_EXPORT_BYTES = 32 * 1024 * 1024;
export const MAX_INPUT_DEPTH = 128;
export const MAX_INPUT_NODES = 500_000;

export function assertInputLimits(value: unknown, fail: (reason: string) => never): void {
  const pending = [{ value, depth: 0 }];
  let visited = 0;
  while (pending.length > 0) {
    const item = pending.pop()!;
    if (++visited > MAX_INPUT_NODES) fail(`Input exceeds ${MAX_INPUT_NODES} values.`);
    if (item.value === null || typeof item.value !== 'object') continue;
    if (item.depth >= MAX_INPUT_DEPTH) fail(`Input exceeds ${MAX_INPUT_DEPTH} nesting levels.`);
    const children = Object.values(item.value);
    if (visited + pending.length + children.length > MAX_INPUT_NODES) {
      fail(`Input exceeds ${MAX_INPUT_NODES} values.`);
    }
    for (const child of children) pending.push({ value: child, depth: item.depth + 1 });
  }
}
