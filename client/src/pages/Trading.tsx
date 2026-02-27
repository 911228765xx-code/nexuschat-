/*
 * Trading — 全功能跟单交易页面（v2.0）
 * 四大标签：我的策略 / 跟单市场 / 交易记录 / 实时持仓
 * 交易员排行榜、收益曲线、风控参数、策略详情弹窗
 */
import { useState, useMemo } from "react";
import {
  TrendingUp, Plus, Play, Pause, Zap, ArrowUpRight, ArrowDownRight,
  Settings, Link as LinkIcon, AlertTriangle, X, Calendar, BarChart3,
  Target, Clock, Users, Star, Shield, ChevronDown, ChevronUp,
  Activity, Eye, Copy, Filter, RefreshCw, Award, Flame,
  CircleDollarSign, Percent, Timer, TrendingDown, Wallet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ReferenceLine
} from "recharts";

/* ─── Types ─── */
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
  sharpeRatio: number;
  profitFactor: number;
  maxConsecutiveLoss: number;
  avgProfit: number;
  avgLoss: number;
  riskLevel: "low" | "medium" | "high";
  stopLoss: number;
  takeProfit: number;
  maxPosition: number;
  dailyLossLimit: number;
  profitHistory: { date: string; profit: number; benchmark: number }[];
  recentTrades: {
    id: string; pair: string; side: "buy" | "sell";
    amount: string; price: string; profit: number;
    time: string; date: string;
  }[];
}

interface Trader {
  id: string;
  name: string;
  avatar: string;
  badge: "gold" | "silver" | "bronze" | "none";
  followers: number;
  totalReturn: number;
  winRate: number;
  trades30d: number;
  maxDrawdown: number;
  sharpeRatio: number;
  riskLevel: "low" | "medium" | "high";
  isFollowing: boolean;
  profitHistory: { date: string; profit: number }[];
  topPairs: string[];
  avgHoldTime: string;
  description: string;
}

interface Position {
  id: string;
  pair: string;
  side: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  amount: number;
  leverage: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  strategy: string;
  openTime: string;
}

/* ─── Mock Data ─── */
const mockTraders: Trader[] = [
  {
    id: "tr1", name: "CryptoKing", avatar: "👑", badge: "gold",
    followers: 2845, totalReturn: 342.5, winRate: 78, trades30d: 156,
    maxDrawdown: -8.2, sharpeRatio: 2.85, riskLevel: "medium", isFollowing: false,
    profitHistory: [
      { date: "W1", profit: 12 }, { date: "W2", profit: 28 }, { date: "W3", profit: 45 },
      { date: "W4", profit: 38 }, { date: "W5", profit: 62 }, { date: "W6", profit: 85 },
      { date: "W7", profit: 78 }, { date: "W8", profit: 105 },
    ],
    topPairs: ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
    avgHoldTime: "2.4h",
    description: "Momentum & breakout specialist. 3+ years crypto trading.",
  },
  {
    id: "tr2", name: "WhaleHunter", avatar: "🐋", badge: "gold",
    followers: 1923, totalReturn: 285.8, winRate: 72, trades30d: 89,
    maxDrawdown: -12.5, sharpeRatio: 2.12, riskLevel: "medium", isFollowing: true,
    profitHistory: [
      { date: "W1", profit: 8 }, { date: "W2", profit: 22 }, { date: "W3", profit: 35 },
      { date: "W4", profit: 52 }, { date: "W5", profit: 48 }, { date: "W6", profit: 72 },
      { date: "W7", profit: 90 }, { date: "W8", profit: 95 },
    ],
    topPairs: ["BTC/USDT", "LINK/USDT"],
    avgHoldTime: "6.8h",
    description: "Whale flow analysis & on-chain signals. Focus on BTC/ETH.",
  },
  {
    id: "tr3", name: "DeFiAlpha", avatar: "🦊", badge: "silver",
    followers: 1456, totalReturn: 198.3, winRate: 65, trades30d: 234,
    maxDrawdown: -15.8, sharpeRatio: 1.78, riskLevel: "high", isFollowing: false,
    profitHistory: [
      { date: "W1", profit: 15 }, { date: "W2", profit: 10 }, { date: "W3", profit: 32 },
      { date: "W4", profit: 28 }, { date: "W5", profit: 55 }, { date: "W6", profit: 42 },
      { date: "W7", profit: 68 }, { date: "W8", profit: 75 },
    ],
    topPairs: ["ARB/USDT", "OP/USDT", "MATIC/USDT"],
    avgHoldTime: "1.2h",
    description: "High-frequency DeFi token scalper. Aggressive style.",
  },
  {
    id: "tr4", name: "SteadyEddie", avatar: "🛡️", badge: "silver",
    followers: 3210, totalReturn: 156.2, winRate: 82, trades30d: 42,
    maxDrawdown: -3.5, sharpeRatio: 3.45, riskLevel: "low", isFollowing: false,
    profitHistory: [
      { date: "W1", profit: 5 }, { date: "W2", profit: 12 }, { date: "W3", profit: 18 },
      { date: "W4", profit: 25 }, { date: "W5", profit: 32 }, { date: "W6", profit: 38 },
      { date: "W7", profit: 45 }, { date: "W8", profit: 52 },
    ],
    topPairs: ["BTC/USDT", "ETH/USDT"],
    avgHoldTime: "12.5h",
    description: "Conservative swing trader. Capital preservation first.",
  },
  {
    id: "tr5", name: "MemeSniper", avatar: "🎯", badge: "bronze",
    followers: 876, totalReturn: 520.8, winRate: 45, trades30d: 312,
    maxDrawdown: -35.2, sharpeRatio: 0.92, riskLevel: "high", isFollowing: false,
    profitHistory: [
      { date: "W1", profit: 45 }, { date: "W2", profit: -20 }, { date: "W3", profit: 80 },
      { date: "W4", profit: -15 }, { date: "W5", profit: 120 }, { date: "W6", profit: 65 },
      { date: "W7", profit: -30 }, { date: "W8", profit: 150 },
    ],
    topPairs: ["PEPE/USDT", "DOGE/USDT", "SHIB/USDT"],
    avgHoldTime: "0.3h",
    description: "Meme coin specialist. High risk, high reward.",
  },
  {
    id: "tr6", name: "AIQuantBot", avatar: "🤖", badge: "bronze",
    followers: 1102, totalReturn: 178.4, winRate: 69, trades30d: 580,
    maxDrawdown: -9.8, sharpeRatio: 2.05, riskLevel: "medium", isFollowing: false,
    profitHistory: [
      { date: "W1", profit: 8 }, { date: "W2", profit: 18 }, { date: "W3", profit: 25 },
      { date: "W4", profit: 35 }, { date: "W5", profit: 42 }, { date: "W6", profit: 55 },
      { date: "W7", profit: 62 }, { date: "W8", profit: 70 },
    ],
    topPairs: ["BTC/USDT", "ETH/USDT", "SOL/USDT", "ARB/USDT"],
    avgHoldTime: "0.8h",
    description: "ML-powered quantitative strategy. Fully automated.",
  },
];

