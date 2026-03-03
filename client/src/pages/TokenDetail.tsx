/*
 * TokenDetail — 代币详情独立页面
 * 完整技术分析仪表盘：K线图表、AI信号评分、技术指标、资金流向、持仓分布、AI对话分析
 * Design: Cyberpunk dark theme with neon accents, Space Grotesk headings
 */
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, TrendingUp, TrendingDown, Shield, ChevronDown, ChevronUp,
  Sparkles, Share2, AlertTriangle, Activity, BarChart3, Flame, Eye,
  Clock, Zap, Globe, Lock, Users, ArrowUpRight, ArrowDownRight, Minus,
  RefreshCw, Star, StarOff, Target, Crosshair, Gauge, CircleDot,
  CheckCircle, XCircle, Timer, ArrowUp, ArrowDown, Signal, Bell,
  BellOff, MessageSquare, Send, Bot, Copy, ExternalLink, PieChart,
  Layers, GitCompare, Bookmark, ChevronRight, Info, Code
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { trpc } from "@/lib/trpc";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip as RechartsTooltip, RadarChart, PolarGrid,
  PolarAngleAxis, Radar, BarChart, Bar, CartesianGrid,
  PieChart as RechartsPieChart, Pie, Cell,
} from "recharts";

// ==================== Types ====================

