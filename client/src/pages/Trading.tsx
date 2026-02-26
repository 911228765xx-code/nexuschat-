/*
 * Trading — 极简信号跟单页面（v1.3增强版）
 * 策略管理、交易记录、收益统计、策略详情弹窗
 */
import { useState } from "react";
import { TrendingUp, Plus, Play, Pause, Zap, ArrowUpRight, ArrowDownRight, Settings, Link as LinkIcon, AlertTriangle, X, Calendar, BarChart3, Target, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

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
  maxDrawdown: number;
  createdAt: string;
  avgHoldTime: string;
  profitHistory: { date: string; profit: number }[];
  recentTrades: {
    id: string;
    pair: string;
    side: "buy" | "sell";
    amount: string;
    price: string;
    profit: number;
    time: string;
    date: string;
  }[];
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
    maxDrawdown: -4.2,
    createdAt: "2025-12-15",
    avgHoldTime: "4.2h",
    profitHistory: [
      { date: "Jan", profit: 20 }, { date: "Feb", profit: 45 }, { date: "Mar", profit: 38 },
      { date: "Apr", profit: 72 }, { date: "May", profit: 95 }, { date: "Jun", profit: 110 },
      { date: "Jul", profit: 88 }, { date: "Aug", profit: 135 }, { date: "Sep", profit: 168 },
      { date: "Oct", profit: 195 }, { date: "Nov", profit: 210 }, { date: "Dec", profit: 234.5 },
    ],
    recentTrades: [
      { id: "t1", pair: "BTC/USDT", side: "buy", amount: "$100", price: "$67,432", profit: 12.5, time: "14:30", date: "Today" },
      { id: "t2", pair: "BTC/USDT", side: "sell", amount: "$100", price: "$67,890", profit: -5.2, time: "11:42", date: "Today" },
      { id: "t3", pair: "BTC/USDT", side: "buy", amount: "$100", price: "$66,980", profit: 22.1, time: "09:15", date: "Yesterday" },
      { id: "t4", pair: "BTC/USDT", side: "sell", amount: "$100", price: "$67,120", profit: 8.3, time: "16:45", date: "Yesterday" },
      { id: "t5", pair: "BTC/USDT", side: "buy", amount: "$100", price: "$65,800", profit: 35.0, time: "10:20", date: "Feb 24" },
      { id: "t6", pair: "BTC/USDT", side: "sell", amount: "$100", price: "$66,200", profit: -8.7, time: "08:30", date: "Feb 24" },
    ],
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
    maxDrawdown: -2.8,
    createdAt: "2026-01-10",
    avgHoldTime: "6.1h",
    profitHistory: [
      { date: "Jan", profit: 10 }, { date: "Feb", profit: 28 }, { date: "Mar", profit: 35 },
      { date: "Apr", profit: 42 }, { date: "May", profit: 55 }, { date: "Jun", profit: 62 },
      { date: "Jul", profit: 58 }, { date: "Aug", profit: 70 }, { date: "Sep", profit: 75 },
      { date: "Oct", profit: 80 }, { date: "Nov", profit: 85 }, { date: "Dec", profit: 89.2 },
    ],
    recentTrades: [
      { id: "t1", pair: "ETH/USDT", side: "sell", amount: "$50", price: "$3,842", profit: 8.3, time: "13:15", date: "Today" },
      { id: "t2", pair: "ETH/USDT", side: "buy", amount: "$50", price: "$3,780", profit: 15.1, time: "09:20", date: "Today" },
      { id: "t3", pair: "ETH/USDT", side: "sell", amount: "$50", price: "$3,810", profit: -3.2, time: "15:40", date: "Yesterday" },
    ],
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
    maxDrawdown: -6.5,
    createdAt: "2026-02-01",
    avgHoldTime: "2.8h",
    profitHistory: [
      { date: "Week 1", profit: 5 }, { date: "Week 2", profit: 12 },
      { date: "Week 3", profit: 8 }, { date: "Week 4", profit: 19.1 },
    ],
    recentTrades: [
      { id: "t1", pair: "SOL/USDT", side: "buy", amount: "$30", price: "$142.50", profit: 4.2, time: "10:30", date: "Feb 20" },
      { id: "t2", pair: "SOL/USDT", side: "sell", amount: "$30", price: "$140.80", profit: -2.1, time: "14:15", date: "Feb 19" },
    ],
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
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [detailTab, setDetailTab] = useState<"chart" | "trades">("chart");
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
                  onClick={() => { setSelectedStrategy(strategy); setDetailTab("chart"); }}
                  className="p-3.5 rounded-2xl bg-card/50 border border-border/30 cursor-pointer hover:border-neon-green/30 active:scale-[0.99] transition-all"
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
                      onClick={(e) => { e.stopPropagation(); toast("Coming soon"); }}
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

                  <div className="flex items-center justify-center mt-2 text-[10px] text-muted-foreground">
                    <span>Tap to view details →</span>
                  </div>
                </motion.div>
              ))}

              {/* Risk Warning */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/15">
                <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
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
                    trade.side === "buy" ? "bg-neon-green/10" : "bg-destructive/10"
                  }`}>
                    {trade.side === "buy" ? (
                      <ArrowUpRight size={16} className="text-neon-green" />
                    ) : (
                      <ArrowDownRight size={16} className="text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">{trade.pair}</span>
                      <span className={`text-[10px] uppercase font-mono ${
                        trade.side === "buy" ? "text-neon-green" : "text-destructive"
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
                        trade.profit >= 0 ? "text-neon-green" : "text-destructive"
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

      {/* Strategy Detail Modal */}
      <AnimatePresence>
        {selectedStrategy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedStrategy(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Detail Header */}
              <div className="px-5 py-4 border-b border-border/30 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-neon-green/10 flex items-center justify-center">
                      <TrendingUp size={20} className="text-neon-green" />
                    </div>
                    <div>
                      <h3 className="font-bold font-display text-base">{selectedStrategy.name}</h3>
                      <p className="text-[11px] text-muted-foreground font-mono">{selectedStrategy.pair} · {selectedStrategy.signalSource}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStrategy(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
                  >
                    <X size={18} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Key metrics row */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    { icon: TrendingUp, label: "Profit", value: `+$${selectedStrategy.totalProfit.toFixed(1)}`, color: "text-neon-green" },
                    { icon: Target, label: "Win Rate", value: `${selectedStrategy.winRate}%`, color: "text-neon-cyan" },
                    { icon: BarChart3, label: "Drawdown", value: `${selectedStrategy.maxDrawdown}%`, color: "text-destructive" },
                    { icon: Clock, label: "Avg Hold", value: selectedStrategy.avgHoldTime, color: "text-neon-purple" },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <div key={m.label} className="text-center p-2 rounded-xl bg-secondary/30">
                        <Icon size={14} className={`${m.color} mx-auto mb-1`} />
                        <p className="text-[9px] text-muted-foreground">{m.label}</p>
                        <p className={`text-xs font-mono font-bold ${m.color}`}>{m.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="flex mx-4 mt-3 p-1 rounded-xl bg-secondary/40 shrink-0">
                {(["chart", "trades"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      detailTab === tab
                        ? "bg-secondary text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {tab === "chart" ? "Profit Curve" : "Trade History"}
                  </button>
                ))}
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {detailTab === "chart" ? (
                  <div className="space-y-4">
                    {/* Profit Curve Chart */}
                    <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-medium">Cumulative Profit ($)</h4>
                        <span className="text-xs font-mono text-neon-green">+{selectedStrategy.profitPercent}%</span>
                      </div>
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={selectedStrategy.profitHistory}>
                            <defs>
                              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--neon-green)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--neon-green)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) => `$${v}`}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: "12px",
                                fontSize: "12px",
                                color: "var(--foreground)",
                              }}
                              formatter={(value: number) => [`$${value.toFixed(1)}`, "Profit"]}
                            />
                            <Area
                              type="monotone"
                              dataKey="profit"
                              stroke="var(--neon-green)"
                              strokeWidth={2}
                              fill="url(#profitGradient)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Strategy Info */}
                    <div className="space-y-2">
                      {[
                        { label: "Created", value: selectedStrategy.createdAt, icon: Calendar },
                        { label: "Total Trades", value: `${selectedStrategy.trades}`, icon: BarChart3 },
                        { label: "Amount per Trade", value: selectedStrategy.amount, icon: Target },
                        { label: "Signal Source", value: selectedStrategy.signalSource, icon: LinkIcon },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20">
                            <div className="flex items-center gap-2">
                              <Icon size={14} className="text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{item.label}</span>
                            </div>
                            <span className="text-xs font-mono">{item.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedStrategy.recentTrades.map((trade, index) => (
                      <motion.div
                        key={trade.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/10"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          trade.side === "buy" ? "bg-neon-green/10" : "bg-destructive/10"
                        }`}>
                          {trade.side === "buy" ? (
                            <ArrowUpRight size={14} className="text-neon-green" />
                          ) : (
                            <ArrowDownRight size={14} className="text-destructive" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-medium">{trade.pair}</span>
                            <span className={`text-[10px] uppercase font-mono ${
                              trade.side === "buy" ? "text-neon-green" : "text-destructive"
                            }`}>
                              {trade.side.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {trade.amount} @ {trade.price} · {trade.date}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-mono font-semibold ${
                            trade.profit >= 0 ? "text-neon-green" : "text-destructive"
                          }`}>
                            {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(1)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{trade.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="px-4 py-3 border-t border-border/30 flex gap-3 shrink-0">
                <button
                  onClick={() => { toast("Coming soon"); }}
                  className="flex-1 h-11 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Settings size={16} />
                  Edit Strategy
                </button>
                <button
                  onClick={() => { toast("Coming soon"); }}
                  className={`flex-1 h-11 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedStrategy.status === "running"
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                      : "bg-neon-green/10 text-neon-green hover:bg-neon-green/20 border border-neon-green/20"
                  }`}
                >
                  {selectedStrategy.status === "running" ? (
                    <><Pause size={16} /> Pause</>
                  ) : (
                    <><Play size={16} /> Resume</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
