import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";

function fmtPrice(n: number) {
  if (!(n > 0)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: n >= 100 ? 2 : 4, maximumFractionDigits: n >= 100 ? 2 : 4 });
}

export default function StockTokens() {
  const [, setLocation] = useLocation();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const quotes = trpc.trading.getStockTokens.useQuery(undefined, { staleTime: 15_000, refetchInterval: 30_000, retry: false });
  const chart = trpc.trading.getStockTokenChart.useQuery(
    { key: openKey ?? "AAPL" },
    { enabled: !!openKey, staleTime: 60_000, retry: false },
  );

  return (
    <div className="mx-auto max-w-lg px-4 pb-16 pt-4">
      <button type="button" onClick={() => setLocation("/app/discover")} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft size={16} /> 发现
      </button>
      <h1 className="text-xl font-semibold">美股代币</h1>
      <p className="mt-1 text-sm text-muted-foreground">只展示 · 不下单</p>
      <div className="mt-4 space-y-2">
        {(quotes.data?.items ?? []).map((item) => {
          const up = (item.change24h ?? 0) >= 0;
          const open = openKey === item.key;
          return (
            <div key={item.key} className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
              <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setOpenKey(open ? null : item.key)}>
                <div>
                  <div className="font-semibold">{item.name} {item.equity}</div>
                  <div className="text-xs text-muted-foreground">{item.pair}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">{fmtPrice(item.lastPrice)}</div>
                  <div className={`text-xs font-semibold ${up ? "text-emerald-500" : "text-rose-500"}`}>
                    {item.change24h == null ? "—" : `${item.change24h > 0 ? "+" : ""}${item.change24h.toFixed(2)}%`}
                  </div>
                </div>
              </button>
              {open ? (
                <div className="mt-3 border-t border-border/60 pt-3">
                  {chart.data?.candles?.length ? (
                    <div className="mb-2 text-xs text-muted-foreground">近 {chart.data.candles.length} 根小时线已加载</div>
                  ) : (
                    <div className="mb-2 text-xs text-muted-foreground">K 线加载中…</div>
                  )}
                  <a href={item.binanceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    去币安查看 <ExternalLink size={14} />
                  </a>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {!quotes.isLoading && !quotes.data?.items?.length ? (
        <p className="mt-6 text-sm text-muted-foreground">行情暂时连不上。后端部署后即可显示币安代币价格。</p>
      ) : null}
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        {quotes.data?.disclaimer ?? "行情来自币安等公开市场，仅供浏览。这是代币化股票，不是美股正股。本平台不开户、不托管、不撮合。"}
      </p>
    </div>
  );
}
