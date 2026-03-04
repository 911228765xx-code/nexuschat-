/**
 * Multi-Source Price Service
 *
 * Fetches live crypto prices with automatic fallback:
 *   1. CoinGecko (primary, free tier, 30 req/min)
 *   2. CoinCap    (fallback #1, free, no key, generous limits)
 *   3. Binance    (fallback #2, public REST, very high limits)
 *
 * All results are cached for 30 seconds to minimise external requests.
 * Frontend interface is unchanged — callers still receive:
 *   { symbol, price, change, volume, marketCap }[]
 */

import logger from './logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceRecord {
  symbol: string;
  price: number;
  change: number;   // 24h % change
  volume: number;   // 24h USD volume
  marketCap: number;
}

// ─── Symbol mappings ──────────────────────────────────────────────────────────

const SYMBOL_TO_COINGECKO: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  ARB: 'arbitrum',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
  CAKE: 'pancakeswap-token',
  MATIC: 'matic-network',
  DOT: 'polkadot',
  RENDER: 'render-token',
  PEPE: 'pepe',
};

// CoinCap uses lowercase symbol as ID for most coins
const SYMBOL_TO_COINCAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binance-coin',
  SOL: 'solana',
  ARB: 'arbitrum',
  LINK: 'chainlink',
  AVAX: 'avalanche',
  CAKE: 'pancakeswap',
  MATIC: 'polygon',
  DOT: 'polkadot',
  RENDER: 'render-token',
  PEPE: 'pepe',
};

// Binance uses SYMBOL+USDT trading pairs
const SYMBOL_TO_BINANCE_PAIR: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  BNB: 'BNBUSDT',
  SOL: 'SOLUSDT',
  ARB: 'ARBUSDT',
  LINK: 'LINKUSDT',
  AVAX: 'AVAXUSDT',
  CAKE: 'CAKEUSDT',
  MATIC: 'MATICUSDT',
  DOT: 'DOTUSDT',
  RENDER: 'RENDERUSDT',
  PEPE: 'PEPEUSDT',
};

// ─── In-memory cache ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000; // 30 seconds
const STALE_TTL_MS = 300_000; // Keep stale data for 5 minutes as last resort

interface CacheEntry {
  data: PriceRecord[];
  fetchedAt: number;
  source: string;
}

const priceCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<PriceRecord[]>>();

