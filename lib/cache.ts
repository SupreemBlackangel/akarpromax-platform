type CacheEntry = { value: unknown; exp: number };

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 30_000;

export async function cached<T>(
  key: string,
  ttlMs: number = DEFAULT_TTL_MS,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.exp > now) {
    return hit.value as T;
  }
  const value = await fn();
  cache.set(key, { value, exp: now + ttlMs });
  return value;
}

export function cacheKey(parts: Array<string | number | undefined | null>): string {
  return parts.map((p) => String(p ?? "")).join("|");
}
