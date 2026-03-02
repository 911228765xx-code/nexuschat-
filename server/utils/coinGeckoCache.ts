/**
 * CoinGecko API Cache Layer
 * In-memory cache with TTL + exponential backoff retry
 * Solves 429 rate limiting on CoinGecko free tier (10-30 req/min)
 */

import logger from './logger';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Default TTLs (in ms)
const TTL = {
  prices: 30_000,       // 30s for price data (near real-time)
  chart: 180_000,       // 3 min for chart data
  trending: 300_000,    // 5 min for trending
  tokenDetail: 30_000,  // 30s for token detail (near real-time)
  search: 60_000,       // 1 min for search results
};

// In-flight deduplication: prevent multiple concurrent requests for the same key
const inFlight = new Map<string, Promise<any>>();

async function fetchWithTimeout(url: string, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

/**
 * Fetch with cache + exponential backoff retry + in-flight deduplication
 */
export async function cachedFetch<T>(
  cacheKey: string,
  url: string,
  ttlMs: number,
  parser: (res: Response) => Promise<T>,
  maxRetries = 2,
): Promise<T | null> {
  // Check cache first (fresh data)
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Deduplicate in-flight requests for the same key
  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetchWithTimeout(url);

        if (res.status === 429) {
          // Rate limited — wait with exponential backoff
          const waitMs = Math.min(2000 * Math.pow(2, attempt), 15000);
          logger.warn({ cacheKey, waitMs, attempt: attempt + 1, maxAttempts: maxRetries + 1 }, `CoinGecko: 429 rate limited, retrying in ${waitMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        if (!res.ok) {
          throw new Error(`CoinGecko API error: ${res.status}`);
        }

        const data = await parser(res);

        // Store in cache
        cache.set(cacheKey, { data, expiresAt: Date.now() + ttlMs });

        return data;
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries) {
          const waitMs = 500 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }

    // If all retries failed, return stale cache if available
    if (cached) {
      logger.warn({ cacheKey }, "CoinGecko: All retries failed, returning stale cache");
      return cached.data;
    }

    logger.error({ cacheKey, err: lastError }, "CoinGecko: All retries failed");
    return null;
  })();

  inFlight.set(cacheKey, fetchPromise);
  try {
    const result = await fetchPromise;
    return result;
  } finally {
    inFlight.delete(cacheKey);
  }
}

/**
 * Clear expired cache entries (call periodically)
 */
export function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of Array.from(cache.entries())) {
    // Keep stale entries for up to 5 minutes as fallback
    if (entry.expiresAt + 300_000 < now) {
      cache.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupCache, 300_000);

export { TTL };
