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
  const live = await cachedFetch<Array<{ symbol?: string; price?: string }>>(
    "call-quotes-px",
    `https://api.binance.com/api/v3/ticker/price?symbols=${BN_SYMS}`,
    1_200,
    (res) => res.json(),
  );
  const chg = await cachedFetch<Array<{ symbol?: string; priceChangePercent?: string }>>(
    "call-quotes-24h",
    `https://api.binance.com/api/v3/ticker/24hr?symbols=${BN_SYMS}`,
    20_000,
    (res) => res.json(),
  );
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

/** 近 40 根 1 分钟 K 线，给下注页画走势。 */
export async function fetchCallSparklines(): Promise<Record<"BTC" | "ETH", CallCandle[]>> {
  const [btc, eth] = await Promise.all([
    cachedFetch<unknown>(
      "call-spark-BTC",
      "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=40",
      4_000,
      (res) => res.json(),
    ),
    cachedFetch<unknown>(
      "call-spark-ETH",
      "https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1m&limit=40",
      4_000,
      (res) => res.json(),
    ),
  ]);
  return { BTC: parseKlines(btc), ETH: parseKlines(eth) };
}

export async function fetchCallSpotPrice(symbol: string): Promise<number | null> {
  const sym = symbol.toUpperCase();
  const id = CG_ID[sym];
  if (!id) return null;

  const cg = await cachedFetch<Record<string, { usd?: number }>>(
    `call-spot-cg:${id}`,
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
    TTL.prices,
    (res) => res.json(),
  );
  const cgPx = cg?.[id]?.usd;
  if (typeof cgPx === "number" && cgPx > 0) return cgPx;

  const cc = await cachedFetch<Record<string, number>>(
    `call-spot-cc:${sym}`,
    `https://min-api.cryptocompare.com/data/price?fsym=${sym}&tsyms=USD`,
    TTL.prices,
    (res) => res.json(),
  );
  const ccPx = cc?.USD;
  return typeof ccPx === "number" && ccPx > 0 ? ccPx : null;
}

const BINANCE_PAIR: Record<string, string> = { BTC: "BTCUSDT", ETH: "ETHUSDT" };

function binanceInterval(horizonMin: number): string | null {
  if (horizonMin === 60) return "1h";
  if (horizonMin === 5 || horizonMin === 15 || horizonMin === 30) return `${horizonMin}m`;
  return null;
}

/** 取该时间窗 K 线的开盘价 / 收盘价（Binance，失败再试 CryptoCompare 分钟线）。 */
export async function fetchCallWindowOHLC(
  symbol: string,
  openMs: number,
  horizonMin: number,
): Promise<{ open: number; close: number } | null> {
  const sym = symbol.toUpperCase();
  const pair = BINANCE_PAIR[sym];
  const interval = binanceInterval(horizonMin);
  if (pair && interval) {
    const rows = await cachedFetch<Array<[number, string, string, string, string]>>(
      `call-kline:${pair}:${interval}:${openMs}`,
      `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&startTime=${openMs}&limit=1`,
      15_000,
      (res) => res.json(),
    );
    const k = Array.isArray(rows) ? rows[0] : null;
    if (k && Number(k[0]) === openMs) {
      const open = Number(k[1]);
      const close = Number(k[4]);
      if (open > 0 && close > 0) return { open, close };
    }
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
