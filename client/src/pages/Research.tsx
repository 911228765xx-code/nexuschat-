/*
 * Research — AI投研机器人页面
 * 全面增强版：更多代币 + 时间周期切换 + 搜索交互 + 风险指标 + 市场情绪 + 链上数据
 * Design: Cyberpunk dark theme with neon accents, Space Grotesk headings
 */
import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Search, TrendingUp, TrendingDown, Shield, Code, ChevronDown, ChevronUp,
  Sparkles, Share2, Check, ExternalLink, AlertTriangle, Activity,
  BarChart3, Flame, Eye, Clock, Zap, Globe, Lock, Users, ArrowUpRight,
  ArrowDownRight, Minus, RefreshCw, BookOpen, Filter, Star, StarOff,
  Target, Crosshair, Gauge, CircleDot, CheckCircle, XCircle, Timer,
  ArrowUp, ArrowDown, Signal
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
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

// ==================== Mock Data ====================

const generatePriceHistory = (base: number, volatility: number, trend: number, points: number, labels: string[]) => {
  let price = base * (1 - trend * 0.3);
  return labels.map((time) => {
    price = price + (Math.random() - 0.45) * volatility + trend * (volatility * 0.1);
    price = Math.max(price * 0.5, price);
    return { time, price: Math.round(price * 100) / 100 };
  });
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const days30 = Array.from({ length: 30 }, (_, i) => `${i + 1}`);
const days7 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const mockReports: ResearchReport[] = [
  {
    id: "1",
    token: "BTC",
    icon: "₿",
    price: "$97,245.00",
    priceNum: 97245,
    change24h: 1.8,
    change7d: 5.2,
    change30d: 12.4,
    marketCap: "$1.91T",
    rank: 1,
    tvl: "$—",
    volume24h: "$42.8B",
    activeAddresses: "1,023,456",
    holders: "48.2M",
    aiScore: 9.2,
    aiVerdict: "Strong Buy",
    aiVerdictKey: "research.verdictStrongBuy",
    aiSummary: "research.btcSummary",
    securityScore: "A+",
    devActivity: "High (1,245 commits/mo)",
    devCommits: 1245,
    contractVerified: true,
    auditStatus: "N/A (Native)",
    riskLevel: "low",
    riskFactors: ["research.riskRegulatory", "research.riskMacro"],
    timestamp: "1 min ago",
    category: "L1",
    chain: "Bitcoin",
    priceHistory: generatePriceHistory(97245, 3000, 0.5, 12, months),
    priceHistory7d: generatePriceHistory(97245, 1500, 0.15, 7, days7),
    priceHistory30d: generatePriceHistory(97245, 2000, 0.3, 30, days30),
    radarData: [
      { metric: "Security", score: 98, fullMark: 100 },
      { metric: "Dev Activity", score: 78, fullMark: 100 },
      { metric: "Ecosystem", score: 95, fullMark: 100 },
      { metric: "Tokenomics", score: 96, fullMark: 100 },
      { metric: "Community", score: 97, fullMark: 100 },
      { metric: "Liquidity", score: 99, fullMark: 100 },
    ],
    volumeHistory: months.map((m) => ({ time: m, volume: Math.round(35 + Math.random() * 20) })),
    onChainData: {
      whaleActivity: "research.whaleAccumulating",
      netFlow: "-12,450 BTC",
      netFlowDir: "out",
      burnRate: "N/A",
      stakingRate: "N/A",
      dexVolume: "$1.2B",
    },
    socialSentiment: { score: 82, trend: "bullish", mentions24h: 245800, fearGreedIndex: 72 },
    aiSignal: {
      overallScore: 82, signal: "strongBuy", confidence: 88, updatedAgo: "30s ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "62.4", signal: "buy", score: 72 },
        { name: "MACD", value: "+1,245", signal: "buy", score: 78 },
        { name: "Bollinger", value: "Upper Band", signal: "neutral", score: 55 },
        { name: "MA Cross", value: "Golden Cross", signal: "buy", score: 85 },
        { name: "Volume", value: "Above Avg", signal: "buy", score: 80 },
        { name: "Stochastic", value: "68.2", signal: "buy", score: 70 },
        { name: "ADX", value: "32.5", signal: "buy", score: 75 },
        { name: "OBV", value: "Rising", signal: "buy", score: 82 },
      ],
      timeframes: [
        { period: "1H", signal: "buy", score: 72 },
        { period: "4H", signal: "strongBuy", score: 85 },
        { period: "1D", signal: "strongBuy", score: 88 },
        { period: "1W", signal: "buy", score: 76 },
      ],
      strategy: {
        action: "Long", entry: "$96,800 - $97,200", stopLoss: "$94,500 (-2.8%)",
        takeProfit1: "$99,500 (+2.4%)", takeProfit2: "$103,000 (+6.0%)", riskReward: "1:2.1",
        positionSize: "2-3% of portfolio", leverage: "3x-5x", timeHorizon: "3-7 days",
        reasoning: "research.btcStrategyReason",
      },
      signalHistory: [
        { date: "Feb 25", signal: "Buy", price: "$95,200", result: "win", pnl: "+3.2%" },
        { date: "Feb 20", signal: "Hold", price: "$94,800", result: "win", pnl: "+1.8%" },
        { date: "Feb 15", signal: "Buy", price: "$92,100", result: "win", pnl: "+5.6%" },
        { date: "Feb 10", signal: "Sell", price: "$98,400", result: "loss", pnl: "-1.2%" },
        { date: "Feb 5", signal: "Buy", price: "$91,500", result: "win", pnl: "+4.8%" },
      ],
      accuracy: { total: 48, wins: 35, losses: 13, winRate: 72.9, avgReturn: 3.2 },
    },
  },
  {
    id: "2",
    token: "ETH",
    icon: "Ξ",
    price: "$3,842.50",
    priceNum: 3842.5,
    change24h: 2.4,
    change7d: 3.8,
    change30d: 8.6,
    marketCap: "$461.8B",
    rank: 2,
    tvl: "$58.2B",
    volume24h: "$18.5B",
    activeAddresses: "524,891",
    holders: "120.5M",
    aiScore: 8.5,
    aiVerdict: "Strong Buy",
    aiVerdictKey: "research.verdictStrongBuy",
    aiSummary: "research.ethSummary",
    securityScore: "A+",
    devActivity: "Very High (2,847 commits/mo)",
    devCommits: 2847,
    contractVerified: true,
    auditStatus: "Multiple Audits",
    riskLevel: "low",
    riskFactors: ["research.riskGasSpike", "research.riskCompetition"],
    timestamp: "2 min ago",
    category: "L1",
    chain: "Ethereum",
    priceHistory: generatePriceHistory(3842, 200, 0.4, 12, months),
    priceHistory7d: generatePriceHistory(3842, 100, 0.1, 7, days7),
    priceHistory30d: generatePriceHistory(3842, 150, 0.2, 30, days30),
    radarData: [
      { metric: "Security", score: 95, fullMark: 100 },
      { metric: "Dev Activity", score: 92, fullMark: 100 },
      { metric: "Ecosystem", score: 88, fullMark: 100 },
      { metric: "Tokenomics", score: 82, fullMark: 100 },
      { metric: "Community", score: 90, fullMark: 100 },
      { metric: "Liquidity", score: 96, fullMark: 100 },
    ],
    volumeHistory: months.map((m) => ({ time: m, volume: Math.round(14 + Math.random() * 10) })),
    onChainData: {
      whaleActivity: "research.whaleAccumulating",
      netFlow: "-85,200 ETH",
      netFlowDir: "out",
      burnRate: "2.1 ETH/min",
      stakingRate: "27.3%",
      dexVolume: "$8.5B",
    },
    socialSentiment: { score: 78, trend: "bullish", mentions24h: 189500, fearGreedIndex: 68 },
    aiSignal: {
      overallScore: 75, signal: "buy", confidence: 82, updatedAgo: "45s ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "58.7", signal: "buy", score: 65 },
        { name: "MACD", value: "+42.3", signal: "buy", score: 72 },
        { name: "Bollinger", value: "Mid Band", signal: "neutral", score: 50 },
        { name: "MA Cross", value: "Bullish", signal: "buy", score: 78 },
        { name: "Volume", value: "Average", signal: "neutral", score: 52 },
        { name: "Stochastic", value: "55.8", signal: "neutral", score: 55 },
        { name: "ADX", value: "28.1", signal: "buy", score: 68 },
        { name: "OBV", value: "Rising", signal: "buy", score: 75 },
      ],
      timeframes: [
        { period: "1H", signal: "neutral", score: 55 },
        { period: "4H", signal: "buy", score: 72 },
        { period: "1D", signal: "buy", score: 78 },
        { period: "1W", signal: "buy", score: 74 },
      ],
      strategy: {
        action: "Long", entry: "$3,800 - $3,850", stopLoss: "$3,680 (-3.5%)",
        takeProfit1: "$3,980 (+3.6%)", takeProfit2: "$4,200 (+9.3%)", riskReward: "1:2.7",
        positionSize: "3-5% of portfolio", leverage: "2x-4x", timeHorizon: "5-14 days",
        reasoning: "research.ethStrategyReason",
      },
      signalHistory: [
        { date: "Feb 25", signal: "Buy", price: "$3,720", result: "win", pnl: "+2.8%" },
        { date: "Feb 21", signal: "Hold", price: "$3,650", result: "win", pnl: "+1.5%" },
        { date: "Feb 16", signal: "Sell", price: "$3,900", result: "win", pnl: "+2.1%" },
        { date: "Feb 11", signal: "Buy", price: "$3,580", result: "win", pnl: "+4.2%" },
        { date: "Feb 6", signal: "Buy", price: "$3,450", result: "loss", pnl: "-2.1%" },
      ],
      accuracy: { total: 42, wins: 30, losses: 12, winRate: 71.4, avgReturn: 2.8 },
    },
  },
  {
    id: "3",
    token: "SOL",
    icon: "◎",
    price: "$187.30",
    priceNum: 187.3,
    change24h: -1.2,
    change7d: 2.1,
    change30d: -3.5,
    marketCap: "$82.4B",
    rank: 5,
    tvl: "$8.9B",
    volume24h: "$5.2B",
    activeAddresses: "1,234,567",
    holders: "15.8M",
    aiScore: 7.2,
    aiVerdict: "Buy",
    aiVerdictKey: "research.verdictBuy",
    aiSummary: "research.solSummary",
    securityScore: "A",
    devActivity: "High (1,523 commits/mo)",
    devCommits: 1523,
    contractVerified: true,
    auditStatus: "Audited",
    riskLevel: "medium",
    riskFactors: ["research.riskNetworkOutage", "research.riskFTXUnlock"],
    timestamp: "5 min ago",
    category: "L1",
    chain: "Solana",
    priceHistory: generatePriceHistory(187, 15, 0.2, 12, months),
    priceHistory7d: generatePriceHistory(187, 8, 0.05, 7, days7),
    priceHistory30d: generatePriceHistory(187, 12, -0.1, 30, days30),
    radarData: [
      { metric: "Security", score: 75, fullMark: 100 },
      { metric: "Dev Activity", score: 80, fullMark: 100 },
      { metric: "Ecosystem", score: 82, fullMark: 100 },
      { metric: "Tokenomics", score: 68, fullMark: 100 },
      { metric: "Community", score: 88, fullMark: 100 },
      { metric: "Liquidity", score: 85, fullMark: 100 },
    ],
    volumeHistory: months.map((m) => ({ time: m, volume: Math.round(3 + Math.random() * 5) })),
    onChainData: {
      whaleActivity: "research.whaleDistributing",
      netFlow: "+234,500 SOL",
      netFlowDir: "in",
      burnRate: "50% fees",
      stakingRate: "65.8%",
      dexVolume: "$2.1B",
    },
    socialSentiment: { score: 65, trend: "neutral", mentions24h: 98200, fearGreedIndex: 55 },
    aiSignal: {
      overallScore: 58, signal: "neutral", confidence: 65, updatedAgo: "1m ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "45.2", signal: "neutral", score: 48 },
        { name: "MACD", value: "-2.8", signal: "sell", score: 38 },
        { name: "Bollinger", value: "Lower Band", signal: "buy", score: 68 },
        { name: "MA Cross", value: "Bearish", signal: "sell", score: 35 },
        { name: "Volume", value: "Below Avg", signal: "sell", score: 40 },
        { name: "Stochastic", value: "32.5", signal: "buy", score: 65 },
        { name: "ADX", value: "18.4", signal: "neutral", score: 45 },
        { name: "OBV", value: "Flat", signal: "neutral", score: 50 },
      ],
      timeframes: [
        { period: "1H", signal: "sell", score: 38 },
        { period: "4H", signal: "neutral", score: 52 },
        { period: "1D", signal: "neutral", score: 55 },
        { period: "1W", signal: "buy", score: 68 },
      ],
      strategy: {
        action: "Wait", entry: "$178 - $182 (if support holds)", stopLoss: "$170 (-5.0%)",
        takeProfit1: "$195 (+7.2%)", takeProfit2: "$210 (+15.5%)", riskReward: "1:1.4",
        positionSize: "1-2% of portfolio", leverage: "1x-2x", timeHorizon: "7-21 days",
        reasoning: "research.solStrategyReason",
      },
      signalHistory: [
        { date: "Feb 24", signal: "Sell", price: "$192", result: "win", pnl: "+2.5%" },
        { date: "Feb 19", signal: "Hold", price: "$188", result: "loss", pnl: "-1.8%" },
        { date: "Feb 14", signal: "Buy", price: "$175", result: "win", pnl: "+6.8%" },
        { date: "Feb 9", signal: "Sell", price: "$198", result: "win", pnl: "+3.2%" },
        { date: "Feb 4", signal: "Buy", price: "$165", result: "win", pnl: "+8.5%" },
      ],
      accuracy: { total: 38, wins: 25, losses: 13, winRate: 65.8, avgReturn: 2.1 },
    },
  },
  {
    id: "4",
    token: "ARB",
    icon: "🔵",
    price: "$1.85",
    priceNum: 1.85,
    change24h: 4.5,
    change7d: 8.2,
    change30d: 15.3,
    marketCap: "$7.2B",
    rank: 38,
    tvl: "$3.2B",
    volume24h: "$890M",
    activeAddresses: "312,456",
    holders: "2.1M",
    aiScore: 7.8,
    aiVerdict: "Buy",
    aiVerdictKey: "research.verdictBuy",
    aiSummary: "research.arbSummary",
    securityScore: "A",
    devActivity: "Very High (1,890 commits/mo)",
    devCommits: 1890,
    contractVerified: true,
    auditStatus: "Trail of Bits, OpenZeppelin",
    riskLevel: "medium",
    riskFactors: ["research.riskTokenUnlock", "research.riskL2Competition"],
    timestamp: "8 min ago",
    category: "L2",
    chain: "Arbitrum",
    priceHistory: generatePriceHistory(1.85, 0.15, 0.3, 12, months),
    priceHistory7d: generatePriceHistory(1.85, 0.08, 0.15, 7, days7),
    priceHistory30d: generatePriceHistory(1.85, 0.12, 0.25, 30, days30),
    radarData: [
      { metric: "Security", score: 85, fullMark: 100 },
      { metric: "Dev Activity", score: 90, fullMark: 100 },
      { metric: "Ecosystem", score: 78, fullMark: 100 },
      { metric: "Tokenomics", score: 65, fullMark: 100 },
      { metric: "Community", score: 72, fullMark: 100 },
      { metric: "Liquidity", score: 80, fullMark: 100 },
    ],
    volumeHistory: months.map((m) => ({ time: m, volume: Math.round(0.5 + Math.random() * 1.5) })),
    onChainData: {
      whaleActivity: "research.whaleAccumulating",
      netFlow: "-15.2M ARB",
      netFlowDir: "out",
      burnRate: "N/A",
      stakingRate: "12.5%",
      dexVolume: "$450M",
    },
    socialSentiment: { score: 71, trend: "bullish", mentions24h: 42300, fearGreedIndex: 62 },
    aiSignal: {
      overallScore: 71, signal: "buy", confidence: 75, updatedAgo: "2m ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "65.8", signal: "buy", score: 70 },
        { name: "MACD", value: "+0.08", signal: "buy", score: 68 },
        { name: "Bollinger", value: "Upper Band", signal: "neutral", score: 52 },
        { name: "MA Cross", value: "Golden Cross", signal: "buy", score: 82 },
        { name: "Volume", value: "Above Avg", signal: "buy", score: 75 },
        { name: "Stochastic", value: "72.1", signal: "neutral", score: 48 },
        { name: "ADX", value: "26.8", signal: "buy", score: 65 },
        { name: "OBV", value: "Rising", signal: "buy", score: 72 },
      ],
      timeframes: [
        { period: "1H", signal: "buy", score: 68 },
        { period: "4H", signal: "buy", score: 74 },
        { period: "1D", signal: "buy", score: 72 },
        { period: "1W", signal: "neutral", score: 58 },
      ],
      strategy: {
        action: "Long", entry: "$1.80 - $1.86", stopLoss: "$1.68 (-8.6%)",
        takeProfit1: "$2.05 (+10.8%)", takeProfit2: "$2.30 (+24.3%)", riskReward: "1:1.3",
        positionSize: "1-2% of portfolio", leverage: "2x-3x", timeHorizon: "7-14 days",
        reasoning: "research.arbStrategyReason",
      },
      signalHistory: [
        { date: "Feb 25", signal: "Buy", price: "$1.72", result: "win", pnl: "+7.6%" },
        { date: "Feb 20", signal: "Hold", price: "$1.65", result: "win", pnl: "+3.0%" },
        { date: "Feb 15", signal: "Buy", price: "$1.55", result: "win", pnl: "+12.9%" },
        { date: "Feb 10", signal: "Sell", price: "$1.80", result: "loss", pnl: "-3.3%" },
        { date: "Feb 5", signal: "Buy", price: "$1.48", result: "win", pnl: "+10.8%" },
      ],
      accuracy: { total: 32, wins: 22, losses: 10, winRate: 68.8, avgReturn: 3.5 },
    },
  },
  {
    id: "5",
    token: "LINK",
    icon: "⬡",
    price: "$22.45",
    priceNum: 22.45,
    change24h: 3.1,
    change7d: 6.7,
    change30d: 18.9,
    marketCap: "$14.1B",
    rank: 12,
    tvl: "$—",
    volume24h: "$1.8B",
    activeAddresses: "89,234",
    holders: "725K",
    aiScore: 8.1,
    aiVerdict: "Strong Buy",
    aiVerdictKey: "research.verdictStrongBuy",
    aiSummary: "research.linkSummary",
    securityScore: "A+",
    devActivity: "High (980 commits/mo)",
    devCommits: 980,
    contractVerified: true,
    auditStatus: "Multiple Audits",
    riskLevel: "low",
    riskFactors: ["research.riskTokenConcentration"],
    timestamp: "12 min ago",
    category: "DeFi",
    chain: "Multi-chain",
    priceHistory: generatePriceHistory(22.45, 2, 0.4, 12, months),
    priceHistory7d: generatePriceHistory(22.45, 1, 0.12, 7, days7),
    priceHistory30d: generatePriceHistory(22.45, 1.5, 0.3, 30, days30),
    radarData: [
      { metric: "Security", score: 92, fullMark: 100 },
      { metric: "Dev Activity", score: 82, fullMark: 100 },
      { metric: "Ecosystem", score: 90, fullMark: 100 },
      { metric: "Tokenomics", score: 70, fullMark: 100 },
      { metric: "Community", score: 78, fullMark: 100 },
      { metric: "Liquidity", score: 88, fullMark: 100 },
    ],
    volumeHistory: months.map((m) => ({ time: m, volume: Math.round(1 + Math.random() * 2) })),
    onChainData: {
      whaleActivity: "research.whaleAccumulating",
      netFlow: "-2.5M LINK",
      netFlowDir: "out",
      burnRate: "N/A",
      stakingRate: "35.2%",
      dexVolume: "$320M",
    },
    socialSentiment: { score: 74, trend: "bullish", mentions24h: 56700, fearGreedIndex: 65 },
    aiSignal: {
      overallScore: 73, signal: "buy", confidence: 78, updatedAgo: "1m ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "61.2", signal: "buy", score: 68 },
        { name: "MACD", value: "+0.85", signal: "buy", score: 72 },
        { name: "Bollinger", value: "Mid Band", signal: "neutral", score: 55 },
        { name: "MA Cross", value: "Bullish", signal: "buy", score: 75 },
        { name: "Volume", value: "Above Avg", signal: "buy", score: 70 },
        { name: "Stochastic", value: "58.4", signal: "neutral", score: 55 },
        { name: "ADX", value: "24.6", signal: "neutral", score: 52 },
        { name: "OBV", value: "Rising", signal: "buy", score: 78 },
      ],
      timeframes: [
        { period: "1H", signal: "buy", score: 65 },
        { period: "4H", signal: "buy", score: 72 },
        { period: "1D", signal: "buy", score: 75 },
        { period: "1W", signal: "neutral", score: 58 },
      ],
      strategy: {
        action: "Long", entry: "$22.00 - $22.50", stopLoss: "$20.80 (-6.5%)",
        takeProfit1: "$24.50 (+9.1%)", takeProfit2: "$27.00 (+20.2%)", riskReward: "1:1.4",
        positionSize: "2-3% of portfolio", leverage: "2x-3x", timeHorizon: "7-21 days",
        reasoning: "research.linkStrategyReason",
      },
      signalHistory: [
        { date: "Feb 24", signal: "Buy", price: "$20.80", result: "win", pnl: "+5.8%" },
        { date: "Feb 19", signal: "Hold", price: "$21.50", result: "win", pnl: "+2.2%" },
        { date: "Feb 14", signal: "Buy", price: "$19.20", result: "win", pnl: "+8.5%" },
        { date: "Feb 9", signal: "Sell", price: "$23.10", result: "loss", pnl: "-2.6%" },
        { date: "Feb 4", signal: "Buy", price: "$18.50", result: "win", pnl: "+12.2%" },
      ],
      accuracy: { total: 36, wins: 26, losses: 10, winRate: 72.2, avgReturn: 3.1 },
    },
  },
  {
    id: "6",
    token: "AVAX",
    icon: "🔺",
    price: "$42.80",
    priceNum: 42.8,
    change24h: -0.8,
    change7d: 1.5,
    change30d: 5.2,
    marketCap: "$16.8B",
    rank: 9,
    tvl: "$1.8B",
    volume24h: "$680M",
    activeAddresses: "156,789",
    holders: "3.2M",
    aiScore: 6.8,
    aiVerdict: "Hold",
    aiVerdictKey: "research.verdictHold",
    aiSummary: "research.avaxSummary",
    securityScore: "A",
    devActivity: "Medium (645 commits/mo)",
    devCommits: 645,
    contractVerified: true,
    auditStatus: "Audited",
    riskLevel: "medium",
    riskFactors: ["research.riskEcosystemGrowth", "research.riskCompetition"],
    timestamp: "18 min ago",
    category: "L1",
    chain: "Avalanche",
    priceHistory: generatePriceHistory(42.8, 4, 0.1, 12, months),
    priceHistory7d: generatePriceHistory(42.8, 2, -0.02, 7, days7),
    priceHistory30d: generatePriceHistory(42.8, 3, 0.08, 30, days30),
    radarData: [
      { metric: "Security", score: 82, fullMark: 100 },
      { metric: "Dev Activity", score: 65, fullMark: 100 },
      { metric: "Ecosystem", score: 68, fullMark: 100 },
      { metric: "Tokenomics", score: 72, fullMark: 100 },
      { metric: "Community", score: 60, fullMark: 100 },
      { metric: "Liquidity", score: 75, fullMark: 100 },
    ],
    volumeHistory: months.map((m) => ({ time: m, volume: Math.round(0.4 + Math.random() * 1) })),
    onChainData: {
      whaleActivity: "research.whaleNeutral",
      netFlow: "+120K AVAX",
      netFlowDir: "in",
      burnRate: "1.2 AVAX/min",
      stakingRate: "58.2%",
      dexVolume: "$180M",
    },
    socialSentiment: { score: 52, trend: "neutral", mentions24h: 23400, fearGreedIndex: 48 },
    aiSignal: {
      overallScore: 52, signal: "neutral", confidence: 60, updatedAgo: "2m ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "42.8", signal: "neutral", score: 45 },
        { name: "MACD", value: "-1.2", signal: "sell", score: 35 },
        { name: "Bollinger", value: "Lower Band", signal: "buy", score: 65 },
        { name: "MA Cross", value: "Neutral", signal: "neutral", score: 50 },
        { name: "Volume", value: "Below Avg", signal: "sell", score: 38 },
        { name: "Stochastic", value: "28.5", signal: "buy", score: 68 },
        { name: "ADX", value: "15.2", signal: "neutral", score: 42 },
        { name: "OBV", value: "Declining", signal: "sell", score: 32 },
      ],
      timeframes: [
        { period: "1H", signal: "sell", score: 35 },
        { period: "4H", signal: "neutral", score: 48 },
        { period: "1D", signal: "neutral", score: 52 },
        { period: "1W", signal: "buy", score: 62 },
      ],
      strategy: {
        action: "Wait", entry: "$38.00 - $39.50 (if reversal)", stopLoss: "$36.00 (-7.5%)",
        takeProfit1: "$44.00 (+13.0%)", takeProfit2: "$48.00 (+23.3%)", riskReward: "1:1.7",
        positionSize: "1% of portfolio", leverage: "1x-2x", timeHorizon: "14-30 days",
        reasoning: "research.avaxStrategyReason",
      },
      signalHistory: [
        { date: "Feb 23", signal: "Sell", price: "$42.50", result: "win", pnl: "+5.2%" },
        { date: "Feb 18", signal: "Hold", price: "$40.80", result: "loss", pnl: "-3.1%" },
        { date: "Feb 13", signal: "Buy", price: "$36.20", result: "win", pnl: "+8.8%" },
        { date: "Feb 8", signal: "Sell", price: "$44.00", result: "win", pnl: "+4.5%" },
        { date: "Feb 3", signal: "Buy", price: "$35.00", result: "win", pnl: "+11.4%" },
      ],
      accuracy: { total: 30, wins: 19, losses: 11, winRate: 63.3, avgReturn: 2.4 },
    },
  },
  {
    id: "7",
    token: "RENDER",
    icon: "🎨",
    price: "$11.25",
    priceNum: 11.25,
    change24h: 8.5,
    change7d: 15.3,
    change30d: 42.1,
    marketCap: "$5.8B",
    rank: 28,
    tvl: "$—",
    volume24h: "$1.2B",
    activeAddresses: "45,678",
    holders: "890K",
    aiScore: 7.5,
    aiVerdict: "Buy",
    aiVerdictKey: "research.verdictBuy",
    aiSummary: "research.renderSummary",
    securityScore: "B+",
    devActivity: "High (720 commits/mo)",
    devCommits: 720,
    contractVerified: true,
    auditStatus: "Audited",
    riskLevel: "medium",
    riskFactors: ["research.riskVolatility", "research.riskNarrative"],
    timestamp: "22 min ago",
    category: "AI",
    chain: "Solana",
    priceHistory: generatePriceHistory(11.25, 1.5, 0.8, 12, months),
    priceHistory7d: generatePriceHistory(11.25, 0.8, 0.3, 7, days7),
    priceHistory30d: generatePriceHistory(11.25, 1.2, 0.6, 30, days30),
    radarData: [
      { metric: "Security", score: 72, fullMark: 100 },
      { metric: "Dev Activity", score: 78, fullMark: 100 },
      { metric: "Ecosystem", score: 65, fullMark: 100 },
      { metric: "Tokenomics", score: 70, fullMark: 100 },
      { metric: "Community", score: 82, fullMark: 100 },
      { metric: "Liquidity", score: 68, fullMark: 100 },
    ],
    volumeHistory: months.map((m) => ({ time: m, volume: Math.round(0.3 + Math.random() * 1.5) })),
    onChainData: {
      whaleActivity: "research.whaleAccumulating",
      netFlow: "-8.5M RENDER",
      netFlowDir: "out",
      burnRate: "N/A",
      stakingRate: "N/A",
      dexVolume: "$280M",
    },
    socialSentiment: { score: 85, trend: "bullish", mentions24h: 78900, fearGreedIndex: 78 },
    aiSignal: {
      overallScore: 78, signal: "buy", confidence: 82, updatedAgo: "1m ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "67.5", signal: "buy", score: 72 },
        { name: "MACD", value: "+0.42", signal: "buy", score: 75 },
        { name: "Bollinger", value: "Upper Band", signal: "neutral", score: 50 },
        { name: "MA Cross", value: "Golden Cross", signal: "buy", score: 85 },
        { name: "Volume", value: "High", signal: "buy", score: 82 },
        { name: "Stochastic", value: "74.2", signal: "neutral", score: 48 },
        { name: "ADX", value: "35.8", signal: "buy", score: 80 },
        { name: "OBV", value: "Strong Rise", signal: "buy", score: 85 },
      ],
      timeframes: [
        { period: "1H", signal: "buy", score: 72 },
        { period: "4H", signal: "strongBuy", score: 82 },
        { period: "1D", signal: "buy", score: 78 },
        { period: "1W", signal: "strongBuy", score: 85 },
      ],
      strategy: {
        action: "Long", entry: "$11.20 - $11.60", stopLoss: "$10.20 (-9.5%)",
        takeProfit1: "$13.50 (+19.8%)", takeProfit2: "$15.00 (+33.0%)", riskReward: "1:2.1",
        positionSize: "2-3% of portfolio", leverage: "2x-3x", timeHorizon: "7-21 days",
        reasoning: "research.renderStrategyReason",
      },
      signalHistory: [
        { date: "Feb 25", signal: "Buy", price: "$10.50", result: "win", pnl: "+8.6%" },
        { date: "Feb 20", signal: "Hold", price: "$9.80", result: "win", pnl: "+5.1%" },
        { date: "Feb 15", signal: "Buy", price: "$8.50", result: "win", pnl: "+18.8%" },
        { date: "Feb 10", signal: "Hold", price: "$9.20", result: "win", pnl: "+3.3%" },
        { date: "Feb 5", signal: "Buy", price: "$7.80", result: "win", pnl: "+25.6%" },
      ],
      accuracy: { total: 28, wins: 21, losses: 7, winRate: 75.0, avgReturn: 4.8 },
    },
  },
  {
    id: "8",
    token: "PEPE",
    icon: "🐸",
    price: "$0.0000182",
    priceNum: 0.0000182,
    change24h: -5.2,
    change7d: -12.3,
    change30d: -28.5,
    marketCap: "$7.6B",
    rank: 25,
    tvl: "$—",
    volume24h: "$2.1B",
    activeAddresses: "234,567",
    holders: "280K",
    aiScore: 3.8,
    aiVerdict: "Sell",
    aiVerdictKey: "research.verdictSell",
    aiSummary: "research.pepeSummary",
    securityScore: "C+",
    devActivity: "Low (45 commits/mo)",
    devCommits: 45,
    contractVerified: true,
    auditStatus: "Unaudited",
    riskLevel: "high",
    riskFactors: ["research.riskMeme", "research.riskWhaleManipulation", "research.riskNoUtility"],
    timestamp: "30 min ago",
    category: "Meme",
    chain: "Ethereum",
    priceHistory: generatePriceHistory(0.0000182, 0.000003, -0.5, 12, months),
    priceHistory7d: generatePriceHistory(0.0000182, 0.000002, -0.2, 7, days7),
    priceHistory30d: generatePriceHistory(0.0000182, 0.0000025, -0.4, 30, days30),
    radarData: [
      { metric: "Security", score: 45, fullMark: 100 },
      { metric: "Dev Activity", score: 15, fullMark: 100 },
      { metric: "Ecosystem", score: 20, fullMark: 100 },
      { metric: "Tokenomics", score: 30, fullMark: 100 },
      { metric: "Community", score: 85, fullMark: 100 },
      { metric: "Liquidity", score: 70, fullMark: 100 },
    ],
    volumeHistory: months.map((m) => ({ time: m, volume: Math.round(1 + Math.random() * 4) })),
    onChainData: {
      whaleActivity: "research.whaleDistributing",
      netFlow: "+2.5T PEPE",
      netFlowDir: "in",
      burnRate: "N/A",
      stakingRate: "N/A",
      dexVolume: "$1.8B",
    },
    socialSentiment: { score: 42, trend: "bearish", mentions24h: 156000, fearGreedIndex: 32 },
    aiSignal: {
      overallScore: 35, signal: "sell", confidence: 72, updatedAgo: "30s ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "28.5", signal: "sell", score: 25 },
        { name: "MACD", value: "-0.00002", signal: "sell", score: 22 },
        { name: "Bollinger", value: "Below Lower", signal: "buy", score: 72 },
        { name: "MA Cross", value: "Death Cross", signal: "sell", score: 18 },
        { name: "Volume", value: "Spike Down", signal: "sell", score: 20 },
        { name: "Stochastic", value: "15.2", signal: "buy", score: 75 },
        { name: "ADX", value: "42.5", signal: "sell", score: 28 },
        { name: "OBV", value: "Sharp Drop", signal: "sell", score: 15 },
      ],
      timeframes: [
        { period: "1H", signal: "strongSell", score: 18 },
        { period: "4H", signal: "sell", score: 28 },
        { period: "1D", signal: "sell", score: 32 },
        { period: "1W", signal: "neutral", score: 45 },
      ],
      strategy: {
        action: "Short / Avoid", entry: "Wait for $0.0000085+ (bounce)", stopLoss: "$0.0000095 (+11.8%)",
        takeProfit1: "$0.0000065 (-23.5%)", takeProfit2: "$0.0000050 (-41.2%)", riskReward: "1:2.0",
        positionSize: "0.5-1% of portfolio", leverage: "1x (spot short)", timeHorizon: "1-7 days",
        reasoning: "research.pepeStrategyReason",
      },
      signalHistory: [
        { date: "Feb 25", signal: "Sell", price: "$0.0000092", result: "win", pnl: "+8.7%" },
        { date: "Feb 20", signal: "Sell", price: "$0.0000105", result: "win", pnl: "+12.4%" },
        { date: "Feb 15", signal: "Buy", price: "$0.0000088", result: "loss", pnl: "-15.9%" },
        { date: "Feb 10", signal: "Sell", price: "$0.0000120", result: "win", pnl: "+18.3%" },
        { date: "Feb 5", signal: "Buy", price: "$0.0000095", result: "loss", pnl: "-8.4%" },
      ],
      accuracy: { total: 25, wins: 14, losses: 11, winRate: 56.0, avgReturn: 1.8 },
    },
  },
];