const mockStrategies: Strategy[] = [
  {
    id: "1", name: "BTC MA Breakout", signalSource: "CryptoKing",
    pair: "BTC/USDT", amount: "$100/trade", status: "running",
    totalProfit: 234.5, profitPercent: 12.3, trades: 28, winRate: 68,
    maxDrawdown: -4.2, createdAt: "2025-12-15", avgHoldTime: "4.2h",
    sharpeRatio: 2.15, profitFactor: 1.85, maxConsecutiveLoss: 3,
    avgProfit: 18.5, avgLoss: -12.3, riskLevel: "low",
    stopLoss: 5, takeProfit: 15, maxPosition: 500, dailyLossLimit: 50,
    profitHistory: [
      { date: "Jan", profit: 20, benchmark: 15 }, { date: "Feb", profit: 45, benchmark: 30 },
      { date: "Mar", profit: 38, benchmark: 25 }, { date: "Apr", profit: 72, benchmark: 48 },
      { date: "May", profit: 95, benchmark: 60 }, { date: "Jun", profit: 110, benchmark: 72 },
      { date: "Jul", profit: 88, benchmark: 65 }, { date: "Aug", profit: 135, benchmark: 90 },
      { date: "Sep", profit: 168, benchmark: 110 }, { date: "Oct", profit: 195, benchmark: 130 },
      { date: "Nov", profit: 210, benchmark: 145 }, { date: "Dec", profit: 234.5, benchmark: 160 },
    ],
    recentTrades: [
      { id: "t1", pair: "BTC/USDT", side: "buy", amount: "$100", price: "$97,432", profit: 12.5, time: "14:30", date: "Today" },
      { id: "t2", pair: "BTC/USDT", side: "sell", amount: "$100", price: "$97,890", profit: -5.2, time: "11:42", date: "Today" },
      { id: "t3", pair: "BTC/USDT", side: "buy", amount: "$100", price: "$96,980", profit: 22.1, time: "09:15", date: "Yesterday" },
      { id: "t4", pair: "BTC/USDT", side: "sell", amount: "$100", price: "$97,120", profit: 8.3, time: "16:45", date: "Yesterday" },
      { id: "t5", pair: "BTC/USDT", side: "buy", amount: "$100", price: "$95,800", profit: 35.0, time: "10:20", date: "Feb 24" },
      { id: "t6", pair: "BTC/USDT", side: "sell", amount: "$100", price: "$96,200", profit: -8.7, time: "08:30", date: "Feb 24" },
    ],
  },
  {
    id: "2", name: "ETH RSI Oversold", signalSource: "WhaleHunter",
    pair: "ETH/USDT", amount: "$50/trade", status: "running",
    totalProfit: 89.2, profitPercent: 8.9, trades: 15, winRate: 73,
    maxDrawdown: -2.8, createdAt: "2026-01-10", avgHoldTime: "6.1h",
    sharpeRatio: 2.68, profitFactor: 2.12, maxConsecutiveLoss: 2,
    avgProfit: 12.8, avgLoss: -6.5, riskLevel: "low",
    stopLoss: 3, takeProfit: 10, maxPosition: 300, dailyLossLimit: 30,
    profitHistory: [
      { date: "Jan", profit: 10, benchmark: 8 }, { date: "Feb", profit: 28, benchmark: 18 },
      { date: "Mar", profit: 35, benchmark: 22 }, { date: "Apr", profit: 42, benchmark: 30 },
      { date: "May", profit: 55, benchmark: 38 }, { date: "Jun", profit: 62, benchmark: 45 },
      { date: "Jul", profit: 58, benchmark: 42 }, { date: "Aug", profit: 70, benchmark: 52 },
      { date: "Sep", profit: 75, benchmark: 58 }, { date: "Oct", profit: 80, benchmark: 62 },
      { date: "Nov", profit: 85, benchmark: 68 }, { date: "Dec", profit: 89.2, benchmark: 72 },
    ],
    recentTrades: [
      { id: "t1", pair: "ETH/USDT", side: "sell", amount: "$50", price: "$3,842", profit: 8.3, time: "13:15", date: "Today" },
      { id: "t2", pair: "ETH/USDT", side: "buy", amount: "$50", price: "$3,780", profit: 15.1, time: "09:20", date: "Today" },
      { id: "t3", pair: "ETH/USDT", side: "sell", amount: "$50", price: "$3,810", profit: -3.2, time: "15:40", date: "Yesterday" },
    ],
  },
  {
    id: "3", name: "SOL Bollinger", signalSource: "DeFiAlpha",
    pair: "SOL/USDT", amount: "$30/trade", status: "paused",
    totalProfit: 19.1, profitPercent: 3.2, trades: 4, winRate: 50,
    maxDrawdown: -6.5, createdAt: "2026-02-01", avgHoldTime: "2.8h",
    sharpeRatio: 0.85, profitFactor: 1.15, maxConsecutiveLoss: 2,
    avgProfit: 8.2, avgLoss: -7.8, riskLevel: "medium",
    stopLoss: 8, takeProfit: 20, maxPosition: 200, dailyLossLimit: 40,
    profitHistory: [
      { date: "W1", profit: 5, benchmark: 3 }, { date: "W2", profit: 12, benchmark: 8 },
      { date: "W3", profit: 8, benchmark: 6 }, { date: "W4", profit: 19.1, benchmark: 12 },
    ],
    recentTrades: [
      { id: "t1", pair: "SOL/USDT", side: "buy", amount: "$30", price: "$187.50", profit: 4.2, time: "10:30", date: "Feb 20" },
      { id: "t2", pair: "SOL/USDT", side: "sell", amount: "$30", price: "$185.80", profit: -2.1, time: "14:15", date: "Feb 19" },
    ],
  },
];

