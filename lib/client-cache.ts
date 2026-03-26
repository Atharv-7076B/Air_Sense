// Simple in-memory client-side cache for API responses
// Prevents redundant API calls when navigating between pages

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<unknown>>()

const DEFAULT_TTL = 30 * 60 * 1000 // 30 minutes

export function getCached<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) {
      cache.delete(key)
    }
  }
}

/**
 * Fetch with client-side caching.
 * Returns cached data if available and within TTL, otherwise fetches fresh.
 */
export async function cachedFetch<T>(
  url: string,
  options?: { ttl?: number; forceRefresh?: boolean }
): Promise<T> {
  const ttl = options?.ttl ?? DEFAULT_TTL

  if (!options?.forceRefresh) {
    const cached = getCached<T>(url, ttl)
    if (cached) return cached
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const data = await res.json() as T
  setCache(url, data)
  return data
}
