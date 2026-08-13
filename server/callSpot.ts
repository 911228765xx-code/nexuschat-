/**
 * 猜涨跌专用现价：BTC/ETH 走 CoinGecko simple/price，失败再试 CryptoCompare。
 * 不用 search?query=BTC（coins[0] 可能不是比特币，短窗会整盘判错/拿不到价）。
 */
import { cachedFetch, TTL } from "./utils/coinGeckoCache";

const CG_ID: Record<string, string> = { BTC: "bitcoin", ETH: "ethereum" };

export type CallQuote = { symbol: "BTC" | "ETH"; price: number; change24h: number | null };

/** 猜涨跌页实时对比用：优先 Binance 24h ticker（约 8s 缓存），失败再走 CoinGecko。 */
export async function fetchCallLiveQuotes(): Promise<CallQuote[]> {
  const bn = await cachedFetch<Array<{ symbol?: string; lastPrice?: string; priceChangePercent?: string }>>(
    "call-quotes-bn",
    "https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22%5D",
    8_000,
    (res) => res.json(),
  );
  if (Array.isArray(bn)) {
    const out: CallQuote[] = [];
    for (const row of bn) {
      const symbol = row.symbol === "BTCUSDT" ? "BTC" : row.symbol === "ETHUSDT" ? "ETH" : null;
      const price = Number(row.lastPrice);
      if (!symbol || !(price > 0)) continue;
      const ch = Number(row.priceChangePercent);
      out.push({ symbol, price, change24h: Number.isFinite(ch) ? ch : null });
    }
    if (out.length >= 1) return out;
  }

  const cg = await cachedFetch<Record<string, { usd?: number; usd_24h_change?: number }>>(
    "call-quotes-cg",
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true",
    TTL.prices,
    (res) => res.json(),
  );
  const out: CallQuote[] = [];
  const btc = cg?.bitcoin?.usd;
  const eth = cg?.ethereum?.usd;
  if (typeof btc === "number" && btc > 0) {
    const ch = cg?.bitcoin?.usd_24h_change;
    out.push({ symbol: "BTC", price: btc, change24h: typeof ch === "number" ? ch : null });
  }
  if (typeof eth === "number" && eth > 0) {
    const ch = cg?.ethereum?.usd_24h_change;
    out.push({ symbol: "ETH", price: eth, change24h: typeof ch === "number" ? ch : null });
  }
  return out;
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
