/*
 * Trading — 全功能跟单交易页面（v3.0）
 * 五大标签：我的策略 / 跟单市场 / 实时持仓 / PnL日历 / 交易记录
 * 新增：创建策略表单、跟单配置面板、PnL日历热力图、交易员对比、价格Ticker、平仓确认
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp, Plus, Play, Pause, Zap, ArrowUpRight, ArrowDownRight,
  Settings, AlertTriangle, X, Calendar, BarChart3,
  Target, Clock, Users, Star, Shield, ChevronDown, ChevronUp,
  Activity, Eye, Copy, Filter, RefreshCw, Award, Flame,
  CircleDollarSign, Percent, Timer, TrendingDown, Wallet,
  Bell, BellOff, Check, ChevronLeft, ChevronRight, Layers,
  Scale, Sliders, ArrowRight, Info, Lock, Unlock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/_core/hooks/useAuth";
import LoginPromptCard from "@/components/LoginPromptCard";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ReferenceLine
} from "recharts";

/* ─── Types ─── */
interface Strategy {
  id: string; name: string; signalSource: string; pair: string;
  amount: string; status: "running" | "paused";
  totalProfit: number; profitPercent: number; trades: number; winRate: number;
  maxDrawdown: number; createdAt: string; avgHoldTime: string;
  sharpeRatio: number; profitFactor: number; maxConsecutiveLoss: number;
  avgProfit: number; avgLoss: number; riskLevel: "low" | "medium" | "high";
  stopLoss: number; takeProfit: number; maxPosition: number; dailyLossLimit: number;
  notifications: { onTrade: boolean; onStopLoss: boolean; onTakeProfit: boolean; dailySummary: boolean };
  profitHistory: { date: string; profit: number; benchmark: number }[];
  recentTrades: { id: string; pair: string; side: "buy" | "sell"; amount: string; price: string; profit: number; time: string; date: string }[];
}

interface Trader {
  id: string; name: string; avatar: string; badge: "gold" | "silver" | "bronze" | "none";
  followers: number; totalReturn: number; winRate: number; trades30d: number;
  maxDrawdown: number; sharpeRatio: number; riskLevel: "low" | "medium" | "high";
  isFollowing: boolean; profitHistory: { date: string; profit: number }[];
  topPairs: string[]; avgHoldTime: string; description: string;
  weeklyReturns: number[]; consistency: number; avgTradeSize: string;
}

interface Position {
  id: string; pair: string; side: "long" | "short"; entryPrice: number;
  currentPrice: number; amount: number; leverage: number;
  unrealizedPnl: number; unrealizedPnlPercent: number;
  strategy: string; openTime: string;
  stopLossPrice: number | null; takeProfitPrice: number | null;
  liquidationPrice: number | null;
}

interface PnlDay {
  date: string; day: number; pnl: number; trades: number;
}

/* ─── Demo Data (no backend yet for traders/strategies) ─── */
// Default ticker structure (prices loaded from CoinGecko API)
const defaultTicker = [
  { symbol: "BTC", price: 0, change: 0 },
  { symbol: "ETH", price: 0, change: 0 },
  { symbol: "SOL", price: 0, change: 0 },
  { symbol: "ARB", price: 0, change: 0 },
  { symbol: "LINK", price: 0, change: 0 },
  { symbol: "AVAX", price: 0, change: 0 },
];



const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type MainTab = "strategies" | "market" | "positions" | "calendar" | "logs" | "alerts";
type DetailTab = "chart" | "trades" | "risk" | "stats";
type MarketSort = "return" | "winRate" | "followers" | "sharpe";
type ModalType = "none" | "strategy" | "trader" | "createStrategy" | "copyConfig" | "closePosition" | "compare" | "notifications";

