/*
 * Research — AI投研机器人页面
 * 全面增强版：更多代币 + 时间周期切换 + 搜索交互 + 风险指标 + 市场情绪 + 链上数据
 * Design: Cyberpunk dark theme with neon accents, Space Grotesk headings
 */
import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Search, TrendingUp, TrendingDown, Shield, Code, ChevronDown, ChevronUp,
  Sparkles, Share2, Check, ExternalLink, AlertTriangle, Activity,
  BarChart3, Flame, Eye, Clock, Zap, Globe, Lock, Users, ArrowUpRight,
  ArrowDownRight, Minus, RefreshCw, BookOpen, Filter, Star, StarOff,
  Target, Crosshair, Gauge, CircleDot, CheckCircle, XCircle, Timer,
  ArrowUp, ArrowDown, Signal
} from "lucide-react";
import { toast } from "sonner";
import LightMarkdown from "@/components/LightMarkdown";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

// ==================== Types ====================

interface ResearchReport {
  id: string;
  token: string;
  icon: string;
  price: string;
  priceNum: number;
  change24h: number;
  change7d: number;
  change30d: number;
  marketCap: string;
  rank: number;
  tvl: string;
  volume24h: string;
  activeAddresses: string;
  holders: string;
  aiScore: number;
  aiVerdict: string;
  aiVerdictKey: string;
  aiSummary: string;
  securityScore: string;
  devActivity: string;
  devCommits: number;
  contractVerified: boolean;
  auditStatus: string;
  riskLevel: "low" | "medium" | "high";
  riskFactors: string[];
  timestamp: string;
  category: string;
  chain: string;
  priceHistory: { time: string; price: number }[];
  priceHistory7d: { time: string; price: number }[];
  priceHistory30d: { time: string; price: number }[];
  radarData: { metric: string; score: number; fullMark: number }[];
  volumeHistory: { time: string; volume: number }[];
  onChainData: {
    whaleActivity: string;
    netFlow: string;
    netFlowDir: "in" | "out" | "neutral";
    burnRate: string;
    stakingRate: string;
    dexVolume: string;
  };
  socialSentiment: {
    score: number;
    trend: "bullish" | "bearish" | "neutral";
    mentions24h: number;
    fearGreedIndex: number;
  };
  aiSignal: {
    overallScore: number;
    signal: "strongBuy" | "buy" | "neutral" | "sell" | "strongSell";
    confidence: number;
    updatedAgo: string;
    technicalIndicators: {
      name: string;
      value: string;
      signal: "buy" | "neutral" | "sell";
      score: number;
    }[];
    timeframes: {
      period: string;
      signal: "strongBuy" | "buy" | "neutral" | "sell" | "strongSell";
      score: number;
    }[];
    strategy: {
      action: string;
      entry: string;
      stopLoss: string;
      takeProfit1: string;
      takeProfit2: string;
      riskReward: string;
      positionSize: string;
      leverage: string;
      timeHorizon: string;
      reasoning: string;
    };
    signalHistory: {
      date: string;
      signal: string;
      price: string;
      result: "win" | "loss" | "pending";
      pnl: string;
    }[];
    accuracy: { total: number; wins: number; losses: number; winRate: number; avgReturn: number };
  };
}

type TimeRange = "7d" | "30d" | "1y";
type SortBy = "aiScore" | "change24h" | "marketCap" | "volume";
type FilterCategory = "all" | "L1" | "L2" | "DeFi" | "AI" | "Meme";

// ==================== Demo Data (pre-built showcase reports) ====================

// Price history data is now fetched from CoinGecko API via backend (see trading.getMarketOverview)


const hotTokens = ["BTC", "ETH", "SOL", "ARB", "LINK", "AVAX", "RENDER", "PEPE"];
const CATEGORIES: FilterCategory[] = ["all", "L1", "L2", "DeFi", "AI", "Meme"];

// ==================== Sub-components ====================

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const formatted = val < 0.01 ? `$${val.toFixed(8)}` : val < 1 ? `$${val.toFixed(4)}` : `$${val.toLocaleString()}`;
  return (
    <div className="px-2.5 py-1.5 rounded-lg bg-card border border-border/40 shadow-lg">
      <p className="text-sm font-mono text-neon-cyan font-semibold">{formatted}</p>
    </div>
  );
}

function VolumeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-2.5 py-1.5 rounded-lg bg-card border border-border/40 shadow-lg">
      <p className="text-sm font-mono text-neon-purple font-semibold">${payload[0].value}B</p>
    </div>
  );
}

function SentimentBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "bg-neon-green" : score >= 40 ? "bg-yellow-500" : "bg-neon-red";
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{score}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary/40 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function RiskBadge({ level, t }: { level: "low" | "medium" | "high"; t: (k: string) => string }) {
  const config = {
    low: { bg: "bg-neon-green/10", text: "text-neon-green", border: "border-neon-green/20", icon: Shield, label: t("research.riskLow") },
    medium: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/20", icon: AlertTriangle, label: t("research.riskMedium") },
    high: { bg: "bg-neon-red/10", text: "text-neon-red", border: "border-neon-red/20", icon: AlertTriangle, label: t("research.riskHigh") },
  };
  const c = config[level];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium ${c.bg} ${c.text} border ${c.border}`}>
      <Icon size={10} />
      {c.label}
    </span>
  );
}

function ChangeIndicator({ value, size = "sm" }: { value: number; size?: "sm" | "xs" }) {
  const isPositive = value > 0;
  const isZero = value === 0;
  const textSize = size === "sm" ? "text-xs" : "text-xs";
  if (isZero) return <span className={`${textSize} font-mono text-muted-foreground flex items-center gap-0.5`}><Minus size={12} />0%</span>;
  return (
    <span className={`${textSize} font-mono flex items-center gap-0.5 ${isPositive ? "text-neon-green" : "text-neon-red"}`}>
      {isPositive ? <ArrowUpRight size={size === "sm" ? 12 : 10} /> : <ArrowDownRight size={size === "sm" ? 12 : 10} />}
      {isPositive ? "+" : ""}{value}%
    </span>
  );
}

// ==================== Realtime Price Component ====================
function RealtimePrice({ symbol, fallback, fallbackNum }: { symbol: string; fallback: string; fallbackNum: number }) {
  const { data, isLoading } = trpc.research.getPrice.useQuery(
    { symbol },
    { staleTime: 60_000, refetchInterval: 120_000 }
  );
  if (isLoading) return <span className="text-sm font-mono font-semibold text-muted-foreground animate-pulse">{fallback}</span>;
  if (!data?.price) return <span className="text-sm font-mono font-semibold">{fallback}</span>;
  const price = data.price;
  const formatted = price < 0.01 ? `$${price.toFixed(8)}` : price < 1 ? `$${price.toFixed(4)}` : price < 1000 ? `$${price.toFixed(2)}` : `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  const change = data.priceChange24h;
  return (
    <div className="text-right">
      <p className="text-sm font-mono font-semibold">{formatted}</p>
      {change !== undefined && change !== null && (
        <p className={`text-[13px] font-mono ${change >= 0 ? "text-neon-green" : "text-neon-red"}`}>
          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
        </p>
      )}
    </div>
  );
}

// ==================== Main Component ====================

