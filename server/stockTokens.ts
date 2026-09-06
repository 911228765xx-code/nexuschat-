/**
 * 币安美股代币（代币化股票）只读行情。
 * 本模块只拉公开 ticker / kline，不打开户、下单或托管。
 */
import { cachedFetch } from "./utils/coinGeckoCache";

export const STOCK_TOKEN_DISCLAIMER =
  "行情来自币安等公开市场，仅供浏览。这是代币化股票，不是美股正股，可能有折溢价与地区限制。本平台不开户、不托管、不撮合，不构成投资建议。";

export const STOCK_TOKEN_CATALOG = [
  { key: "AAPL", name: "苹果", equity: "AAPL", cgId: "apple-xstock", candidates: ["AAPLXUSDT", "AAPLUSDT"] },
  { key: "TSLA", name: "特斯拉", equity: "TSLA", cgId: "tesla-xstock", candidates: ["TSLAXUSDT", "TSLAUSDT"] },
  { key: "NVDA", name: "英伟达", equity: "NVDA", cgId: "nvidia-xstock", candidates: ["NVDAXUSDT", "NVDAUSDT"] },
  { key: "MSFT", name: "微软", equity: "MSFT", cgId: "microsoft-xstock", candidates: ["MSFTXUSDT", "MSFTUSDT"] },
  { key: "AMZN", name: "亚马逊", equity: "AMZN", cgId: "amazon-xstock", candidates: ["AMZNXUSDT", "AMZNUSDT"] },
  { key: "GOOGL", name: "谷歌", equity: "GOOGL", cgId: "alphabet-xstock", candidates: ["GOOGLXUSDT", "GOOGLUSDT"] },
  { key: "META", name: "Meta", equity: "META", cgId: "meta-xstock", candidates: ["METAXUSDT", "METAUSDT"] },
  { key: "SPY", name: "标普500", equity: "SPY", cgId: "sp500-xstock", candidates: ["SPYXUSDT", "SPYUSDT"] },
  { key: "MSTR", name: "微策略", equity: "MSTR", cgId: "microstrategy-xstock", candidates: ["MSTRXUSDT", "MSTRUSDT"] },
  { key: "COIN", name: "Coinbase", equity: "COIN", cgId: "coinbase-xstock", candidates: ["COINXUSDT", "COINUSDT"] },
] as const;

export type StockTokenKey = (typeof STOCK_TOKEN_CATALOG)[number]["key"];

export type StockTokenQuote = {
  key: string;
  name: string;
  equity: string;
  pair: string;
  lastPrice: number;
  change24h: number | null;
  quoteVolume: number | null;
  source: "binance" | "bybit" | "coingecko";
  binanceUrl: string;
};

const BN_HOSTS = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
  "https://api1.binance.com",
];

type Resolved = { pair: string; source: "binance" | "bybit"; at: number };
const resolvedPairs = new Map<string, Resolved>();
const quotesCache = new Map<string, { at: number; payload: { disclaimer: string; updatedAt: string; items: StockTokenQuote[] } }>();
const RESOLVE_MS = 6 * 60 * 60_000;
const QUOTES_MS = 15_000;

async function fetchJsonQuick(url: string, timeoutMs = 4000): Promise<unknown | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 BitchatStock/1.0", Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

async function bnGet(path: string): Promise<unknown | null> {
  for (const host of BN_HOSTS) {
    const raw = await fetchJsonQuick(`${host}${path}`, 3500);
    if (raw != null) return raw;
  }
  return null;
}

function encodeSymbols(pairs: string[]): string {
  return encodeURIComponent(JSON.stringify(pairs));
}

function parseBn24(row: { symbol?: string; lastPrice?: string; priceChangePercent?: string; quoteVolume?: string } | null | undefined) {
  const lastPrice = Number(row?.lastPrice);
  if (!(lastPrice > 0) || !row?.symbol) return null;
  const change = Number(row.priceChangePercent);
  const vol = Number(row.quoteVolume);
  return {
    pair: row.symbol,
    lastPrice,
    change24h: Number.isFinite(change) ? change : null,
    quoteVolume: Number.isFinite(vol) ? vol : null,
  };
}

async function bn24Batch(pairs: string[]): Promise<Map<string, NonNullable<ReturnType<typeof parseBn24>>>> {
  const out = new Map<string, NonNullable<ReturnType<typeof parseBn24>>>();
  if (pairs.length === 0) return out;
  const raw = await bnGet(`/api/v3/ticker/24hr?symbols=${encodeSymbols(pairs)}`);
  if (Array.isArray(raw)) {
    for (const row of raw) {
      const parsed = parseBn24(row);
      if (parsed) out.set(parsed.pair, parsed);
    }
  }
  return out;
}

async function resolvePair(item: (typeof STOCK_TOKEN_CATALOG)[number]): Promise<Resolved | null> {
  const hit = resolvedPairs.get(item.key);
  if (hit && Date.now() - hit.at < RESOLVE_MS) return hit;
  await fetchStockTokenQuotes();
  return resolvedPairs.get(item.key) ?? null;
}

function binanceTradeUrl(pair: string) {
  return `https://www.binance.com/en/trade/${pair}?type=spot`;
}

