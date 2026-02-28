/**
 * CoinGecko API Cache Layer
 * In-memory cache with TTL + exponential backoff retry
 * Solves 429 rate limiting on CoinGecko free tier (10-30 req/min)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

// Default TTLs (in ms)
const TTL = {
  prices: 60_000,       // 1 min for price data
  chart: 300_000,       // 5 min for chart data
  trending: 600_000,    // 10 min for trending
  tokenDetail: 120_000, // 2 min for token detail
  search: 300_000,      // 5 min for search results
};

// Rate limiter: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5s between requests (safe for free tier)

async function rateLimitedFetch(url: string, timeoutMs = 8000): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

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
 * Fetch with cache + exponential backoff retry
 */
export async function cachedFetch<T>(
  cacheKey: string,
  url: string,
  ttlMs: number,
  parser: (res: Response) => Promise<T>,
  maxRetries = 2,
): Promise<T | null> {
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Fetch with retry
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await rateLimitedFetch(url);

      if (res.status === 429) {
        // Rate limited — wait with exponential backoff
        const waitMs = Math.min(2000 * Math.pow(2, attempt), 30000);
        console.warn(`[CoinGecko] 429 rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
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
        const waitMs = 1000 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  // If all retries failed, return stale cache if available
  if (cached) {
    console.warn(`[CoinGecko] All retries failed, returning stale cache for: ${cacheKey}`);
    return cached.data;
  }

  console.error(`[CoinGecko] All retries failed for: ${cacheKey}`, lastError);
  return null;
}

/**
 * Clear expired cache entries (call periodically)
 */
export function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of Array.from(cache.entries())) {
    // Keep stale entries for up to 10 minutes as fallback
    if (entry.expiresAt + 600_000 < now) {
      cache.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupCache, 300_000);

export { TTL };