interface TokenData {
  id: string; token: string; icon: string; price: string; priceNum: number;
  change24h: number; change7d: number; change30d: number; change1h: number;
  marketCap: string; rank: number; tvl: string; volume24h: string;
  activeAddresses: string; holders: string; ath: string; athDate: string;
  atl: string; atlDate: string; circulatingSupply: string; maxSupply: string;
  fdv: string; aiScore: number; aiVerdict: string; aiVerdictKey: string;
  aiSummary: string; securityScore: string; devCommits: number;
  contractVerified: boolean; auditStatus: string;
  riskLevel: "low" | "medium" | "high"; riskFactors: string[];
  category: string; chain: string;
  priceHistory1h: { time: string; price: number }[];
  priceHistory4h: { time: string; price: number }[];
  priceHistory1d: { time: string; price: number }[];
  priceHistory1w: { time: string; price: number }[];
  priceHistory1m: { time: string; price: number }[];
  radarData: { metric: string; score: number; fullMark: number }[];
  volumeHistory: { time: string; buy: number; sell: number }[];
  holdersDistribution: { name: string; value: number; color: string }[];
  fundFlow: { time: string; inflow: number; outflow: number }[];
  onChainData: {
    whaleActivity: string; netFlow: string; netFlowDir: "in" | "out" | "neutral";
    burnRate: string; stakingRate: string; dexVolume: string;
    txCount24h: string; avgTxValue: string;
  };
  socialSentiment: {
    score: number; trend: "bullish" | "bearish" | "neutral";
    mentions24h: number; fearGreedIndex: number;
  };
  aiSignal: {
    overallScore: number;
    signal: "strongBuy" | "buy" | "neutral" | "sell" | "strongSell";
    confidence: number; updatedAgo: string;
    technicalIndicators: { name: string; value: string; signal: "buy" | "neutral" | "sell"; score: number }[];
    timeframes: { period: string; signal: "strongBuy" | "buy" | "neutral" | "sell" | "strongSell"; score: number }[];
    strategy: {
      action: string; entry: string; stopLoss: string; takeProfit1: string;
      takeProfit2: string; riskReward: string; positionSize: string;
      leverage: string; timeHorizon: string; reasoning: string;
    };
    signalHistory: { date: string; signal: string; price: string; result: "win" | "loss" | "pending"; pnl: string }[];
    accuracy: { total: number; wins: number; losses: number; winRate: number; avgReturn: number };
  };
  relatedTokens: { token: string; icon: string; correlation: number; change24h: number }[];
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

type ChartTimeframe = "1h" | "4h" | "1d" | "1w" | "1m";
type DetailTab = "overview" | "technical" | "onchain" | "ai-chat";

// ==================== Chart Data ====================
// Price history is fetched from CoinGecko API via tRPC (trading.getChart)
// Static labels kept only for volume/fundFlow display axes
const EMPTY_PRICE: { time: string; price: number }[] = [];
const m1Labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Pre-built AI chat responses per token
const aiChatResponses: Record<string, string[]> = {
  BTC: [
    "Based on current technical analysis, BTC is showing strong bullish momentum. The golden cross on the 4H chart combined with RSI at 62.4 suggests room for further upside before entering overbought territory. Key support at $94,500 and resistance at $100,000.",
    "On-chain data shows significant whale accumulation over the past 7 days, with net exchange outflows of 12,450 BTC. This typically precedes upward price movements as supply decreases on exchanges.",
    "The Fear & Greed Index at 72 indicates moderate greed. Historically, BTC tends to continue rallying until this index reaches 85+. Current market structure supports a target of $103,000-$105,000 within the next 2 weeks.",
    "Risk assessment: Primary risks include potential regulatory announcements and macro economic shifts. The halving cycle dynamics remain favorable. Recommended position sizing: 2-3% of portfolio with 3x-5x leverage.",
  ],
  ETH: [
    "Ethereum's EIP-4844 implementation has significantly reduced L2 gas costs, driving increased ecosystem activity. The burn rate of 2.1 ETH/min combined with staking rate of 27.3% creates strong deflationary pressure.",
    "Technical analysis shows ETH forming a bullish ascending triangle on the daily chart. MACD crossover on 4H confirms momentum shift. Target: $4,200 with support at $3,650.",
    "DeFi TVL on Ethereum has grown 15% this month, indicating renewed confidence in the ecosystem. The ETH/BTC ratio is showing signs of bottoming, suggesting potential outperformance ahead.",
  ],
  SOL: [
    "Solana's network metrics show impressive growth with 1,200+ TPS average and sub-second finality. However, the recent price decline of 1.2% reflects profit-taking after the strong rally.",
    "The DeFi ecosystem on Solana continues to expand with TVL at $8.9B. Key risk: network stability concerns persist despite improvements. Watch for the $180 support level.",
  ],
  DEFAULT: [
    "I'm analyzing the current market data for this token. Based on the technical indicators and on-chain metrics, here's my assessment of the current situation and potential trading opportunities.",
    "The market sentiment analysis shows mixed signals. I recommend monitoring the key support and resistance levels closely before making any trading decisions.",
  ],
};

const TOKENS_DATA: Record<string, TokenData> = {
  BTC: {
    id: "1", token: "BTC", icon: "₿", price: "$97,245.00", priceNum: 97245,
    change24h: 1.8, change7d: 5.2, change30d: 12.4, change1h: 0.3,
    marketCap: "$1.91T", rank: 1, tvl: "$—", volume24h: "$42.8B",
    activeAddresses: "1,023,456", holders: "48.2M",
    ath: "$108,268", athDate: "2025-01-20", atl: "$67.81", atlDate: "2013-07-06",
    circulatingSupply: "19.8M BTC", maxSupply: "21M BTC", fdv: "$2.04T",
    aiScore: 9.2, aiVerdict: "Strong Buy", aiVerdictKey: "research.verdictStrongBuy",
    aiSummary: "research.btcSummary", securityScore: "A+", devCommits: 1245,
    contractVerified: true, auditStatus: "N/A (Native)",
    riskLevel: "low", riskFactors: ["research.riskRegulatory", "research.riskMacro"],
    category: "L1", chain: "Bitcoin",
    priceHistory1h: EMPTY_PRICE,
    priceHistory4h: EMPTY_PRICE,
    priceHistory1d: EMPTY_PRICE,
    priceHistory1w: EMPTY_PRICE,
    priceHistory1m: EMPTY_PRICE,
    radarData: [
      { metric: "Security", score: 98, fullMark: 100 },
      { metric: "Dev Activity", score: 78, fullMark: 100 },
      { metric: "Ecosystem", score: 95, fullMark: 100 },
      { metric: "Tokenomics", score: 96, fullMark: 100 },
      { metric: "Community", score: 97, fullMark: 100 },
      { metric: "Liquidity", score: 99, fullMark: 100 },
    ],
    volumeHistory: m1Labels.map((m) => ({ time: m, buy: Math.round(18 + Math.random() * 12), sell: Math.round(14 + Math.random() * 10) })),
    holdersDistribution: [
      { name: "Whales (>1K BTC)", value: 40, color: "oklch(0.65 0.25 295)" },
      { name: "Institutions", value: 25, color: "oklch(0.82 0.15 195)" },
      { name: "Retail (<1 BTC)", value: 20, color: "oklch(0.82 0.19 155)" },
      { name: "Exchanges", value: 10, color: "oklch(0.75 0.15 85)" },
      { name: "Lost/Dormant", value: 5, color: "oklch(0.5 0.05 260)" },
    ],
    fundFlow: m1Labels.map((m) => ({ time: m, inflow: Math.round(8 + Math.random() * 6), outflow: Math.round(6 + Math.random() * 8) })),
    onChainData: {
      whaleActivity: "research.whaleAccumulating", netFlow: "-12,450 BTC",
      netFlowDir: "out", burnRate: "N/A", stakingRate: "N/A",
      dexVolume: "$1.2B", txCount24h: "342,567", avgTxValue: "$28,450",
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
    relatedTokens: [
      { token: "ETH", icon: "Ξ", correlation: 0.85, change24h: 2.4 },
      { token: "SOL", icon: "◎", correlation: 0.72, change24h: -1.2 },
      { token: "LINK", icon: "⬡", correlation: 0.68, change24h: 3.1 },
    ],
  },
  ETH: {
    id: "2", token: "ETH", icon: "Ξ", price: "$3,842.50", priceNum: 3842.5,
    change24h: 2.4, change7d: 3.8, change30d: 8.6, change1h: 0.5,
    marketCap: "$461.8B", rank: 2, tvl: "$58.2B", volume24h: "$18.5B",
    activeAddresses: "524,891", holders: "120.5M",
    ath: "$4,891", athDate: "2024-12-16", atl: "$0.43", atlDate: "2015-10-20",
    circulatingSupply: "120.2M ETH", maxSupply: "∞", fdv: "$461.8B",
    aiScore: 8.5, aiVerdict: "Strong Buy", aiVerdictKey: "research.verdictStrongBuy",
    aiSummary: "research.ethSummary", securityScore: "A+", devCommits: 2847,
    contractVerified: true, auditStatus: "Multiple Audits",
    riskLevel: "low", riskFactors: ["research.riskGasSpike", "research.riskCompetition"],
    category: "L1", chain: "Ethereum",
    priceHistory1h: EMPTY_PRICE,
    priceHistory4h: EMPTY_PRICE,
    priceHistory1d: EMPTY_PRICE,
    priceHistory1w: EMPTY_PRICE,
    priceHistory1m: EMPTY_PRICE,
    radarData: [
      { metric: "Security", score: 95, fullMark: 100 },
      { metric: "Dev Activity", score: 92, fullMark: 100 },
      { metric: "Ecosystem", score: 88, fullMark: 100 },
      { metric: "Tokenomics", score: 82, fullMark: 100 },
      { metric: "Community", score: 90, fullMark: 100 },
      { metric: "Liquidity", score: 96, fullMark: 100 },
    ],
    volumeHistory: m1Labels.map((m) => ({ time: m, buy: Math.round(8 + Math.random() * 6), sell: Math.round(6 + Math.random() * 5) })),
    holdersDistribution: [
      { name: "DeFi Protocols", value: 35, color: "oklch(0.65 0.25 295)" },
      { name: "Staking", value: 27, color: "oklch(0.82 0.15 195)" },
      { name: "Retail", value: 22, color: "oklch(0.82 0.19 155)" },
      { name: "Exchanges", value: 12, color: "oklch(0.75 0.15 85)" },
      { name: "Bridges", value: 4, color: "oklch(0.5 0.05 260)" },
    ],
    fundFlow: m1Labels.map((m) => ({ time: m, inflow: Math.round(4 + Math.random() * 5), outflow: Math.round(5 + Math.random() * 6) })),
    onChainData: {
      whaleActivity: "research.whaleAccumulating", netFlow: "-85,200 ETH",
      netFlowDir: "out", burnRate: "2.1 ETH/min", stakingRate: "27.3%",
      dexVolume: "$8.5B", txCount24h: "1,245,678", avgTxValue: "$2,450",
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
        { period: "1D", signal: "buy", score: 75 },
        { period: "1W", signal: "buy", score: 70 },
      ],
      strategy: {
        action: "Long", entry: "$3,800 - $3,850", stopLoss: "$3,620 (-5.8%)",
        takeProfit1: "$4,100 (+6.7%)", takeProfit2: "$4,500 (+17.1%)", riskReward: "1:1.2",
        positionSize: "3-5% of portfolio", leverage: "2x-4x", timeHorizon: "5-14 days",
        reasoning: "research.ethStrategyReason",
      },
      signalHistory: [
        { date: "Feb 24", signal: "Buy", price: "$3,720", result: "win", pnl: "+2.8%" },
        { date: "Feb 19", signal: "Hold", price: "$3,650", result: "win", pnl: "+1.5%" },
        { date: "Feb 14", signal: "Buy", price: "$3,480", result: "win", pnl: "+6.2%" },
        { date: "Feb 9", signal: "Sell", price: "$3,900", result: "loss", pnl: "-1.8%" },
        { date: "Feb 4", signal: "Buy", price: "$3,350", result: "win", pnl: "+8.5%" },
      ],
      accuracy: { total: 42, wins: 30, losses: 12, winRate: 71.4, avgReturn: 2.8 },
    },
    relatedTokens: [
      { token: "BTC", icon: "₿", correlation: 0.85, change24h: 1.8 },
      { token: "ARB", icon: "🔵", correlation: 0.78, change24h: 4.5 },
      { token: "LINK", icon: "⬡", correlation: 0.72, change24h: 3.1 },
    ],
  },
  SOL: {
    id: "3", token: "SOL", icon: "◎", price: "$187.30", priceNum: 187.3,
    change24h: -1.2, change7d: 2.1, change30d: 15.8, change1h: -0.4,
    marketCap: "$82.4B", rank: 5, tvl: "$8.9B", volume24h: "$5.2B",
    activeAddresses: "892,345", holders: "15.8M",
    ath: "$263.83", athDate: "2024-11-23", atl: "$0.50", atlDate: "2020-05-11",
    circulatingSupply: "440M SOL", maxSupply: "∞", fdv: "$82.4B",
    aiScore: 7.2, aiVerdict: "Buy", aiVerdictKey: "research.verdictBuy",
    aiSummary: "research.solSummary", securityScore: "A", devCommits: 1890,
    contractVerified: true, auditStatus: "Audited",
    riskLevel: "medium", riskFactors: ["research.riskNetworkStability", "research.riskCompetition"],
    category: "L1", chain: "Solana",
    priceHistory1h: EMPTY_PRICE,
    priceHistory4h: EMPTY_PRICE,
    priceHistory1d: EMPTY_PRICE,
    priceHistory1w: EMPTY_PRICE,
    priceHistory1m: EMPTY_PRICE,
    radarData: [
      { metric: "Security", score: 78, fullMark: 100 },
      { metric: "Dev Activity", score: 88, fullMark: 100 },
      { metric: "Ecosystem", score: 82, fullMark: 100 },
      { metric: "Tokenomics", score: 68, fullMark: 100 },
      { metric: "Community", score: 85, fullMark: 100 },
      { metric: "Liquidity", score: 90, fullMark: 100 },
    ],
    volumeHistory: m1Labels.map((m) => ({ time: m, buy: Math.round(2 + Math.random() * 3), sell: Math.round(2 + Math.random() * 2.5) })),
    holdersDistribution: [
      { name: "Validators", value: 30, color: "oklch(0.65 0.25 295)" },
      { name: "DeFi/DEX", value: 25, color: "oklch(0.82 0.15 195)" },
      { name: "Retail", value: 28, color: "oklch(0.82 0.19 155)" },
      { name: "Exchanges", value: 12, color: "oklch(0.75 0.15 85)" },
      { name: "Foundation", value: 5, color: "oklch(0.5 0.05 260)" },
    ],
    fundFlow: m1Labels.map((m) => ({ time: m, inflow: Math.round(1.5 + Math.random() * 3), outflow: Math.round(2 + Math.random() * 3) })),
    onChainData: {
      whaleActivity: "research.whaleNeutral", netFlow: "+45,200 SOL",
      netFlowDir: "in", burnRate: "50% of fees", stakingRate: "67.8%",
      dexVolume: "$2.8B", txCount24h: "45,678,901", avgTxValue: "$125",
    },
    socialSentiment: { score: 68, trend: "neutral", mentions24h: 156700, fearGreedIndex: 55 },
    aiSignal: {
      overallScore: 62, signal: "buy", confidence: 72, updatedAgo: "1m ago",
      technicalIndicators: [
        { name: "RSI (14)", value: "45.2", signal: "neutral", score: 48 },
        { name: "MACD", value: "-2.8", signal: "sell", score: 38 },
        { name: "Bollinger", value: "Mid Band", signal: "neutral", score: 52 },
        { name: "MA Cross", value: "Neutral", signal: "neutral", score: 50 },
        { name: "Volume", value: "Average", signal: "neutral", score: 55 },
        { name: "Stochastic", value: "42.5", signal: "neutral", score: 48 },
        { name: "ADX", value: "22.1", signal: "neutral", score: 45 },
        { name: "OBV", value: "Flat", signal: "neutral", score: 50 },
      ],
      timeframes: [
        { period: "1H", signal: "sell", score: 38 },
        { period: "4H", signal: "neutral", score: 52 },
        { period: "1D", signal: "buy", score: 65 },
        { period: "1W", signal: "buy", score: 72 },
      ],
      strategy: {
        action: "Wait", entry: "$180 - $183 (if support holds)", stopLoss: "$172 (-5.8%)",
        takeProfit1: "$198 (+8.2%)", takeProfit2: "$215 (+17.5%)", riskReward: "1:1.4",
        positionSize: "2-3% of portfolio", leverage: "2x-3x", timeHorizon: "7-14 days",
        reasoning: "research.solStrategyReason",
      },
      signalHistory: [
        { date: "Feb 24", signal: "Hold", price: "$188.50", result: "pending", pnl: "—" },
        { date: "Feb 19", signal: "Buy", price: "$175.20", result: "win", pnl: "+6.9%" },
        { date: "Feb 14", signal: "Sell", price: "$195.80", result: "win", pnl: "+4.3%" },
        { date: "Feb 9", signal: "Buy", price: "$168.00", result: "win", pnl: "+11.5%" },
        { date: "Feb 4", signal: "Hold", price: "$172.50", result: "win", pnl: "+2.8%" },
      ],
      accuracy: { total: 38, wins: 26, losses: 12, winRate: 68.4, avgReturn: 2.6 },
    },
    relatedTokens: [
      { token: "ETH", icon: "Ξ", correlation: 0.72, change24h: 2.4 },
      { token: "RENDER", icon: "🎨", correlation: 0.65, change24h: 8.5 },
      { token: "AVAX", icon: "🔺", correlation: 0.58, change24h: -0.8 },
    ],
  },
};

// ==================== Helper Components ====================

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const color = score >= 70 ? "oklch(0.82 0.19 155)" : score >= 50 ? "oklch(0.75 0.15 85)" : "oklch(0.65 0.25 25)";
  const textColor = score >= 70 ? "text-neon-green" : score >= 50 ? "text-yellow-500" : "text-neon-red";
  const r = size * 0.42;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(0.2 0.01 260)" strokeWidth={size * 0.08} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={size * 0.08}
          strokeLinecap="round" strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
          className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold font-mono ${textColor}`}>{score}</span>
        <span className="text-[7px] text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 [backdrop-filter:none] border border-border/30 rounded-lg px-2.5 py-1.5 shadow-xl">
      <p className="text-[10px] font-mono font-bold text-neon-cyan">${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

function FlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 [backdrop-filter:none] border border-border/30 rounded-lg px-2.5 py-1.5 shadow-xl">
      <p className="text-[9px] text-muted-foreground mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className={`text-[10px] font-mono ${p.dataKey === "inflow" ? "text-neon-green" : "text-neon-red"}`}>
          {p.dataKey === "inflow" ? "In" : "Out"}: ${p.value}B
        </p>
      ))}
    </div>
  );
}

// ==================== Main Component ====================

export default function TokenDetail() {
  const { t } = useI18n();
  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const token = params.token?.toUpperCase() || "BTC";
  const data = TOKENS_DATA[token];

  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>("1d");
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [isWatched, setIsWatched] = useState(true);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertPrice, setAlertPrice] = useState("");
  const [showAlertInput, setShowAlertInput] = useState(false);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatResponseIndex = useRef(0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // tRPC: real-time price data (must be before getPriceData)
  const { data: livePrice } = trpc.trading.getPrices.useQuery(
    { symbols: [token] },
    { staleTime: 30_000, refetchInterval: 60_000 }
  );
  const livePriceData = livePrice?.[0];

  // tRPC: real chart data for all timeframes via CoinGecko
  const timeframeDaysMap: Record<ChartTimeframe, number> = { "1h": 1, "4h": 1, "1d": 1, "1w": 7, "1m": 30 };
  const chartDays = timeframeDaysMap[chartTimeframe];
  const { data: chartData, isLoading: chartLoading } = trpc.trading.getChart.useQuery(
    { symbol: token, days: chartDays },
    { staleTime: 60_000, placeholderData: (prev: any) => prev }
  );
  const realChartPrices = (chartData?.prices ?? []) as unknown as [number, number][];

  const getPriceData = useCallback(() => {
    if (realChartPrices.length > 0) {
      let points = realChartPrices;
      // For 1h: take last ~12 points; 4h: take every 4th point; 1d: all hourly; 1w/1m: all daily
      if (chartTimeframe === "1h") {
        points = points.slice(-12);
      } else if (chartTimeframe === "4h") {
        // CoinGecko returns hourly for days<=1, take every 4th for 4h candles
        const filtered: [number, number][] = [];
        for (let i = 0; i < points.length; i += 4) filtered.push(points[i]);
        points = filtered;
      }
      const fmt: Intl.DateTimeFormatOptions = chartTimeframe === "1m"
        ? { month: "short", day: "numeric" }
        : chartTimeframe === "1w"
          ? { month: "short", day: "numeric" }
          : { hour: "2-digit", minute: "2-digit" };
      return points.map((item: [number, number]) => ({
        time: new Date(item[0]).toLocaleDateString("en-US", fmt),
        price: item[1],
      }));
    }
    // Fallback to static data if CoinGecko unavailable
    if (!data) return [];
    switch (chartTimeframe) {
      case "1h": return data.priceHistory1h;
      case "4h": return data.priceHistory4h;
      case "1d": return data.priceHistory1d;
      case "1w": return data.priceHistory1w;
      case "1m": return data.priceHistory1m;
    }
  }, [data, chartTimeframe, realChartPrices]);

  const handleSetAlert = useCallback(() => {
    if (!alertPrice.trim()) return;
    setAlertEnabled(true);
    setShowAlertInput(false);
    toast.success(`${t("research.alertSet")} ${token} @ $${alertPrice}`);
  }, [alertPrice, token, t]);

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim() || isAiTyping) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`, role: "user", content: chatInput.trim(), timestamp: new Date(),
    };
    const history = chatMessages.slice(-10).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }));
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsAiTyping(true);

    // Streaming AI chat via SSE
    const aiMsgId = `a-${Date.now()}`;
    const aiMsg: ChatMessage = { id: aiMsgId, role: "ai", content: "", timestamp: new Date() };
    setChatMessages(prev => [...prev, aiMsg]);

    try {
      const res = await fetch("/api/token-chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, message: userMsg.content, history }),
      });
      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let firstToken = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const json = JSON.parse(trimmed.slice(6));
            if (json.token) {
              if (firstToken) { setIsAiTyping(false); firstToken = false; }
              setChatMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, content: m.content + json.token } : m
              ));
            }
            if (json.done || json.error) break;
          } catch { /* skip */ }
        }
      }
    } catch (err: any) {
      setChatMessages(prev => prev.map(m =>
        m.id === aiMsgId ? { ...m, content: "AI 服务暂时不可用，请稍后重试。" } : m
      ));
    } finally {
      setIsAiTyping(false);
    }
  }, [chatInput, isAiTyping, token, chatMessages]);

  // Merge real price into display values
  const displayPrice = livePriceData ? `$${livePriceData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : data?.price ?? "N/A";
  const displayChange24h = livePriceData ? livePriceData.change : (data?.change24h ?? 0);
  const displayMarketCap = livePriceData && livePriceData.marketCap > 0
    ? `$${(livePriceData.marketCap / 1e9).toFixed(2)}B`
    : (data?.marketCap ?? "N/A");
  const displayVolume = livePriceData && livePriceData.volume > 0
    ? `$${(livePriceData.volume / 1e6).toFixed(1)}M`
    : (data?.volume24h ?? "N/A");

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <AlertTriangle size={48} className="text-neon-red" />
        <p className="text-lg font-semibold">{t("research.tokenNotFound")}</p>
        <button onClick={() => setLocation("/app/research")}
          className="px-4 py-2 rounded-xl bg-neon-purple/20 text-neon-purple text-sm font-medium hover:bg-neon-purple/30 transition-colors">
          <ArrowLeft size={14} className="inline mr-1" /> {t("research.backToResearch")}
        </button>
      </div>
    );
  }

  const sig = data.aiSignal;
  const signalColor = (s: string) => s === "strongBuy" ? "text-neon-green" : s === "buy" ? "text-neon-green/80" : s === "neutral" ? "text-yellow-500" : s === "sell" ? "text-neon-red/80" : "text-neon-red";
  const signalBg = (s: string) => s === "strongBuy" ? "bg-neon-green/10 border-neon-green/20" : s === "buy" ? "bg-neon-green/8 border-neon-green/15" : s === "neutral" ? "bg-yellow-500/10 border-yellow-500/20" : s === "sell" ? "bg-neon-red/8 border-neon-red/15" : "bg-neon-red/10 border-neon-red/20";
  const signalLabel = (s: string) => s === "strongBuy" ? t("research.signalStrongBuy") : s === "buy" ? t("research.signalBuy") : s === "neutral" ? t("research.signalNeutral") : s === "sell" ? t("research.signalSell") : t("research.signalStrongSell");
  const indSignalColor = (s: string) => s === "buy" ? "text-neon-green" : s === "neutral" ? "text-yellow-500" : "text-neon-red";
  const indSignalBg = (s: string) => s === "buy" ? "bg-neon-green/10" : s === "neutral" ? "bg-yellow-500/10" : "bg-neon-red/10";
  const scoreRing = (v: number) => v >= 70 ? "oklch(0.82 0.19 155)" : v >= 50 ? "oklch(0.75 0.15 85)" : "oklch(0.65 0.25 25)";

  const TABS: { key: DetailTab; label: string; icon: any }[] = [
    { key: "overview", label: t("research.tabOverview"), icon: Layers },
    { key: "technical", label: t("research.tabTechnical"), icon: BarChart3 },
    { key: "onchain", label: t("research.tabOnchain"), icon: Globe },
    { key: "ai-chat", label: t("research.tabAiChat"), icon: Bot },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ─── Sticky Header ─── */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/app/research")}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary/40 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-neon-purple/15 flex items-center justify-center text-xl border border-neon-purple/20">
              {data.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold font-display">{data.token}</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground font-mono">#{data.rank}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-purple/10 text-neon-purple font-mono">{data.category}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{data.chain}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setIsWatched(!isWatched); toast.info(isWatched ? t("research.removedFromWatchlist") : t("research.addedToWatchlist")); }}
              className={`p-2 rounded-lg transition-colors ${isWatched ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground hover:bg-secondary/40"}`}>
              {isWatched ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
            </button>
            <button onClick={() => setShowAlertInput(!showAlertInput)}
              className={`p-2 rounded-lg transition-colors ${alertEnabled ? "text-neon-cyan bg-neon-cyan/10" : "text-muted-foreground hover:bg-secondary/40"}`}>
              {alertEnabled ? <Bell size={16} fill="currentColor" /> : <BellOff size={16} />}
            </button>
            <button onClick={() => {
                const url = window.location.href;
                if (navigator.share) {
                  navigator.share({ title: `${token} Analysis`, text: `Check out ${token} on NexusChat`, url });
                } else {
                  navigator.clipboard.writeText(url);
                  toast.success(t("research.linkCopied") || "Link copied to clipboard");
                }
              }}
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary/40 transition-colors">
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Price Alert Input */}
        <AnimatePresence>
          {showAlertInput && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pb-2">
              <div className="flex items-center gap-2">
                <input type="number" value={alertPrice} onChange={(e) => setAlertPrice(e.target.value)}
                  placeholder={`${t("research.alertPrice")} (USD)`}
                  className="flex-1 h-8 px-3 rounded-lg bg-secondary/50 border border-border/30 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50" />
                <button onClick={handleSetAlert}
                  className="px-3 h-8 rounded-lg bg-neon-cyan/20 text-neon-cyan text-xs font-medium hover:bg-neon-cyan/30 transition-colors">
                  {t("research.setAlert")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Price Display */}
        <div className="flex items-end justify-between pb-3">
          <div>
            <p className="text-2xl font-bold font-mono">{displayPrice}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {[
                { label: "1h", value: data.change1h },
                { label: "24h", value: displayChange24h },
                { label: "7d", value: data.change7d },
                { label: "30d", value: data.change30d },
              ].map((c) => (
                <span key={c.label} className={`text-[10px] font-mono flex items-center gap-0.5 ${c.value >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                  <span className="text-muted-foreground">{c.label}:</span>
                  {c.value >= 0 ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                  {c.value >= 0 ? "+" : ""}{c.value}%
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold ${signalBg(sig.signal)} ${signalColor(sig.signal)}`}>
              <Target size={12} />
              {signalLabel(sig.signal)}
            </div>
            <ScoreRing score={sig.overallScore} size={48} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 pb-2 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-neon-purple/15 text-neon-purple border border-neon-purple/25"
                    : "text-muted-foreground hover:bg-secondary/30 border border-transparent"
                }`}>
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* ─── Content Area ─── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* ═══════════ OVERVIEW TAB ═══════════ */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {/* Chart with Timeframe Selector */}
              <div className="p-3 rounded-2xl bg-secondary/20 border border-border/15">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground font-mono">{t("research.priceChart")}</p>
                  <div className="flex gap-1">
                    {(["1h", "4h", "1d", "1w", "1m"] as ChartTimeframe[]).map((tf) => (
                      <button key={tf} onClick={() => setChartTimeframe(tf)}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-medium transition-all ${
                          chartTimeframe === tf ? "bg-neon-cyan/20 text-neon-cyan" : "text-muted-foreground hover:text-foreground"
                        }`}>
                        {tf.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={getPriceData()}>
                      <defs>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={data.change24h >= 0 ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={data.change24h >= 0 ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => `$${v.toLocaleString()}`} width={60} domain={["auto", "auto"]} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="price" stroke={data.change24h >= 0 ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"}
                        fill="url(#priceGrad)" strokeWidth={2} dot={false}
                        activeDot={{ r: 4, fill: data.change24h >= 0 ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: t("research.marketCap"), value: displayMarketCap, icon: BarChart3 },
                  { label: "24h Vol", value: displayVolume, icon: Activity },
                  { label: "TVL", value: data.tvl, icon: Lock },
                  { label: "FDV", value: data.fdv, icon: PieChart },
                  { label: t("research.holders"), value: data.holders, icon: Users },
                  { label: t("research.activeAddr"), value: data.activeAddresses, icon: Globe },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                      <div className="flex items-center gap-1 mb-1">
                        <Icon size={10} className="text-neon-cyan" />
                        <span className="text-[9px] text-muted-foreground">{m.label}</span>
                      </div>
                      <p className="text-xs font-mono font-semibold">{m.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Supply Info */}
              <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                <p className="text-[10px] text-muted-foreground mb-2 font-mono">{t("research.supplyInfo")}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] text-muted-foreground">{t("research.circSupply")}</p>
                    <p className="text-xs font-mono font-semibold">{data.circulatingSupply}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">{t("research.maxSupply")}</p>
                    <p className="text-xs font-mono font-semibold">{data.maxSupply}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">{t("research.ath")}</p>
                    <p className="text-xs font-mono font-semibold text-neon-green">{data.ath}</p>
                    <p className="text-[8px] text-muted-foreground">{data.athDate}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground">{t("research.atl")}</p>
                    <p className="text-xs font-mono font-semibold text-neon-red">{data.atl}</p>
                    <p className="text-[8px] text-muted-foreground">{data.atlDate}</p>
                  </div>
                </div>
              </div>

              {/* AI Signal Summary */}
              <div className="p-3 rounded-2xl bg-gradient-to-br from-neon-purple/8 to-neon-cyan/5 border border-neon-purple/15">
                <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                  <Sparkles size={10} className="text-neon-purple" />
                  {t("research.aiStrategy")}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                    sig.strategy.action === "Long" ? "bg-neon-green/15 text-neon-green border-neon-green/25" :
                    sig.strategy.action === "Wait" ? "bg-yellow-500/15 text-yellow-500 border-yellow-500/25" :
                    "bg-neon-red/15 text-neon-red border-neon-red/25"
                  }`}>{sig.strategy.action}</span>
                  <span className="text-[10px] text-muted-foreground">{sig.strategy.timeHorizon}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
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
                <div className="flex gap-2 mb-2">
                  {[
                    { label: t("research.riskReward"), value: sig.strategy.riskReward },
                    { label: t("research.posSize"), value: sig.strategy.positionSize },
                    { label: t("research.leverage"), value: sig.strategy.leverage },
                  ].map((p) => (
                    <div key={p.label} className="flex-1 p-1.5 rounded-lg bg-background/20 text-center">
                      <p className="text-[8px] text-muted-foreground">{p.label}</p>
                      <p className="text-[10px] font-mono font-semibold">{p.value}</p>
                    </div>
                  ))}
                </div>
                <div className="p-2 rounded-lg bg-neon-purple/5 border border-neon-purple/10">
                  <p className="text-[9px] text-neon-purple mb-0.5 flex items-center gap-1"><Sparkles size={9} />{t("research.aiReasoning")}</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{t(sig.strategy.reasoning)}</p>
                </div>
              </div>

              {/* Related Tokens */}
              <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                  <GitCompare size={10} />
                  {t("research.relatedTokens")}
                </p>
                <div className="space-y-1.5">
                  {data.relatedTokens.map((rt) => (
                    <button key={rt.token} onClick={() => setLocation(`/app/research/${rt.token.toLowerCase()}`)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg bg-background/20 hover:bg-background/40 transition-colors">
                      <span className="text-lg">{rt.icon}</span>
                      <span className="text-xs font-bold flex-1 text-left">{rt.token}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">r={rt.correlation.toFixed(2)}</span>
                      <span className={`text-[10px] font-mono ${rt.change24h >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                        {rt.change24h >= 0 ? "+" : ""}{rt.change24h}%
                      </span>
                      <ChevronRight size={12} className="text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════ TECHNICAL TAB ═══════════ */}
          {activeTab === "technical" && (
            <motion.div key="technical" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {/* Multi-Timeframe Analysis */}
              <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                  <Timer size={10} /> {t("research.timeframeAnalysis")}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {sig.timeframes.map((tf) => (
                    <div key={tf.period} className={`text-center p-2.5 rounded-xl border ${signalBg(tf.signal)}`}>
                      <p className="text-[11px] font-mono font-bold text-foreground mb-1">{tf.period}</p>
                      <div className="w-full h-1.5 rounded-full bg-secondary/40 overflow-hidden mb-1">
                        <div className="h-full rounded-full transition-all" style={{ width: `${tf.score}%`, backgroundColor: scoreRing(tf.score) }} />
                      </div>
                      <p className={`text-[9px] font-medium ${signalColor(tf.signal)}`}>{signalLabel(tf.signal)}</p>
                      <p className={`text-[11px] font-mono font-bold ${tf.score >= 70 ? "text-neon-green" : tf.score >= 50 ? "text-yellow-500" : "text-neon-red"}`}>{tf.score}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Indicators Matrix */}
              <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                  <Gauge size={10} /> {t("research.technicalIndicators")}
                </p>
                <div className="space-y-1.5">
                  {sig.technicalIndicators.map((ind) => (
                    <div key={ind.name} className="flex items-center gap-2 p-2 rounded-lg bg-background/30">
                      <span className="text-[10px] text-muted-foreground w-20 shrink-0">{ind.name}</span>
                      <span className="text-[10px] font-mono font-semibold flex-1">{ind.value}</span>
                      <div className="w-20 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${ind.score}%`, backgroundColor: scoreRing(ind.score) }} />
                      </div>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${indSignalBg(ind.signal)} ${indSignalColor(ind.signal)}`}>
                        {ind.signal === "buy" ? t("research.indBuy") : ind.signal === "sell" ? t("research.indSell") : t("research.indNeutral")}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                  <div className="flex gap-3">
                    <span className="text-[10px] text-neon-green flex items-center gap-0.5">
                      <ArrowUp size={10} /> {sig.technicalIndicators.filter(i => i.signal === "buy").length} {t("research.indBuy")}
                    </span>
                    <span className="text-[10px] text-yellow-500 flex items-center gap-0.5">
                      <Minus size={10} /> {sig.technicalIndicators.filter(i => i.signal === "neutral").length} {t("research.indNeutral")}
                    </span>
                    <span className="text-[10px] text-neon-red flex items-center gap-0.5">
                      <ArrowDown size={10} /> {sig.technicalIndicators.filter(i => i.signal === "sell").length} {t("research.indSell")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                <p className="text-[10px] text-muted-foreground mb-1 font-mono">{t("research.multiDimAnalysis")}</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data.radarData} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke="oklch(0.3 0.01 260)" strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }} />
                      <Radar name="Score" dataKey="score" stroke="oklch(0.82 0.15 195)" fill="oklch(0.82 0.15 195)"
                        fillOpacity={0.15} strokeWidth={2} dot={{ r: 3, fill: "oklch(0.82 0.15 195)" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {data.radarData.map((d) => (
                    <div key={d.metric} className="flex items-center justify-between px-2 py-1 rounded-lg bg-background/30">
                      <span className="text-[9px] text-muted-foreground">{d.metric}</span>
                      <span className={`text-[10px] font-mono font-bold ${d.score >= 80 ? "text-neon-green" : d.score >= 60 ? "text-neon-cyan" : "text-neon-red"}`}>{d.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signal History */}
              <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                    <CircleDot size={10} /> {t("research.signalHistory")}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neon-green font-mono">{t("research.winRate")}: {sig.accuracy.winRate}%</span>
                    <span className="text-[10px] text-neon-cyan font-mono">{t("research.avgReturn")}: +{sig.accuracy.avgReturn}%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {sig.signalHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-background/20">
                      <span className="text-[9px] text-muted-foreground font-mono w-14 shrink-0">{h.date}</span>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded w-10 text-center ${
                        h.signal === "Buy" ? "bg-neon-green/10 text-neon-green" :
                        h.signal === "Sell" ? "bg-neon-red/10 text-neon-red" : "bg-yellow-500/10 text-yellow-500"
                      }`}>{h.signal}</span>
                      <span className="text-[10px] font-mono flex-1">{h.price}</span>
                      {h.result === "win" ? <CheckCircle size={10} className="text-neon-green" /> :
                       h.result === "loss" ? <XCircle size={10} className="text-neon-red" /> :
                       <Clock size={10} className="text-yellow-500" />}
                      <span className={`text-[10px] font-mono font-semibold w-14 text-right ${
                        h.result === "win" ? "text-neon-green" : h.result === "loss" ? "text-neon-red" : "text-yellow-500"
                      }`}>{h.pnl}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-border/10">
                  {[
                    { label: t("research.totalSignals"), value: sig.accuracy.total.toString(), color: "" },
                    { label: t("research.wins"), value: sig.accuracy.wins.toString(), color: "text-neon-green" },
                    { label: t("research.losses"), value: sig.accuracy.losses.toString(), color: "text-neon-red" },
                    { label: t("research.winRate"), value: `${sig.accuracy.winRate}%`, color: sig.accuracy.winRate >= 65 ? "text-neon-green" : "text-yellow-500" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="text-[8px] text-muted-foreground">{s.label}</p>
                      <p className={`text-xs font-mono font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk & Security */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-secondary/30 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Shield size={13} className="text-neon-green" />
                    <span className="text-[10px] text-muted-foreground">{t("research.security")}</span>
                  </div>
                  <p className="text-xs font-mono font-semibold text-neon-green">{data.securityScore}</p>
                  {data.contractVerified && <span className="text-[9px] text-neon-green">✓ {t("research.verified")}</span>}
                  <p className="text-[9px] text-muted-foreground">{data.auditStatus}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary/30 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Code size={13} className="text-neon-cyan" />
                    <span className="text-[10px] text-muted-foreground">{t("research.devActivity")}</span>
                  </div>
                  <p className="text-xs font-mono font-semibold">{data.devCommits.toLocaleString()}</p>
                  <p className="text-[9px] text-muted-foreground">commits/mo</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════ ON-CHAIN TAB ═══════════ */}
          {activeTab === "onchain" && (
            <motion.div key="onchain" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
              {/* On-chain Metrics */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Eye, color: "text-neon-cyan", label: t("research.whaleActivity"), value: t(data.onChainData.whaleActivity) },
                  { icon: Activity, color: data.onChainData.netFlowDir === "out" ? "text-neon-green" : "text-neon-red", label: t("research.netFlow"), value: data.onChainData.netFlow },
                  { icon: Flame, color: "text-orange-400", label: t("research.burnRate"), value: data.onChainData.burnRate },
                  { icon: Lock, color: "text-neon-purple", label: t("research.stakingRate"), value: data.onChainData.stakingRate },
                  { icon: Zap, color: "text-neon-cyan", label: t("research.txCount"), value: data.onChainData.txCount24h },
                  { icon: BarChart3, color: "text-neon-green", label: t("research.avgTxValue"), value: data.onChainData.avgTxValue },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon size={12} className={m.color} />
                        <span className="text-[10px] text-muted-foreground">{m.label}</span>
                      </div>
                      <p className="text-xs font-mono font-medium">{m.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Fund Flow Chart */}
              <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                  <Activity size={10} /> {t("research.fundFlow")}
                </p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.fundFlow}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                      <XAxis dataKey="time" tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}B`} width={35} />
                      <RechartsTooltip content={<FlowTooltip />} />
                      <Bar dataKey="inflow" fill="oklch(0.82 0.19 155)" radius={[2, 2, 0, 0]} opacity={0.8} />
                      <Bar dataKey="outflow" fill="oklch(0.65 0.25 25)" radius={[2, 2, 0, 0]} opacity={0.8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-1">
                  <span className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neon-green inline-block" /> {t("research.inflow")}</span>
                  <span className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neon-red inline-block" /> {t("research.outflow")}</span>
                </div>
              </div>

              {/* Holders Distribution */}
              <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                  <PieChart size={10} /> {t("research.holdersDistribution")}
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-36 h-36 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={data.holdersDistribution} dataKey="value" cx="50%" cy="50%"
                          innerRadius={30} outerRadius={55} paddingAngle={3} strokeWidth={0}>
                          {data.holdersDistribution.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {data.holdersDistribution.map((h) => (
                      <div key={h.name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: h.color }} />
                        <span className="text-[10px] text-muted-foreground flex-1">{h.name}</span>
                        <span className="text-[10px] font-mono font-bold">{h.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Volume Buy/Sell */}
              <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                  <BarChart3 size={10} /> {t("research.buySellVolume")}
                </p>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.volumeHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.01 260)" />
                      <XAxis dataKey="time" tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}B`} width={35} />
                      <Bar dataKey="buy" stackId="vol" fill="oklch(0.82 0.19 155)" radius={[0, 0, 0, 0]} opacity={0.8} />
                      <Bar dataKey="sell" stackId="vol" fill="oklch(0.65 0.25 25)" radius={[2, 2, 0, 0]} opacity={0.8} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 mt-1">
                  <span className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neon-green inline-block" /> {t("research.buyVol")}</span>
                  <span className="text-[9px] flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neon-red inline-block" /> {t("research.sellVol")}</span>
                </div>
              </div>

              {/* Social Sentiment */}
              <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                <p className="text-[10px] text-muted-foreground mb-2 font-mono flex items-center gap-1">
                  <Users size={10} /> {t("research.socialSentiment")}
                </p>
                <div className="space-y-2">
                  {[
                    { label: t("research.sentimentScore"), score: data.socialSentiment.score },
                    { label: t("research.fearGreedIndex"), score: data.socialSentiment.fearGreedIndex },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-muted-foreground">{s.label}</span>
                        <span className={`text-[10px] font-mono font-bold ${s.score >= 70 ? "text-neon-green" : s.score >= 40 ? "text-yellow-500" : "text-neon-red"}`}>{s.score}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${s.score}%` }} transition={{ duration: 0.8 }}
                          className={`h-full rounded-full ${s.score >= 70 ? "bg-neon-green" : s.score >= 40 ? "bg-yellow-500" : "bg-neon-red"}`} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                  <span className="text-[10px] text-muted-foreground">
                    {t("research.mentions")}: <span className="font-mono font-semibold text-foreground">{data.socialSentiment.mentions24h.toLocaleString()}</span>
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                    data.socialSentiment.trend === "bullish" ? "bg-neon-green/10 text-neon-green" :
                    data.socialSentiment.trend === "bearish" ? "bg-neon-red/10 text-neon-red" : "bg-yellow-500/10 text-yellow-500"
                  }`}>
                    {t(`research.trend${data.socialSentiment.trend.charAt(0).toUpperCase() + data.socialSentiment.trend.slice(1)}`)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════ AI CHAT TAB ═══════════ */}
          {activeTab === "ai-chat" && (
            <motion.div key="ai-chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex flex-col" style={{ minHeight: "calc(100dvh - 320px)" }}>
              {/* Chat Messages */}
              <div className="flex-1 space-y-3 pb-4">
                {/* Welcome message */}
                {chatMessages.length === 0 && (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center mx-auto">
                      <Bot size={32} className="text-neon-purple" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold font-display">{t("research.aiChatTitle")} — {data.token}</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{t("research.aiChatDesc")}</p>
                    </div>
                    {/* Quick prompts */}
                    <div className="space-y-1.5 max-w-xs mx-auto">
                      {[
                        t("research.quickPrompt1").replace("{token}", data.token),
                        t("research.quickPrompt2").replace("{token}", data.token),
                        t("research.quickPrompt3").replace("{token}", data.token),
                        t("research.quickPrompt4").replace("{token}", data.token),
                      ].map((prompt, i) => (
                        <button key={i} onClick={() => { setChatInput(prompt); }}
                          className="w-full text-left p-2.5 rounded-xl bg-secondary/30 border border-border/20 text-[11px] text-muted-foreground hover:text-foreground hover:border-neon-purple/30 transition-all">
                          <MessageSquare size={10} className="inline mr-1.5 text-neon-purple" />
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat bubbles */}
                {chatMessages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs ${
                      msg.role === "ai" ? "bg-neon-purple/15 border border-neon-purple/20" : "bg-neon-cyan/15 border border-neon-cyan/20"
                    }`}>
                      {msg.role === "ai" ? <Bot size={14} className="text-neon-purple" /> : "🧑"}
                    </div>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-[12px] leading-relaxed ${
                      msg.role === "ai"
                        ? "bg-secondary/30 border border-border/20 rounded-tl-sm"
                        : "bg-neon-cyan/10 border border-neon-cyan/15 rounded-tr-sm"
                    }`}>
                      {msg.content}
                      <p className="text-[8px] text-muted-foreground mt-1.5 font-mono">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {/* AI typing indicator */}
                {isAiTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                    <div className="w-7 h-7 rounded-lg bg-neon-purple/15 border border-neon-purple/20 flex items-center justify-center">
                      <Bot size={14} className="text-neon-purple" />
                    </div>
                    <div className="bg-secondary/30 border border-border/20 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="sticky bottom-0 pt-2 pb-2 bg-gradient-to-t from-background via-background to-transparent">
                <div className="flex items-center gap-2">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
                    placeholder={t("research.askAi").replace("{token}", data.token)}
                    className="flex-1 h-10 px-4 rounded-xl bg-secondary/50 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20 transition-all" />
                  <button onClick={handleSendChat} disabled={!chatInput.trim() || isAiTyping}
                    className="w-10 h-10 rounded-xl bg-neon-purple/20 text-neon-purple flex items-center justify-center hover:bg-neon-purple/30 transition-colors disabled:opacity-40">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