const mockPositions: Position[] = [
  {
    id: "p1", pair: "BTC/USDT", side: "long", entryPrice: 96850, currentPrice: 97245,
    amount: 0.001, leverage: 5, unrealizedPnl: 1.98, unrealizedPnlPercent: 2.04,
    strategy: "BTC MA Breakout", openTime: "2h 15m ago",
  },
  {
    id: "p2", pair: "ETH/USDT", side: "long", entryPrice: 3810, currentPrice: 3842.5,
    amount: 0.015, leverage: 3, unrealizedPnl: 0.49, unrealizedPnlPercent: 0.85,
    strategy: "ETH RSI Oversold", openTime: "45m ago",
  },
  {
    id: "p3", pair: "BTC/USDT", side: "short", entryPrice: 97500, currentPrice: 97245,
    amount: 0.0005, leverage: 10, unrealizedPnl: 0.13, unrealizedPnlPercent: 0.26,
    strategy: "BTC MA Breakout", openTime: "12m ago",
  },
];

const allTrades = [
  { id: "1", pair: "BTC/USDT", side: "buy" as const, amount: "$100", price: "$97,432", profit: 12.5, time: "14:30", date: "Today", strategy: "BTC MA Breakout" },
  { id: "2", pair: "ETH/USDT", side: "sell" as const, amount: "$50", price: "$3,842", profit: 8.3, time: "13:15", date: "Today", strategy: "ETH RSI Oversold" },
  { id: "3", pair: "BTC/USDT", side: "sell" as const, amount: "$100", price: "$97,890", profit: -5.2, time: "11:42", date: "Today", strategy: "BTC MA Breakout" },
  { id: "4", pair: "ETH/USDT", side: "buy" as const, amount: "$50", price: "$3,780", profit: 15.1, time: "09:20", date: "Today", strategy: "ETH RSI Oversold" },
  { id: "5", pair: "BTC/USDT", side: "buy" as const, amount: "$100", price: "$96,980", profit: 22.1, time: "09:15", date: "Yesterday", strategy: "BTC MA Breakout" },
  { id: "6", pair: "SOL/USDT", side: "buy" as const, amount: "$30", price: "$187.50", profit: 4.2, time: "10:30", date: "Feb 24", strategy: "SOL Bollinger" },
  { id: "7", pair: "BTC/USDT", side: "sell" as const, amount: "$100", price: "$96,200", profit: -8.7, time: "08:30", date: "Feb 24", strategy: "BTC MA Breakout" },
  { id: "8", pair: "ETH/USDT", side: "sell" as const, amount: "$50", price: "$3,810", profit: -3.2, time: "15:40", date: "Feb 23", strategy: "ETH RSI Oversold" },
];

type MainTab = "strategies" | "market" | "logs" | "positions";
type DetailTab = "chart" | "trades" | "risk" | "stats";
type MarketSort = "return" | "winRate" | "followers" | "sharpe";