export default function Research() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("1");
  const [isSearching, setIsSearching] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [sortBy, setSortBy] = useState<SortBy>("aiScore");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [, setLocation] = useLocation();
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set(["1", "2"]));
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [shareCaption, setShareCaption] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"chart" | "radar" | "volume" | "onchain" | "signal">("chart");
  const [showFilters, setShowFilters] = useState(false);
  // AI Report state
  const [aiReportContent, setAiReportContent] = useState<string | null>(null);
  const [showAiReport, setShowAiReport] = useState(false);
  const [aiReportToken, setAiReportToken] = useState<string>("");
  const [aiReportId, setAiReportId] = useState<number | null>(null);
  const [aiReportSentiment, setAiReportSentiment] = useState<string>("neutral");
  const [aiReportRisk, setAiReportRisk] = useState<string>("medium");
  const [aiReportPrice, setAiReportPrice] = useState<string | null>(null);
  const [aiReportMcap, setAiReportMcap] = useState<string | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareComment, setShareComment] = useState("");
  const [aiKeyMetrics, setAiKeyMetrics] = useState<Array<{label: string; value: string; isChange?: boolean; changeVal?: number; isProgress?: boolean; progressVal?: number}>>([]);
  const [aiScore, setAiScore] = useState<number | null>(null);



   // tRPC: report history
  const [showHistory, setShowHistory] = useState(false);
  const [historyTimeFilter, setHistoryTimeFilter] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [historySortFilter, setHistorySortFilter] = useState<"newest" | "oldest" | "bullish" | "bearish">("newest");
  const { data: reportHistory, refetch: refetchHistory } = trpc.research.getHistory.useQuery(
    undefined,
    { staleTime: 30_000 }
  );

  const filteredHistory = useMemo(() => {
    if (!reportHistory) return [];
    let list = [...reportHistory];
    // Time filter
    if (historyTimeFilter !== "all") {
      const days = historyTimeFilter === "7d" ? 7 : historyTimeFilter === "30d" ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter(r => new Date(r.createdAt).getTime() > cutoff);
    }
    // Sort / sentiment filter
    switch (historySortFilter) {
      case "newest": list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case "oldest": list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case "bullish": list = list.filter(r => r.sentiment === "bullish"); break;
      case "bearish": list = list.filter(r => r.sentiment === "bearish"); break;
    }
    return list;
  }, [reportHistory, historyTimeFilter, historySortFilter]);
  // tRPC: price alerts
  const { data: serverAlerts, refetch: refetchAlerts } = trpc.research.myAlerts.useQuery(
    undefined,
    { staleTime: 30_000 }
  );
  const createResearchAlert = trpc.research.createAlert.useMutation({
    onSuccess: () => {
      toast.success("价格预警已设置");
      refetchAlerts();
    },
    onError: (err) => {
      toast.error("设置预警失败: " + err.message);
    },
  });
  // Auth state for share button
  const { user: authUser, isAuthenticated: isResearchAuthed } = useAuth();
  const [showResearchLoginPrompt, setShowResearchLoginPrompt] = useState(false);
  // tRPC: direct post creation (for unauthenticated or no-reportId share)
  const createPost = trpc.posts.create.useMutation({
    onSuccess: () => {
      toast.success("报告已发布到社区动态");
      setShowShareDialog(false);
      setShareComment("");
    },
    onError: (err) => toast.error("发布失败: " + err.message),
  });
  // tRPC: share report to feed
  const shareToFeed = trpc.research.shareToFeed.useMutation({
    onSuccess: () => {
      toast.success("报告已分享到社区\u52a8\u6001");
      setShowShareDialog(false);
      setShareComment("");
    },
    onError: (err) => toast.error("分享失败: " + err.message),
  });
  // SSE streaming research report
  const handleSearch = useCallback(async (directToken?: string) => {
    const sym = (directToken ?? searchQuery).trim().toUpperCase();
    if (!sym) return;
    setIsSearching(true);
    setAiReportToken(sym);
    setAiReportContent("");
    setShowAiReport(true);
    setAiReportSentiment("neutral");
    setAiReportRisk("medium");
    setAiReportPrice(null);
    setAiReportMcap(null);
    setAiReportId(null);
    setAiKeyMetrics([]);
    setAiScore(null);

    try {
      const res = await fetch("/api/research/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tokenSymbol: sym, mode: "quick" }),
      });
      if (!res.ok || !res.body) {
        if (res.status === 401) { toast.error("AI 投研服务暂时不可用"); setShowAiReport(false); setIsSearching(false); return; }
        if (res.status === 429) { toast.error("请求过于频繁，请稍后再试"); setShowAiReport(false); setIsSearching(false); return; }
        throw new Error(`HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processEvent = (eventText: string) => {
        for (const line of eventText.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            if (json.token) setAiReportContent(prev => (prev ?? "") + json.token);
            if (json.done) {
              setIsSearching(false);
              if (json.vizData) {
                if (json.vizData.sentiment) setAiReportSentiment(json.vizData.sentiment);
                if (json.vizData.riskLevel) setAiReportRisk(json.vizData.riskLevel);
                if (json.vizData.keyMetrics) setAiKeyMetrics(json.vizData.keyMetrics);
                if (json.vizData.aiScore !== null && json.vizData.aiScore !== undefined) setAiScore(json.vizData.aiScore);
              }
              if (json.meta) {
                if (json.meta.price) setAiReportPrice(String(json.meta.price));
                if (json.meta.marketCap) setAiReportMcap(String(json.meta.marketCap));
              }
              refetchHistory();
              toast.success(`AI 研究报告已生成: ${json.meta?.tokenName ?? sym}`);
            }
            if (json.error) { toast.error("报告生成失败: " + json.error); setIsSearching(false); }
          } catch { /* skip malformed */ }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) processEvent(buffer);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        // Split on double-newline (SSE event boundary)
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          if (event.trim()) processEvent(event);
        }
      }
    } catch (err: any) {
      toast.error("AI 报告生成失败: " + (err.message ?? "未知错误"));
      setShowAiReport(false);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const toggleWatchlist = useCallback((id: string) => {
    if (!isResearchAuthed) { setShowResearchLoginPrompt(true); return; }
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info(t("research.removedFromWatchlist")); }
      else { next.add(id); toast.success(t("research.addedToWatchlist")); }
      return next;
    });
  }, [t]);

  const filteredReports = useMemo(() => {
    let reports: ResearchReport[] = [];

    // Filter by category
    if (filterCategory !== "all") {
      reports = reports.filter(r => r.category === filterCategory);
    }

    // Filter by search
    if (searchQuery.trim() && !isSearching) {
      const q = searchQuery.trim().toLowerCase();
      reports = reports.filter(r => r.token.toLowerCase().includes(q) || r.chain.toLowerCase().includes(q));
    }

    // Sort
    switch (sortBy) {
      case "aiScore": reports.sort((a, b) => b.aiScore - a.aiScore); break;
      case "change24h": reports.sort((a, b) => b.change24h - a.change24h); break;
      case "marketCap": reports.sort((a, b) => b.rank === a.rank ? 0 : a.rank - b.rank); break;
      case "volume": reports.sort((a, b) => 0); break; // keep original order for volume
    }

    return reports;
  }, [filterCategory, sortBy, searchQuery, isSearching]);

  const getPriceData = (report: ResearchReport) => {
    switch (timeRange) {
      case "7d": return report.priceHistory7d;
      case "30d": return report.priceHistory30d;
      default: return report.priceHistory;
    }
  };

  const getChangeForRange = (report: ResearchReport) => {
    switch (timeRange) {
      case "7d": return report.change7d;
      case "30d": return report.change30d;
      default: return report.change24h;
    }
  };

  // Market overview stats from CoinGecko + Fear & Greed API
  const { data: marketOverview, isLoading: marketLoading } = trpc.trading.getMarketOverview.useQuery(undefined, {
    staleTime: 120_000,
    refetchInterval: 300_000,
  });
  const marketStats = useMemo(() => {
    if (!marketOverview) return { avgScore: "—", bullish: 0, total: 0, avgFearGreed: 0, btcDominance: 0, totalMarketCap: 0, avg24hChange: 0, fearGreedLabel: "" };
    return {
      avgScore: marketOverview.aiScoreAvg > 0 ? marketOverview.aiScoreAvg.toFixed(1) : "—",
      bullish: marketOverview.bullish,
      total: marketOverview.total,
      avgFearGreed: marketOverview.fearGreedValue,
      btcDominance: marketOverview.btcDominance,
      totalMarketCap: marketOverview.totalMarketCap,
      avg24hChange: marketOverview.avg24hChange,
      fearGreedLabel: marketOverview.fearGreedLabel,
    };
  }, [marketOverview]);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30 overflow-hidden">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-neon-purple" />
            <h1 className="text-lg font-semibold font-display">{t("research.title")}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${showFilters ? "bg-neon-purple/15 text-neon-purple" : "text-muted-foreground hover:bg-secondary/40"}`}
            >
              <Filter size={16} />
            </button>
            <button
              onClick={() => setLocation("/app/watchlist")}
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary/40 transition-colors relative"
            >
              <Star size={16} />
              {watchlist.size > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-yellow-500 text-[13px] text-background font-bold flex items-center justify-center">{watchlist.size}</span>
              )}
            </button>
            <button
              onClick={() => { setIsSearching(true); setTimeout(() => { setIsSearching(false); toast.success(t("research.refreshed")); }, 1500); }}
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary/40 transition-colors"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative pb-3">
          <Search size={16} className="absolute left-3 top-[20px] -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={t("research.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full h-10 pr-20 rounded-xl bg-secondary/60 border border-border/30 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20 transition-all"
            style={{ paddingLeft: '2.25rem' }}
          />
          <button
            onClick={() => handleSearch()}
            disabled={isSearching}
            className="absolute right-1.5 top-[20px] -translate-y-1/2 px-3 py-1.5 rounded-lg bg-neon-purple/20 text-neon-purple text-sm font-medium hover:bg-neon-purple/30 transition-colors disabled:opacity-50"
          >
            {isSearching ? <RefreshCw size={14} className="animate-spin" /> : t("research.analyze")}
          </button>
        </div>

        {/* History Reports Button */}
        {reportHistory && reportHistory.length > 0 && (
          <div className="pb-3">
            <button
              onClick={() => setShowHistory(prev => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20 text-sm text-[#a855f7] hover:bg-[#a855f7]/15 transition-all"
            >
              <span className="flex items-center gap-2.5">
                <Sparkles size={13} />
                历史研究报告 ({reportHistory.length})
              </span>
              <span>{showHistory ? "▲" : "▼"}</span>
            </button>
            {showHistory && (
              <>
              {/* Filter controls */}
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {/* Time range */}
                {(["all", "7d", "30d", "90d"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setHistoryTimeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                      historyTimeFilter === t
                        ? "bg-[#a855f7]/25 text-[#a855f7] border-[#a855f7]/40"
                        : "bg-white/[0.03] text-gray-500 border-white/[0.06] hover:text-gray-300"
                    }`}
                  >
                    {t === "all" ? "全部" : t}
                  </button>
                ))}
                <div className="w-px bg-white/10 mx-0.5" />
                {/* Sort / sentiment */}
                {(["newest", "oldest", "bullish", "bearish"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setHistorySortFilter(s)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                      historySortFilter === s
                        ? s === "bullish" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : s === "bearish" ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-[#a855f7]/25 text-[#a855f7] border-[#a855f7]/40"
                        : "bg-white/[0.03] text-gray-500 border-white/[0.06] hover:text-gray-300"
                    }`}
                  >
                    {s === "newest" ? "最新" : s === "oldest" ? "最早" : s === "bullish" ? "▲ 看多" : "▼ 看空"}
                  </button>
                ))}
              </div>
              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-0.5 scrollbar-hide">
                {filteredHistory.length === 0 && (
                  <div className="py-6 text-center text-sm text-gray-500">暂无匹配的报告</div>
                )}
                {filteredHistory.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => {
                      setAiReportContent(report.reportContent);
                      setAiReportToken(report.tokenSymbol);
                      setShowAiReport(true);
                      setShowHistory(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#0f1629]/80 border border-white/[0.06] hover:border-[#a855f7]/30 hover:bg-[#a855f7]/5 transition-all text-left group"
                  >
                    {/* Token avatar */}
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#a855f7]/30 to-[#00d4ff]/20 flex items-center justify-center shrink-0 border border-[#a855f7]/20">
                      <span className="text-xs font-black text-[#a855f7]">{report.tokenSymbol.slice(0, 2)}</span>
                    </div>
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-bold font-mono text-white">{report.tokenSymbol}</span>
                        {report.sentiment && (
                          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                            report.sentiment === 'bullish' ? 'bg-emerald-500/15 text-emerald-400' :
                            report.sentiment === 'bearish' ? 'bg-red-500/15 text-red-400' :
                            'bg-yellow-500/15 text-yellow-400'
                          }`}>
                            {report.sentiment === 'bullish' ? '▲ 看多' : report.sentiment === 'bearish' ? '▼ 看空' : '◆ 中性'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {new Date(report.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {/* Arrow */}
                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#a855f7]/20 transition-colors">
                      <svg className="w-2.5 h-2.5 text-gray-500 group-hover:text-[#a855f7]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </button>
                ))}
              </div>
              </>
            )}
          </div>
        )}

        {/* Hot tokens */}
        <div className="flex gap-2 pb-3 overflow-x-auto scrollbar-hide">
          {hotTokens.map((token) => {
            return (
              <button
                key={token}
                onClick={() => { setSearchQuery(token); handleSearch(token); }}
                className="shrink-0 flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-secondary/40 text-sm font-mono border border-border/20 hover:border-neon-cyan/30 transition-all group"
              >
                <span className="text-muted-foreground group-hover:text-neon-cyan transition-colors">{token}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Filter & Sort Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/20 bg-card/30"
          >
            <div className="px-4 py-4 space-y-4">
              {/* Category Filter */}
              <div>
                <p className="text-sm text-muted-foreground mb-2.5 font-mono">{t("research.filterCategory")}</p>
                <div className="flex gap-2.5 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-[13px] font-medium transition-all ${
                        filterCategory === cat
                          ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30"
                          : "bg-secondary/30 text-muted-foreground border border-border/20 hover:border-border/40"
                      }`}
                    >
                      {cat === "all" ? t("research.filterAll") : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <p className="text-sm text-muted-foreground mb-2.5 font-mono">{t("research.sortBy")}</p>
                <div className="flex gap-2.5 flex-wrap">
                  {([
                    { key: "aiScore" as SortBy, label: t("research.aiScore") },
                    { key: "change24h" as SortBy, label: "24h %" },
                    { key: "marketCap" as SortBy, label: t("research.marketCap") },
                  ]).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSortBy(s.key)}
                      className={`px-3 py-1 rounded-lg text-[13px] font-medium transition-all ${
                        sortBy === s.key
                          ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                          : "bg-secondary/30 text-muted-foreground border border-border/20 hover:border-border/40"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Market Overview Bar */}
      <div className="px-3 py-2 flex items-center gap-2.5 overflow-x-auto border-b border-border/15 bg-gradient-to-r from-neon-purple/[0.03] via-card/50 to-neon-cyan/[0.03] scrollbar-hide">
        {/* Skeleton while market data loads */}
        {marketLoading && (
          <>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="shrink-0 flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-secondary/30 border border-border/20">
                <div className="w-3 h-3 rounded bg-secondary/60 animate-pulse" />
                <div className="flex flex-col gap-2">
                  <div className="h-2 w-10 bg-secondary/40 animate-pulse rounded" />
                  <div className="h-3 w-14 bg-secondary/60 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </>
        )}
        {/* AI Score */}
        <div className="shrink-0 flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-neon-purple/10 border border-neon-purple/25 hover:border-neon-purple/40 transition-colors">
          <BarChart3 size={11} className="text-neon-purple" />
          <div className="flex flex-col leading-none">
            <span className="text-[13px] text-muted-foreground uppercase tracking-wider font-medium">{t("research.avgScore")}</span>
            <span className="text-[12px] font-mono font-bold text-neon-purple leading-tight">{marketStats.avgScore}<span className="text-[13px] text-neon-purple/60">/10</span></span>
          </div>
        </div>
        <div className="w-px h-5 bg-border/20 shrink-0" />
        {/* Bullish */}
        <div className="shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-neon-green/10 border border-neon-green/25 hover:border-neon-green/40 transition-colors">
          <TrendingUp size={11} className="text-neon-green" />
          <div className="flex flex-col leading-none">
            <span className="text-[13px] text-muted-foreground uppercase tracking-wider font-medium">{t("research.bullish")}</span>
            <span className="text-[12px] font-mono font-bold text-neon-green leading-tight">{marketStats.bullish}<span className="text-sm text-muted-foreground">/{marketStats.total}</span></span>
          </div>
        </div>
        <div className="w-px h-5 bg-border/20 shrink-0" />
        {/* Fear & Greed */}
        <div className="shrink-0 flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/25 hover:border-neon-cyan/40 transition-colors">
          <Gauge size={11} className="text-neon-cyan" />
          <div className="flex flex-col leading-none">
            <span className="text-[13px] text-muted-foreground uppercase tracking-wider font-medium">{t("research.fearGreed")}</span>
            <span className={`text-[12px] font-mono font-bold leading-tight ${marketStats.avgFearGreed >= 60 ? "text-neon-green" : marketStats.avgFearGreed >= 40 ? "text-yellow-400" : "text-neon-red"}`}>
              {marketStats.avgFearGreed || "—"}
              <span className="text-[13px] ml-0.5 opacity-70">{marketStats.fearGreedLabel || ""}</span>
            </span>
          </div>
        </div>
        <div className="w-px h-5 bg-border/20 shrink-0" />
        {/* BTC Dominance */}
        <div className="shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/40 transition-colors">
          <CircleDot size={11} className="text-amber-400" />
          <div className="flex flex-col leading-none">
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">BTC Dom</span>
            <span className="text-sm font-mono font-bold text-amber-400 leading-tight">{marketStats.btcDominance || "—"}<span className="text-sm text-amber-400/60">%</span></span>
          </div>
        </div>
        <div className="w-px h-5 bg-border/20 shrink-0" />
        {/* Total Market Cap */}
        <div className="shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary/40 border border-border/20 hover:border-border/40 transition-colors">
          <Globe size={11} className="text-muted-foreground" />
          <div className="flex flex-col leading-none">
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Mkt Cap</span>
            <span className="text-sm font-mono font-bold text-foreground leading-tight">${marketStats.totalMarketCap > 0 ? (marketStats.totalMarketCap / 1e12).toFixed(2) : "—"}<span className="text-sm text-muted-foreground">T</span></span>
          </div>
        </div>
        <div className="w-px h-5 bg-border/20 shrink-0" />
        {/* 24h Change */}
        <div className="shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-neon-green/10 border border-neon-green/25 hover:border-neon-green/40 transition-colors">
          <ArrowUpRight size={11} className="text-neon-green" />
          <div className="flex flex-col leading-none">
            <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium">24h Avg</span>
            <span className={`text-sm font-mono font-bold leading-tight ${marketStats.avg24hChange >= 0 ? "text-neon-green" : "text-neon-red"}`}>{marketStats.avg24hChange >= 0 ? "+" : ""}{marketStats.avg24hChange || "—"}<span className={`text-sm ${marketStats.avg24hChange >= 0 ? "text-neon-green/60" : "text-neon-red/60"}`}>%</span></span>
          </div>
        </div>
        <div className="ml-auto shrink-0 flex items-center gap-2 text-sm text-muted-foreground/60 font-mono">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
            <RefreshCw size={9} />
          </motion.div>
          <span>Live</span>
        </div>
      </div>

      {/* AI Report Modal - Beautiful Visualized Design */}
      {showAiReport && (
        <div className="fixed inset-0 z-[100] sm:flex sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-black/80 [backdrop-filter:none]" onClick={() => setShowAiReport(false)} />
          <div className="absolute bottom-0 left-0 right-0 sm:static sm:max-w-3xl sm:mx-4 sm:rounded-3xl rounded-t-3xl bg-[#080d1e] border border-[#a855f7]/20 shadow-[0_0_80px_rgba(168,85,247,0.15)] overflow-hidden flex flex-col" style={{maxHeight: '85dvh', bottom: 'calc(62px + env(safe-area-inset-bottom, 0px))'}}>

            {/* Gradient Header Banner */}
            <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-[#0f1629] via-[#130d2a] to-[#0a1020] border-b border-white/[0.06] shrink-0">
              {/* Decorative glow orbs */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#a855f7]/8 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#00d4ff]/6 rounded-full blur-2xl pointer-events-none" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Token identity */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center shrink-0 shadow-lg">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white font-['Space_Grotesk'] tracking-wide">{aiReportToken}</span>
                        <span className="text-sm text-[#a855f7]/70 font-mono bg-[#a855f7]/10 px-2 py-1 rounded-full border border-[#a855f7]/20">AI REPORT</span>
                      </div>
                      <p className="text-[13px] text-gray-500 mt-0.5">深度投研分析 · 仅供参考</p>
                    </div>
                  </div>

                  {/* Status badges row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Sentiment badge */}
                    <div className={`flex items-center gap-2.5 px-2.5 py-1 rounded-full text-sm font-semibold border ${
                      aiReportSentiment === "bullish"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : aiReportSentiment === "bearish"
                        ? "bg-red-500/15 text-red-300 border-red-500/30"
                        : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                    }`}>
                      <span className="text-sm">{aiReportSentiment === "bullish" ? "▲" : aiReportSentiment === "bearish" ? "▼" : "◆"}</span>
                      {aiReportSentiment === "bullish" ? "看多" : aiReportSentiment === "bearish" ? "看空" : "中性"}
                    </div>
                    {/* Risk badge */}
                    <div className={`flex items-center gap-2.5 px-2.5 py-1 rounded-full text-sm font-medium border ${
                      aiReportRisk === "low"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : aiReportRisk === "high"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    }`}>
                      {aiReportRisk === "low" ? "🛡️ 低风险" : aiReportRisk === "high" ? "⚠️ 高风险" : "⚡ 中风险"}
                    </div>
                    {/* AI Score badge */}
                    {aiScore !== null && (
                      <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-sm font-bold border ${
                        aiScore >= 8 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : aiScore >= 6 ? "bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/25"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}>
                        <Sparkles size={9} />
                        {aiScore}/10
                      </div>
                    )}
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setShowAiReport(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Key Metrics Grid - Visualized Data Cards */}
            {(aiKeyMetrics.length > 0 || isSearching) && (
              <div className="px-4 py-3 border-b border-white/[0.06] bg-[#060b18] shrink-0 max-h-[200px] overflow-y-auto">
                {isSearching && aiKeyMetrics.length === 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="bg-white/[0.03] rounded-xl px-2.5 py-2 border border-white/[0.06] animate-pulse">
                        <div className="h-2 bg-white/10 rounded mb-2 w-3/4" />
                        <div className="h-3 bg-white/15 rounded w-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {aiKeyMetrics.slice(0, 5).map((m, i) => (
                        <div key={i} className="bg-white/[0.03] rounded-xl px-2.5 py-2 border border-white/[0.06] hover:border-[#a855f7]/20 transition-colors">
                          <p className="text-sm text-gray-500 uppercase tracking-wider mb-2 truncate">{m.label}</p>
                          <p className={`text-sm font-bold font-mono truncate ${
                            m.isChange
                              ? (m.changeVal ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                              : "text-white"
                          }`}>{m.value}</p>
                          {m.isProgress && m.progressVal !== undefined && (
                            <div className="mt-2.5 h-1 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#a855f7] to-[#00d4ff] rounded-full"
                                style={{ width: `${Math.min(100, m.progressVal)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {aiKeyMetrics.length > 5 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {aiKeyMetrics.slice(5).map((m, i) => (
                          <div key={i} className="bg-white/[0.03] rounded-xl px-2.5 py-2 border border-white/[0.06]">
                            <p className="text-sm text-gray-500 uppercase tracking-wider mb-2 truncate">{m.label}</p>
                            <p className={`text-sm font-bold font-mono truncate ${
                              m.isChange
                                ? (m.changeVal ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                                : "text-white"
                            }`}>{m.value}</p>
                            {m.isProgress && m.progressVal !== undefined && (
                              <div className="mt-2.5 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#a855f7] to-[#00d4ff] rounded-full"
                                  style={{ width: `${Math.min(100, m.progressVal)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Report Content - Styled Markdown */}
            <div className="overflow-y-auto" style={{maxHeight: '55vh'}}>
              {aiReportContent ? (
                <div className="px-5 py-4 report-markdown">
                  <LightMarkdown>{aiReportContent}</LightMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-[#a855f7]/30 border-t-[#a855f7] animate-spin" />
                  <p className="text-sm text-gray-500">AI 正在生成报告...</p>
                </div>
              )}
            </div>

            {/* Footer Actions Bar */}
            <div className="px-4 py-3 border-t border-white/[0.06] bg-[#060b18] flex items-center justify-between gap-3 shrink-0">
              <p className="text-sm text-gray-600 hidden sm:block">本报告由 AI 生成，仅供参考，不构成投资建议</p>
              <div className="flex items-center gap-2 ml-auto">
                {/* Copy button */}
                <button
                  onClick={() => { if (aiReportContent) { navigator.clipboard.writeText(aiReportContent); toast.success("已复制报告内容"); } }}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  复制
                </button>
                {/* Share to Feed button - always visible */}
                <button
                  onClick={() => { setShowShareDialog(true); setShareComment(""); }}
                  className="flex items-center gap-2.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-sm text-white font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-[#a855f7]/20"
                >
                  <Share2 size={12} />
                  发布动态
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share to Feed Dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 [backdrop-filter:none]" onClick={() => setShowShareDialog(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#0f1629] border border-[#a855f7]/30 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                <Share2 size={16} className="text-[#a855f7]" />
                分享报告到社区动态
              </h3>
            </div>

            {/* Preview Card */}
            <div className="px-5 py-3">
              <div className="rounded-xl bg-gradient-to-br from-[#0a0f1e] to-[#131b35] border border-[#a855f7]/20 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center">
                    <BarChart3 size={12} className="text-white" />
                  </div>
                  <span className="text-sm font-bold text-white font-['Space_Grotesk']">{aiReportToken}</span>
                  <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${
                    aiReportSentiment === "bullish" ? "bg-emerald-500/20 text-emerald-400" :
                    aiReportSentiment === "bearish" ? "bg-red-500/20 text-red-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>
                    {aiReportSentiment === "bullish" ? "🟢 看多" : aiReportSentiment === "bearish" ? "🔴 看空" : "🟡 中性"}
                  </span>
                </div>
                <p className="text-[13px] text-gray-400 line-clamp-2">
                  {(aiReportContent ?? "").split("\n").filter(l => l.trim() && !l.startsWith("#") && !l.startsWith("|")).find(l => l.length > 20)?.replace(/\*\*/g, "").slice(0, 100) ?? "AI 投研报告"}
                </p>
              </div>
            </div>

            {/* Comment Input */}
            <div className="px-5 pb-3">
              <textarea
                value={shareComment}
                onChange={(e) => setShareComment(e.target.value)}
                placeholder="添加你的观点（可选）..."
                maxLength={500}
                rows={3}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#a855f7]/40 resize-none"
              />
              <p className="text-right text-sm text-gray-500 mt-2">{shareComment.length}/500</p>
            </div>

            {/* Actions */}
            <div className="px-5 py-3 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowShareDialog(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
              >取消</button>
              {!authUser ? (
                // Not logged in - show login prompt
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">登录后可发布</span>
                  <a
                    href={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                    className="flex items-center gap-2.5 px-5 py-2 rounded-lg bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-sm text-white font-medium hover:opacity-90 transition-opacity"
                  >
                    登录并发布
                  </a>
                </div>
              ) : aiReportId ? (
                // Logged in with saved report - use shareToFeed
                <button
                  onClick={() => {
                    shareToFeed.mutate({
                      reportId: aiReportId,
                      comment: shareComment || undefined,
                    });
                  }}
                  disabled={shareToFeed.isPending}
                  className="flex items-center gap-2.5 px-5 py-2 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {shareToFeed.isPending ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 发布中...</>
                  ) : (
                    <><Share2 size={14} /> 发布到社区</>
                  )}
                </button>
              ) : (
                // Logged in but no saved reportId - create post directly
                <button
                  onClick={() => {
                    const sentimentEmoji = aiReportSentiment === "bullish" ? "🟢" : aiReportSentiment === "bearish" ? "🔴" : "🟡";
                    const sentimentLabel = aiReportSentiment === "bullish" ? "看多" : aiReportSentiment === "bearish" ? "看空" : "中性";
                    const riskLabel = aiReportRisk === "low" ? "低风险" : aiReportRisk === "high" ? "高风险" : "中风险";
                    const summary = (aiReportContent ?? "").split("\n").filter(l => l.trim() && !l.startsWith("#") && !l.startsWith("|")).find(l => l.length > 20)?.replace(/\*\*/g, "").slice(0, 150) ?? "AI 投研报告";
                    const userComment = shareComment.trim() ? `${shareComment.trim()}\n\n` : "";
                    const content = `${userComment}📊 AI 投研报告 | ${aiReportToken} ${sentimentEmoji} ${sentimentLabel}\n\n${summary}${summary.length >= 150 ? "..." : ""}\n\n⚠️ ${riskLabel}${aiScore ? ` | 🎯 评分: ${aiScore}/10` : ""}`;
                    createPost.mutate({
                      content,
                      tags: ["投研报告", aiReportToken, sentimentLabel],
                    });
                  }}
                  disabled={createPost.isPending}
                  className="flex items-center gap-2.5 px-5 py-2 rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-sm text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {createPost.isPending ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 发布中...</>
                  ) : (
                    <><Share2 size={14} /> 发布到社区</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-6 flex flex-col items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full border-2 border-neon-purple/30 border-t-neon-purple animate-spin" />
            <p className="text-sm text-muted-foreground">
              {t("research.analyzing")} <span className="text-neon-purple font-mono">{searchQuery.toUpperCase() || "Market"}</span>...
            </p>
            <div className="flex gap-2 text-sm text-muted-foreground font-mono">
              <span className="text-neon-green">✓ CoinGecko</span>
              <span className="text-neon-green">✓ DefiLlama</span>
              <span className="text-neon-green">✓ Etherscan</span>
              <span className="animate-pulse">⟳ AI Processing</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {filteredReports.length === 0 && !isSearching && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search size={32} className="mb-3 opacity-30" />
            <p className="text-sm">{t("research.noResults")}</p>
          </div>
        )}

        {filteredReports.map((report, index) => {
          const isExpanded = expandedId === report.id;
          const isPositive = report.change24h >= 0;
          const priceData = getPriceData(report);
          const rangeChange = getChangeForRange(report);
          const isRangePositive = rangeChange >= 0;
          const isWatched = watchlist.has(report.id);

          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden shadow-sm"
            >
              {/* Report Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
                className="w-full px-5 py-4 text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center text-lg border border-border/20">
                      {report.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold font-display">{report.token}</span>
                        <span className="text-sm font-mono text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded">
                          #{report.rank}
                        </span>
                        <span className="text-sm font-mono text-neon-purple/70 bg-neon-purple/8 px-2.5 py-1 rounded">
                          {report.category}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{report.chain}</span>
                    </div>
                  </div>
                  <RealtimePrice symbol={report.token} fallback={report.price} fallbackNum={report.priceNum} />
                </div>

                {/* Mini K-line chart */}
                <div className="h-16 mb-3 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.priceHistory}>
                      <defs>
                        <linearGradient id={`gradient-${report.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isPositive ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={isPositive ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={isPositive ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"}
                        strokeWidth={1.5}
                        fill={`url(#gradient-${report.id})`}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Key metrics grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {[
                    { label: t("research.marketCap"), value: report.marketCap },
                    { label: "24h Vol", value: report.volume24h },
                    { label: t("research.tvl"), value: report.tvl },
                    { label: t("research.aiScore"), value: `${report.aiScore}/10`, highlight: true },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/30">
                      <p className="text-sm text-muted-foreground">{m.label}</p>
                      <p className={`text-sm font-mono font-semibold ${m.highlight ? (report.aiScore >= 8 ? "text-neon-green" : report.aiScore >= 6 ? "text-neon-cyan" : "text-neon-red") : "text-foreground"}`}>
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* AI Verdict + Risk */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-neon-purple" />
                    <span className={`text-sm font-bold ${report.aiScore >= 8 ? "text-neon-green" : report.aiScore >= 6 ? "text-neon-cyan" : report.aiScore >= 4 ? "text-yellow-500" : "text-neon-red"}`}>
                      {t(report.aiVerdictKey)}
                    </span>
                    <RiskBadge level={report.riskLevel} t={t} />
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-border/20"
                  >
                    <div className="px-4 pb-5 space-y-4 border-t border-border/20 pt-4">

                      {/* Tab Switcher */}
                      <div className="flex gap-2 p-0.5 rounded-xl bg-secondary/30 border border-border/15">
                        {([
                          { key: "chart" as const, icon: TrendingUp, label: t("research.tabChart") },
                          { key: "radar" as const, icon: Activity, label: t("research.tabRadar") },
                          { key: "volume" as const, icon: BarChart3, label: t("research.tabVolume") },
                          { key: "onchain" as const, icon: Globe, label: t("research.tabOnChain") },
                          { key: "signal" as const, icon: Signal, label: t("research.tabSignal") },
                        ]).map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                              activeTab === tab.key
                                ? "bg-neon-purple/15 text-neon-purple border border-neon-purple/20"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <tab.icon size={12} />
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Chart Tab */}
                      {activeTab === "chart" && (
                        <div className="space-y-3">
                          {/* Time Range Selector */}
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              {(["7d", "30d", "1y"] as TimeRange[]).map((range) => (
                                <button
                                  key={range}
                                  onClick={() => setTimeRange(range)}
                                  className={`px-3 py-1.5 rounded-lg text-sm font-mono font-medium transition-all ${
                                    timeRange === range
                                      ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/25"
                                      : "text-muted-foreground hover:text-foreground bg-secondary/20"
                                  }`}
                                >
                                  {range}
                                </button>
                              ))}
                            </div>
                            <ChangeIndicator value={rangeChange} />
                          </div>

                          {/* Price Chart */}
                          <div className="p-4 rounded-xl bg-secondary/20 border border-border/15">
                            <div className="h-40">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={priceData}>
                                  <defs>
                                    <linearGradient id={`gradient-detail-${report.id}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={isRangePositive ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"} stopOpacity={0.4} />
                                      <stop offset="100%" stopColor={isRangePositive ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"} stopOpacity={0.02} />
                                    </linearGradient>
                                  </defs>
                                  <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 11, fill: "oklch(0.55 0.02 260)" }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={timeRange === "30d" ? 4 : "preserveStartEnd"}
                                  />
                                  <YAxis
                                    tick={{ fontSize: 11, fill: "oklch(0.55 0.02 260)" }}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={["dataMin * 0.95", "dataMax * 1.05"]}
                                    tickFormatter={(v: number) => v < 1 ? `$${v.toFixed(6)}` : `$${v.toLocaleString()}`}
                                    width={report.priceNum < 1 ? 65 : 50}
                                  />
                                  <RechartsTooltip content={<ChartTooltip />} />
                                  <Area
                                    type="monotone"
                                    dataKey="price"
                                    stroke={isRangePositive ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"}
                                    strokeWidth={2}
                                    fill={`url(#gradient-detail-${report.id})`}
                                    dot={false}
                                    activeDot={{ r: 4, fill: "oklch(0.82 0.15 195)", stroke: "oklch(0.82 0.15 195)", strokeWidth: 2 }}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {/* Multi-period change comparison */}
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "24h", value: report.change24h },
                              { label: "7d", value: report.change7d },
                              { label: "30d", value: report.change30d },
                            ].map((p) => (
                              <div key={p.label} className="text-center p-3 rounded-xl bg-secondary/20 border border-border/15">
                                <p className="text-sm text-muted-foreground mb-1">{p.label}</p>
                                <ChangeIndicator value={p.value} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Radar Tab */}
                      {activeTab === "radar" && (
                        <div className="p-4 rounded-xl bg-secondary/20 border border-border/15">
                          <p className="text-sm text-muted-foreground mb-2 font-mono">{t("research.multiDimAnalysis")}</p>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart data={report.radarData} cx="50%" cy="50%" outerRadius="70%">
                                <PolarGrid stroke="oklch(0.3 0.01 260)" strokeDasharray="3 3" />
                                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} />
                                <Radar
                                  name="Score"
                                  dataKey="score"
                                  stroke="oklch(0.82 0.15 195)"
                                  fill="oklch(0.82 0.15 195)"
                                  fillOpacity={0.15}
                                  strokeWidth={2}
                                  dot={{ r: 3, fill: "oklch(0.82 0.15 195)" }}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                          {/* Score breakdown */}
                          <div className="grid grid-cols-3 gap-2.5 mt-2">
                            {report.radarData.map((d) => (
                              <div key={d.metric} className="flex items-center justify-between px-2 py-1 rounded-lg bg-background/30">
                                <span className="text-sm text-muted-foreground">{d.metric}</span>
                                <span className={`text-sm font-mono font-bold ${d.score >= 80 ? "text-neon-green" : d.score >= 60 ? "text-neon-cyan" : "text-neon-red"}`}>
                                  {d.score}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Volume Tab */}
                      {activeTab === "volume" && (
                        <div className="p-4 rounded-xl bg-secondary/20 border border-border/15">
                          <p className="text-sm text-muted-foreground mb-2 font-mono">{t("research.volumeHistory")}</p>
                          <div className="h-36">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={report.volumeHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}B`} width={40} />
                                <RechartsTooltip content={<VolumeTooltip />} />
                                <Bar dataKey="volume" fill="oklch(0.65 0.25 295)" radius={[3, 3, 0, 0]} opacity={0.7} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex items-center justify-between mt-2 px-2">
                            <span className="text-sm text-muted-foreground">24h Vol: <span className="font-mono font-semibold text-foreground">{report.volume24h}</span></span>
                            <span className="text-sm text-muted-foreground">{t("research.holders")}: <span className="font-mono font-semibold text-foreground">{report.holders}</span></span>
                          </div>
                        </div>
                      )}

                      {/* On-Chain Tab */}
                      {activeTab === "onchain" && (
                        <div className="space-y-3">
                          {/* On-chain metrics */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                              <div className="flex items-center gap-2 mb-2">
                                <Eye size={13} className="text-neon-cyan" />
                                <span className="text-sm text-muted-foreground">{t("research.whaleActivity")}</span>
                              </div>
                              <p className="text-sm font-medium">{t(report.onChainData.whaleActivity)}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                              <div className="flex items-center gap-2 mb-2">
                                <Activity size={13} className={report.onChainData.netFlowDir === "out" ? "text-neon-green" : "text-neon-red"} />
                                <span className="text-sm text-muted-foreground">{t("research.netFlow")}</span>
                              </div>
                              <p className={`text-sm font-mono font-medium ${report.onChainData.netFlowDir === "out" ? "text-neon-green" : "text-neon-red"}`}>
                                {report.onChainData.netFlow}
                              </p>
                            </div>
                            <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                              <div className="flex items-center gap-2 mb-2">
                                <Flame size={13} className="text-orange-400" />
                                <span className="text-sm text-muted-foreground">{t("research.burnRate")}</span>
                              </div>
                              <p className="text-sm font-mono font-medium">{report.onChainData.burnRate}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                              <div className="flex items-center gap-2 mb-2">
                                <Lock size={13} className="text-neon-purple" />
                                <span className="text-sm text-muted-foreground">{t("research.stakingRate")}</span>
                              </div>
                              <p className="text-sm font-mono font-medium">{report.onChainData.stakingRate}</p>
                            </div>
                          </div>

                          {/* Additional on-chain info */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                              <span className="text-sm text-muted-foreground">{t("research.activeAddr")}</span>
                              <p className="text-sm font-mono font-semibold mt-0.5">{report.activeAddresses}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                              <span className="text-sm text-muted-foreground">DEX Vol</span>
                              <p className="text-sm font-mono font-semibold mt-0.5">{report.onChainData.dexVolume}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ─── AI Signal Tab ─── */}
                      {activeTab === "signal" && (() => {
                        const sig = report.aiSignal;
                        const signalColor = (s: string) => s === "strongBuy" ? "text-neon-green" : s === "buy" ? "text-neon-green/80" : s === "neutral" ? "text-yellow-500" : s === "sell" ? "text-neon-red/80" : "text-neon-red";
                        const signalBg = (s: string) => s === "strongBuy" ? "bg-neon-green/10 border-neon-green/20" : s === "buy" ? "bg-neon-green/8 border-neon-green/15" : s === "neutral" ? "bg-yellow-500/10 border-yellow-500/20" : s === "sell" ? "bg-neon-red/8 border-neon-red/15" : "bg-neon-red/10 border-neon-red/20";
                        const signalLabel = (s: string) => s === "strongBuy" ? t("research.signalStrongBuy") : s === "buy" ? t("research.signalBuy") : s === "neutral" ? t("research.signalNeutral") : s === "sell" ? t("research.signalSell") : t("research.signalStrongSell");
                        const indSignalColor = (s: string) => s === "buy" ? "text-neon-green" : s === "neutral" ? "text-yellow-500" : "text-neon-red";
                        const indSignalBg = (s: string) => s === "buy" ? "bg-neon-green/10" : s === "neutral" ? "bg-yellow-500/10" : "bg-neon-red/10";
                        const scoreColor = (v: number) => v >= 70 ? "text-neon-green" : v >= 50 ? "text-yellow-500" : "text-neon-red";
                        const scoreRing = (v: number) => v >= 70 ? "oklch(0.82 0.19 155)" : v >= 50 ? "oklch(0.75 0.15 85)" : "oklch(0.65 0.25 25)";

                        return (
                          <div className="space-y-3">
                            {/* ── Overall Score Gauge ── */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 border border-border/20">
                              <div className="flex items-center gap-4">
                                {/* Circular Score */}
                                <div className="relative w-24 h-24 shrink-0">
                                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="oklch(0.2 0.01 260)" strokeWidth="8" />
                                    <circle cx="50" cy="50" r="42" fill="none" stroke={scoreRing(sig.overallScore)} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${sig.overallScore * 2.64} 264`} className="transition-all duration-1000" />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-2xl font-bold font-mono ${scoreColor(sig.overallScore)}`}>{sig.overallScore}</span>
                                    <span className="text-[13px] text-muted-foreground">/100</span>
                                  </div>
                                </div>
                                {/* Signal Info */}
                                <div className="flex-1 space-y-2">
                                  <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-sm font-bold ${signalBg(sig.signal)} ${signalColor(sig.signal)}`}>
                                    <Target size={14} />
                                    {signalLabel(sig.signal)}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <p className="text-sm text-muted-foreground">{t("research.confidence")}</p>
                                      <p className="text-sm font-mono font-bold">{sig.confidence}%</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">{t("research.updated")}</p>
                                      <p className="text-[13px] font-mono text-neon-cyan">{sig.updatedAgo}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* ── Multi-Timeframe Analysis ── */}
                            <div className="p-4 rounded-xl bg-secondary/20 border border-border/15">
                              <p className="text-sm text-muted-foreground mb-2 font-mono flex items-center gap-2">
                                <Timer size={10} />
                                {t("research.timeframeAnalysis")}
                              </p>
                              <div className="grid grid-cols-4 gap-2.5">
                                {sig.timeframes.map((tf) => (
                                  <div key={tf.period} className={`text-center p-2 rounded-xl border ${signalBg(tf.signal)}`}>
                                    <p className="text-sm font-mono font-bold text-foreground mb-2">{tf.period}</p>
                                    <div className="w-full h-1.5 rounded-full bg-secondary/40 overflow-hidden mb-2">
                                      <div className="h-full rounded-full transition-all" style={{ width: `${tf.score}%`, backgroundColor: scoreRing(tf.score) }} />
                                    </div>
                                    <p className={`text-sm font-medium ${signalColor(tf.signal)}`}>{signalLabel(tf.signal)}</p>
                                    <p className={`text-sm font-mono font-bold ${scoreColor(tf.score)}`}>{tf.score}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* ── Technical Indicators Matrix ── */}
                            <div className="p-4 rounded-xl bg-secondary/20 border border-border/15">
                              <p className="text-sm text-muted-foreground mb-2 font-mono flex items-center gap-2">
                                <Gauge size={10} />
                                {t("research.technicalIndicators")}
                              </p>
                              <div className="space-y-3">
                                {sig.technicalIndicators.map((ind) => (
                                  <div key={ind.name} className="flex items-center gap-2 p-2.5 rounded-lg bg-background/30">
                                    <span className="text-sm text-muted-foreground w-20 shrink-0">{ind.name}</span>
                                    <span className="text-sm font-mono font-semibold flex-1">{ind.value}</span>
                                    <div className="w-16 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                                      <div className="h-full rounded-full transition-all" style={{ width: `${ind.score}%`, backgroundColor: scoreRing(ind.score) }} />
                                    </div>
                                    <span className={`text-sm font-medium px-2.5 py-1 rounded ${indSignalBg(ind.signal)} ${indSignalColor(ind.signal)}`}>
                                      {ind.signal === "buy" ? t("research.indBuy") : ind.signal === "sell" ? t("research.indSell") : t("research.indNeutral")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {/* Summary bar */}
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                                <div className="flex gap-3">
                                  <span className="text-sm text-neon-green flex items-center gap-1">
                                    <ArrowUp size={12} />
                                    {sig.technicalIndicators.filter(i => i.signal === "buy").length} {t("research.indBuy")}
                                  </span>
                                  <span className="text-sm text-yellow-500 flex items-center gap-1">
                                    <Minus size={12} />
                                    {sig.technicalIndicators.filter(i => i.signal === "neutral").length} {t("research.indNeutral")}
                                  </span>
                                  <span className="text-sm text-neon-red flex items-center gap-1">
                                    <ArrowDown size={12} />
                                    {sig.technicalIndicators.filter(i => i.signal === "sell").length} {t("research.indSell")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* ── AI Trading Strategy ── */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-neon-purple/8 to-neon-cyan/5 border border-neon-purple/15">
                              <p className="text-sm text-muted-foreground mb-3 font-mono flex items-center gap-2">
                                <Crosshair size={13} className="text-neon-purple" />
                                {t("research.aiStrategy")}
                              </p>
                              {/* Action badge */}
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${
                                  sig.strategy.action === "Long" ? "bg-neon-green/15 text-neon-green border-neon-green/25" :
                                  sig.strategy.action === "Wait" ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/25" :
                                  "bg-neon-red/15 text-neon-red border-neon-red/25"
                                }`}>
                                  {sig.strategy.action}
                                </span>
                                <span className="text-sm text-muted-foreground">{sig.strategy.timeHorizon}</span>
                              </div>
                              {/* Strategy grid */}
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="p-3 rounded-lg bg-background/30">
                                  <p className="text-sm text-muted-foreground">{t("research.entry")}</p>
                                  <p className="text-[13px] font-mono font-semibold text-neon-cyan">{sig.strategy.entry}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-background/30">
                                  <p className="text-sm text-muted-foreground">{t("research.stopLoss")}</p>
                                  <p className="text-[13px] font-mono font-semibold text-neon-red">{sig.strategy.stopLoss}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-background/30">
                                  <p className="text-sm text-muted-foreground">{t("research.tp1")}</p>
                                  <p className="text-[13px] font-mono font-semibold text-neon-green">{sig.strategy.takeProfit1}</p>
                                </div>
                                <div className="p-3 rounded-lg bg-background/30">
                                  <p className="text-sm text-muted-foreground">{t("research.tp2")}</p>
                                  <p className="text-[13px] font-mono font-semibold text-neon-green">{sig.strategy.takeProfit2}</p>
                                </div>
                              </div>
                              {/* Risk params */}
                              <div className="flex gap-2 mb-2.5">
                                <div className="flex-1 p-2.5 rounded-lg bg-background/20 text-center">
                                  <p className="text-[13px] text-muted-foreground">{t("research.riskReward")}</p>
                                  <p className="text-[13px] font-mono font-bold text-neon-purple">{sig.strategy.riskReward}</p>
                                </div>
                                <div className="flex-1 p-2.5 rounded-lg bg-background/20 text-center">
                                  <p className="text-[13px] text-muted-foreground">{t("research.posSize")}</p>
                                  <p className="text-sm font-mono font-semibold">{sig.strategy.positionSize}</p>
                                </div>
                                <div className="flex-1 p-2.5 rounded-lg bg-background/20 text-center">
                                  <p className="text-[13px] text-muted-foreground">{t("research.leverage")}</p>
                                  <p className="text-sm font-mono font-semibold">{sig.strategy.leverage}</p>
                                </div>
                              </div>
                              {/* AI Reasoning */}
                              <div className="p-2 rounded-lg bg-neon-purple/5 border border-neon-purple/10">
                                <p className="text-sm text-neon-purple mb-0.5 flex items-center gap-2">
                                  <Sparkles size={9} />
                                  {t("research.aiReasoning")}
                                </p>
                                <p className="text-[13px] leading-relaxed text-muted-foreground">{t(sig.strategy.reasoning)}</p>
                              </div>
                            </div>

                            {/* ── Signal History & Accuracy ── */}
                            <div className="p-4 rounded-xl bg-secondary/20 border border-border/15">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-muted-foreground font-mono flex items-center gap-2">
                                  <CircleDot size={10} />
                                  {t("research.signalHistory")}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-neon-green font-mono">{t("research.winRate")}: {sig.accuracy.winRate}%</span>
                                  <span className="text-sm text-neon-cyan font-mono">{t("research.avgReturn")}: +{sig.accuracy.avgReturn}%</span>
                                </div>
                              </div>
                              {/* History table */}
                              <div className="space-y-3">
                                {sig.signalHistory.map((h, i) => (
                                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background/20">
                                    <span className="text-sm text-muted-foreground font-mono w-14 shrink-0">{h.date}</span>
                                    <span className={`text-sm font-medium px-2.5 py-1 rounded w-10 text-center ${
                                      h.signal === "Buy" ? "bg-neon-green/10 text-neon-green" :
                                      h.signal === "Sell" ? "bg-neon-red/10 text-neon-red" :
                                      "bg-yellow-500/10 text-yellow-500"
                                    }`}>{h.signal}</span>
                                    <span className="text-sm font-mono flex-1">{h.price}</span>
                                    <span className="flex items-center gap-0.5">
                                      {h.result === "win" ? <CheckCircle size={10} className="text-neon-green" /> :
                                       h.result === "loss" ? <XCircle size={10} className="text-neon-red" /> :
                                       <Clock size={10} className="text-yellow-500" />}
                                    </span>
                                    <span className={`text-sm font-mono font-semibold w-14 text-right ${
                                      h.result === "win" ? "text-neon-green" : h.result === "loss" ? "text-neon-red" : "text-yellow-500"
                                    }`}>{h.pnl}</span>
                                  </div>
                                ))}
                              </div>
                              {/* Accuracy summary */}
                              <div className="grid grid-cols-4 gap-2.5 mt-2 pt-2 border-t border-border/10">
                                <div className="text-center">
                                  <p className="text-[13px] text-muted-foreground">{t("research.totalSignals")}</p>
                                  <p className="text-sm font-mono font-bold">{sig.accuracy.total}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[13px] text-muted-foreground">{t("research.wins")}</p>
                                  <p className="text-sm font-mono font-bold text-neon-green">{sig.accuracy.wins}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[13px] text-muted-foreground">{t("research.losses")}</p>
                                  <p className="text-sm font-mono font-bold text-neon-red">{sig.accuracy.losses}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[13px] text-muted-foreground">{t("research.winRate")}</p>
                                  <p className={`text-sm font-mono font-bold ${sig.accuracy.winRate >= 65 ? "text-neon-green" : sig.accuracy.winRate >= 50 ? "text-yellow-500" : "text-neon-red"}`}>{sig.accuracy.winRate}%</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Social Sentiment */}
                      <div className="p-4 rounded-xl bg-secondary/20 border border-border/15">
                        <p className="text-sm text-muted-foreground mb-2 font-mono flex items-center gap-2">
                          <Users size={10} />
                          {t("research.socialSentiment")}
                        </p>
                        <div className="space-y-3">
                          <SentimentBar score={report.socialSentiment.score} label={t("research.sentimentScore")} />
                          <SentimentBar score={report.socialSentiment.fearGreedIndex} label={t("research.fearGreedIndex")} />
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                          <span className="text-sm text-muted-foreground">
                            {t("research.mentions")}: <span className="font-mono font-semibold text-foreground">{report.socialSentiment.mentions24h.toLocaleString()}</span>
                          </span>
                          <span className={`text-sm font-medium px-2 py-1 rounded-md ${
                            report.socialSentiment.trend === "bullish" ? "bg-neon-green/10 text-neon-green" :
                            report.socialSentiment.trend === "bearish" ? "bg-neon-red/10 text-neon-red" :
                            "bg-yellow-500/10 text-yellow-500"
                          }`}>
                            {t(`research.trend${report.socialSentiment.trend.charAt(0).toUpperCase() + report.socialSentiment.trend.slice(1)}`)}
                          </span>
                        </div>
                      </div>

                      {/* AI Summary */}
                      <div className="p-3 rounded-xl bg-neon-purple/5 border border-neon-purple/15">
                        <p className="text-sm text-muted-foreground mb-2.5 flex items-center gap-2">
                          <Sparkles size={12} className="text-neon-purple" />
                          {t("research.aiAnalysis")}
                        </p>
                        <p className="text-sm leading-relaxed">{t(report.aiSummary)}</p>
                      </div>

                      {/* Risk Factors */}
                      {report.riskFactors.length > 0 && (
                        <div className="p-4 rounded-xl bg-secondary/20 border border-border/15">
                          <p className="text-sm text-muted-foreground mb-2 font-mono flex items-center gap-2">
                            <AlertTriangle size={10} />
                            {t("research.riskFactors")}
                          </p>
                          <div className="flex flex-wrap gap-2.5">
                            {report.riskFactors.map((rf, i) => (
                              <span key={i} className={`text-sm px-2 py-1 rounded-md border ${
                                report.riskLevel === "high" ? "bg-neon-red/8 text-neon-red border-neon-red/20" :
                                report.riskLevel === "medium" ? "bg-yellow-500/8 text-yellow-500 border-yellow-500/20" :
                                "bg-neon-green/8 text-muted-foreground border-border/20"
                              }`}>
                                {t(rf)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Security & Dev */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-secondary/30 space-y-2.5">
                          <div className="flex items-center gap-2.5">
                            <Shield size={13} className="text-neon-green" />
                            <span className="text-sm text-muted-foreground">{t("research.security")}</span>
                          </div>
                          <p className="text-sm font-mono font-semibold text-neon-green">{report.securityScore}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {report.contractVerified && <span className="text-neon-green">✓ {t("research.verified")}</span>}
                          </div>
                          <p className="text-sm text-muted-foreground">{report.auditStatus}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-secondary/30 space-y-2.5">
                          <div className="flex items-center gap-2.5">
                            <Code size={13} className="text-neon-cyan" />
                            <span className="text-sm text-muted-foreground">{t("research.devActivity")}</span>
                          </div>
                          <p className="text-sm font-mono font-semibold">{report.devCommits.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">commits/mo</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setLocation(`/app/research/${report.token.toLowerCase()}`)}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-neon-purple/10 text-neon-purple text-sm font-medium hover:bg-neon-purple/20 border border-neon-purple/20 transition-all"
                          >
                            <ExternalLink size={13} />
                            {t("research.viewDetail")}
                          </button>
                          <button
                            onClick={() => toggleWatchlist(report.id)}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                              isWatched
                                ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                : "bg-secondary/30 text-muted-foreground border-border/20 hover:text-foreground"
                            }`}
                          >
                            {isWatched ? <Star size={13} fill="currentColor" /> : <StarOff size={13} />}
                            {isWatched ? t("research.watching") : t("research.watch")}
                          </button>
                          <button
                            onClick={() => { setShowShareModal(report.id); setShareCaption(""); setShareSuccess(false); }}
                            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-neon-cyan/10 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/20 border border-neon-cyan/20 transition-all"
                          >
                            <Share2 size={13} />
                            {t("research.shareToMoments")}
                          </button>
                          {(
                              <button
                            onClick={() => {
                                if (!isResearchAuthed) { setShowResearchLoginPrompt(true); return; }
                                const targetPrice = prompt(`设置 ${report.token} 价格预警\n当前价格: ${report.price}\n请输入目标价格 (USD):`);
                                if (!targetPrice || isNaN(Number(targetPrice))) return;
                                const condition = Number(targetPrice) > report.priceNum ? "above" : "below";
                                createResearchAlert.mutate({
                                  tokenSymbol: report.token,
                                  tokenId: report.token.toLowerCase(),
                                  targetPrice,
                                  condition,
                                });
                              }}
                              disabled={createResearchAlert.isPending}
                              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-neon-purple/10 text-neon-purple text-sm font-medium hover:bg-neon-purple/20 border border-neon-purple/20 transition-all disabled:opacity-50"
                            >
                              <Crosshair size={13} />
                              设置预警
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono flex items-center gap-2">
                          <Clock size={10} />
                          {report.timestamp}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Share to Moments Modal ─── */}
      <AnimatePresence>
        {showShareModal && (() => {
          const report = null as ResearchReport | null;
          if (!report) return null;
          const isPositive = false;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 [backdrop-filter:none] flex items-end justify-center"
              onClick={() => setShowShareModal(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-card border-t border-border/30 rounded-t-3xl p-4 space-y-4"
              >
                {/* Modal header */}
                <div className="flex items-center justify-between">
                  <button onClick={() => setShowShareModal(null)} className="p-2 text-muted-foreground hover:text-foreground">
                    <span className="text-sm">{t("research.cancel")}</span>
                  </button>
                  <h3 className="text-sm font-semibold font-display flex items-center gap-2.5">
                    <Share2 size={14} className="text-neon-cyan" />
                    {t("research.shareToMoments")}
                  </h3>
                  <button
                    onClick={() => {
                      setIsSharing(true);
                      setTimeout(() => {
                        setIsSharing(false);
                        setShareSuccess(true);
                        toast.success(t("research.shareSuccess"));
                        setTimeout(() => setShowShareModal(null), 1200);
                      }, 1000);
                    }}
                    disabled={isSharing || shareSuccess}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      shareSuccess
                        ? "bg-neon-green/20 text-neon-green"
                        : isSharing
                        ? "bg-secondary/40 text-muted-foreground"
                        : "bg-neon-cyan text-background hover:opacity-90"
                    }`}
                  >
                    {shareSuccess ? (
                      <span className="flex items-center gap-2"><Check size={12} /> {t("research.shared")}</span>
                    ) : isSharing ? (
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-muted-foreground/50 border-t-muted-foreground rounded-full animate-spin" />
                        {t("research.sharing")}
                      </span>
                    ) : (
                      t("research.share")
                    )}
                  </button>
                </div>

                {/* Caption input */}
                <textarea
                  value={shareCaption}
                  onChange={(e) => setShareCaption(e.target.value)}
                  placeholder={t("research.addCaption")}
                  className="w-full bg-secondary/30 rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none border border-border/20 focus:border-neon-cyan/30 transition-colors min-h-[60px]"
                  maxLength={280}
                />

                {/* Research card preview */}
                <div className="rounded-2xl border border-border/30 bg-secondary/20 overflow-hidden">
                  <div className="p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-neon-purple/15 flex items-center justify-center text-lg">
                          {report.icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">AI Research Report</p>
                          <p className="text-sm font-bold font-display">{report.token}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold">{report.price}</p>
                        <ChangeIndicator value={report.change24h} size="xs" />
                      </div>
                    </div>

                    {/* Mini metrics */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="text-center p-2.5 rounded-lg bg-background/40">
                        <p className="text-sm text-muted-foreground">{t("research.aiScore")}</p>
                        <p className="text-sm font-mono font-bold text-neon-cyan">{report.aiScore}/10</p>
                      </div>
                      <div className="text-center p-2.5 rounded-lg bg-background/40">
                        <p className="text-sm text-muted-foreground">{t("research.aiVerdict")}</p>
                        <p className={`text-sm font-mono font-bold ${report.aiScore >= 8 ? "text-neon-green" : report.aiScore >= 6 ? "text-neon-cyan" : "text-neon-red"}`}>
                          {t(report.aiVerdictKey)}
                        </p>
                      </div>
                      <div className="text-center p-2.5 rounded-lg bg-background/40">
                        <p className="text-sm text-muted-foreground">{t("research.security")}</p>
                        <p className="text-sm font-mono font-bold text-neon-green">{report.securityScore}</p>
                      </div>
                    </div>

                    {/* Summary preview */}
                    <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">{t(report.aiSummary)}</p>

                    <div className="flex items-center gap-2 mt-2 text-sm text-neon-cyan">
                      <ExternalLink size={10} />
                      <span>{t("research.viewFullReport")}</span>
                    </div>
                  </div>
                </div>

                {/* Character count */}
                <div className="flex justify-end">
                  <span className={`text-sm font-mono ${shareCaption.length > 250 ? "text-neon-red" : "text-muted-foreground"}`}>
                    {shareCaption.length}/280
                  </span>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ─── Login Prompt Modal ─── */}
      <AnimatePresence>
        {showResearchLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 [backdrop-filter:none] flex items-end justify-center"
            onClick={() => setShowResearchLoginPrompt(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card border-t border-border/30 rounded-t-3xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <button onClick={() => setShowResearchLoginPrompt(false)} className="p-2 text-muted-foreground hover:text-foreground">
                  <span className="text-lg">×</span>
                </button>
                <div className="w-8 h-1 rounded-full bg-border mx-auto" />
                <div className="w-7" />
              </div>
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#00d4ff] flex items-center justify-center shadow-lg shadow-[#a855f7]/20">
                  <span className="text-2xl">🔐</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground mb-2">登录后解锁投研功能</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    登录 Manus 账号，收藏代币、设置价格预警、分享投研报告
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { icon: "⭐", text: "收藏代币到自定义自选股" },
                  { icon: "🔔", text: "设置价格预警，行情到位第一时间知道" },
                  { icon: "📊", text: "分享 AI 投研报告到社区动态" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-background/40 border border-border/20">
                    <span className="text-base">{item.icon}</span>
                    <span className="text-sm text-foreground/80">{item.text}</span>
                  </div>
                ))}
              </div>
              <a
                href={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
                className="block w-full h-12 rounded-xl bg-gradient-to-r from-[#a855f7] to-[#00d4ff] text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-[#a855f7]/20 flex items-center justify-center"
              >
                立即登录
              </a>
              <p className="text-center text-sm text-muted-foreground pb-2">
                安全登录 · 无需密码 · 支持 Web3 钱包
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
 
