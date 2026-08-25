const memoryCache = new Map<string, { value: unknown; expires: number }>();

export async function getCache<T>(key: string): Promise<T | null> {
  const entry = memoryCache.get(key);
  if (entry && entry.expires > Date.now()) return entry.value as T;
  memoryCache.delete(key);
  return null;
}

export async function setCache(key: string, value: unknown, ttlSeconds: number = 3600): Promise<void> {
  memoryCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

export async function clearCache(key: string): Promise<void> {
  memoryCache.delete(key);
}

export async function clearCachePattern(pattern: string): Promise<void> {
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) memoryCache.delete(key);
  }
}
