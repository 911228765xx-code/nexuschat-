/*
 * Trading — 极简信号跟单页面
 * 策略管理、交易记录、收益统计
 */
import { useState } from "react";
import { TrendingUp, Plus, Play, Pause, Zap, ArrowUpRight, ArrowDownRight, Settings, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

interface Strategy {
  id: string;
  name: string;
  signalSource: string;
  pair: string;
  amount: string;
  status: "running" | "paused";
  totalProfit: number;
  profitPercent: number;
  trades: number;
  winRate: number;
}

interface TradeLog {
  id: string;
  pair: string;
  side: "buy" | "sell";
  amount: string;
  price: string;
  profit?: number;
  time: string;
  strategy: string;
}

const mockStrategies: Strategy[] = [
  {
    id: "1",
    name: "BTC MA Breakout",
    signalSource: "TradingView Webhook",
    pair: "BTC/USDT",
    amount: "$100/trade",
    status: "running",
    totalProfit: 234.5,
    profitPercent: 12.3,
    trades: 28,
    winRate: 68,
  },
  {
    id: "2",
    name: "ETH RSI Oversold",
    signalSource: "TradingView Webhook",
    pair: "ETH/USDT",
    amount: "$50/trade",
    status: "running",
    totalProfit: 89.2,
    profitPercent: 8.9,
    trades: 15,
    winRate: 73,
  },
  {
    id: "3",
    name: "SOL Bollinger",
    signalSource: "TradingView Webhook",
    pair: "SOL/USDT",
    amount: "$30/trade",
    status: "paused",
    totalProfit: 19.1,
    profitPercent: 3.2,
    trades: 4,
    winRate: 50,
  },
];

const mockTrades: TradeLog[] = [
  { id: "1", pair: "BTC/USDT", side: "buy", amount: "$100", price: "$67,432", profit: 12.5, time: "14:30", strategy: "BTC MA Breakout" },
  { id: "2", pair: "ETH/USDT", side: "sell", amount: "$50", price: "$3,842", profit: 8.3, time: "13:15", strategy: "ETH RSI Oversold" },
  { id: "3", pair: "BTC/USDT", side: "sell", amount: "$100", price: "$67,890", profit: -5.2, time: "11:42", strategy: "BTC MA Breakout" },
  { id: "4", pair: "ETH/USDT", side: "buy", amount: "$50", price: "$3,780", profit: 15.1, time: "09:20", strategy: "ETH RSI Oversold" },
];

export default function Trading() {
  const [activeTab, setActiveTab] = useState<"strategies" | "logs">("strategies");
  const { t } = useI18n();

  const totalProfit = mockStrategies.reduce((sum, s) => sum + s.totalProfit, 0);
  const totalTrades = mockStrategies.reduce((sum, s) => sum + s.trades, 0);
  const avgWinRate = Math.round(
    mockStrategies.reduce((sum, s) => sum + s.winRate, 0) / mockStrategies.length
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-neon-green" />
            <h1 className="text-lg font-semibold font-display">{t("trading.title")}</h1>
          </div>
          <button
            onClick={() => toast("Coming soon")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <Plus size={18} className="text-neon-green" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Profit Overview Card */}
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-br from-neon-green/10 to-neon-cyan/5 border border-neon-green/20">
          <p className="text-xs text-muted-foreground mb-1">{t("trading.totalProfit")}</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold font-display text-neon-green">
              +${totalProfit.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t("trading.totalTrades"), value: `${totalTrades}` },
              { label: t("trading.avgWinRate"), value: `${avgWinRate}%` },
              { label: t("trading.activeStrategies"), value: `${mockStrategies.filter((s) => s.status === "running").length}` },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <p className="text-[10px] text-muted-foreground">{m.label}</p>
                <p className="text-sm font-mono font-semibold mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab Switch */}
        <div className="flex mx-4 mt-4 p-1 rounded-xl bg-secondary/40">
          {(["strategies", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {tab === "strategies" ? t("trading.myStrategies") : t("trading.tradeHistory")}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-3">
          {activeTab === "strategies" ? (
            <>
              {mockStrategies.map((strategy, index) => (
                <motion.div
                  key={strategy.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3.5 rounded-2xl bg-card/50 border border-border/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold font-display">{strategy.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        strategy.status === "running"
                          ? "bg-neon-green/10 text-neon-green"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {strategy.status === "running" ? t("trading.running") : t("trading.paused")}
                      </span>
                    </div>
                    <button
                      onClick={() => toast("Coming soon")}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
                    >
                      {strategy.status === "running" ? (
                        <Pause size={14} className="text-muted-foreground" />
                      ) : (
                        <Play size={14} className="text-neon-green" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-2.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <LinkIcon size={10} />
                      {strategy.signalSource}
                    </span>
                    <span className="font-mono">{strategy.pair}</span>
                    <span>{strategy.amount}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-secondary/30 text-center">
                      <p className="text-[10px] text-muted-foreground">{t("trading.profit")}</p>
                      <p className={`text-xs font-mono font-semibold ${strategy.totalProfit >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                        {strategy.totalProfit >= 0 ? "+" : ""}${strategy.totalProfit.toFixed(1)}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/30 text-center">
                      <p className="text-[10px] text-muted-foreground">{t("trading.trades")}</p>
                      <p className="text-xs font-mono font-semibold">{strategy.trades}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/30 text-center">
                      <p className="text-[10px] text-muted-foreground">{t("trading.winRate")}</p>
                      <p className="text-xs font-mono font-semibold">{strategy.winRate}%</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Risk Warning */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-neon-red/5 border border-neon-red/15">
                <AlertTriangle size={14} className="text-neon-red shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t("trading.risk")}
                </p>
              </div>
            </>
          ) : (
            <>
              {mockTrades.map((trade, index) => (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/20"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    trade.side === "buy" ? "bg-neon-green/10" : "bg-neon-red/10"
                  }`}>
                    {trade.side === "buy" ? (
                      <ArrowUpRight size={16} className="text-neon-green" />
                    ) : (
                      <ArrowDownRight size={16} className="text-neon-red" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">{trade.pair}</span>
                      <span className={`text-[10px] uppercase font-mono ${
                        trade.side === "buy" ? "text-neon-green" : "text-neon-red"
                      }`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {trade.strategy} · {trade.amount} @ {trade.price}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {trade.profit !== undefined && (
                      <p className={`text-xs font-mono font-semibold ${
                        trade.profit >= 0 ? "text-neon-green" : "text-neon-red"
                      }`}>
                        {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(1)}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{trade.time}</p>
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
