const TTL = 5 * 60 * 1000; // 5 минут

interface CacheEntry<T> {
  data: T;
  at: number;
}

const store: Record<string, CacheEntry<unknown>> = {};

export function cacheGet<T>(key: string): T | null {
  const entry = store[key] as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.at > TTL) { delete store[key]; return null; }
  return entry.data;
}

export function cacheSet<T>(key: string, data: T): void {
  store[key] = { data, at: Date.now() };
}

export function cacheInvalidate(key: string): void {
  delete store[key];
}