export default function Trading() {
  // ─── Real-time prices from CoinGecko ──────────────────────────────────────
  const { data: livePrices } = trpc.trading.getPrices.useQuery(
    { symbols: ["BTC", "ETH", "SOL", "ARB", "LINK", "AVAX"] },
    {
      refetchInterval: 30_000,
      staleTime: 25_000,
      retry: 1,           // Only retry once to avoid long waits on rate limit
      retryDelay: 2000,   // 2s delay between retries
    }
  );

  // Use live prices, fallback to zeros while loading
  const displayTicker = useMemo(() => {
    if (!livePrices || livePrices.every(p => p.price === 0)) return defaultTicker;
    return livePrices.map(p => ({
      symbol: p.symbol,
      price: p.price,
      change: p.change,
    }));
  }, [livePrices]);

  const [activeTab, setActiveTab] = useState<MainTab>("strategies");
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  // ─── Auth state ───────────────────────────────────────────────────────────────────
  const { isAuthenticated } = useAuth();

  // ─── Backend strategies ──────────────────────────────────────────
  const { data: backendStrategies, refetch: refetchStrategies } = trpc.copyTrading.myStrategies.useQuery(
    undefined,
    { enabled: isAuthenticated, staleTime: 30_000 }
  );
  const upsertStrategyMutation = trpc.copyTrading.upsertStrategy.useMutation({
    onSuccess: () => { refetchStrategies(); toast.success("Strategy saved!"); },
    onError: (err) => toast.error("Failed to save: " + err.message),
  });
  const toggleStrategyMutation = trpc.copyTrading.toggleStrategy.useMutation({
    onSuccess: (data) => {
      refetchStrategies();
      toast.success(data.isActive ? "Strategy resumed" : "Strategy paused");
    },
    onError: (err) => toast.error("Failed to toggle: " + err.message),
  });
  const deleteStrategyMutation = trpc.copyTrading.deleteStrategy.useMutation({
    onSuccess: () => { refetchStrategies(); toast.success("Strategy deleted"); },
    onError: (err) => toast.error("Failed to delete: " + err.message),
  });
  // Sync backend strategies to local state
  useEffect(() => {
    if (backendStrategies && backendStrategies.length > 0) {
      const mapped: Strategy[] = backendStrategies.map(s => ({
        id: String(s.id),
        name: s.name,
        signalSource: s.description ?? "",
        pair: s.pair ?? "BTC/USDT",
        amount: s.maxPosition ?? "100",
        status: s.isActive ? "running" as const : "paused" as const,
        totalProfit: parseFloat(s.totalReturn ?? "0"),
        profitPercent: parseFloat(s.totalReturn ?? "0"),
        trades: s.totalTrades ?? 0,
        winRate: s.winRate ?? 0,
        maxDrawdown: parseFloat(s.maxDrawdown ?? "0"),
        createdAt: new Date(s.createdAt).toLocaleDateString(),
        avgHoldTime: "N/A", sharpeRatio: 0, profitFactor: 0,
        maxConsecutiveLoss: 0, avgProfit: 0, avgLoss: 0,
        riskLevel: (s.riskLevel ?? "low") as "low" | "medium" | "high",
        stopLoss: parseFloat(s.stopLoss ?? "5"),
        takeProfit: parseFloat(s.takeProfit ?? "15"),
        maxPosition: parseFloat(s.maxPosition ?? "500"),
        dailyLossLimit: 50,
        notifications: { onTrade: true, onStopLoss: true, onTakeProfit: true, dailySummary: false },
        profitHistory: [], recentTrades: [],
      }));
      setStrategies(mapped);
    }
  }, [backendStrategies]);

  const [detailTab, setDetailTab] = useState<DetailTab>("chart");

  // ─── Real K-line chart data for selected strategy ─────────────────────────
  const chartSymbol = selectedStrategy?.pair?.split("/")[0] ?? "BTC";
  const { data: chartData } = trpc.trading.getChart.useQuery(
    { symbol: chartSymbol, days: 30 },
    { enabled: !!selectedStrategy && detailTab === "chart", staleTime: 5 * 60_000 }
  );

  // Convert CoinGecko chart data to profitHistory format for recharts
  const liveChartData = useMemo(() => {
    if (!chartData || chartData.prices.length === 0) return null;
    const prices = chartData.prices;
    const basePrice = prices[0].price;
    return prices.map((p, i) => ({
      date: new Date(p.time).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      profit: parseFloat(((p.price - basePrice) / basePrice * 100).toFixed(2)),
      benchmark: parseFloat(((i / prices.length) * 5).toFixed(2)),
    }));
  }, [chartData]);
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  // Load real traders from backend, fallback to demo data
  const { data: backendTraders } = trpc.copyTrading.listTraders.useQuery(undefined, { staleTime: 30_000 });
  const { data: followedTraderIds } = trpc.copyTrading.myFollowedTraders.useQuery(undefined, { enabled: isAuthenticated, staleTime: 30_000 });
  const followedSet = useMemo(() => new Set(followedTraderIds ?? []), [followedTraderIds]);
  const trpcUtils = trpc.useUtils();

  const realTraders: Trader[] = useMemo(() => {
    if (!backendTraders || backendTraders.length === 0) return [];
    return backendTraders.map(t => ({
      id: String(t.id),
      name: t.displayName,
      avatar: t.avatar ?? "🤖",
      badge: t.badge as Trader["badge"],
      followers: t.followerCount ?? 0,
      totalReturn: parseFloat(t.totalReturn ?? "0"),
      winRate: t.winRate ?? 0,
      trades30d: t.trades30d ?? 0,
      maxDrawdown: parseFloat(t.maxDrawdown ?? "0"),
      sharpeRatio: 0,
      riskLevel: t.riskLevel as Trader["riskLevel"],
      isFollowing: followedSet.has(t.id),
      profitHistory: [],
      topPairs: t.topPairs ?? [],
      avgHoldTime: "N/A",
      description: t.description ?? "",
      weeklyReturns: [],
      consistency: 0,
      avgTradeSize: "N/A",
    }));
  }, [backendTraders, followedSet]);

  const [traders, setTraders] = useState<Trader[]>([]);
  // Sync real traders when loaded
  useEffect(() => {
    if (realTraders.length > 0) setTraders(realTraders);
  }, [realTraders]);
  const [marketSort, setMarketSort] = useState<MarketSort>("return");
  const [showFilters, setShowFilters] = useState(false);
  const [riskFilter, setRiskFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [modalType, setModalType] = useState<ModalType>("none");
  const [copyTrader, setCopyTrader] = useState<Trader | null>(null);
  const [closePosition, setClosePosition] = useState<Position | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth()); // 0-indexed
  // tickerOffset removed — replaced with pure CSS animation (no JS re-renders)
  const { t } = useI18n();

  // Create strategy form state
  const [newStrategy, setNewStrategy] = useState({
    name: "", pair: "BTC/USDT", amount: "100", signalSource: "",
    stopLoss: "5", takeProfit: "15", maxPosition: "500", dailyLossLimit: "50",
    leverage: "3", riskLevel: "low" as "low" | "medium" | "high",
  });

  // Copy trade config state
  const [copyConfig, setCopyConfig] = useState({
    amount: "100", mode: "fixed" as "fixed" | "proportional",
    proportion: "10", maxPerTrade: "200", stopLoss: "5",
    takeProfit: "15", maxDailyLoss: "50", slippage: "0.5",
  });

  // ─── Positions (real backend) ──────────────────────────────────────────
  const { data: positionsData, refetch: refetchPositions } = trpc.trading.listPositions.useQuery(
    { status: "open" },
    { staleTime: 30_000, refetchInterval: 60_000 }
  );
  const realPositions = positionsData ?? [];
  const closePositionMutation = trpc.trading.closePosition.useMutation({
    onSuccess: () => { refetchPositions(); toast.success("Position closed"); },
    onError: (err) => toast.error("Failed to close: " + err.message),
  });

  // ─── Open Position Form ──────────────────────────────────────────────
  const [openForm, setOpenForm] = useState({
    pair: "BTC/USDT",
    side: "long" as "long" | "short",
    amount: "100",
    leverage: 5,
    stopLoss: "",
    takeProfit: "",
  });
  const openPositionMutation = trpc.trading.openPosition.useMutation({
    onSuccess: () => {
      refetchPositions();
      toast.success("Position opened!");
      setOpenForm(f => ({ ...f, amount: "100", stopLoss: "", takeProfit: "" }));
    },
    onError: (err) => toast.error("Failed to open: " + err.message),
  });
  const handleOpenPosition = () => {
    const sym = openForm.pair.split("/")[0];
    const currentPrice = displayTicker.find(t => t.symbol === sym)?.price ?? 0;
    if (!currentPrice) { toast.error("Price not available"); return; }
    const liqOffset = openForm.side === "long" ? (1 - 1 / openForm.leverage) : (1 + 1 / openForm.leverage);
    const liquidationPrice = (currentPrice * liqOffset).toFixed(2);
    openPositionMutation.mutate({
      pair: openForm.pair,
      side: openForm.side,
      entryPrice: currentPrice.toString(),
      amount: openForm.amount,
      leverage: openForm.leverage,
      stopLossPrice: openForm.stopLoss || undefined,
      takeProfitPrice: openForm.takeProfit || undefined,
      liquidationPrice,
      strategyName: "Manual",
    });
  };

  // ─── Price Alerts (real backend) ──────────────────────────────────────────
  const { data: alertsData, refetch: refetchAlerts } = trpc.trading.listAlerts.useQuery(
    undefined,
    { staleTime: 30_000 }
  );
  const realAlerts = alertsData ?? [];

  const createAlertMutation = trpc.trading.createAlert.useMutation({
    onSuccess: () => { refetchAlerts(); toast.success("Price alert created!"); },
    onError: () => toast.error("Failed to create alert"),
  });
  const deleteAlertMutation = trpc.trading.deleteAlert.useMutation({
    onSuccess: () => { refetchAlerts(); toast.success("Alert deleted"); },
    onError: () => toast.error("Failed to delete alert"),
  });

  // New alert form state
  const [newAlert, setNewAlert] = useState({ symbol: "BNB", targetPrice: "", direction: "above" as "above" | "below" });

  // Ticker animation is now handled by pure CSS @keyframes ticker-scroll

  const { data: pnlCalendar = [] } = trpc.trading.getPnlCalendar.useQuery(
    { year: calendarYear, month: calendarMonth },
    { staleTime: 60_000 }
  );

  const totalProfit = strategies.reduce((s, st) => s + st.totalProfit, 0);
  const totalTrades = strategies.reduce((s, st) => s + st.trades, 0);
  const avgWinRate = strategies.length > 0 ? Math.round(strategies.reduce((s, st) => s + st.winRate, 0) / strategies.length) : 0;
  // Use real positions from backend
  const displayPositions: Position[] = realPositions.map(p => ({
    id: String(p.id),
    pair: p.pair,
    side: p.side as "long" | "short",
    entryPrice: parseFloat(p.entryPrice),
    currentPrice: parseFloat(p.entryPrice),
    amount: parseFloat(p.amount),
    leverage: p.leverage,
    unrealizedPnl: 0,
    unrealizedPnlPercent: 0,
    strategy: p.strategyName ?? "",
    openTime: new Date(p.createdAt).toLocaleString(),
    stopLossPrice: p.stopLossPrice ? parseFloat(p.stopLossPrice) : null,
    takeProfitPrice: p.takeProfitPrice ? parseFloat(p.takeProfitPrice) : null,
    liquidationPrice: p.liquidationPrice ? parseFloat(p.liquidationPrice) : null,
  }));
  const totalUnrealizedPnl = displayPositions.reduce((s, p) => s + p.unrealizedPnl, 0);

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
    const numId = parseInt(id, 10);
    if (!isNaN(numId)) {
      toggleStrategyMutation.mutate({ id: numId });
    }
    // Optimistic update
    setStrategies(prev => prev.map(s => {
      if (s.id !== id) return s;
      const ns = s.status === "running" ? "paused" as const : "running" as const;
      return { ...s, status: ns };
    }));
    setSelectedStrategy(prev => {
      if (!prev || prev.id !== id) return prev;
      return { ...prev, status: prev.status === "running" ? "paused" as const : "running" as const };
    });
  };

  const toggleFollowMutation = trpc.copyTrading.toggleFollow.useMutation({
    onSuccess: () => {
      trpcUtils.copyTrading.myFollowedTraders.invalidate();
      trpcUtils.copyTrading.listTraders.invalidate();
    },
  });
  const toggleFollow = (traderId: string) => {
    const numId = parseInt(traderId, 10);
    if (!isNaN(numId)) {
      toggleFollowMutation.mutate({ traderId: numId });
    }
    // Optimistic update
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

  const toggleCompare = useCallback((traderId: string) => {
    setCompareList(prev =>
      prev.includes(traderId) ? prev.filter(id => id !== traderId) : prev.length < 3 ? [...prev, traderId] : prev
    );
  }, []);

  const riskColor = (level: string) => {
    switch (level) {
      case "low": return "text-neon-green bg-neon-green/10 border-neon-green/20";
      case "medium": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "high": return "text-neon-red bg-neon-red/10 border-neon-red/20";
      default: return "";
    }
  };

  const badgeIcon = (badge: string) => {
    switch (badge) { case "gold": return "🥇"; case "silver": return "🥈"; case "bronze": return "🥉"; default: return ""; }
  };

  const pnlColor = (pnl: number) => {
    if (pnl === 0) return "bg-secondary/30";
    if (pnl > 20) return "bg-neon-green/40";
    if (pnl > 10) return "bg-neon-green/25";
    if (pnl > 0) return "bg-neon-green/12";
    if (pnl > -10) return "bg-neon-red/12";
    return "bg-neon-red/25";
  };

  const handleCreateStrategy = () => {
    if (!newStrategy.name) {
      toast.error("Please fill in strategy name");
      return;
    }
    upsertStrategyMutation.mutate({
      name: newStrategy.name,
      description: newStrategy.signalSource,
      pair: newStrategy.pair,
      riskLevel: newStrategy.riskLevel,
      stopLoss: newStrategy.stopLoss,
      takeProfit: newStrategy.takeProfit,
      maxPosition: newStrategy.maxPosition,
    }, {
      onSuccess: () => {
        setModalType("none");
        setNewStrategy({ name: "", pair: "BTC/USDT", amount: "100", signalSource: "", stopLoss: "5", takeProfit: "15", maxPosition: "500", dailyLossLimit: "50", leverage: "3", riskLevel: "low" });
      },
    });
  };

  const handleDeleteStrategy = (id: string) => {
    const numId = parseInt(id, 10);
    if (!isNaN(numId)) {
      deleteStrategyMutation.mutate({ id: numId });
      if (selectedStrategy?.id === id) setSelectedStrategy(null);
    } else {
      setStrategies(prev => prev.filter(s => s.id !== id));
      if (selectedStrategy?.id === id) setSelectedStrategy(null);
    }
  };

  const handleCopyTrade = () => {
    if (copyTrader) {
      toast.success(`Now copy trading ${copyTrader.name}! Amount: $${copyConfig.amount}/trade`);
      setModalType("none");
      setCopyTrader(null);
    }
  };

  const handleClosePosition = () => {
    if (closePosition) {
      const posId = parseInt(closePosition.id);
      if (!isNaN(posId)) {
        // Real position from DB
        closePositionMutation.mutate({ id: posId }, {
          onSuccess: () => {
            toast.success(`Position ${closePosition.pair} ${closePosition.side.toUpperCase()} closed`);
            setModalType("none");
            setClosePosition(null);
          },
        });
      } else {
        // Mock position fallback
        toast.success(`Position ${closePosition.pair} ${closePosition.side.toUpperCase()} closed at market price`);
        setModalType("none");
        setClosePosition(null);
      }
    }
  };

  const tabItems: { key: MainTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "strategies", label: t("trading.myStrategies"), icon: <Zap size={13} /> },
    { key: "market", label: t("trading.market"), icon: <Users size={13} /> },
    { key: "positions", label: t("trading.positions"), icon: <Activity size={13} /> },
    { key: "calendar", label: t("trading.pnlCal"), icon: <Calendar size={13} /> },
    { key: "logs", label: t("trading.tradeHistory"), icon: <Clock size={13} /> },
    { key: "alerts", label: t("trading.alerts"), icon: <Bell size={13} />, badge: realAlerts.length },
  ];

  const compareTraders = useMemo(() => traders.filter(tr => compareList.includes(tr.id)), [traders, compareList]);

  // Show skeleton while initial data loads
  // Timeout reduced to 600ms: show content ASAP, don't block on slow API
  const [skeletonTimeout, setSkeletonTimeout] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSkeletonTimeout(true), 600);
    return () => clearTimeout(timer);
  }, []);
  // Only show skeleton if BOTH traders AND strategies are still undefined (not just empty)
  // backendTraders === undefined means the query hasn't resolved yet
  const isInitialLoading = !skeletonTimeout && backendTraders === undefined && strategies.length === 0;

  if (isInitialLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Skeleton ticker */}
        <div className="bg-background border-b border-border/20 h-7 flex items-center px-4 gap-4">
          {[80, 100, 90, 110, 85].map((w, i) => (
            <div key={i} className="h-3 rounded-full bg-secondary/60 animate-pulse" style={{ width: w }} />
          ))}
        </div>
        {/* Skeleton header */}
        <div className="glass border-b border-border/30 px-4 h-12 flex items-center justify-between">
          <div className="h-4 w-24 rounded-full bg-secondary/60 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-lg bg-secondary/60 animate-pulse" />
            <div className="h-8 w-8 rounded-lg bg-secondary/60 animate-pulse" />
          </div>
        </div>
        {/* Skeleton overview cards */}
        <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
          {[0,1,2,3].map(i => (
            <div key={i} className="p-2 rounded-xl bg-secondary/20 border border-border/20 animate-pulse">
              <div className="h-2 w-12 rounded-full bg-secondary/60 mb-2.5" />
              <div className="h-4 w-10 rounded-full bg-secondary/60" />
            </div>
          ))}
        </div>
        {/* Skeleton tabs */}
        <div className="flex gap-2 px-4 mt-3">
          {[60, 50, 70, 55, 80, 45].map((w, i) => (
            <div key={i} className="h-7 rounded-full bg-secondary/40 animate-pulse" style={{ width: w }} />
          ))}
        </div>
        {/* Skeleton cards */}
        <div className="px-4 mt-4 space-y-3">
          {[0,1,2].map(i => (
            <div key={i} className="h-20 rounded-xl bg-secondary/20 border border-border/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Public data (traders, strategies, prices) is always visible; personal data silently hidden when not logged in */}
      {/* Price Ticker */}
      <div className="bg-background border-b border-border/20 overflow-hidden h-8 flex items-center" style={{ isolation: 'isolate', contain: 'layout style' }}>
        <div
          className="flex items-center gap-6 whitespace-nowrap"
          style={{
            animation: `ticker-scroll ${displayTicker.length * 4}s linear infinite`,
            willChange: 'transform',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        >
          {[...displayTicker, ...displayTicker].map((coin, i) => (
            <span key={`${coin.symbol}-${i}`} className="flex items-center gap-2.5 text-[13px]">
              <span className="font-mono font-medium text-foreground">{coin.symbol}</span>
              <span className="font-mono text-muted-foreground">${coin.price.toLocaleString()}</span>
              <span className={`font-mono ${coin.change >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                {coin.change >= 0 ? "+" : ""}{coin.change}%
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 border-b border-border/30">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-neon-green" />
            <h1 className="text-base font-semibold font-display">{t("trading.title")}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            {compareList.length >= 2 && (
              <button
                onClick={() => setModalType("compare")}
                className="h-8 px-2.5 flex items-center gap-2 rounded-lg bg-neon-purple/10 text-neon-purple text-[13px] font-medium border border-neon-purple/20"
              >
                <Scale size={13} /> {t("trading.compareBtn")} ({compareList.length})
              </button>
            )}
            <button
              onClick={() => toast.success(t("trading.refreshed") || "Data refreshed ✓")}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <RefreshCw size={14} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => setModalType("createStrategy")}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-neon-green/10 hover:bg-neon-green/20 transition-colors border border-neon-green/20"
            >
              <Plus size={16} className="text-neon-green" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Overview Cards */}
        <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
          {[
            { label: t("trading.totalProfit"), value: `+$${totalProfit.toFixed(0)}`, color: "text-neon-green", bg: "from-neon-green/8 to-transparent border-neon-green/15" },
            { label: t("trading.avgWinRate"), value: `${avgWinRate}%`, color: "text-neon-cyan", bg: "from-neon-cyan/8 to-transparent border-neon-cyan/15" },
            { label: t("trading.openPnl"), value: `${totalUnrealizedPnl >= 0 ? "+" : ""}$${totalUnrealizedPnl.toFixed(2)}`, color: totalUnrealizedPnl >= 0 ? "text-neon-green" : "text-neon-red", bg: "from-neon-purple/8 to-transparent border-neon-purple/15" },
            { label: t("trading.active"), value: `${strategies.filter(s => s.status === "running").length}/${strategies.length}`, color: "text-foreground", bg: "from-secondary/40 to-transparent border-border/20" },
          ].map((card) => (
            <div key={card.label} className={`p-3 rounded-xl bg-gradient-to-br ${card.bg} border`}>
              <p className="text-sm text-muted-foreground mb-0.5 truncate">{card.label}</p>
              <p className={`text-base font-bold font-mono ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Tab Switch */}
        <div className="flex mx-4 mt-3 p-0.5 rounded-xl bg-secondary/40 overflow-x-auto no-scrollbar">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 flex-1 py-2.5 px-3 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="ml-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-neon-cyan text-[13px] font-bold text-background flex items-center justify-center">
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-4">
          <AnimatePresence mode="wait">
            {/* ╔═══ TAB: My Strategies ═══╗ */}
            {activeTab === "strategies" && (
              <motion.div key="strategies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
                {strategies.map((strategy, index) => (
                  <motion.div
                    key={strategy.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.15 }}
                    onClick={() => { setSelectedStrategy(strategy); setDetailTab("chart"); setModalType("strategy"); }}
                    className="p-4 rounded-2xl bg-card/50 border border-border/30 cursor-pointer hover:border-neon-green/30 active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-semibold font-display">{strategy.name}</span>
                        <span className={`text-sm px-2.5 py-1 rounded-full font-mono ${
                          strategy.status === "running" ? "bg-neon-green/10 text-neon-green" : "bg-muted text-muted-foreground"
                        }`}>
                          {strategy.status === "running" ? t("trading.running") : t("trading.paused")}
                        </span>
                        <span className={`text-sm px-2.5 py-1 rounded-full border ${riskColor(strategy.riskLevel)}`}>
                          {strategy.riskLevel === "low" ? t("trading.lowRiskLabel") : strategy.riskLevel === "medium" ? t("trading.mediumRiskLabel") : t("trading.highRiskLabel")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedStrategy(strategy); setModalType("notifications"); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
                        >
                          <Bell size={12} className={strategy.notifications.onTrade ? "text-neon-cyan" : "text-muted-foreground"} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStrategyStatus(strategy.id); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
                        >
                          {strategy.status === "running" ? <Pause size={12} className="text-muted-foreground" /> : <Play size={12} className="text-neon-green" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete strategy "${strategy.name}"?`)) handleDeleteStrategy(strategy.id); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neon-red/20 transition-colors"
                          title="Delete strategy"
                        >
                          <X size={12} className="text-neon-red/60 hover:text-neon-red" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-muted-foreground font-mono">{strategy.pair}</span>
                      <span className="text-sm text-muted-foreground">via {strategy.signalSource}</span>
                      <span className="text-sm text-muted-foreground">{strategy.amount}</span>
                    </div>

                    {/* Mini profit chart */}
                    <div className="h-[48px] mb-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={strategy.profitHistory}>
                          <defs>
                            <linearGradient id={`strat-${strategy.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={strategy.totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)"} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={strategy.totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)"} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="profit" stroke={strategy.totalProfit >= 0 ? "var(--neon-green)" : "var(--neon-red)"} strokeWidth={1.5} fill={`url(#strat-${strategy.id})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: t("trading.profit"), value: `+$${strategy.totalProfit.toFixed(0)}`, color: "text-neon-green" },
                        { label: t("trading.winRate"), value: `${strategy.winRate}%`, color: "text-foreground" },
                        { label: t("trading.trades"), value: `${strategy.trades}`, color: "text-foreground" },
                        { label: t("trading.sortSharpe"), value: strategy.sharpeRatio.toFixed(2), color: strategy.sharpeRatio >= 2 ? "text-neon-cyan" : "text-foreground" },
                      ].map((m) => (
                        <div key={m.label} className="px-3 py-3 rounded-lg bg-secondary/30 flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">{m.label}</p>
                          <p className={`text-sm font-mono font-semibold ${m.color}`}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}

                {/* Quick Create CTA */}
                <button
                  onClick={() => setModalType("createStrategy")}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-border/40 hover:border-neon-green/30 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-neon-green"
                >
                  <Plus size={18} />
                  <span className="text-sm font-medium">{t("trading.createNewStrategy")}</span>
                </button>
              </motion.div>
            )}

            {/* ═══ TAB: Market ═══ */}
            {activeTab === "market" && (
              <motion.div key="market" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
                {/* Sort & Filter Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
                    {(["return", "winRate", "followers", "sharpe"] as MarketSort[]).map((sort) => (
                      <button
                        key={sort}
                        onClick={() => setMarketSort(sort)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                          marketSort === sort ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20" : "bg-secondary/30 text-muted-foreground"
                        }`}
                      >
                        {sort === "return" ? t("trading.sortROI") : sort === "winRate" ? t("trading.sortWinRate") : sort === "followers" ? t("trading.sortFollowers") : t("trading.sortSharpe")}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowFilters(!showFilters)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary/40">
                    <Filter size={14} className={showFilters ? "text-neon-cyan" : "text-muted-foreground"} />
                  </button>
                </div>

                {showFilters && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="flex gap-2.5">
                    {(["all", "low", "medium", "high"] as const).map((risk) => (
                      <button
                        key={risk}
                        onClick={() => setRiskFilter(risk)}
                        className={`px-2.5 py-1 rounded-lg text-sm font-medium transition-colors ${
                          riskFilter === risk ? "bg-neon-purple/10 text-neon-purple border border-neon-purple/20" : "bg-secondary/30 text-muted-foreground"
                        }`}
                      >
                        {risk === "all" ? t("trading.allRisk") : risk === "low" ? t("trading.lowRisk") : risk === "medium" ? t("trading.mediumRisk") : t("trading.highRisk")}
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* Compare hint */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
                  <Scale size={12} />
                  <span>{t("trading.compareHint")}</span>
                </div>

                {/* Top 3 Podium */}
                <div className="flex items-end gap-2 justify-center py-2">
                  {[sortedTraders[1], sortedTraders[0], sortedTraders[2]].filter(Boolean).map((trader, i) => {
                    const heights = ["h-16", "h-20", "h-12"];
                    const positions = ["#2", "#1", "#3"];
                    return (
                      <div key={trader.id} className="flex flex-col items-center gap-2 flex-1">
                        <span className="text-lg">{trader.avatar}</span>
                        <span className="text-sm font-medium truncate max-w-full">{trader.name}</span>
                        <span className="text-sm font-mono text-neon-green">+{trader.totalReturn}%</span>
                        <div className={`w-full ${heights[i]} rounded-t-lg bg-gradient-to-t ${
                          i === 1 ? "from-neon-green/20 to-neon-green/5" : "from-secondary/40 to-secondary/10"
                        } flex items-end justify-center pb-1`}>
                          <span className="text-sm font-bold text-muted-foreground">{positions[i]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Trader Cards */}
                {sortedTraders.map((trader, index) => (
                  <motion.div
                    key={trader.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025, duration: 0.15 }}
                    className="p-4 rounded-2xl bg-card/50 border border-border/30 hover:border-neon-cyan/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2" onClick={() => { setSelectedTrader(trader); setModalType("trader"); }}>
                        {/* Compare checkbox */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleCompare(trader.id); }}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            compareList.includes(trader.id) ? "bg-neon-purple border-neon-purple" : "border-border/40 hover:border-neon-purple/40"
                          }`}
                        >
                          {compareList.includes(trader.id) && <Check size={12} className="text-white" />}
                        </button>
                        <div className="w-11 h-11 rounded-full bg-secondary/60 flex items-center justify-center text-xl relative cursor-pointer">
                          {trader.avatar}
                          {trader.badge !== "none" && <span className="absolute -bottom-0.5 -right-0.5 text-sm">{badgeIcon(trader.badge)}</span>}
                        </div>
                        <div className="cursor-pointer">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-semibold">{trader.name}</span>
                            <span className={`text-sm px-2.5 py-1 rounded-full border ${riskColor(trader.riskLevel)}`}>
                              {trader.riskLevel}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate max-w-[180px]">{trader.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => toggleFollow(trader.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            trader.isFollowing ? "bg-secondary text-muted-foreground" : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                          }`}
                        >
                          {trader.isFollowing ? t("trading.following") : t("trading.follow")}
                        </button>
                        <button
                          onClick={() => { setCopyTrader(trader); setModalType("copyConfig"); }}
                          className="px-3 py-2 rounded-lg text-sm font-medium bg-neon-green/10 text-neon-green border border-neon-green/20"
                        >
                          {t("trading.copy")}
                        </button>
                      </div>
                    </div>

                    {/* Mini chart */}
                    <div className="h-[48px] mb-3">
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

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: t("trading.sortROI"), value: `+${trader.totalReturn}%`, color: "text-neon-green" },
                        { label: t("trading.sortWinRate"), value: `${trader.winRate}%`, color: "text-foreground" },
                        { label: t("trading.sortFollowers"), value: trader.followers > 1000 ? `${(trader.followers / 1000).toFixed(1)}K` : `${trader.followers}`, color: "text-foreground" },
                        { label: t("trading.sortSharpe"), value: trader.sharpeRatio.toFixed(2), color: trader.sharpeRatio >= 2 ? "text-neon-cyan" : "text-foreground" },
                      ].map((m) => (
                        <div key={m.label} className="px-3 py-3 rounded-lg bg-secondary/30 flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">{m.label}</p>
                          <p className={`text-sm font-mono font-semibold ${m.color}`}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* ═══ TAB: Open Positions ═══ */}
            {activeTab === "positions" && (
              <motion.div key="positions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
                {/* Position Summary */}
                <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium flex items-center gap-2.5"><Activity size={14} className="text-neon-cyan" /> {t("trading.livePositions")}</span>
                    <span className="text-sm px-2.5 py-1 rounded-full bg-neon-green/10 text-neon-green font-mono">{displayPositions.length} {t("trading.openLabel")}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: t("trading.unrealizedPnl"), value: `${totalUnrealizedPnl >= 0 ? "+" : ""}$${totalUnrealizedPnl.toFixed(2)}`, color: totalUnrealizedPnl >= 0 ? "text-neon-green" : "text-neon-red" },
                      { label: t("trading.long"), value: `${displayPositions.filter(p => p.side === "long").length}`, color: "text-neon-green" },
                      { label: t("trading.short"), value: `${displayPositions.filter(p => p.side === "short").length}`, color: "text-neon-red" },
                    ].map((item) => (
                      <div key={item.label} className="text-center py-2">
                        <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                        <p className={`text-base font-mono font-bold ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Position Cards */}
                {displayPositions.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground text-sm">{t("trading.noOpenPositions")}</div>
                )}
                {displayPositions.map((pos, index) => (
                  <motion.div
                    key={pos.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025, duration: 0.15 }}
                    className="p-3 rounded-2xl bg-card/50 border border-border/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm px-2 py-1 rounded-full font-mono font-bold ${
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
                        <span className={`text-sm font-mono ${pos.unrealizedPnlPercent >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                          ({pos.unrealizedPnlPercent >= 0 ? "+" : ""}{pos.unrealizedPnlPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("trading.entry")}</span>
                        <span className="font-mono">${pos.entryPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("trading.current")}</span>
                        <span className="font-mono">${pos.currentPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("trading.size")}</span>
                        <span className="font-mono">{pos.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("trading.openTime")}</span>
                        <span className="font-mono">{pos.openTime}</span>
                      </div>
                    </div>

                    {/* SL/TP/Liq Info */}
                    <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/20">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t("trading.stopLossLabel")}</p>
                        <p className="text-sm font-mono text-neon-red">{pos.stopLossPrice ? `$${pos.stopLossPrice.toLocaleString()}` : "—"}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t("trading.takeProfitLabel")}</p>
                        <p className="text-sm font-mono text-neon-green">{pos.takeProfitPrice ? `$${pos.takeProfitPrice.toLocaleString()}` : "—"}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t("trading.liquidation")}</p>
                        <p className="text-sm font-mono text-yellow-400">{pos.liquidationPrice ? `$${pos.liquidationPrice.toLocaleString()}` : "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
                      <span className="text-sm text-muted-foreground flex items-center gap-2"><Zap size={12} />{pos.strategy}</span>
                      <button
                        onClick={() => { setClosePosition(pos); setModalType("closePosition"); }}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
                      >
                        {t("trading.closeBtn")}
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* ─── Open Position Form ─── */}
                <div className="p-4 rounded-2xl bg-card/50 border border-neon-cyan/20">
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2.5">
                    <Plus size={14} className="text-neon-cyan" /> {t("trading.openNewPosition")}
                  </h4>
                  {/* Side Toggle */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={() => setOpenForm(f => ({ ...f, side: "long" }))}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                        openForm.side === "long"
                          ? "bg-neon-green/20 text-neon-green border border-neon-green/30"
                          : "bg-secondary/30 text-muted-foreground border border-border/20"
                      }`}
                    >
                      ▲ {t("trading.long")}
                    </button>
                    <button
                      onClick={() => setOpenForm(f => ({ ...f, side: "short" }))}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                        openForm.side === "short"
                          ? "bg-neon-red/20 text-neon-red border border-neon-red/30"
                          : "bg-secondary/30 text-muted-foreground border border-border/20"
                      }`}
                    >
                      ▼ {t("trading.short")}
                    </button>
                  </div>
                  {/* Pair & Amount */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">{t("trading.pair")}</label>
                      <select
                        value={openForm.pair}
                        onChange={(e) => setOpenForm(f => ({ ...f, pair: e.target.value }))}
                        className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 text-sm px-2 font-mono"
                      >
                        {["BTC/USDT", "ETH/USDT", "SOL/USDT", "ARB/USDT", "LINK/USDT", "AVAX/USDT"].map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">{t("trading.amountUSDT")}</label>
                      <input
                        type="number"
                        value={openForm.amount}
                        onChange={(e) => setOpenForm(f => ({ ...f, amount: e.target.value }))}
                        className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 text-sm px-2 font-mono"
                        placeholder="100"
                      />
                    </div>
                  </div>
                  {/* Leverage */}
                  <div className="mb-2">
                    <label className="text-sm text-muted-foreground mb-2 block">{t("trading.leverage")}: {openForm.leverage}x</label>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={openForm.leverage}
                      onChange={(e) => setOpenForm(f => ({ ...f, leverage: parseInt(e.target.value) }))}
                      className="w-full h-1.5 accent-neon-cyan"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground mt-0.5">
                      <span>1x</span><span>10x</span><span>25x</span><span>50x</span>
                    </div>
                  </div>
                  {/* SL / TP */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">{t("trading.stopLossLabel")}</label>
                      <input
                        type="number"
                        value={openForm.stopLoss}
                        onChange={(e) => setOpenForm(f => ({ ...f, stopLoss: e.target.value }))}
                        className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 text-sm px-2 font-mono"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">{t("trading.takeProfitLabel")}</label>
                      <input
                        type="number"
                        value={openForm.takeProfit}
                        onChange={(e) => setOpenForm(f => ({ ...f, takeProfit: e.target.value }))}
                        className="w-full h-8 rounded-lg bg-secondary/40 border border-border/30 text-sm px-2 font-mono"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  {/* Current Price Info */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-3 px-2">
                    <span>{t("trading.entry")}</span>
                    <span className="font-mono font-semibold text-foreground">
                      ${(displayTicker.find(t => t.symbol === openForm.pair.split("/")[0])?.price ?? 0).toLocaleString()}
                    </span>
                  </div>
                  {/* Submit Button */}
                  <button
                    onClick={handleOpenPosition}
                    disabled={openPositionMutation.isPending || !openForm.amount}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
                      openForm.side === "long"
                        ? "bg-neon-green/20 text-neon-green border border-neon-green/30 hover:bg-neon-green/30"
                        : "bg-neon-red/20 text-neon-red border border-neon-red/30 hover:bg-neon-red/30"
                    } disabled:opacity-50`}
                  >
                    {openPositionMutation.isPending
                      ? t("trading.opening")
                      : openForm.side === "long"
                        ? `${t("trading.buyLong")} ${openForm.pair}`
                        : `${t("trading.sellShort")} ${openForm.pair}`}
                  </button>
                </div>

                {/* Margin Info */}
                <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2.5"><Wallet size={14} className="text-neon-purple" /> {t("trading.accountSummary")}</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                    {[
                      { label: t("trading.balance"), value: "$2,450.00" },
                      { label: t("trading.usedMargin"), value: "$185.20" },
                      { label: t("trading.available"), value: "$2,264.80" },
                      { label: t("trading.marginLevel"), value: "1,322%" },
                      { label: t("trading.todayPnl"), value: "+$30.70" },
                      { label: t("trading.totalPnlLabel"), value: "+$342.80" },
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

            {/* ═══ TAB: PnL Calendar ═══ */}
            {activeTab === "calendar" && (
              <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                  <button onClick={() => {
                    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
                    else setCalendarMonth(m => m - 1);
                  }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary/40">
                    <ChevronLeft size={16} className="text-muted-foreground" />
                  </button>
                  <span className="text-sm font-semibold font-display">
                    {MONTH_NAMES[calendarMonth]} {calendarYear}
                  </span>
                  <button onClick={() => {
                    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
                    else setCalendarMonth(m => m + 1);
                  }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary/40">
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Monthly Summary */}
                <div className="grid grid-cols-4 gap-2">
                  {(() => {
                    const totalPnl = pnlCalendar.reduce((s, d) => s + d.pnl, 0);
                    const pnlValues = pnlCalendar.map(d => d.pnl);
                    const bestDay = pnlValues.length > 0 ? Math.max(...pnlValues) : 0;
                    return [
                      { label: t("trading.totalPnlLabel"), value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(1)}`, color: totalPnl >= 0 ? "text-neon-green" : "text-neon-red" },
                      { label: t("trading.winDays"), value: `${pnlCalendar.filter(d => d.pnl > 0).length}`, color: "text-neon-green" },
                      { label: t("trading.lossDays"), value: `${pnlCalendar.filter(d => d.pnl < 0).length}`, color: "text-neon-red" },
                      { label: t("trading.bestDay"), value: `${bestDay >= 0 ? "+" : ""}$${bestDay.toFixed(1)}`, color: "text-neon-cyan" },
                    ];
                  })().map((item) => (
                    <div key={item.label} className="p-2 rounded-xl bg-secondary/20 border border-border/20 text-center">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className={`text-sm font-mono font-bold ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="rounded-2xl bg-card/50 border border-border/30 p-3">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {[t("trading.sun"), t("trading.mon"), t("trading.tue"), t("trading.wed"), t("trading.thu"), t("trading.fri"), t("trading.sat")].map((d) => (
                      <div key={d} className="text-center text-sm text-muted-foreground font-medium">{d}</div>
                    ))}
                  </div>
                  {/* Calendar cells - Feb 2026 starts on Sunday */}
                  <div className="grid grid-cols-7 gap-2">
                    {pnlCalendar.map((day) => (
                      <div
                        key={day.day}
                        className={`aspect-square rounded-lg ${pnlColor(day.pnl)} flex flex-col items-center justify-center cursor-pointer hover:ring-1 hover:ring-neon-cyan/30 transition-all`}
                        title={`${day.date}: $${day.pnl.toFixed(1)} (${day.trades} trades)`}
                      >
                        <span className="text-sm text-muted-foreground">{day.day}</span>
                        {day.pnl !== 0 && (
                          <span className={`text-[13px] font-mono font-bold ${day.pnl > 0 ? "text-neon-green" : "text-neon-red"}`}>
                            {day.pnl > 0 ? "+" : ""}{day.pnl.toFixed(0)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-neon-red/25" /> {t("trading.legendLoss")}</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-secondary/30" /> {t("trading.legendNoTrade")}</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-neon-green/12" /> {t("trading.legendSmallWin")}</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-neon-green/40" /> {t("trading.legendBigWin")}</div>
                </div>

                {/* Daily PnL Bar Chart */}
                <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                  <h4 className="text-sm font-medium mb-2">{t("trading.dailyPnlDist")}</h4>
                  <div className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pnlCalendar.filter(d => d.pnl !== 0)}>
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <ReferenceLine y={0} stroke="var(--border)" />
                        <Tooltip
                          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "11px", color: "var(--foreground)" }}
                          formatter={(value: number) => [`$${value.toFixed(1)}`, "PnL"]}
                          labelFormatter={(label) => `Day ${label}`}
                        />
                        <Bar dataKey="pnl" radius={[3, 3, 0, 0]} fill="var(--neon-green)">
                          {pnlCalendar.filter(d => d.pnl !== 0).map((entry, index) => (
                            <rect key={index} fill={entry.pnl >= 0 ? "var(--neon-green)" : "var(--neon-red)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Streak Info */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-neon-green/5 border border-neon-green/15">
                    <p className="text-sm text-muted-foreground mb-0.5">{t("trading.bestWinStreak")}</p>
                    <p className="text-sm font-mono font-bold text-neon-green">5 days</p>
                    <p className="text-sm text-muted-foreground">Feb 14-20</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neon-red/5 border border-neon-red/15">
                    <p className="text-sm text-muted-foreground mb-0.5">{t("trading.maxLossStreak")}</p>
                    <p className="text-sm font-mono font-bold text-neon-red">2 days</p>
                    <p className="text-sm text-muted-foreground">Feb 9-10</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══ TAB: Trade History ═══ */}
            {activeTab === "logs" && (
              <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-2">
                {/* Daily Summary */}
                <div className="p-3 rounded-2xl bg-secondary/20 border border-border/20 mb-3">
                  <h4 className="text-sm font-medium mb-2">{t("trading.todaySummary")}</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: t("trading.trades"), value: "4", color: "text-foreground" },
                      { label: t("trading.pnlLabel"), value: "+$30.7", color: "text-neon-green" },
                      { label: t("trading.winRate"), value: "75%", color: "text-foreground" },
                      { label: t("trading.best"), value: "+$15.1", color: "text-neon-green" },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <p className="text-sm text-muted-foreground">{m.label}</p>
                        <p className={`text-sm font-mono font-semibold ${m.color}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trade history - empty state */}
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/30 flex items-center justify-center mb-3">
                    <BarChart3 size={20} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("trading.noTradeHistory")}</p>
                  <p className="text-sm text-muted-foreground/60 mt-2">{t("trading.tradesWillAppear")}</p>
                </div>
              </motion.div>
            )}

            {/* ═══ TAB: Price Alerts ═══ */}
            {activeTab === "alerts" && (
              <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-4">
                {/* Create Alert Form */}
                <div className="p-4 rounded-2xl bg-card/50 border border-border/30">
                  <h4 className="text-sm font-semibold font-display mb-3 flex items-center gap-2">
                    <Bell size={14} className="text-neon-cyan" /> {t("trading.setPriceAlert")}
                  </h4>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block">{t("trading.token")}</label>
                        <select
                          value={newAlert.symbol}
                          onChange={(e) => setNewAlert(prev => ({ ...prev, symbol: e.target.value }))}
                          className="w-full h-9 px-3 rounded-xl bg-secondary/40 border border-border/30 text-sm font-mono focus:outline-none focus:border-neon-cyan/40"
                        >
                          {["BTC", "ETH", "BNB", "SOL", "ARB", "LINK", "AVAX", "CAKE"].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block">{t("trading.direction")}</label>
                        <select
                          value={newAlert.direction}
                          onChange={(e) => setNewAlert(prev => ({ ...prev, direction: e.target.value as "above" | "below" }))}
                          className="w-full h-9 px-3 rounded-xl bg-secondary/40 border border-border/30 text-sm font-mono focus:outline-none focus:border-neon-cyan/40"
                        >
                          <option value="above">{t("trading.priceAbove")}</option>
                          <option value="below">{t("trading.priceBelow")}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">{t("trading.targetPriceUSD")}</label>
                      <input
                        type="number"
                        placeholder="e.g. 100000"
                        value={newAlert.targetPrice}
                        onChange={(e) => setNewAlert(prev => ({ ...prev, targetPrice: e.target.value }))}
                        className="w-full h-9 px-3 rounded-xl bg-secondary/40 border border-border/30 text-sm font-mono focus:outline-none focus:border-neon-cyan/40"
                      />
                    </div>
                    <button
                      disabled={!newAlert.targetPrice || createAlertMutation.isPending}
                      onClick={() => {
                        if (!newAlert.targetPrice) return;
                        const symbolToId: Record<string, string> = {
                          BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin",
                          SOL: "solana", ARB: "arbitrum", LINK: "chainlink",
                          AVAX: "avalanche-2", CAKE: "pancakeswap-token",
                        };
                        createAlertMutation.mutate({
                          tokenSymbol: newAlert.symbol,
                          tokenId: symbolToId[newAlert.symbol] ?? newAlert.symbol.toLowerCase(),
                          targetPrice: newAlert.targetPrice,
                          condition: newAlert.direction,
                        });
                        setNewAlert(prev => ({ ...prev, targetPrice: "" }));
                      }}
                      className="w-full h-9 rounded-xl bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {createAlertMutation.isPending ? t("trading.creating") : `+ ${t("trading.createAlert")}`}
                    </button>
                  </div>
                </div>

                {/* Alerts List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">{t("trading.activeAlerts")} ({realAlerts.length})</h4>
                  </div>
                  {realAlerts.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">{t("trading.noAlertsYet")}</p>
                      <p className="text-sm text-muted-foreground/60 mt-2">{t("trading.setAlertHint")}</p>
                    </div>
                  ) : (
                    realAlerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/20"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            alert.condition === "above" ? "bg-neon-green/10" : "bg-neon-red/10"
                          }`}>
                            {alert.condition === "above"
                              ? <ArrowUpRight size={14} className="text-neon-green" />
                              : <ArrowDownRight size={14} className="text-destructive" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold font-mono">{alert.tokenSymbol}</p>
                            <p className="text-sm text-muted-foreground">
                              {alert.condition === "above" ? t("trading.above") : t("trading.below")} ${parseFloat(alert.targetPrice).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteAlertMutation.mutate({ id: alert.id })}
                          disabled={deleteAlertMutation.isPending}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <X size={13} className="text-muted-foreground hover:text-destructive" />
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      <AnimatePresence>
        {/* Strategy Detail Modal */}
        {modalType === "strategy" && selectedStrategy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 [backdrop-filter:none]"
            onClick={() => { setModalType("none"); setSelectedStrategy(null); }}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="px-4 py-3 border-b border-border/30 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold font-display text-base">{selectedStrategy.name}</h3>
                    <p className="text-[13px] text-muted-foreground">{selectedStrategy.pair} · {selectedStrategy.signalSource} · {selectedStrategy.amount}</p>
                  </div>
                  <button onClick={() => { setModalType("none"); setSelectedStrategy(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60"><X size={18} className="text-muted-foreground" /></button>
                </div>
                <div className="flex gap-2 mt-2">
                  {(["chart", "stats", "risk", "trades"] as DetailTab[]).map((tab) => (
                    <button key={tab} onClick={() => setDetailTab(tab)}
                      className={`flex-1 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                        detailTab === tab ? "bg-secondary text-foreground" : "text-muted-foreground"
                      }`}>
                      {tab === "chart" ? t("trading.tabChart") : tab === "stats" ? t("trading.tabStats") : tab === "risk" ? t("trading.tabRisk") : t("trading.tabTrades")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {detailTab === "chart" && (
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium">{t("trading.cumulativePnl")}</h4>
                        <span className="text-sm font-mono text-neon-green">+${selectedStrategy.totalProfit.toFixed(1)}</span>
                      </div>
                      <div className="h-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={liveChartData ?? selectedStrategy.profitHistory}>
                            <defs>
                              <linearGradient id="stratDetailGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--neon-green)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--neon-green)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "11px", color: "var(--foreground)" }} />
                            <Area type="monotone" dataKey="profit" stroke="var(--neon-green)" strokeWidth={2} fill="url(#stratDetailGrad)" name="Strategy" />
                            <Area type="monotone" dataKey="benchmark" stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="4 4" fill="none" name="Benchmark" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                      <h4 className="text-sm font-medium mb-3">{t("trading.monthlyReturns")}</h4>
                      <div className="h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={selectedStrategy.profitHistory.map((d, i, arr) => ({ date: d.date, monthly: i === 0 ? d.profit : d.profit - arr[i - 1].profit }))}>
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                            <ReferenceLine y={0} stroke="var(--border)" />
                            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "11px", color: "var(--foreground)" }} formatter={(value: number) => [`$${value.toFixed(1)}`, "Monthly"]} />
                            <Bar dataKey="monthly" radius={[4, 4, 0, 0]} fill="var(--neon-green)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === "stats" && (
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                      <h4 className="text-sm font-medium mb-4 flex items-center gap-2.5"><BarChart3 size={14} className="text-neon-cyan" /> {t("trading.performanceMetrics")}</h4>
                      <div className="space-y-2">
                        {[
                          { label: t("trading.sharpeRatio"), value: selectedStrategy.sharpeRatio.toFixed(2), color: selectedStrategy.sharpeRatio >= 2 ? "text-neon-green" : "text-yellow-400" },
                          { label: t("trading.profitFactor"), value: selectedStrategy.profitFactor.toFixed(2), color: selectedStrategy.profitFactor >= 1.5 ? "text-neon-green" : "text-yellow-400" },
                          { label: t("trading.maxConsecutiveLoss"), value: `${selectedStrategy.maxConsecutiveLoss}`, color: "text-foreground" },
                          { label: t("trading.avgProfitTrade"), value: `+$${selectedStrategy.avgProfit.toFixed(1)}`, color: "text-neon-green" },
                          { label: t("trading.avgLossTrade"), value: `-$${Math.abs(selectedStrategy.avgLoss).toFixed(1)}`, color: "text-neon-red" },
                          { label: t("trading.plRatio"), value: (selectedStrategy.avgProfit / Math.abs(selectedStrategy.avgLoss)).toFixed(2), color: "text-foreground" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                            <span className="text-[13px] text-muted-foreground">{item.label}</span>
                            <span className={`text-sm font-mono font-bold ${item.color}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                      <h4 className="text-sm font-medium mb-2">{t("trading.strategyRadar")}</h4>
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={[
                            { metric: t("trading.sortWinRate") || "Win%", value: selectedStrategy.winRate },
                            { metric: t("trading.sharpe") || "Sharpe", value: Math.min(selectedStrategy.sharpeRatio * 30, 100) },
                            { metric: t("trading.profitFactor") || "Profit Factor", value: Math.min(selectedStrategy.profitFactor * 40, 100) },
                            { metric: t("trading.consistency") || "Consistency", value: 100 - Math.abs(selectedStrategy.maxDrawdown) * 5 },
                            { metric: t("trading.frequency") || "Frequency", value: Math.min(selectedStrategy.trades * 2, 100) },
                            { metric: t("trading.riskMgmt") || "Risk Mgmt", value: selectedStrategy.riskLevel === "low" ? 90 : selectedStrategy.riskLevel === "medium" ? 60 : 30 },
                          ]}>
                            <PolarGrid stroke="var(--border)" />
                            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                            <Radar dataKey="value" stroke="var(--neon-cyan)" fill="var(--neon-cyan)" fillOpacity={0.2} strokeWidth={2} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === "risk" && (
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                      <h4 className="text-sm font-medium mb-4 flex items-center gap-2.5"><Shield size={14} className="text-neon-purple" /> {t("trading.riskProfile")}</h4>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-sm px-3 py-1 rounded-full border font-medium ${riskColor(selectedStrategy.riskLevel)}`}>
                          {selectedStrategy.riskLevel === "low" ? t("trading.lowRiskFull") : selectedStrategy.riskLevel === "medium" ? t("trading.mediumRiskFull") : t("trading.highRiskFull")}
                        </span>
                        <span className="text-[13px] text-muted-foreground">Max DD: <span className="font-mono text-neon-red">{selectedStrategy.maxDrawdown}%</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          selectedStrategy.riskLevel === "low" ? "bg-neon-green w-[25%]" : selectedStrategy.riskLevel === "medium" ? "bg-yellow-400 w-[55%]" : "bg-neon-red w-[85%]"
                        }`} />
                      </div>
                    </div>
                    <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                      <h4 className="text-sm font-medium mb-4 flex items-center gap-2.5"><Settings size={14} /> {t("trading.riskControls")}</h4>
                      <div className="space-y-2.5">
                        {[
                          { label: t("trading.stopLossLabel"), value: `${selectedStrategy.stopLoss}%`, icon: TrendingDown, color: "text-neon-red" },
                          { label: t("trading.takeProfitLabel"), value: `${selectedStrategy.takeProfit}%`, icon: TrendingUp, color: "text-neon-green" },
                          { label: t("trading.maxPosition"), value: `$${selectedStrategy.maxPosition}`, icon: CircleDollarSign, color: "text-foreground" },
                          { label: t("trading.dailyLossLimit"), value: `$${selectedStrategy.dailyLossLimit}`, icon: Shield, color: "text-yellow-400" },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <div key={item.label} className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-border/10">
                              <div className="flex items-center gap-2">
                                <Icon size={14} className={item.color} />
                                <span className="text-sm">{item.label}</span>
                              </div>
                              <span className={`text-sm font-mono font-bold ${item.color}`}>{item.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/15">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={14} className="text-destructive" />
                        <span className="text-sm font-medium text-destructive">{t("trading.riskWarnings")}</span>
                      </div>
                      <ul className="space-y-2 text-[13px] text-muted-foreground">
                        <li>• {t("trading.riskWarn1")}</li>
                        <li>• {t("trading.riskWarn2")}</li>
                        <li>• {t("trading.riskWarn3")}</li>
                      </ul>
                    </div>
                  </div>
                )}

                {detailTab === "trades" && (
                  <div className="space-y-2">
                    {selectedStrategy.recentTrades.map((trade, index) => (
                      <motion.div key={trade.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/10">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trade.side === "buy" ? "bg-neon-green/10" : "bg-destructive/10"}`}>
                          {trade.side === "buy" ? <ArrowUpRight size={14} className="text-neon-green" /> : <ArrowDownRight size={14} className="text-destructive" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-mono font-medium">{trade.pair}</span>
                          <p className="text-sm text-muted-foreground">{trade.amount} @ {trade.price} · {trade.date}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-mono font-semibold ${trade.profit >= 0 ? "text-neon-green" : "text-destructive"}`}>
                            {trade.profit >= 0 ? "+" : ""}${trade.profit.toFixed(1)}
                          </p>
                          <p className="text-sm text-muted-foreground">{trade.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 py-3 border-t border-border/30 flex gap-3 shrink-0">
                <button onClick={() => { setModalType("createStrategy"); toast.info("Edit mode: modify your strategy parameters"); }}
                  className="flex-1 h-10 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
                  <Settings size={14} /> {t("trading.edit")}
                </button>
                <button onClick={() => toggleStrategyStatus(selectedStrategy.id)}
                  className={`flex-1 h-10 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedStrategy.status === "running" ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-neon-green/10 text-neon-green border border-neon-green/20"
                  }`}>
                  {selectedStrategy.status === "running" ? <><Pause size={14} /> {t("trading.pause")}</> : <><Play size={14} /> {t("trading.resume")}</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Trader Detail Modal */}
        {modalType === "trader" && selectedTrader && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 [backdrop-filter:none]"
            onClick={() => { setModalType("none"); setSelectedTrader(null); }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border overflow-hidden max-h-[85vh] flex flex-col">
              <div className="px-4 py-3 border-b border-border/30 shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/60 flex items-center justify-center text-xl relative">
                      {selectedTrader.avatar}
                      {selectedTrader.badge !== "none" && <span className="absolute -bottom-0.5 -right-0.5 text-sm">{badgeIcon(selectedTrader.badge)}</span>}
                    </div>
                    <div>
                      <h3 className="font-bold font-display text-sm">{selectedTrader.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedTrader.description}</p>
                    </div>
                  </div>
                  <button onClick={() => { setModalType("none"); setSelectedTrader(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60"><X size={18} className="text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: t("trading.roi") || "ROI", value: `+${selectedTrader.totalReturn}%`, color: "text-neon-green" },
                    { label: t("trading.sortWinRate") || "Win%", value: `${selectedTrader.winRate}%`, color: "text-neon-cyan" },
                    { label: t("trading.followers") || "Followers", value: selectedTrader.followers > 1000 ? `${(selectedTrader.followers / 1000).toFixed(1)}K` : `${selectedTrader.followers}`, color: "text-foreground" },
                    { label: t("trading.sharpe") || "Sharpe", value: selectedTrader.sharpeRatio.toFixed(2), color: "text-neon-purple" },
                  ].map((m) => (
                    <div key={m.label} className="text-center p-2.5 rounded-xl bg-secondary/30">
                      <p className="text-sm text-muted-foreground">{m.label}</p>
                      <p className={`text-sm font-mono font-bold ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                      <h4 className="text-sm font-medium mb-2">{t("trading.eightWeekPerf")}</h4>
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

                {/* Weekly Returns */}
                <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                  <h4 className="text-sm font-medium mb-2">{t("trading.weeklyReturns")}</h4>
                  <div className="flex gap-2 items-end h-[60px]">
                    {selectedTrader.weeklyReturns.map((ret, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className={`w-full rounded-t transition-all ${
                          ret >= 0 ? "bg-neon-green/60" : "bg-neon-red/60"
                        }`} style={{ height: `${Math.abs(ret) * 2.5}px` }} />
                        <span className="text-[13px] text-muted-foreground">W{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  {[
                    { label: t("trading.trades30d"), value: `${selectedTrader.trades30d}` },
                    { label: t("trading.maxDrawdown"), value: `${selectedTrader.maxDrawdown}%` },
                    { label: t("trading.avgHoldTime"), value: selectedTrader.avgHoldTime },
                    { label: t("trading.avgTradeSize"), value: selectedTrader.avgTradeSize },
                    { label: t("trading.consistency"), value: `${selectedTrader.consistency}%` },
                    { label: t("trading.topPairs"), value: selectedTrader.topPairs.join(", ") },
                    { label: t("trading.riskLevelLabel"), value: selectedTrader.riskLevel.charAt(0).toUpperCase() + selectedTrader.riskLevel.slice(1) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-2 rounded-xl bg-secondary/20">
                      <span className="text-[13px] text-muted-foreground">{item.label}</span>
                      <span className="text-[13px] font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-border/30 flex gap-3 shrink-0">
                <button onClick={() => toggleFollow(selectedTrader.id)}
                  className={`flex-1 h-10 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    selectedTrader.isFollowing ? "bg-secondary text-muted-foreground border border-border" : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                  }`}>
                  <Eye size={14} />
                  {selectedTrader.isFollowing ? t("trading.unfollow") : t("trading.follow")}
                </button>
                <button onClick={() => { setCopyTrader(selectedTrader); setModalType("copyConfig"); setSelectedTrader(null); }}
                  className="flex-1 h-10 rounded-xl bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <Copy size={14} /> {t("trading.copyTrade")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ═══ Create Strategy Modal ═══ */}
        {modalType === "createStrategy" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 [backdrop-filter:none]"
            onClick={() => setModalType("none")}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border overflow-hidden max-h-[85vh] flex flex-col">
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between shrink-0">
                <h3 className="font-bold font-display text-base">{t("trading.createStrategy")}</h3>
                <button onClick={() => setModalType("none")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60"><X size={18} className="text-muted-foreground" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-[13px] text-muted-foreground mb-2 block">{t("trading.strategyName")}</label>
                  <input value={newStrategy.name} onChange={(e) => setNewStrategy(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. BTC Momentum" className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border/30 text-sm focus:outline-none focus:border-neon-green/40" />
                </div>
                {/* Signal Source */}
                <div>
                  <label className="text-[13px] text-muted-foreground mb-2 block">{t("trading.signalSource")}</label>
                  <select value={newStrategy.signalSource} onChange={(e) => setNewStrategy(p => ({ ...p, signalSource: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border/30 text-sm focus:outline-none focus:border-neon-green/40 appearance-none">
                    <option value="">{t("trading.selectTrader")}</option>
                    {traders.map(tr => <option key={tr.id} value={tr.name}>{tr.avatar} {tr.name} (ROI +{tr.totalReturn}%)</option>)}
                  </select>
                </div>
                {/* Pair & Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] text-muted-foreground mb-2 block">{t("trading.pair")}</label>
                    <select value={newStrategy.pair} onChange={(e) => setNewStrategy(p => ({ ...p, pair: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border/30 text-sm focus:outline-none appearance-none">
                      {["BTC/USDT", "ETH/USDT", "SOL/USDT", "ARB/USDT", "LINK/USDT"].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[13px] text-muted-foreground mb-2 block">{t("trading.amountPerTrade")}</label>
                    <input type="number" value={newStrategy.amount} onChange={(e) => setNewStrategy(p => ({ ...p, amount: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border/30 text-sm focus:outline-none font-mono" />
                  </div>
                </div>
                {/* Leverage & Risk */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[13px] text-muted-foreground mb-2 block">{t("trading.leverage")}</label>
                    <select value={newStrategy.leverage} onChange={(e) => setNewStrategy(p => ({ ...p, leverage: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border/30 text-sm focus:outline-none appearance-none">
                      {["1", "2", "3", "5", "10", "20"].map(l => <option key={l} value={l}>{l}x</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[13px] text-muted-foreground mb-2 block">{t("trading.riskLevelLabel")}</label>
                    <div className="flex gap-2.5">
                      {(["low", "medium", "high"] as const).map(r => (
                        <button key={r} onClick={() => setNewStrategy(p => ({ ...p, riskLevel: r }))}
                          className={`flex-1 h-10 rounded-xl text-[13px] font-medium transition-colors border ${
                            newStrategy.riskLevel === r ? riskColor(r) : "bg-secondary/30 text-muted-foreground border-border/20"
                          }`}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Risk Controls */}
                <div className="p-4 rounded-xl bg-secondary/20 border border-border/20">
                  <h4 className="text-[13px] font-medium mb-2 flex items-center gap-2.5"><Shield size={12} className="text-neon-purple" /> {t("trading.riskControls")}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-0.5 block">{t("trading.stopLossPct")}</label>
                      <input type="number" value={newStrategy.stopLoss} onChange={(e) => setNewStrategy(p => ({ ...p, stopLoss: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border/20 text-sm focus:outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-0.5 block">{t("trading.takeProfitPct")}</label>
                      <input type="number" value={newStrategy.takeProfit} onChange={(e) => setNewStrategy(p => ({ ...p, takeProfit: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border/20 text-sm focus:outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-0.5 block">{t("trading.maxPositionDollar")}</label>
                      <input type="number" value={newStrategy.maxPosition} onChange={(e) => setNewStrategy(p => ({ ...p, maxPosition: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border/20 text-sm focus:outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-0.5 block">{t("trading.dailyLossLimitDollar")}</label>
                      <input type="number" value={newStrategy.dailyLossLimit} onChange={(e) => setNewStrategy(p => ({ ...p, dailyLossLimit: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border/20 text-sm focus:outline-none font-mono" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-border/30 shrink-0">
                <button onClick={handleCreateStrategy}
                  className="w-full h-11 rounded-xl bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <Zap size={16} /> {t("trading.createStrategy")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ═══ Copy Trade Config Modal ═══ */}
        {modalType === "copyConfig" && copyTrader && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 [backdrop-filter:none]"
            onClick={() => { setModalType("none"); setCopyTrader(null); }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border overflow-hidden max-h-[85vh] flex flex-col">
              <div className="px-4 py-3 border-b border-border/30 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{copyTrader.avatar}</span>
                    <div>
                      <h3 className="font-bold font-display text-sm">{t("trading.copyTraderTitle").replace("{name}", copyTrader.name)}</h3>
                      <p className="text-sm text-muted-foreground">{t("trading.copyTraderDesc")}</p>
                    </div>
                  </div>
                  <button onClick={() => { setModalType("none"); setCopyTrader(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60"><X size={18} className="text-muted-foreground" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {/* Copy Mode */}
                <div>
                  <label className="text-[13px] text-muted-foreground mb-2.5 block">{t("trading.copyMode")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setCopyConfig(p => ({ ...p, mode: "fixed" }))}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        copyConfig.mode === "fixed" ? "border-neon-green/30 bg-neon-green/5" : "border-border/20 bg-secondary/20"
                      }`}>
                      <CircleDollarSign size={16} className={copyConfig.mode === "fixed" ? "text-neon-green mb-2" : "text-muted-foreground mb-2"} />
                      <p className="text-sm font-medium">{t("trading.fixedAmount")}</p>
                      <p className="text-sm text-muted-foreground">{t("trading.fixedAmountDesc")}</p>
                    </button>
                    <button onClick={() => setCopyConfig(p => ({ ...p, mode: "proportional" }))}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        copyConfig.mode === "proportional" ? "border-neon-cyan/30 bg-neon-cyan/5" : "border-border/20 bg-secondary/20"
                      }`}>
                      <Percent size={16} className={copyConfig.mode === "proportional" ? "text-neon-cyan mb-2" : "text-muted-foreground mb-2"} />
                      <p className="text-sm font-medium">{t("trading.proportional")}</p>
                      <p className="text-sm text-muted-foreground">{t("trading.proportionalDesc")}</p>
                    </button>
                  </div>
                </div>
                {/* Amount / Proportion */}
                {copyConfig.mode === "fixed" ? (
                  <div>
                    <label className="text-[13px] text-muted-foreground mb-2 block">{t("trading.amountPerTrade")}</label>
                    <input type="number" value={copyConfig.amount} onChange={(e) => setCopyConfig(p => ({ ...p, amount: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border/30 text-sm focus:outline-none font-mono" />
                  </div>
                ) : (
                  <div>
                    <label className="text-[13px] text-muted-foreground mb-2 block">{t("trading.proportion")}</label>
                    <input type="number" value={copyConfig.proportion} onChange={(e) => setCopyConfig(p => ({ ...p, proportion: e.target.value }))}
                      className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border/30 text-sm focus:outline-none font-mono" />
                  </div>
                )}
                {/* Risk Settings */}
                <div className="p-4 rounded-xl bg-secondary/20 border border-border/20">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2.5"><Shield size={14} className="text-neon-purple" /> {t("trading.riskSettings")}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-0.5 block">{t("trading.stopLossPct")}</label>
                      <input type="number" value={copyConfig.stopLoss} onChange={(e) => setCopyConfig(p => ({ ...p, stopLoss: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border/20 text-sm focus:outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-0.5 block">{t("trading.takeProfitPct")}</label>
                      <input type="number" value={copyConfig.takeProfit} onChange={(e) => setCopyConfig(p => ({ ...p, takeProfit: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border/20 text-sm focus:outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-0.5 block">{t("trading.maxPerTrade")}</label>
                      <input type="number" value={copyConfig.maxPerTrade} onChange={(e) => setCopyConfig(p => ({ ...p, maxPerTrade: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border/20 text-sm focus:outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-0.5 block">{t("trading.maxSlippage")}</label>
                      <input type="number" value={copyConfig.slippage} onChange={(e) => setCopyConfig(p => ({ ...p, slippage: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border/20 text-sm focus:outline-none font-mono" />
                    </div>
                  </div>
                </div>
                {/* Daily Loss Limit */}
                <div>
                  <label className="text-[13px] text-muted-foreground mb-2 block">{t("trading.dailyLossLimitDollar")}</label>
                  <input type="number" value={copyConfig.maxDailyLoss} onChange={(e) => setCopyConfig(p => ({ ...p, maxDailyLoss: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border/30 text-sm focus:outline-none font-mono" />
                  <p className="text-sm text-muted-foreground mt-2">{t("trading.autoPauseHint")}</p>
                </div>
                {/* Trader Stats Summary */}
                <div className="p-4 rounded-xl bg-neon-green/5 border border-neon-green/15">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={12} className="text-neon-green" />
                    <span className="text-[13px] font-medium text-neon-green">{t("trading.traderPerformance")}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-sm text-muted-foreground">{t("trading.sortROI")}</p><p className="text-sm font-mono font-bold text-neon-green">+{copyTrader.totalReturn}%</p></div>
                    <div><p className="text-sm text-muted-foreground">{t("trading.winRate")}</p><p className="text-sm font-mono font-bold">{copyTrader.winRate}%</p></div>
                    <div><p className="text-sm text-muted-foreground">{t("trading.maxDrawdown")}</p><p className="text-sm font-mono font-bold text-neon-red">{copyTrader.maxDrawdown}%</p></div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-border/30 shrink-0">
                <button onClick={handleCopyTrade}
                  className="w-full h-11 rounded-xl bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/20 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <Copy size={16} /> {t("trading.startCopyTrading")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ═══ Close Position Confirm Modal ═══ */}
        {modalType === "closePosition" && closePosition && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 [backdrop-filter:none]"
            onClick={() => { setModalType("none"); setClosePosition(null); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[90%] max-w-sm rounded-2xl bg-card border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={20} className="text-destructive" />
                <h3 className="font-bold font-display text-base">{t("trading.closePosition")}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t("trading.closePositionConfirm").replace("{pair}", closePosition.pair).replace("{side}", closePosition.side.toUpperCase())}
              </p>
              <div className="p-4 rounded-xl bg-secondary/20 border border-border/20 mb-4 space-y-3">
                <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("trading.entry")}</span>
                  <span className="font-mono">${closePosition.entryPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("trading.current")}</span>
                  <span className="font-mono">${closePosition.currentPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("trading.unrealizedPnl")}</span>
                  <span className={`font-mono font-bold ${closePosition.unrealizedPnl >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                    {closePosition.unrealizedPnl >= 0 ? "+" : ""}${closePosition.unrealizedPnl.toFixed(2)} ({closePosition.unrealizedPnlPercent >= 0 ? "+" : ""}{closePosition.unrealizedPnlPercent.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("trading.leverage")}</span>
                  <span className="font-mono">{closePosition.leverage}x</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setModalType("none"); setClosePosition(null); }}
                  className="flex-1 h-10 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
                  {t("trading.cancel")}
                </button>
                <button onClick={handleClosePosition}
                  className="flex-1 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 text-sm font-semibold transition-colors">
                  {t("trading.confirmClose")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ═══ Compare Traders Modal ═══ */}
        {modalType === "compare" && compareTraders.length >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 [backdrop-filter:none]"
            onClick={() => setModalType("none")}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border overflow-hidden max-h-[85vh] flex flex-col">
              <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between shrink-0">
                <h3 className="font-bold font-display text-base flex items-center gap-2"><Scale size={18} className="text-neon-purple" /> {t("trading.compareTraders")}</h3>
                <button onClick={() => setModalType("none")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60"><X size={18} className="text-muted-foreground" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {/* Trader Headers */}
                <div className="flex gap-2">
                  {compareTraders.map(tr => (
                    <div key={tr.id} className="flex-1 text-center p-2 rounded-xl bg-secondary/20 border border-border/20">
                      <span className="text-xl block mb-2">{tr.avatar}</span>
                      <span className="text-sm font-semibold block">{tr.name}</span>
                      <span className={`text-sm px-2.5 py-1 rounded-full border ${riskColor(tr.riskLevel)}`}>{tr.riskLevel}</span>
                    </div>
                  ))}
                </div>
                {/* Comparison Table */}
                <div className="rounded-xl border border-border/20 overflow-hidden">
                  {[
                    { label: t("trading.sortROI"), values: compareTraders.map(tr => `+${tr.totalReturn}%`), colors: compareTraders.map(() => "text-neon-green") },
                    { label: t("trading.winRate"), values: compareTraders.map(tr => `${tr.winRate}%`), colors: compareTraders.map(tr => tr.winRate >= 70 ? "text-neon-green" : "text-foreground") },
                    { label: t("trading.sharpeRatio"), values: compareTraders.map(tr => tr.sharpeRatio.toFixed(2)), colors: compareTraders.map(tr => tr.sharpeRatio >= 2 ? "text-neon-cyan" : "text-foreground") },
                    { label: t("trading.maxDrawdown"), values: compareTraders.map(tr => `${tr.maxDrawdown}%`), colors: compareTraders.map(() => "text-neon-red") },
                    { label: t("trading.trades30d"), values: compareTraders.map(tr => `${tr.trades30d}`), colors: compareTraders.map(() => "text-foreground") },
                    { label: t("trading.sortFollowers"), values: compareTraders.map(tr => `${tr.followers}`), colors: compareTraders.map(() => "text-foreground") },
                    { label: t("trading.consistency"), values: compareTraders.map(tr => `${tr.consistency}%`), colors: compareTraders.map(tr => tr.consistency >= 80 ? "text-neon-green" : "text-yellow-400") },
                    { label: t("trading.avgHoldTime"), values: compareTraders.map(tr => tr.avgHoldTime), colors: compareTraders.map(() => "text-foreground") },
                  ].map((row, i) => (
                    <div key={row.label} className={`flex items-center ${i % 2 === 0 ? "bg-secondary/10" : ""}`}>
                      <div className="w-24 shrink-0 px-2 py-2 text-sm text-muted-foreground">{row.label}</div>
                      {row.values.map((val, j) => (
                        <div key={j} className="flex-1 px-2 py-2 text-center">
                          <span className={`text-sm font-mono font-semibold ${row.colors[j]}`}>{val}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {/* Radar Comparison */}
                <div className="p-5 rounded-2xl bg-secondary/20 border border-border/20">
                  <h4 className="text-sm font-medium mb-3">{t("trading.performanceRadar")}</h4>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { metric: t("trading.roi") || "ROI", ...Object.fromEntries(compareTraders.map(tr => [tr.name, Math.min(tr.totalReturn / 5, 100)])) },
                        { metric: t("trading.sortWinRate") || "Win%", ...Object.fromEntries(compareTraders.map(tr => [tr.name, tr.winRate])) },
                        { metric: t("trading.sharpe") || "Sharpe", ...Object.fromEntries(compareTraders.map(tr => [tr.name, Math.min(tr.sharpeRatio * 30, 100)])) },
                        { metric: t("trading.consistency") || "Consist.", ...Object.fromEntries(compareTraders.map(tr => [tr.name, tr.consistency])) },
                        { metric: t("trading.riskMgmt") || "Safety", ...Object.fromEntries(compareTraders.map(tr => [tr.name, 100 - Math.abs(tr.maxDrawdown) * 2])) },
                      ]}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} />
                        {compareTraders.map((tr, i) => (
                          <Radar key={tr.id} name={tr.name} dataKey={tr.name}
                            stroke={["var(--neon-green)", "var(--neon-cyan)", "var(--neon-purple)"][i]}
                            fill={["var(--neon-green)", "var(--neon-cyan)", "var(--neon-purple)"][i]}
                            fillOpacity={0.1} strokeWidth={2} />
                        ))}
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {compareTraders.map((tr, i) => (
                      <span key={tr.id} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full" style={{ background: ["var(--neon-green)", "var(--neon-cyan)", "var(--neon-purple)"][i] }} />
                        {tr.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-border/30 shrink-0">
                <button onClick={() => { setCompareList([]); setModalType("none"); }}
                  className="w-full h-10 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
                  {t("trading.clearComparison")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ═══ Notifications Config Modal ═══ */}
        {modalType === "notifications" && selectedStrategy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 [backdrop-filter:none]"
            onClick={() => { setModalType("none"); setSelectedStrategy(null); }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[90%] max-w-sm rounded-2xl bg-card border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold font-display text-base flex items-center gap-2"><Bell size={18} className="text-neon-cyan" /> {t("trading.notifications")}</h3>
                <button onClick={() => { setModalType("none"); setSelectedStrategy(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60"><X size={16} className="text-muted-foreground" /></button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{selectedStrategy.name}</p>
              <div className="space-y-2">
                {[
                  { key: "onTrade" as const, label: t("trading.notifOnTrade"), desc: t("trading.notifOnTradeDesc") },
                  { key: "onStopLoss" as const, label: t("trading.notifOnStopLoss"), desc: t("trading.notifOnStopLossDesc") },
                  { key: "onTakeProfit" as const, label: t("trading.notifOnTakeProfit"), desc: t("trading.notifOnTakeProfitDesc") },
                  { key: "dailySummary" as const, label: t("trading.notifDailySummary"), desc: t("trading.notifDailySummaryDesc") },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/20">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        setStrategies(prev => prev.map(s => s.id === selectedStrategy.id ? { ...s, notifications: { ...s.notifications, [item.key]: !s.notifications[item.key] } } : s));
                        setSelectedStrategy(prev => prev ? { ...prev, notifications: { ...prev.notifications, [item.key]: !prev.notifications[item.key] } } : null);
                      }}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        selectedStrategy.notifications[item.key] ? "bg-neon-green" : "bg-secondary"
                      }`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        selectedStrategy.notifications[item.key] ? "translate-x-5" : "translate-x-1"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => { setModalType("none"); setSelectedStrategy(null); toast.success("Notification settings saved"); }}
                className="w-full h-10 mt-4 rounded-xl bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/20 text-sm font-semibold transition-colors">
                {t("trading.saveSettings")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