const hotTokens = ["BTC", "ETH", "SOL", "ARB", "LINK", "AVAX", "RENDER", "PEPE"];
const CATEGORIES: FilterCategory[] = ["all", "L1", "L2", "DeFi", "AI", "Meme"];

// ==================== Sub-components ====================

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const formatted = val < 0.01 ? `$${val.toFixed(8)}` : val < 1 ? `$${val.toFixed(4)}` : `$${val.toLocaleString()}`;
  return (
    <div className="px-2.5 py-1.5 rounded-lg bg-card border border-border/40 shadow-lg">
      <p className="text-xs font-mono text-neon-cyan font-semibold">{formatted}</p>
    </div>
  );
}

function VolumeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-2.5 py-1.5 rounded-lg bg-card border border-border/40 shadow-lg">
      <p className="text-xs font-mono text-neon-purple font-semibold">${payload[0].value}B</p>
    </div>
  );
}

function SentimentBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "bg-neon-green" : score >= 40 ? "bg-yellow-500" : "bg-neon-red";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${c.bg} ${c.text} border ${c.border}`}>
      <Icon size={10} />
      {c.label}
    </span>
  );
}

function ChangeIndicator({ value, size = "sm" }: { value: number; size?: "sm" | "xs" }) {
  const isPositive = value > 0;
  const isZero = value === 0;
  const textSize = size === "sm" ? "text-xs" : "text-[10px]";
  if (isZero) return <span className={`${textSize} font-mono text-muted-foreground flex items-center gap-0.5`}><Minus size={10} />0%</span>;
  return (
    <span className={`${textSize} font-mono flex items-center gap-0.5 ${isPositive ? "text-neon-green" : "text-neon-red"}`}>
      {isPositive ? <ArrowUpRight size={size === "sm" ? 12 : 10} /> : <ArrowDownRight size={size === "sm" ? 12 : 10} />}
      {isPositive ? "+" : ""}{value}%
    </span>
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

  // ─── Auth state ───
  const { isAuthenticated, loading: authLoading } = useAuth();

  // tRPC: report history
  const [showHistory, setShowHistory] = useState(false);
  const { data: reportHistory, refetch: refetchHistory } = trpc.research.getHistory.useQuery(
    undefined,
    { enabled: isAuthenticated, staleTime: 30_000 }
  );

  // tRPC AI report generation
  const generateReport = trpc.research.generate.useMutation({
    onSuccess: (data) => {
      setAiReportContent(data.reportContent);
      setShowAiReport(true);
      setIsSearching(false);
      toast.success(`AI 研究报告已生成: ${data.tokenData?.name ?? aiReportToken}`);
      refetchHistory();
    },
    onError: (err) => {
      setIsSearching(false);
      if (err.message.includes("10001") || err.message.includes("login")) {
        const found = mockReports.find(r => r.token.toLowerCase() === searchQuery.trim().toLowerCase());
        if (found) {
          setExpandedId(found.id);
          setFilterCategory("all");
          toast.success(`${t("research.analysisComplete")} ${found.token}`);
        } else {
          toast.info(t("research.tokenNotFound"));
        }
      } else {
        toast.error("AI 报告生成失败: " + err.message);
      }
    },
  });

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setAiReportToken(searchQuery.trim().toUpperCase());
    generateReport.mutate({ tokenSymbol: searchQuery.trim(), chain: "BSC" });
  }, [searchQuery]);

  const toggleWatchlist = useCallback((id: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast.info(t("research.removedFromWatchlist")); }
      else { next.add(id); toast.success(t("research.addedToWatchlist")); }
      return next;
    });
  }, [t]);

  const filteredReports = useMemo(() => {
    let reports = [...mockReports];

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

  // Market overview stats
  const marketStats = useMemo(() => {
    const avgScore = (mockReports.reduce((s, r) => s + r.aiScore, 0) / mockReports.length).toFixed(1);
    const bullish = mockReports.filter(r => r.socialSentiment.trend === "bullish").length;
    const avgFearGreed = Math.round(mockReports.reduce((s, r) => s + r.socialSentiment.fearGreedIndex, 0) / mockReports.length);
    return { avgScore, bullish, total: mockReports.length, avgFearGreed };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Login prompt banner for AI report */}
      {!authLoading && !isAuthenticated && (
        <div className="bg-neon-purple/10 border-b border-neon-purple/20 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={14} className="text-neon-purple shrink-0" />
            <span className="text-xs text-neon-purple truncate">登录后可使用 AI 生成专业投研报告</span>
          </div>
          <button
            onClick={() => window.location.href = getLoginUrl()}
            className="shrink-0 text-xs font-semibold text-neon-purple border border-neon-purple/40 px-3 py-1 rounded-full hover:bg-neon-purple/10 transition-colors"
          >
            立即登录
          </button>
        </div>
      )}
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-neon-purple" />
            <h1 className="text-lg font-semibold font-display">{t("research.title")}</h1>
          </div>
          <div className="flex items-center gap-1.5">
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
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-yellow-500 text-[8px] text-background font-bold flex items-center justify-center">{watchlist.size}</span>
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
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-[calc(50%+6px)] text-muted-foreground" />
          <input
            type="text"
            placeholder={t("research.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full h-10 pl-9 pr-20 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20 transition-all"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="absolute right-1.5 top-1/2 -translate-y-[calc(50%+6px)] px-3 py-1.5 rounded-lg bg-neon-purple/20 text-neon-purple text-xs font-medium hover:bg-neon-purple/30 transition-colors disabled:opacity-50"
          >
            {isSearching ? <RefreshCw size={14} className="animate-spin" /> : t("research.analyze")}
          </button>
        </div>

        {/* History Reports Button */}
        {isAuthenticated && reportHistory && reportHistory.length > 0 && (
          <div className="pb-3">
            <button
              onClick={() => setShowHistory(prev => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#a855f7]/10 border border-[#a855f7]/20 text-xs text-[#a855f7] hover:bg-[#a855f7]/15 transition-all"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles size={13} />
                历史研究报告 ({reportHistory.length})
              </span>
              <span>{showHistory ? "▲" : "▼"}</span>
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto">
                {reportHistory.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => {
                      setAiReportContent(report.reportContent);
                      setAiReportToken(report.tokenSymbol);
                      setShowAiReport(true);
                      setShowHistory(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 border border-border/15 hover:border-[#a855f7]/30 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#a855f7]">{report.tokenSymbol}</span>
                      {report.sentiment && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          report.sentiment === 'bullish' ? 'bg-neon-green/15 text-neon-green' :
                          report.sentiment === 'bearish' ? 'bg-neon-red/15 text-neon-red' :
                          'bg-muted/30 text-muted-foreground'
                        }`}>{report.sentiment}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hot tokens */}
        <div className="flex gap-2 pb-3 overflow-x-auto scrollbar-hide">
          {hotTokens.map((token) => {
            const report = mockReports.find(r => r.token === token);
            const isPositive = report && report.change24h >= 0;
            return (
              <button
                key={token}
                onClick={() => { setSearchQuery(token); handleSearch(); }}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/40 text-xs font-mono border border-border/20 hover:border-neon-cyan/30 transition-all group"
              >
                <span className="text-muted-foreground group-hover:text-neon-cyan transition-colors">{token}</span>
                {report && (
                  <span className={`text-[10px] ${isPositive ? "text-neon-green" : "text-neon-red"}`}>
                    {isPositive ? "+" : ""}{report.change24h}%
                  </span>
                )}
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
            <div className="px-4 py-3 space-y-3">
              {/* Category Filter */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5 font-mono">{t("research.filterCategory")}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
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
                <p className="text-[10px] text-muted-foreground mb-1.5 font-mono">{t("research.sortBy")}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    { key: "aiScore" as SortBy, label: t("research.aiScore") },
                    { key: "change24h" as SortBy, label: "24h %" },
                    { key: "marketCap" as SortBy, label: t("research.marketCap") },
                  ]).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSortBy(s.key)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
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
      <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-border/15 bg-gradient-to-r from-neon-purple/[0.03] via-card/50 to-neon-cyan/[0.03] scrollbar-hide">
        {/* AI Score */}
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neon-purple/10 border border-neon-purple/25 hover:border-neon-purple/40 transition-colors">
          <BarChart3 size={11} className="text-neon-purple" />
          <div className="flex flex-col leading-none">
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-medium">{t("research.avgScore")}</span>
            <span className="text-[12px] font-mono font-bold text-neon-purple leading-tight">{marketStats.avgScore}<span className="text-[8px] text-neon-purple/60">/10</span></span>
          </div>
        </div>
        <div className="w-px h-5 bg-border/20 shrink-0" />
        {/* Bullish */}
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/25 hover:border-neon-green/40 transition-colors">
          <TrendingUp size={11} className="text-neon-green" />
          <div className="flex flex-col leading-none">
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-medium">{t("research.bullish")}</span>
            <span className="text-[12px] font-mono font-bold text-neon-green leading-tight">{marketStats.bullish}<span className="text-[9px] text-muted-foreground">/{marketStats.total}</span></span>
          </div>
        </div>
        <div className="w-px h-5 bg-border/20 shrink-0" />
        {/* Fear & Greed */}
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neon-cyan/10 border border-neon-cyan/25 hover:border-neon-cyan/40 transition-colors">
          <Gauge size={11} className="text-neon-cyan" />
          <div className="flex flex-col leading-none">
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-medium">{t("research.fearGreed")}</span>
            <span className={`text-[12px] font-mono font-bold leading-tight ${marketStats.avgFearGreed >= 60 ? "text-neon-green" : marketStats.avgFearGreed >= 40 ? "text-yellow-400" : "text-neon-red"}`}>
              {marketStats.avgFearGreed}
              <span className="text-[8px] ml-0.5 opacity-70">{marketStats.avgFearGreed >= 60 ? "Greed" : marketStats.avgFearGreed >= 40 ? "Neutral" : "Fear"}</span>
            </span>
          </div>
        </div>
        <div className="w-px h-5 bg-border/20 shrink-0" />
        {/* BTC Dominance */}
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/40 transition-colors">
          <CircleDot size={11} className="text-amber-400" />
          <div className="flex flex-col leading-none">
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-medium">BTC Dom</span>
            <span className="text-[12px] font-mono font-bold text-amber-400 leading-tight">52.4<span className="text-[8px] text-amber-400/60">%</span></span>
          </div>
        </div>
        <div className="w-px h-5 bg-border/20 shrink-0" />
        {/* Total Market Cap */}
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border/20 hover:border-border/40 transition-colors">
          <Globe size={11} className="text-muted-foreground" />
          <div className="flex flex-col leading-none">
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-medium">Mkt Cap</span>
            <span className="text-[12px] font-mono font-bold text-foreground leading-tight">$2.4<span className="text-[8px] text-muted-foreground">T</span></span>
          </div>
        </div>
        <div className="w-px h-5 bg-border/20 shrink-0" />
        {/* 24h Change */}
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/25 hover:border-neon-green/40 transition-colors">
          <ArrowUpRight size={11} className="text-neon-green" />
          <div className="flex flex-col leading-none">
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-medium">24h Avg</span>
            <span className="text-[12px] font-mono font-bold text-neon-green leading-tight">+3.2<span className="text-[8px] text-neon-green/60">%</span></span>
          </div>
        </div>
        <div className="ml-auto shrink-0 flex items-center gap-1 text-[9px] text-muted-foreground/60 font-mono">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
            <RefreshCw size={9} />
          </motion.div>
          <span>Live</span>
        </div>
      </div>

      {/* AI Report Modal */}
      {showAiReport && aiReportContent && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAiReport(false)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[#0f1629]/95 border border-[#a855f7]/30 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#a855f7]" />
                <span className="font-bold text-white font-['Space_Grotesk']">AI 深度研究报告</span>
                <span className="px-2 py-0.5 rounded-full bg-[#a855f7]/20 text-[#a855f7] text-xs font-mono">{aiReportToken}</span>
              </div>
              <button onClick={() => setShowAiReport(false)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed">{aiReportContent}</pre>
            </div>
            <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
              <p className="text-xs text-gray-500">本报告仅供参考，不构成投资建议</p>
              <button onClick={() => { navigator.clipboard.writeText(aiReportContent); toast.success("已复制报告"); }} className="text-xs text-[#00d4ff] hover:underline">复制内容</button>
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
            <div className="flex gap-2 text-[10px] text-muted-foreground font-mono">
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
              className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden"
            >
              {/* Report Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
                className="w-full px-4 py-3.5 text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center text-lg border border-border/20">
                      {report.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold font-display">{report.token}</span>
                        <span className="text-[9px] font-mono text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">
                          #{report.rank}
                        </span>
                        <span className="text-[9px] font-mono text-neon-purple/70 bg-neon-purple/8 px-1.5 py-0.5 rounded">
                          {report.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{report.chain}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold">{report.price}</p>
                    <ChangeIndicator value={report.change24h} size="xs" />
                  </div>
                </div>

                {/* Mini K-line chart */}
                <div className="h-14 mb-2 -mx-1">
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
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[
                    { label: t("research.marketCap"), value: report.marketCap },
                    { label: "24h Vol", value: report.volume24h },
                    { label: t("research.tvl"), value: report.tvl },
                    { label: t("research.aiScore"), value: `${report.aiScore}/10`, highlight: true },
                  ].map((m) => (
                    <div key={m.label} className="text-center p-1.5 rounded-lg bg-secondary/30">
                      <p className="text-[9px] text-muted-foreground truncate">{m.label}</p>
                      <p className={`text-[11px] font-mono font-semibold mt-0.5 ${m.highlight ? (report.aiScore >= 8 ? "text-neon-green" : report.aiScore >= 6 ? "text-neon-cyan" : "text-neon-red") : ""}`}>
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* AI Verdict + Risk */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={13} className="text-neon-purple" />
                    <span className={`text-xs font-bold ${report.aiScore >= 8 ? "text-neon-green" : report.aiScore >= 6 ? "text-neon-cyan" : report.aiScore >= 4 ? "text-yellow-500" : "text-neon-red"}`}>
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
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">

                      {/* Tab Switcher */}
                      <div className="flex gap-1 p-0.5 rounded-xl bg-secondary/30 border border-border/15">
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
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                              activeTab === tab.key
                                ? "bg-neon-purple/15 text-neon-purple border border-neon-purple/20"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <tab.icon size={11} />
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Chart Tab */}
                      {activeTab === "chart" && (
                        <div className="space-y-3">
                          {/* Time Range Selector */}
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                              {(["7d", "30d", "1y"] as TimeRange[]).map((range) => (
                                <button
                                  key={range}
                                  onClick={() => setTimeRange(range)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-all ${
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
                          <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
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
                                    tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={timeRange === "30d" ? 4 : "preserveStartEnd"}
                                  />
                                  <YAxis
                                    tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }}
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
                              <div key={p.label} className="text-center p-2 rounded-xl bg-secondary/20 border border-border/15">
                                <p className="text-[9px] text-muted-foreground mb-0.5">{p.label}</p>
                                <ChangeIndicator value={p.value} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Radar Tab */}
                      {activeTab === "radar" && (
                        <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                          <p className="text-[10px] text-muted-foreground mb-1 font-mono">{t("research.multiDimAnalysis")}</p>
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
                          <div className="grid grid-cols-3 gap-1.5 mt-2">
                            {report.radarData.map((d) => (
                              <div key={d.metric} className="flex items-center justify-between px-2 py-1 rounded-lg bg-background/30">
                                <span className="text-[9px] text-muted-foreground">{d.metric}</span>
                                <span className={`text-[10px] font-mono font-bold ${d.score >= 80 ? "text-neon-green" : d.score >= 60 ? "text-neon-cyan" : "text-neon-red"}`}>
                                  {d.score}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Volume Tab */}
                      {activeTab === "volume" && (
                        <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                          <p className="text-[10px] text-muted-foreground mb-2 font-mono">{t("research.volumeHistory")}</p>
                          <div className="h-36">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={report.volumeHistory}>
                                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                                <XAxis dataKey="time" tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}B`} width={40} />
                                <RechartsTooltip content={<VolumeTooltip />} />
                                <Bar dataKey="volume" fill="oklch(0.65 0.25 295)" radius={[3, 3, 0, 0]} opacity={0.7} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex items-center justify-between mt-2 px-1">
                            <span className="text-[10px] text-muted-foreground">24h Vol: <span className="font-mono font-semibold text-foreground">{report.volume24h}</span></span>
                            <span className="text-[10px] text-muted-foreground">{t("research.holders")}: <span className="font-mono font-semibold text-foreground">{report.holders}</span></span>
                          </div>
                        </div>
                      )}

                      {/* On-Chain Tab */}
                      {activeTab === "onchain" && (
                        <div className="space-y-2">
                          {/* On-chain metrics */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Eye size={12} className="text-neon-cyan" />
                                <span className="text-[10px] text-muted-foreground">{t("research.whaleActivity")}</span>
                              </div>
                              <p className="text-xs font-medium">{t(report.onChainData.whaleActivity)}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Activity size={12} className={report.onChainData.netFlowDir === "out" ? "text-neon-green" : "text-neon-red"} />
                                <span className="text-[10px] text-muted-foreground">{t("research.netFlow")}</span>
                              </div>
                              <p className={`text-xs font-mono font-medium ${report.onChainData.netFlowDir === "out" ? "text-neon-green" : "text-neon-red"}`}>
                                {report.onChainData.netFlow}
                              </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Flame size={12} className="text-orange-400" />
                                <span className="text-[10px] text-muted-foreground">{t("research.burnRate")}</span>
                              </div>
                              <p className="text-xs font-mono font-medium">{report.onChainData.burnRate}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Lock size={12} className="text-neon-purple" />
                                <span className="text-[10px] text-muted-foreground">{t("research.stakingRate")}</span>
                              </div>
                              <p className="text-xs font-mono font-medium">{report.onChainData.stakingRate}</p>
                            </div>
                          </div>

                          {/* Additional on-chain info */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                              <span className="text-[10px] text-muted-foreground">{t("research.activeAddr")}</span>
                              <p className="text-xs font-mono font-semibold mt-0.5">{report.activeAddresses}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                              <span className="text-[10px] text-muted-foreground">DEX Vol</span>
                              <p className="text-xs font-mono font-semibold mt-0.5">{report.onChainData.dexVolume}</p>
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
                                    <span className="text-[8px] text-muted-foreground">/100</span>
                                  </div>
                                </div>
                                {/* Signal Info */}
                                <div className="flex-1 space-y-2">
                                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold ${signalBg(sig.signal)} ${signalColor(sig.signal)}`}>
                                    <Target size={14} />
                                    {signalLabel(sig.signal)}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <p className="text-[9px] text-muted-foreground">{t("research.confidence")}</p>
                                      <p className="text-sm font-mono font-bold">{sig.confidence}%</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] text-muted-foreground">{t("research.updated")}</p>
                                      <p className="text-[11px] font-mono text-neon-cyan">{sig.updatedAgo}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* ── Multi-Timeframe Analysis ── */}
                            <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                              <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                                <Timer size={10} />
                                {t("research.timeframeAnalysis")}
                              </p>
                              <div className="grid grid-cols-4 gap-1.5">
                                {sig.timeframes.map((tf) => (
                                  <div key={tf.period} className={`text-center p-2 rounded-xl border ${signalBg(tf.signal)}`}>
                                    <p className="text-[10px] font-mono font-bold text-foreground mb-1">{tf.period}</p>
                                    <div className="w-full h-1.5 rounded-full bg-secondary/40 overflow-hidden mb-1">
                                      <div className="h-full rounded-full transition-all" style={{ width: `${tf.score}%`, backgroundColor: scoreRing(tf.score) }} />
                                    </div>
                                    <p className={`text-[9px] font-medium ${signalColor(tf.signal)}`}>{signalLabel(tf.signal)}</p>
                                    <p className={`text-[10px] font-mono font-bold ${scoreColor(tf.score)}`}>{tf.score}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* ── Technical Indicators Matrix ── */}
                            <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                              <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                                <Gauge size={10} />
                                {t("research.technicalIndicators")}
                              </p>
                              <div className="space-y-1.5">
                                {sig.technicalIndicators.map((ind) => (
                                  <div key={ind.name} className="flex items-center gap-2 p-1.5 rounded-lg bg-background/30">
                                    <span className="text-[10px] text-muted-foreground w-20 shrink-0">{ind.name}</span>
                                    <span className="text-[10px] font-mono font-semibold flex-1">{ind.value}</span>
                                    <div className="w-16 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                                      <div className="h-full rounded-full transition-all" style={{ width: `${ind.score}%`, backgroundColor: scoreRing(ind.score) }} />
                                    </div>
                                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${indSignalBg(ind.signal)} ${indSignalColor(ind.signal)}`}>
                                      {ind.signal === "buy" ? t("research.indBuy") : ind.signal === "sell" ? t("research.indSell") : t("research.indNeutral")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              {/* Summary bar */}
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                                <div className="flex gap-3">
                                  <span className="text-[10px] text-neon-green flex items-center gap-0.5">
                                    <ArrowUp size={10} />
                                    {sig.technicalIndicators.filter(i => i.signal === "buy").length} {t("research.indBuy")}
                                  </span>
                                  <span className="text-[10px] text-yellow-500 flex items-center gap-0.5">
                                    <Minus size={10} />
                                    {sig.technicalIndicators.filter(i => i.signal === "neutral").length} {t("research.indNeutral")}
                                  </span>
                                  <span className="text-[10px] text-neon-red flex items-center gap-0.5">
                                    <ArrowDown size={10} />
                                    {sig.technicalIndicators.filter(i => i.signal === "sell").length} {t("research.indSell")}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* ── AI Trading Strategy ── */}
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-neon-purple/8 to-neon-cyan/5 border border-neon-purple/15">
                              <p className="text-[10px] text-muted-foreground mb-2.5 font-mono flex items-center gap-1">
                                <Crosshair size={10} className="text-neon-purple" />
                                {t("research.aiStrategy")}
                              </p>
                              {/* Action badge */}
                              <div className="flex items-center gap-2 mb-3">
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                                  sig.strategy.action === "Long" ? "bg-neon-green/15 text-neon-green border-neon-green/25" :
                                  sig.strategy.action === "Wait" ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/25" :
                                  "bg-neon-red/15 text-neon-red border-neon-red/25"
                                }`}>
                                  {sig.strategy.action}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{sig.strategy.timeHorizon}</span>
                              </div>
                              {/* Strategy grid */}
                              <div className="grid grid-cols-2 gap-2 mb-2.5">
                                <div className="p-2 rounded-lg bg-background/30">
                                  <p className="text-[9px] text-muted-foreground">{t("research.entry")}</p>
                                  <p className="text-[11px] font-mono font-semibold text-neon-cyan">{sig.strategy.entry}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-background/30">
                                  <p className="text-[9px] text-muted-foreground">{t("research.stopLoss")}</p>
                                  <p className="text-[11px] font-mono font-semibold text-neon-red">{sig.strategy.stopLoss}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-background/30">
                                  <p className="text-[9px] text-muted-foreground">{t("research.tp1")}</p>
                                  <p className="text-[11px] font-mono font-semibold text-neon-green">{sig.strategy.takeProfit1}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-background/30">
                                  <p className="text-[9px] text-muted-foreground">{t("research.tp2")}</p>
                                  <p className="text-[11px] font-mono font-semibold text-neon-green">{sig.strategy.takeProfit2}</p>
                                </div>
                              </div>
                              {/* Risk params */}
                              <div className="flex gap-2 mb-2.5">
                                <div className="flex-1 p-1.5 rounded-lg bg-background/20 text-center">
                                  <p className="text-[8px] text-muted-foreground">{t("research.riskReward")}</p>
                                  <p className="text-[11px] font-mono font-bold text-neon-purple">{sig.strategy.riskReward}</p>
                                </div>
                                <div className="flex-1 p-1.5 rounded-lg bg-background/20 text-center">
                                  <p className="text-[8px] text-muted-foreground">{t("research.posSize")}</p>
                                  <p className="text-[10px] font-mono font-semibold">{sig.strategy.positionSize}</p>
                                </div>
                                <div className="flex-1 p-1.5 rounded-lg bg-background/20 text-center">
                                  <p className="text-[8px] text-muted-foreground">{t("research.leverage")}</p>
                                  <p className="text-[10px] font-mono font-semibold">{sig.strategy.leverage}</p>
                                </div>
                              </div>
                              {/* AI Reasoning */}
                              <div className="p-2 rounded-lg bg-neon-purple/5 border border-neon-purple/10">
                                <p className="text-[9px] text-neon-purple mb-0.5 flex items-center gap-1">
                                  <Sparkles size={9} />
                                  {t("research.aiReasoning")}
                                </p>
                                <p className="text-[11px] leading-relaxed text-muted-foreground">{t(sig.strategy.reasoning)}</p>
                              </div>
                            </div>

                            {/* ── Signal History & Accuracy ── */}
                            <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                  <CircleDot size={10} />
                                  {t("research.signalHistory")}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-neon-green font-mono">{t("research.winRate")}: {sig.accuracy.winRate}%</span>
                                  <span className="text-[10px] text-neon-cyan font-mono">{t("research.avgReturn")}: +{sig.accuracy.avgReturn}%</span>
                                </div>
                              </div>
                              {/* History table */}
                              <div className="space-y-1">
                                {sig.signalHistory.map((h, i) => (
                                  <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-background/20">
                                    <span className="text-[9px] text-muted-foreground font-mono w-14 shrink-0">{h.date}</span>
                                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded w-10 text-center ${
                                      h.signal === "Buy" ? "bg-neon-green/10 text-neon-green" :
                                      h.signal === "Sell" ? "bg-neon-red/10 text-neon-red" :
                                      "bg-yellow-500/10 text-yellow-500"
                                    }`}>{h.signal}</span>
                                    <span className="text-[10px] font-mono flex-1">{h.price}</span>
                                    <span className="flex items-center gap-0.5">
                                      {h.result === "win" ? <CheckCircle size={10} className="text-neon-green" /> :
                                       h.result === "loss" ? <XCircle size={10} className="text-neon-red" /> :
                                       <Clock size={10} className="text-yellow-500" />}
                                    </span>
                                    <span className={`text-[10px] font-mono font-semibold w-14 text-right ${
                                      h.result === "win" ? "text-neon-green" : h.result === "loss" ? "text-neon-red" : "text-yellow-500"
                                    }`}>{h.pnl}</span>
                                  </div>
                                ))}
                              </div>
                              {/* Accuracy summary */}
                              <div className="grid grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-border/10">
                                <div className="text-center">
                                  <p className="text-[8px] text-muted-foreground">{t("research.totalSignals")}</p>
                                  <p className="text-xs font-mono font-bold">{sig.accuracy.total}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[8px] text-muted-foreground">{t("research.wins")}</p>
                                  <p className="text-xs font-mono font-bold text-neon-green">{sig.accuracy.wins}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[8px] text-muted-foreground">{t("research.losses")}</p>
                                  <p className="text-xs font-mono font-bold text-neon-red">{sig.accuracy.losses}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[8px] text-muted-foreground">{t("research.winRate")}</p>
                                  <p className={`text-xs font-mono font-bold ${sig.accuracy.winRate >= 65 ? "text-neon-green" : sig.accuracy.winRate >= 50 ? "text-yellow-500" : "text-neon-red"}`}>{sig.accuracy.winRate}%</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Social Sentiment */}
                      <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                        <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                          <Users size={10} />
                          {t("research.socialSentiment")}
                        </p>
                        <div className="space-y-2">
                          <SentimentBar score={report.socialSentiment.score} label={t("research.sentimentScore")} />
                          <SentimentBar score={report.socialSentiment.fearGreedIndex} label={t("research.fearGreedIndex")} />
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                          <span className="text-[10px] text-muted-foreground">
                            {t("research.mentions")}: <span className="font-mono font-semibold text-foreground">{report.socialSentiment.mentions24h.toLocaleString()}</span>
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
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
                        <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Sparkles size={12} className="text-neon-purple" />
                          {t("research.aiAnalysis")}
                        </p>
                        <p className="text-sm leading-relaxed">{t(report.aiSummary)}</p>
                      </div>

                      {/* Risk Factors */}
                      {report.riskFactors.length > 0 && (
                        <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                          <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                            <AlertTriangle size={10} />
                            {t("research.riskFactors")}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {report.riskFactors.map((rf, i) => (
                              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-md border ${
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
                        <div className="p-2.5 rounded-xl bg-secondary/30 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Shield size={13} className="text-neon-green" />
                            <span className="text-[10px] text-muted-foreground">{t("research.security")}</span>
                          </div>
                          <p className="text-xs font-mono font-semibold text-neon-green">{report.securityScore}</p>
                          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                            {report.contractVerified && <span className="text-neon-green">✓ {t("research.verified")}</span>}
                          </div>
                          <p className="text-[9px] text-muted-foreground">{report.auditStatus}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-secondary/30 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Code size={13} className="text-neon-cyan" />
                            <span className="text-[10px] text-muted-foreground">{t("research.devActivity")}</span>
                          </div>
                          <p className="text-xs font-mono font-semibold">{report.devCommits.toLocaleString()}</p>
                          <p className="text-[9px] text-muted-foreground">commits/mo</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setLocation(`/app/research/${report.token.toLowerCase()}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-purple/10 text-neon-purple text-xs font-medium hover:bg-neon-purple/20 border border-neon-purple/20 transition-all"
                          >
                            <ExternalLink size={13} />
                            {t("research.viewDetail")}
                          </button>
                          <button
                            onClick={() => toggleWatchlist(report.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
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
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-cyan/10 text-neon-cyan text-xs font-medium hover:bg-neon-cyan/20 border border-neon-cyan/20 transition-all"
                          >
                            <Share2 size={13} />
                            {t("research.shareToMoments")}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
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
          const report = mockReports.find(r => r.id === showShareModal);
          if (!report) return null;
          const isPositive = report.change24h >= 0;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
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
                  <button onClick={() => setShowShareModal(null)} className="p-1 text-muted-foreground hover:text-foreground">
                    <span className="text-sm">{t("research.cancel")}</span>
                  </button>
                  <h3 className="text-sm font-semibold font-display flex items-center gap-1.5">
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
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      shareSuccess
                        ? "bg-neon-green/20 text-neon-green"
                        : isSharing
                        ? "bg-secondary/40 text-muted-foreground"
                        : "bg-neon-cyan text-background hover:opacity-90"
                    }`}
                  >
                    {shareSuccess ? (
                      <span className="flex items-center gap-1"><Check size={12} /> {t("research.shared")}</span>
                    ) : isSharing ? (
                      <span className="flex items-center gap-1">
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
                          <p className="text-xs font-medium text-muted-foreground">AI Research Report</p>
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
                      <div className="text-center p-1.5 rounded-lg bg-background/40">
                        <p className="text-[9px] text-muted-foreground">{t("research.aiScore")}</p>
                        <p className="text-xs font-mono font-bold text-neon-cyan">{report.aiScore}/10</p>
                      </div>
                      <div className="text-center p-1.5 rounded-lg bg-background/40">
                        <p className="text-[9px] text-muted-foreground">{t("research.aiVerdict")}</p>
                        <p className={`text-xs font-mono font-bold ${report.aiScore >= 8 ? "text-neon-green" : report.aiScore >= 6 ? "text-neon-cyan" : "text-neon-red"}`}>
                          {t(report.aiVerdictKey)}
                        </p>
                      </div>
                      <div className="text-center p-1.5 rounded-lg bg-background/40">
                        <p className="text-[9px] text-muted-foreground">{t("research.security")}</p>
                        <p className="text-xs font-mono font-bold text-neon-green">{report.securityScore}</p>
                      </div>
                    </div>

                    {/* Summary preview */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{t(report.aiSummary)}</p>

                    <div className="flex items-center gap-1 mt-2 text-[10px] text-neon-cyan">
                      <ExternalLink size={10} />
                      <span>{t("research.viewFullReport")}</span>
                    </div>
                  </div>
                </div>

                {/* Character count */}
                <div className="flex justify-end">
                  <span className={`text-[10px] font-mono ${shareCaption.length > 250 ? "text-neon-red" : "text-muted-foreground"}`}>
                    {shareCaption.length}/280
                  </span>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
