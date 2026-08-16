/**
 * 猜涨跌专用现价：BTC/ETH 走 CoinGecko simple/price，失败再试 CryptoCompare。
 * 不用 search?query=BTC（coins[0] 可能不是比特币，短窗会整盘判错/拿不到价）。
 */
import { cachedFetch, TTL } from "./utils/coinGeckoCache";

const CG_ID: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum" };

export type CallQuote = {
  symbol: "BTC" | "ETH";
  price: number;
  change24h: number | null;
  tick?: "up" | "down" | "flat";
  delta?: number;
};
export type CallCandle = { t: number; o: number; h: number; l: number; c: number };

const lastPx = new Map<string, number>();
const BN_SYMS = "%5B%22BTCUSDT%22,%22ETHUSDT%22%5D";

function toSym(pair?: string): "BTC" | "ETH" | null {
  if (pair === "BTCUSDT") return "BTC";
  if (pair === "ETHUSDT") return "ETH";
  return null;
}

/** 现价走 Binance ticker/price（约 1.2s 缓存），24h 涨跌单独缓 20s。页面不刷新也能跳。 */
export async function fetchCallLiveQuotes(): Promise<CallQuote[]> {
  const [live, chg] = await Promise.all([
    cachedFetch<Array<{ symbol?: string; price?: string }>>(
      "call-quotes-px",
      `https://api.binance.com/api/v3/ticker/price?symbols=${BN_SYMS}`,
      1_200,
      (res) => res.json(),
    ),
    cachedFetch<Array<{ symbol?: string; priceChangePercent?: string }>>(
      "call-quotes-24h",
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${BN_SYMS}`,
      20_000,
      (res) => res.json(),
    ),
  ]);
  const chgMap = new Map<string, number>();
  if (Array.isArray(chg)) {
    for (const row of chg) {
      const s = toSym(row.symbol);
      const p = Number(row.priceChangePercent);
      if (s && Number.isFinite(p)) chgMap.set(s, p);
    }
  }

  const fromBn: CallQuote[] = [];
  if (Array.isArray(live)) {
    for (const row of live) {
      const symbol = toSym(row.symbol);
      const price = Number(row.price);
      if (!symbol || !(price > 0)) continue;
      const prev = lastPx.get(symbol);
      lastPx.set(symbol, price);
      const delta = prev != null ? price - prev : 0;
      fromBn.push({
        symbol,
        price,
        change24h: chgMap.get(symbol) ?? null,
        tick: delta > 1e-8 ? "up" : delta < -1e-8 ? "down" : "flat",
        delta,
      });
    }
  }
  if (fromBn.length >= 1) return fromBn;

  const cg = await cachedFetch<Record<string, { usd?: number; usd_24h_change?: number }>>(
    "call-quotes-cg",
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
    8_000,
    (res) => res.json(),
  );
  const out: CallQuote[] = [];
  for (const [symbol, id] of [["BTC", "bitcoin"], ["ETH", "ethereum"]] as const) {
    const price = cg?.[id]?.usd;
    if (!(typeof price === "number" && price > 0)) continue;
    const prev = lastPx.get(symbol);
    lastPx.set(symbol, price);
    const delta = prev != null ? price - prev : 0;
    const ch = cg?.[id]?.usd_24h_change;
    out.push({
      symbol,
      price,
      change24h: typeof ch === "number" ? ch : null,
      tick: delta > 1e-8 ? "up" : delta < -1e-8 ? "down" : "flat",
      delta,
    });
  }
  return out;
}

function parseKlines(rows: unknown): CallCandle[] {
  if (!Array.isArray(rows)) return [];
  const out: CallCandle[] = [];
  for (const k of rows) {
    if (!Array.isArray(k) || k.length < 5) continue;
    const t = Number(k[0]), o = Number(k[1]), h = Number(k[2]), l = Number(k[3]), c = Number(k[4]);
    if (t > 0 && o > 0 && h > 0 && l > 0 && c > 0) out.push({ t, o, h, l, c });
  }
  return out;
}

async function fetchJsonQuick(url: string, timeoutMs = 4000): Promise<unknown | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 BitchatCall/1.0", Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

function parseBybitKlines(json: unknown): CallCandle[] {
  const list = (json as { result?: { list?: unknown[] } })?.result?.list;
  if (!Array.isArray(list)) return [];
  const out: CallCandle[] = [];
  for (const k of list) {
    if (!Array.isArray(k) || k.length < 5) continue;
    const t = Number(k[0]), o = Number(k[1]), h = Number(k[2]), l = Number(k[3]), c = Number(k[4]);
    if (t > 0 && o > 0 && h > 0 && l > 0 && c > 0) out.push({ t, o, h, l, c });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

function klineQuality(bars: CallCandle[]): number {
  if (bars.length < 2) return 0;
  const ranged = bars.filter((b) => b.h > b.l).length;
  const closes = bars.map((b) => b.c);
  const span = Math.max(...closes) - Math.min(...closes);
  const rel = span / (closes[0] || 1);
  return ranged * 20 + rel * 10_000 + bars.length;
}

const SPARK_CACHE_MS = 8_000;
const sparkCache = new Map<string, { at: number; bars: CallCandle[] }>();

async function fetchSymbolKlines(symbol: "BTC" | "ETH"): Promise<CallCandle[]> {
  const hit = sparkCache.get(symbol);
  if (hit && Date.now() - hit.at < SPARK_CACHE_MS && klineQuality(hit.bars) > 40) return hit.bars;

  const pair = `${symbol}USDT`;
  const sources: Array<{ url: string; parse: (raw: unknown) => CallCandle[] }> = [
    { url: `https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=1m&limit=40`, parse: parseKlines },
    { url: `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1m&limit=40`, parse: parseKlines },
    { url: `https://api1.binance.com/api/v3/klines?symbol=${pair}&interval=1m&limit=40`, parse: parseKlines },
    { url: `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=1&limit=40`, parse: parseBybitKlines },
  ];
  let best: CallCandle[] = hit?.bars ?? [];
  let bestQ = klineQuality(best);
  await new Promise<void>((resolve) => {
    let left = sources.length;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    for (const s of sources) {
      void fetchJsonQuick(s.url, 2200).then((raw) => {
        const bars = s.parse(raw);
        const q = klineQuality(bars);
        if (q > bestQ) {
          bestQ = q;
          best = bars;
        }
        if (q > 40) finish();
        if (--left === 0) finish();
      });
    }
  });
  if (best.length >= 2) {
    sparkCache.set(symbol, { at: Date.now(), bars: best });
    return best;
  }
  return hit?.bars ?? [];
}

/** 近 40 根 1 分钟 K 线，给下注页画走势。币安不通时走 Bybit。 */
export async function fetchCallSparklines(): Promise<Record<"BTC" | "ETH", CallCandle[]>> {
  const [btc, eth] = await Promise.all([fetchSymbolKlines("BTC"), fetchSymbolKlines("ETH")]);
  return { BTC: btc, ETH: eth };
}

export async function fetchCallSpotPrice(symbol: string): Promise<number | null> {
  const sym = symbol.toUpperCase();
  const pair = BINANCE_PAIR[sym];

  // 和下注页同一路：币安现价。CoinGecko 常限流，CryptoCompare 现已要 Key。
  if (pair) {
    const bn = await cachedFetch<{ price?: string }>(
      `call-spot-bn:${pair}`,
      `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`,
      1_200,
      (res) => res.json(),
    );
    const bnPx = Number(bn?.price);
    if (bnPx > 0) {
      lastPx.set(sym, bnPx);
      return bnPx;
    }
    const vis = await fetchJsonQuick(`https://data-api.binance.vision/api/v3/ticker/price?symbol=${pair}`, 2200);
    const visPx = Number((vis as { price?: string } | null)?.price);
    if (visPx > 0) {
      lastPx.set(sym, visPx);
      return visPx;
    }
  }

  const id = CG_ID[sym];
  if (id) {
    const cg = await cachedFetch<Record<string, { usd?: number }>>(
      `call-spot-cg:${id}`,
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      TTL.prices,
      (res) => res.json(),
    );
    const cgPx = cg?.[id]?.usd;
    if (typeof cgPx === "number" && cgPx > 0) {
      lastPx.set(sym, cgPx);
      return cgPx;
    }
  }

  const mem = lastPx.get(sym);
  return mem && mem > 0 ? mem : null;
}

const BINANCE_PAIR: Record<string, string> = { BTC: "BTCUSDT", ETH: "ETHUSDT" };

function binanceInterval(horizonMin: number): string | null {
  if (horizonMin === 60) return "1h";
  if (horizonMin === 5 || horizonMin === 15 || horizonMin === 30) return `${horizonMin}m`;
  return null;
}

function bybitInterval(horizonMin: number): string | null {
  if (horizonMin === 60) return "60";
  if (horizonMin === 5 || horizonMin === 15 || horizonMin === 30) return String(horizonMin);
  return null;
}

export function pickWindowOHLC(bars: CallCandle[], openMs: number): { open: number; close: number } | null {
  if (!bars.length) return null;
  let best = bars[0];
  let bestD = Math.abs(best.t - openMs);
  for (const b of bars) {
    const d = Math.abs(b.t - openMs);
    if (d < bestD) {
      best = b;
      bestD = d;
    }
  }
  if (bestD > 60_000 || !(best.o > 0) || !(best.c > 0)) return null;
  return { open: best.o, close: best.c };
}

function ohlcFrom1m(bars: CallCandle[], openMs: number, horizonMin: number): { open: number; close: number } | null {
  const closeMs = openMs + horizonMin * 60_000;
  const inWin = bars.filter((b) => b.t >= openMs - 1000 && b.t < closeMs + 1000).sort((a, b) => a.t - b.t);
  if (inWin.length < 2) return null;
  const open = inWin[0].o;
  const close = inWin[inWin.length - 1].c;
  if (!(open > 0) || !(close > 0)) return null;
  return { open, close };
}

async function raceParsedKlines(
  sources: Array<{ url: string; parse: (raw: unknown) => CallCandle[] }>,
  minBars = 1,
): Promise<CallCandle[]> {
  let best: CallCandle[] = [];
  let bestN = 0;
  await new Promise<void>((resolve) => {
    let left = sources.length;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    if (!sources.length) {
      finish();
      return;
    }
    for (const s of sources) {
      void fetchJsonQuick(s.url, 2500).then((raw) => {
        const bars = s.parse(raw);
        if (bars.length > bestN) {
          bestN = bars.length;
          best = bars;
        }
        if (bars.length >= minBars) finish();
        if (--left === 0) finish();
      });
    }
  });
  return best;
}

/** 取该时间窗 K 线的开盘价 / 收盘价。币安主站不通时走 vision / Bybit / 1 分钟线拼。 */
export async function fetchCallWindowOHLC(
  symbol: string,
  openMs: number,
  horizonMin: number,
): Promise<{ open: number; close: number } | null> {
  const sym = symbol.toUpperCase();
  const pair = BINANCE_PAIR[sym];
  const interval = binanceInterval(horizonMin);
  const start = Math.max(0, openMs - 5000);

  const sources: Array<{ url: string; parse: (raw: unknown) => CallCandle[] }> = [];
  if (pair && interval) {
    sources.push(
      { url: `https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=${interval}&startTime=${start}&limit=2`, parse: parseKlines },
      { url: `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&startTime=${start}&limit=2`, parse: parseKlines },
      { url: `https://api1.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&startTime=${start}&limit=2`, parse: parseKlines },
    );
  }
  const bv = bybitInterval(horizonMin);
  if (pair && bv) {
    sources.push({
      url: `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=${bv}&start=${start}&limit=2`,
      parse: parseBybitKlines,
    });
  }

  const hit = pickWindowOHLC(await raceParsedKlines(sources), openMs);
  if (hit) return hit;

  if (pair) {
    const need = Math.min(horizonMin, 60);
    const oneMin = await raceParsedKlines([
      { url: `https://data-api.binance.vision/api/v3/klines?symbol=${pair}&interval=1m&startTime=${openMs}&limit=${need}`, parse: parseKlines },
      { url: `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1m&startTime=${openMs}&limit=${need}`, parse: parseKlines },
      { url: `https://api.bybit.com/v5/market/kline?category=spot&symbol=${pair}&interval=1&start=${openMs}&limit=${need}`, parse: parseBybitKlines },
    ], Math.max(2, Math.floor(need * 0.7)));
    const from1m = ohlcFrom1m(oneMin, openMs, horizonMin);
    if (from1m) return from1m;
  }

  const toTs = Math.floor((openMs + horizonMin * 60_000) / 1000);
  const cc = await cachedFetch<{ Data?: { Data?: Array<{ time: number; open: number; close: number }> } }>(
    `call-histominute:${sym}:${openMs}:${horizonMin}`,
    `https://min-api.cryptocompare.com/data/v2/histominute?fsym=${sym}&tsym=USD&limit=${Math.min(horizonMin, 60)}&toTs=${toTs}`,
    15_000,
    (res) => res.json(),
  );
  const pts = cc?.Data?.Data ?? [];
  if (pts.length >= 2) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    if (first?.open > 0 && last?.close > 0) return { open: first.open, close: last.close };
  }
  return null;
}