async function quoteFromBybit(pair: string): Promise<Omit<StockTokenQuote, "key" | "name" | "equity"> | null> {
  const by = await fetchJsonQuick(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${pair}`, 3000);
  const row = (by as { result?: { list?: Array<{ symbol?: string; lastPrice?: string; price24hPcnt?: string; turnover24h?: string }> } })?.result?.list?.[0];
  const lastPrice = Number(row?.lastPrice);
  if (!row?.symbol || !(lastPrice > 0)) return null;
  const change = Number(row.price24hPcnt) * 100;
  const vol = Number(row.turnover24h);
  return {
    pair: row.symbol,
    lastPrice,
    change24h: Number.isFinite(change) ? change : null,
    quoteVolume: Number.isFinite(vol) ? vol : null,
    source: "bybit",
    binanceUrl: binanceTradeUrl(row.symbol),
  };
}

async function quotesFromCoinGecko(): Promise<StockTokenQuote[]> {
  const ids = STOCK_TOKEN_CATALOG.map((item) => item.cgId).join(",");
  const data = await cachedFetch<Record<string, { usd?: number; usd_24h_change?: number; usd_24h_vol?: number }>>(
    `stock-tokens-cg:${ids}`,
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
    30_000,
    (res) => res.json(),
    1,
  );
  if (!data) return [];
  const out: StockTokenQuote[] = [];
  for (const item of STOCK_TOKEN_CATALOG) {
    const row = data[item.cgId];
    const lastPrice = Number(row?.usd);
    if (!(lastPrice > 0)) continue;
    out.push({
      key: item.key,
      name: item.name,
      equity: item.equity,
      pair: item.candidates[0],
      lastPrice,
      change24h: Number.isFinite(Number(row?.usd_24h_change)) ? Number(row?.usd_24h_change) : null,
      quoteVolume: Number.isFinite(Number(row?.usd_24h_vol)) ? Number(row?.usd_24h_vol) : null,
      source: "coingecko",
      binanceUrl: binanceTradeUrl(item.candidates[0]),
    });
  }
  return out;
}

export async function fetchStockTokenQuotes(): Promise<{
  disclaimer: string;
  updatedAt: string;
  items: StockTokenQuote[];
}> {
  const cached = quotesCache.get("all");
  if (cached && Date.now() - cached.at < QUOTES_MS) return cached.payload;

  const first = STOCK_TOKEN_CATALOG.map((item) => item.candidates[0]);
  const bnMap = await bn24Batch(first);
  const missing = STOCK_TOKEN_CATALOG.filter((item) => !item.candidates.some((pair) => bnMap.has(pair)));
  if (missing.length > 0) {
    const extra = await bn24Batch(missing.map((item) => item.candidates[1] ?? item.candidates[0]));
    for (const [pair, row] of extra) bnMap.set(pair, row);
  }

  const items: StockTokenQuote[] = [];
  for (const item of STOCK_TOKEN_CATALOG) {
    const parsed = item.candidates.map((pair) => bnMap.get(pair)).find((row) => row != null);
    if (parsed) {
      resolvedPairs.set(item.key, { pair: parsed.pair, source: "binance", at: Date.now() });
      items.push({
        key: item.key,
        name: item.name,
        equity: item.equity,
        pair: parsed.pair,
        lastPrice: parsed.lastPrice,
        change24h: parsed.change24h,
        quoteVolume: parsed.quoteVolume,
        source: "binance",
        binanceUrl: binanceTradeUrl(parsed.pair),
      });
      continue;
    }
    for (const pair of item.candidates) {
      const by = await quoteFromBybit(pair);
      if (!by) continue;
      resolvedPairs.set(item.key, { pair: by.pair, source: "bybit", at: Date.now() });
      items.push({ key: item.key, name: item.name, equity: item.equity, ...by });
      break;
    }
  }
  if (items.length === 0) {
    const fallback = await quotesFromCoinGecko();
    for (const row of fallback) {
      resolvedPairs.set(row.key, { pair: row.pair, source: "binance", at: Date.now() });
    }
    items.push(...fallback);
  }
  const payload = { disclaimer: STOCK_TOKEN_DISCLAIMER, updatedAt: new Date().toISOString(), items };
  quotesCache.set("all", { at: Date.now(), payload });
  return payload;
}

export type StockTokenCandle = { t: number; o: number; h: number; l: number; c: number };

function parseBnKlines(raw: unknown): StockTokenCandle[] {
  if (!Array.isArray(raw)) return [];
  const out: StockTokenCandle[] = [];
  for (const k of raw) {
    if (!Array.isArray(k) || k.length < 5) continue;
    const t = Number(k[0]), o = Number(k[1]), h = Number(k[2]), l = Number(k[3]), c = Number(k[4]);
    if (t > 0 && o > 0 && c > 0) out.push({ t, o, h, l, c });
  }
  return out;
}

export async function fetchStockTokenChart(key: string): Promise<{ key: string; pair: string | null; candles: StockTokenCandle[] }> {
  const item = STOCK_TOKEN_CATALOG.find((row) => row.key === key.toUpperCase());
  if (!item) return { key: key.toUpperCase(), pair: null, candles: [] };
  const resolved = await resolvePair(item);
  if (!resolved) return { key: item.key, pair: null, candles: [] };
  const candles = parseBnKlines(await bnGet(`/api/v3/klines?symbol=${resolved.pair}&interval=1h&limit=48`));
  if (candles.length >= 2) return { key: item.key, pair: resolved.pair, candles };
  const by = await fetchJsonQuick(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${resolved.pair}&interval=60&limit=48`, 3500);
  const list = (by as { result?: { list?: unknown[] } })?.result?.list;
  const byCandles: StockTokenCandle[] = [];
  if (Array.isArray(list)) {
    for (const k of list) {
      if (!Array.isArray(k) || k.length < 5) continue;
      const t = Number(k[0]), o = Number(k[1]), h = Number(k[2]), l = Number(k[3]), c = Number(k[4]);
      if (t > 0 && o > 0 && c > 0) byCandles.push({ t, o, h, l, c });
    }
    byCandles.sort((a, b) => a.t - b.t);
  }
  return { key: item.key, pair: resolved.pair, candles: byCandles };
}