function cacheKey(symbols: string[]): string {
  return symbols.slice().sort().join(',');
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

function isUsable(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < STALE_TTL_MS;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ─── Source 1: CoinGecko ──────────────────────────────────────────────────────

async function fetchFromCoinGecko(symbols: string[]): Promise<PriceRecord[] | null> {
  const ids = symbols.map(s => SYMBOL_TO_COINGECKO[s]).filter(Boolean);
  if (!ids.length) return null;

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;

  try {
    const res = await fetchWithTimeout(url, 8000);
    if (res.status === 429) {
      logger.warn('PriceService: CoinGecko 429 — switching to fallback');
      return null;
    }
    if (!res.ok) {
      logger.warn({ status: res.status }, 'PriceService: CoinGecko non-OK');
      return null;
    }
    const data: Record<string, { usd: number; usd_24h_change: number; usd_24h_vol: number; usd_market_cap: number }> = await res.json();

    return symbols.map(symbol => {
      const id = SYMBOL_TO_COINGECKO[symbol];
      const coin = id ? data[id] : null;
      return {
        symbol,
        price: coin?.usd ?? 0,
        change: coin ? parseFloat((coin.usd_24h_change ?? 0).toFixed(2)) : 0,
        volume: coin?.usd_24h_vol ?? 0,
        marketCap: coin?.usd_market_cap ?? 0,
      };
    });
  } catch (err) {
    logger.warn({ err }, 'PriceService: CoinGecko fetch error');
    return null;
  }
}

// ─── Source 2: CoinCap ────────────────────────────────────────────────────────

async function fetchFromCoinCap(symbols: string[]): Promise<PriceRecord[] | null> {
  try {
    // CoinCap /v2/assets supports filtering by ids (comma-separated)
    const ids = symbols.map(s => SYMBOL_TO_COINCAP[s]).filter(Boolean);
    if (!ids.length) return null;

    const url = `https://api.coincap.io/v2/assets?ids=${ids.join(',')}`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) {
      logger.warn({ status: res.status }, 'PriceService: CoinCap non-OK');
      return null;
    }
    const json: { data: { id: string; symbol: string; priceUsd: string; changePercent24Hr: string; volumeUsd24Hr: string; marketCapUsd: string }[] } = await res.json();

    // Build a lookup by CoinCap id
    const byId: Record<string, typeof json.data[0]> = {};
    for (const item of json.data ?? []) {
      byId[item.id] = item;
    }

    return symbols.map(symbol => {
      const id = SYMBOL_TO_COINCAP[symbol];
      const coin = id ? byId[id] : null;
      return {
        symbol,
        price: coin ? parseFloat(coin.priceUsd) : 0,
        change: coin ? parseFloat(parseFloat(coin.changePercent24Hr).toFixed(2)) : 0,
        volume: coin ? parseFloat(coin.volumeUsd24Hr) : 0,
        marketCap: coin ? parseFloat(coin.marketCapUsd) : 0,
      };
    });
  } catch (err) {
    logger.warn({ err }, 'PriceService: CoinCap fetch error');
    return null;
  }
}

// ─── Source 3: Binance ────────────────────────────────────────────────────────

async function fetchFromBinance(symbols: string[]): Promise<PriceRecord[] | null> {
  try {
    const pairs = symbols.map(s => SYMBOL_TO_BINANCE_PAIR[s]).filter(Boolean);
    if (!pairs.length) return null;

    // Binance /api/v3/ticker/24hr supports multiple symbols via JSON array
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(pairs))}`;
    const res = await fetchWithTimeout(url, 8000);
    if (!res.ok) {
      logger.warn({ status: res.status }, 'PriceService: Binance non-OK');
      return null;
    }
    const tickers: { symbol: string; lastPrice: string; priceChangePercent: string; quoteVolume: string }[] = await res.json();

    const byPair: Record<string, typeof tickers[0]> = {};
    for (const t of tickers) {
      byPair[t.symbol] = t;
    }

    return symbols.map(symbol => {
      const pair = SYMBOL_TO_BINANCE_PAIR[symbol];
      const t = pair ? byPair[pair] : null;
      return {
        symbol,
        price: t ? parseFloat(t.lastPrice) : 0,
        change: t ? parseFloat(parseFloat(t.priceChangePercent).toFixed(2)) : 0,
        volume: t ? parseFloat(t.quoteVolume) : 0,
        marketCap: 0, // Binance doesn't provide market cap
      };
    });
  } catch (err) {
    logger.warn({ err }, 'PriceService: Binance fetch error');
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get prices for the given symbols.
 * Tries CoinGecko → CoinCap → Binance in order.
 * Returns cached data (up to 30s fresh, up to 5min stale) on all-source failure.
 */
export async function getPrices(symbols: string[]): Promise<PriceRecord[]> {
  const key = cacheKey(symbols);

  // Return fresh cache immediately
  const cached = priceCache.get(key);
  if (cached && isFresh(cached)) {
    return cached.data;
  }

  // Deduplicate concurrent requests for the same symbol set
  if (inFlight.has(key)) {
    return inFlight.get(key)!;
  }

  const fetchPromise = (async (): Promise<PriceRecord[]> => {
    // Try each source in order
    const sources: Array<{ name: string; fn: () => Promise<PriceRecord[] | null> }> = [
      { name: 'CoinGecko', fn: () => fetchFromCoinGecko(symbols) },
      { name: 'CoinCap',   fn: () => fetchFromCoinCap(symbols) },
      { name: 'Binance',   fn: () => fetchFromBinance(symbols) },
    ];

    for (const source of sources) {
      const result = await source.fn();
      if (result && result.some(r => r.price > 0)) {
        logger.info({ source: source.name, symbols }, 'PriceService: fetched prices');
        priceCache.set(key, { data: result, fetchedAt: Date.now(), source: source.name });
        return result;
      }
      logger.warn({ source: source.name }, 'PriceService: source returned no data, trying next');
    }

    // All sources failed — return stale cache if available
    if (cached && isUsable(cached)) {
      logger.warn({ key }, 'PriceService: all sources failed, returning stale cache');
      return cached.data;
    }

    // Absolute last resort: return zeros
    logger.error({ key }, 'PriceService: all sources failed, no cache available');
    return symbols.map(symbol => ({ symbol, price: 0, change: 0, volume: 0, marketCap: 0 }));
  })();

  inFlight.set(key, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Cleanup stale cache entries (called periodically)
 */
export function cleanupPriceCache(): void {
  const now = Date.now();
  for (const [key, entry] of Array.from(priceCache.entries())) {
    if (now - entry.fetchedAt > STALE_TTL_MS) {
      priceCache.delete(key);
    }
  }
}

setInterval(cleanupPriceCache, 300_000);