export default function Trading() {
  const [activeTab, setActiveTab] = useState<MainTab>("strategies");
  const [strategies, setStrategies] = useState(mockStrategies);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("chart");
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [traders, setTraders] = useState(mockTraders);
  const [marketSort, setMarketSort] = useState<MarketSort>("return");
  const [showFilters, setShowFilters] = useState(false);
  const [riskFilter, setRiskFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const { t } = useI18n();

  const totalProfit = strategies.reduce((s, st) => s + st.totalProfit, 0);
  const totalTrades = strategies.reduce((s, st) => s + st.trades, 0);
  const avgWinRate = Math.round(strategies.reduce((s, st) => s + st.winRate, 0) / strategies.length);
  const totalUnrealizedPnl = mockPositions.reduce((s, p) => s + p.unrealizedPnl, 0);

  const sortedTraders = useMemo(() => {
    let filtered = riskFilter === "all" ? [...traders] : traders.filter(tr => tr.riskLevel === riskFilter);
    switch (marketSort) {
      case "return": return filtered.sort((a, b) => b.totalReturn - a.totalReturn);
      case "winRate": return filtered.sort((a, b) => b.winRate - a.winRate);
      case "followers": return filtered.sort((a, b) => b.followers - a.followers);
      case "sharpe": return filtered.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
      default: return filtered;
    }
  }, [traders, marketSort, riskFilter]);

  const toggleStrategyStatus = (id: string) => {
    setStrategies(prev => prev.map(s => {
      if (s.id !== id) return s;
      const ns = s.status === "running" ? "paused" as const : "running" as const;
      toast.success(ns === "running" ? `${s.name} resumed` : `${s.name} paused`);
      return { ...s, status: ns };
    }));
    setSelectedStrategy(prev => {
      if (!prev || prev.id !== id) return prev;
      return { ...prev, status: prev.status === "running" ? "paused" as const : "running" as const };
    });
  };

  const toggleFollow = (traderId: string) => {
    setTraders(prev => prev.map(tr => {
      if (tr.id !== traderId) return tr;
      const nf = !tr.isFollowing;
      toast.success(nf ? `Now following ${tr.name}` : `Unfollowed ${tr.name}`);
      return { ...tr, isFollowing: nf, followers: nf ? tr.followers + 1 : tr.followers - 1 };
    }));
    setSelectedTrader(prev => {
      if (!prev || prev.id !== traderId) return prev;
      const nf = !prev.isFollowing;
      return { ...prev, isFollowing: nf, followers: nf ? prev.followers + 1 : prev.followers - 1 };
    });
  };

  const riskColor = (level: string) => {
    switch (level) {
      case "low": return "text-neon-green bg-neon-green/10 border-neon-green/20";
      case "medium": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "high": return "text-neon-red bg-neon-red/10 border-neon-red/20";
      default: return "";
    }
  };

  const badgeIcon = (badge: string) => {
    switch (badge) {
      case "gold": return "🥇";
      case "silver": return "🥈";
      case "bronze": return "🥉";
      default: return "";
    }
  };

  const tabItems: { key: MainTab; label: string; icon: React.ReactNode }[] = [
    { key: "strategies", label: t("trading.myStrategies"), icon: <Zap size={14} /> },
    { key: "market", label: t("trading.market") || "Market", icon: <Users size={14} /> },
    { key: "positions", label: t("trading.positions") || "Positions", icon: <Activity size={14} /> },
    { key: "logs", label: t("trading.tradeHistory"), icon: <Clock size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-neon-green" />
            <h1 className="text-lg font-semibold font-display">{t("trading.title")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toast.success(t("trading.refreshed") || "Data refreshed ✓")}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <RefreshCw size={16} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => toast.info("Create new strategy coming soon")}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Plus size={18} className="text-neon-green" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Overview Cards */}
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-neon-green/10 to-neon-green/5 border border-neon-green/20">
            <p className="text-[10px] text-muted-foreground mb-0.5">{t("trading.totalProfit")}</p>
            <p className="text-xl font-bold font-display text-neon-green">+${totalProfit.toFixed(2)}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-muted-foreground">{t("trading.totalTrades")}: <span className="font-mono text-foreground">{totalTrades}</span></span>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-gradient-to-br from-neon-cyan/10 to-neon-cyan/5 border border-neon-cyan/20">
            <p className="text-[10px] text-muted-foreground mb-0.5">{t("trading.positions") || "Open Positions"}</p>
            <p className={`text-xl font-bold font-display ${totalUnrealizedPnl >= 0 ? "text-neon-cyan" : "text-neon-red"}`}>
              {totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl.toFixed(2)}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-muted-foreground">{t("trading.activeStrategies")}: <span className="font-mono text-foreground">{strategies.filter(s => s.status === "running").length}</span></span>
            </div>
          </div>
        </div>

        {/* Tab Switch */}
        <div className="flex mx-4 mt-4 p-1 rounded-xl bg-secondary/40 overflow-x-auto no-scrollbar">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-3">
          <AnimatePresence mode="wait">
            {/* ═══ TAB: My Strategies ═══ */}
            {activeTab === "strategies" && (
              <motion.div key="strategies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {strategies.map((strategy, index) => (
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
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${riskColor(strategy.riskLevel)}`}>
                          {strategy.riskLevel === "low" ? "Low" : strategy.riskLevel === "medium" ? "Med" : "High"}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStrategyStatus(strategy.id); }}
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
                      <span className="flex items-center gap-1"><Users size={10} />{strategy.signalSource}</span>
                      <span className="font-mono">{strategy.pair}</span>
                      <span>{strategy.amount}</span>
                    </div>

                    {/* Mini sparkline */}
                    <div className="h-[40px] mb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={strategy.profitHistory}>
                          <defs>
                            <linearGradient id={`spark-${strategy.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={strategy.totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)"} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={strategy.totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)"} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="profit" stroke={strategy.totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)"} strokeWidth={1.5} fill={`url(#spark-${strategy.id})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: t("trading.profit"), value: `${strategy.totalProfit >= 0 ? "+" : ""}$${strategy.totalProfit.toFixed(1)}`, color: strategy.totalProfit >= 0 ? "text-neon-green" : "text-neon-red" },
                        { label: t("trading.winRate"), value: `${strategy.winRate}%`, color: "text-foreground" },
                        { label: "Sharpe", value: strategy.sharpeRatio.toFixed(2), color: "text-foreground" },
                        { label: "Drawdown", value: `${strategy.maxDrawdown}%`, color: "text-neon-red" },
                      ].map((m) => (
                        <div key={m.label} className="p-1.5 rounded-lg bg-secondary/30 text-center">
                          <p className="text-[9px] text-muted-foreground">{m.label}</p>
                          <p className={`text-[11px] font-mono font-semibold ${m.color}`}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}

                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/15">
                  <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{t("trading.risk")}</p>
                </div>
              </motion.div>
            )}

            {/* ═══ TAB: Copy Trade Market ═══ */}
            {activeTab === "market" && (
              <motion.div key="market" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {/* Filters */}
                <div className="flex items-center justify-between">
                  <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Filter size={14} />
                    {showFilters ? "Hide Filters" : "Filters"}
                    {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <div className="flex items-center gap-1">
                    {(["return", "winRate", "followers", "sharpe"] as MarketSort[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setMarketSort(s)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                          marketSort === s ? "bg-neon-green/10 text-neon-green" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s === "return" ? "ROI" : s === "winRate" ? "Win%" : s === "followers" ? "Fans" : "Sharpe"}
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="flex items-center gap-2 pb-2">
                        <span className="text-[10px] text-muted-foreground">Risk:</span>
                        {(["all", "low", "medium", "high"] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setRiskFilter(r)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                              riskFilter === r
                                ? r === "all" ? "bg-secondary text-foreground border-border" : riskColor(r)
                                : "text-muted-foreground border-transparent hover:border-border"
                            }`}
                          >
                            {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Top 3 Podium */}
                {marketSort === "return" && riskFilter === "all" && (
                  <div className="flex items-end justify-center gap-2 py-3">
                    {[sortedTraders[1], sortedTraders[0], sortedTraders[2]].filter(Boolean).map((tr, i) => {
                      const heights = ["h-16", "h-20", "h-12"];
                      const ranks = ["2nd", "1st", "3rd"];
                      const colors = ["from-gray-400/20 to-gray-400/5", "from-yellow-400/20 to-yellow-400/5", "from-amber-600/20 to-amber-600/5"];
                      return (
                        <div key={tr.id} className="flex flex-col items-center gap-1 flex-1" onClick={() => setSelectedTrader(tr)}>
                          <span className="text-lg">{tr.avatar}</span>
                          <span className="text-[10px] font-medium truncate max-w-[80px]">{tr.name}</span>
                          <span className="text-[10px] font-mono text-neon-green">+{tr.totalReturn}%</span>
                          <div className={`w-full ${heights[i]} rounded-t-xl bg-gradient-to-t ${colors[i]} border border-border/20 flex items-center justify-center`}>
                            <span className="text-[10px] font-bold text-muted-foreground">{ranks[i]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Trader Cards */}
                {sortedTraders.map((trader, index) => (
                  <motion.div
                    key={trader.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => setSelectedTrader(trader)}
                    className="p-3.5 rounded-2xl bg-card/50 border border-border/30 cursor-pointer hover:border-neon-cyan/30 active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-secondary/60 flex items-center justify-center text-xl relative">
                        {trader.avatar}
                        {trader.badge !== "none" && (
                          <span className="absolute -bottom-0.5 -right-0.5 text-xs">{badgeIcon(trader.badge)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold font-display">{trader.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${riskColor(trader.riskLevel)}`}>
                            {trader.riskLevel === "low" ? "Low" : trader.riskLevel === "medium" ? "Med" : "High"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{trader.description}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFollow(trader.id); }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          trader.isFollowing
                            ? "bg-secondary text-muted-foreground border border-border"
                            : "bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20"
                        }`}
                      >
                        {trader.isFollowing ? "Following" : "Follow"}
                      </button>
                    </div>

                    {/* Mini chart */}
                    <div className="h-[35px] mb-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trader.profitHistory}>
                          <defs>
                            <linearGradient id={`trader-${trader.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--neon-cyan)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="var(--neon-cyan)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="profit" stroke="var(--neon-cyan)" strokeWidth={1.5} fill={`url(#trader-${trader.id})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "ROI", value: `+${trader.totalReturn}%`, color: "text-neon-green" },
                        { label: "Win%", value: `${trader.winRate}%`, color: "text-foreground" },
                        { label: "Followers", value: trader.followers > 1000 ? `${(trader.followers / 1000).toFixed(1)}K` : `${trader.followers}`, color: "text-foreground" },
                        { label: "Sharpe", value: trader.sharpeRatio.toFixed(2), color: trader.sharpeRatio >= 2 ? "text-neon-cyan" : "text-foreground" },
                      ].map((m) => (
                        <div key={m.label} className="p-1.5 rounded-lg bg-secondary/30 text-center">
                          <p className="text-[9px] text-muted-foreground">{m.label}</p>
                          <p className={`text-[11px] font-mono font-semibold ${m.color}`}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* ═══ TAB: Open Positions ═══ */}
            {activeTab === "positions" && (
              <motion.div key="positions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {/* Position Summary */}
                <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium flex items-center gap-1.5"><Activity size={14} className="text-neon-cyan" /> Live Positions</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green font-mono">{mockPositions.length} Open</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Unrealized PnL</p>
                      <p className={`text-sm font-mono font-bold ${totalUnrealizedPnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                        {totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Long</p>
                      <p className="text-sm font-mono font-bold text-neon-green">{mockPositions.filter(p => p.side === "long").length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground">Short</p>
                      <p className="text-sm font-mono font-bold text-neon-red">{mockPositions.filter(p => p.side === "short").length}</p>
                    </div>
                  </div>
                </div>

                {/* Position Cards */}
                {mockPositions.map((pos, index) => (
                  <motion.div
                    key={pos.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3.5 rounded-2xl bg-card/50 border border-border/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                          pos.side === "long" ? "bg-neon-green/10 text-neon-green" : "bg-neon-red/10 text-neon-red"
                        }`}>
                          {pos.side.toUpperCase()} {pos.leverage}x
                        </span>
                        <span className="text-sm font-mono font-semibold">{pos.pair}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono font-bold ${pos.unrealizedPnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                          {pos.unrealizedPnl >= 0 ? "+" : ""}${pos.unrealizedPnl.toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-mono ${pos.unrealizedPnlPercent >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                          ({pos.unrealizedPnlPercent >= 0 ? "+" : ""}{pos.unrealizedPnlPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entry</span>
                        <span className="font-mono">${pos.entryPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current</span>
                        <span className="font-mono">${pos.currentPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Size</span>
                        <span className="font-mono">{pos.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Open</span>
                        <span className="font-mono">{pos.openTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Zap size={10} />{pos.strategy}</span>
                      <button
                        onClick={() => toast.info("Close position coming soon")}
                        className="px-3 py-1 rounded-lg text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Margin Info */}
                <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20">
                  <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5"><Wallet size={14} className="text-neon-purple" /> Account Summary</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                    {[
                      { label: "Balance", value: "$2,450.00" },
                      { label: "Used Margin", value: "$185.20" },
                      { label: "Available", value: "$2,264.80" },
                      { label: "Margin Level", value: "1,322%" },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-mono font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ TAB: Trade History ═══ */}
            {activeTab === "logs" && (
              <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                {/* Daily Summary */}
                <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20 mb-3">
                  <h4 className="text-xs font-medium mb-2">Today's Summary</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Trades", value: "4", color: "text-foreground" },
                      { label: "PnL", value: "+$30.7", color: "text-neon-green" },
                      { label: "Win Rate", value: "75%", color: "text-foreground" },
                      { label: "Best", value: "+$15.1", color: "text-neon-green" },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <p className="text-[9px] text-muted-foreground">{m.label}</p>
                        <p className={`text-xs font-mono font-semibold ${m.color}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {allTrades.map((trade, index) => (
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
                        }`}>{trade.side.toUpperCase()}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {trade.strategy} · {trade.amount} @ {trade.price}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-mono font-semibold ${
                        trade.profit >= 0 ? "text-neon-green" : "text-destructive"
                      }`}>
                        {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{trade.date} {trade.time}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ Strategy Detail Modal ═══ */}
      <AnimatePresence>
        {selectedStrategy && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedStrategy(null)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
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
                  <button onClick={() => setSelectedStrategy(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors">
                    <X size={18} className="text-muted-foreground" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[
                    { icon: TrendingUp, label: t("trading.profit"), value: `+$${selectedStrategy.totalProfit.toFixed(1)}`, color: "text-neon-green" },
                    { icon: Target, label: t("trading.winRate"), value: `${selectedStrategy.winRate}%`, color: "text-neon-cyan" },
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
                {(["chart", "stats", "risk", "trades"] as DetailTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                      detailTab === tab ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    {tab === "chart" ? "Curve" : tab === "stats" ? "Stats" : tab === "risk" ? "Risk" : "Trades"}
                  </button>
                ))}
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {detailTab === "chart" && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-medium">Cumulative Profit vs Benchmark ($)</h4>
                        <span className="text-xs font-mono text-neon-green">+{selectedStrategy.profitPercent}%</span>
                      </div>
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={selectedStrategy.profitHistory}>
                            <defs>
                              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--neon-green)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--neon-green)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--foreground)" }}
                              formatter={(value: number, name: string) => [`$${value.toFixed(1)}`, name === "profit" ? "Strategy" : "Benchmark"]}
                            />
                            <Area type="monotone" dataKey="profit" stroke="var(--neon-green)" strokeWidth={2} fill="url(#profitGrad)" name="profit" />
                            <Area type="monotone" dataKey="benchmark" stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="4 4" fill="none" name="benchmark" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Monthly Returns Bar */}
                    <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20">
                      <h4 className="text-xs font-medium mb-3">Monthly Returns ($)</h4>
                      <div className="h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={selectedStrategy.profitHistory.map((d, i, arr) => ({
                            date: d.date,
                            monthly: i === 0 ? d.profit : d.profit - arr[i - 1].profit,
                          }))}>
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                            <ReferenceLine y={0} stroke="var(--border)" />
                            <Tooltip
                              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "11px", color: "var(--foreground)" }}
                              formatter={(value: number) => [`$${value.toFixed(1)}`, "Monthly"]}
                            />
                            <Bar dataKey="monthly" radius={[4, 4, 0, 0]} fill="var(--neon-green)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === "stats" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20">
                      <h4 className="text-xs font-medium mb-3 flex items-center gap-1.5"><BarChart3 size={14} className="text-neon-cyan" /> Performance Metrics</h4>
                      <div className="space-y-2.5">
                        {[
                          { label: "Sharpe Ratio", value: selectedStrategy.sharpeRatio.toFixed(2), desc: selectedStrategy.sharpeRatio >= 2 ? "Excellent" : selectedStrategy.sharpeRatio >= 1 ? "Good" : "Below avg", color: selectedStrategy.sharpeRatio >= 2 ? "text-neon-green" : selectedStrategy.sharpeRatio >= 1 ? "text-yellow-400" : "text-neon-red" },
                          { label: "Profit Factor", value: selectedStrategy.profitFactor.toFixed(2), desc: selectedStrategy.profitFactor >= 1.5 ? "Strong" : "Moderate", color: selectedStrategy.profitFactor >= 1.5 ? "text-neon-green" : "text-yellow-400" },
                          { label: "Max Consecutive Loss", value: `${selectedStrategy.maxConsecutiveLoss}`, desc: "trades", color: "text-foreground" },
                          { label: "Avg Profit / Trade", value: `+$${selectedStrategy.avgProfit.toFixed(1)}`, desc: "", color: "text-neon-green" },
                          { label: "Avg Loss / Trade", value: `-$${Math.abs(selectedStrategy.avgLoss).toFixed(1)}`, desc: "", color: "text-neon-red" },
                          { label: "Profit/Loss Ratio", value: (selectedStrategy.avgProfit / Math.abs(selectedStrategy.avgLoss)).toFixed(2), desc: "", color: "text-foreground" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                            <span className="text-[11px] text-muted-foreground">{item.label}</span>
                            <div className="flex items-center gap-2">
                              {item.desc && <span className="text-[10px] text-muted-foreground">{item.desc}</span>}
                              <span className={`text-xs font-mono font-bold ${item.color}`}>{item.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Radar */}
                    <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20">
                      <h4 className="text-xs font-medium mb-2">Strategy Radar</h4>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={[
                            { metric: "Win Rate", value: selectedStrategy.winRate },
                            { metric: "Sharpe", value: Math.min(selectedStrategy.sharpeRatio * 30, 100) },
                            { metric: "Profit Factor", value: Math.min(selectedStrategy.profitFactor * 40, 100) },
                            { metric: "Consistency", value: 100 - Math.abs(selectedStrategy.maxDrawdown) * 5 },
                            { metric: "Frequency", value: Math.min(selectedStrategy.trades * 2, 100) },
                            { metric: "Risk Mgmt", value: selectedStrategy.riskLevel === "low" ? 90 : selectedStrategy.riskLevel === "medium" ? 60 : 30 },
                          ]}>
                            <PolarGrid stroke="var(--border)" />
                            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                            <Radar dataKey="value" stroke="var(--neon-cyan)" fill="var(--neon-cyan)" fillOpacity={0.2} strokeWidth={2} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        { label: "Created", value: selectedStrategy.createdAt, icon: Calendar },
                        { label: t("trading.totalTrades"), value: `${selectedStrategy.trades}`, icon: BarChart3 },
                        { label: "Amount/Trade", value: selectedStrategy.amount, icon: Target },
                        { label: "Signal Source", value: selectedStrategy.signalSource, icon: Users },
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
                )}

                {detailTab === "risk" && (
                  <div className="space-y-3">
                    {/* Risk Level */}
                    <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20">
                      <h4 className="text-xs font-medium mb-3 flex items-center gap-1.5"><Shield size={14} className="text-neon-purple" /> Risk Profile</h4>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-sm px-3 py-1 rounded-full border font-medium ${riskColor(selectedStrategy.riskLevel)}`}>
                          {selectedStrategy.riskLevel === "low" ? "Low Risk" : selectedStrategy.riskLevel === "medium" ? "Medium Risk" : "High Risk"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">Max Drawdown: <span className="font-mono text-neon-red">{selectedStrategy.maxDrawdown}%</span></span>
                      </div>
                      {/* Risk meter */}
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            selectedStrategy.riskLevel === "low" ? "bg-neon-green w-[25%]" :
                            selectedStrategy.riskLevel === "medium" ? "bg-yellow-400 w-[55%]" : "bg-neon-red w-[85%]"
                          }`}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                        <span>Conservative</span><span>Moderate</span><span>Aggressive</span>
                      </div>
                    </div>

                    {/* Risk Controls */}
                    <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20">
                      <h4 className="text-xs font-medium mb-3 flex items-center gap-1.5"><Settings size={14} /> Risk Controls</h4>
                      <div className="space-y-3">
                        {[
                          { label: "Stop Loss", value: `${selectedStrategy.stopLoss}%`, icon: TrendingDown, desc: "Per trade maximum loss", color: "text-neon-red" },
                          { label: "Take Profit", value: `${selectedStrategy.takeProfit}%`, icon: TrendingUp, desc: "Per trade target profit", color: "text-neon-green" },
                          { label: "Max Position", value: `$${selectedStrategy.maxPosition}`, icon: CircleDollarSign, desc: "Maximum position size", color: "text-foreground" },
                          { label: "Daily Loss Limit", value: `$${selectedStrategy.dailyLossLimit}`, icon: Shield, desc: "Auto-pause trigger", color: "text-yellow-400" },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl bg-background/50 border border-border/10">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center">
                                  <Icon size={14} className={item.color} />
                                </div>
                                <div>
                                  <p className="text-xs font-medium">{item.label}</p>
                                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                                </div>
                              </div>
                              <span className={`text-sm font-mono font-bold ${item.color}`}>{item.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Risk Warnings */}
                    <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/15">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={14} className="text-destructive" />
                        <span className="text-xs font-medium text-destructive">Risk Warnings</span>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                        <li>• Past performance does not guarantee future results</li>
                        <li>• Leverage amplifies both gains and losses</li>
                        <li>• Market conditions can change rapidly</li>
                        <li>• Only trade with funds you can afford to lose</li>
                      </ul>
                    </div>
                  </div>
                )}

                {detailTab === "trades" && (
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
                          {trade.side === "buy" ? <ArrowUpRight size={14} className="text-neon-green" /> : <ArrowDownRight size={14} className="text-destructive" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-medium">{trade.pair}</span>
                            <span className={`text-[10px] uppercase font-mono ${trade.side === "buy" ? "text-neon-green" : "text-destructive"}`}>{trade.side.toUpperCase()}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{trade.amount} @ {trade.price} · {trade.date}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-mono font-semibold ${trade.profit >= 0 ? "text-neon-green" : "text-destructive"}`}>
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
                  onClick={() => toast.info("Edit strategy coming soon")}
                  className="flex-1 h-11 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Settings size={16} /> Edit
                </button>
                <button
                  onClick={() => toggleStrategyStatus(selectedStrategy.id)}
                  className={`flex-1 h-11 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedStrategy.status === "running"
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                      : "bg-neon-green/10 text-neon-green hover:bg-neon-green/20 border border-neon-green/20"
                  }`}
                >
                  {selectedStrategy.status === "running" ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Resume</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Trader Detail Modal ═══ */}
      <AnimatePresence>
        {selectedTrader && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedTrader(null)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Trader Header */}
              <div className="px-5 py-4 border-b border-border/30 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary/60 flex items-center justify-center text-2xl relative">
                      {selectedTrader.avatar}
                      {selectedTrader.badge !== "none" && (
                        <span className="absolute -bottom-0.5 -right-0.5 text-sm">{badgeIcon(selectedTrader.badge)}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold font-display text-base">{selectedTrader.name}</h3>
                      <p className="text-[11px] text-muted-foreground">{selectedTrader.description}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTrader(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors">
                    <X size={18} className="text-muted-foreground" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "ROI", value: `+${selectedTrader.totalReturn}%`, color: "text-neon-green" },
                    { label: "Win Rate", value: `${selectedTrader.winRate}%`, color: "text-neon-cyan" },
                    { label: "Followers", value: selectedTrader.followers > 1000 ? `${(selectedTrader.followers / 1000).toFixed(1)}K` : `${selectedTrader.followers}`, color: "text-foreground" },
                    { label: "Sharpe", value: selectedTrader.sharpeRatio.toFixed(2), color: "text-neon-purple" },
                  ].map((m) => (
                    <div key={m.label} className="text-center p-2 rounded-xl bg-secondary/30">
                      <p className="text-[9px] text-muted-foreground">{m.label}</p>
                      <p className={`text-xs font-mono font-bold ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trader Content */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {/* Profit Chart */}
                <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20">
                  <h4 className="text-xs font-medium mb-2">8-Week Performance</h4>
                  <div className="h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedTrader.profitHistory}>
                        <defs>
                          <linearGradient id="traderDetailGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--neon-cyan)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--neon-cyan)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "11px", color: "var(--foreground)" }} />
                        <Area type="monotone" dataKey="profit" stroke="var(--neon-cyan)" strokeWidth={2} fill="url(#traderDetailGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  {[
                    { label: "30d Trades", value: `${selectedTrader.trades30d}` },
                    { label: "Max Drawdown", value: `${selectedTrader.maxDrawdown}%` },
                    { label: "Avg Hold Time", value: selectedTrader.avgHoldTime },
                    { label: "Top Pairs", value: selectedTrader.topPairs.join(", ") },
                    { label: "Risk Level", value: selectedTrader.riskLevel.charAt(0).toUpperCase() + selectedTrader.riskLevel.slice(1) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-xs font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow / Copy Button */}
              <div className="px-4 py-3 border-t border-border/30 flex gap-3 shrink-0">
                <button
                  onClick={() => toggleFollow(selectedTrader.id)}
                  className={`flex-1 h-11 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedTrader.isFollowing
                      ? "bg-secondary text-muted-foreground border border-border"
                      : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20"
                  }`}
                >
                  <Eye size={16} />
                  {selectedTrader.isFollowing ? "Unfollow" : "Follow"}
                </button>
                <button
                  onClick={() => toast.info("Copy trading setup coming soon")}
                  className="flex-1 h-11 rounded-xl bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={16} /> Copy Trade
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
