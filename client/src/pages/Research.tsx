/*
 * Research — AI投研机器人页面
 * 增强版：迷你K线图 + 雷达图 + 详细报告卡片
 */
import { useState, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, Shield, Code, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
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
} from "recharts";

interface ResearchReport {
  id: string;
  token: string;
  price: string;
  change24h: number;
  marketCap: string;
  rank: number;
  tvl: string;
  activeAddresses: string;
  aiScore: number;
  aiVerdict: string;
  aiSummary: string;
  securityScore: string;
  devActivity: string;
  timestamp: string;
  priceHistory: { time: string; price: number }[];
  radarData: { metric: string; score: number; fullMark: number }[];
}

const mockReports: ResearchReport[] = [
  {
    id: "1",
    token: "ETH",
    price: "$3,842.50",
    change24h: 2.4,
    marketCap: "$461.8B",
    rank: 2,
    tvl: "$58.2B",
    activeAddresses: "524,891",
    aiScore: 8.5,
    aiVerdict: "Strong Buy",
    aiSummary: "ETH fundamentals are strong with staking rate rising to 27.3%. L2 ecosystem (Arbitrum, Optimism, Base) is thriving. EIP-4844 significantly reduced L2 fees, driving on-chain activity to new highs. Institutional holdings steadily increasing. Recommend long-term hold, watch $4,000 resistance.",
    securityScore: "A+",
    devActivity: "Very High (2,847 commits/mo)",
    timestamp: "2 min ago",
    priceHistory: [
      { time: "Jan", price: 2280 }, { time: "Feb", price: 2520 },
      { time: "Mar", price: 3100 }, { time: "Apr", price: 3350 },
      { time: "May", price: 2980 }, { time: "Jun", price: 3420 },
      { time: "Jul", price: 3180 }, { time: "Aug", price: 3560 },
      { time: "Sep", price: 3280 }, { time: "Oct", price: 3650 },
      { time: "Nov", price: 3780 }, { time: "Dec", price: 3842 },
    ],
    radarData: [
      { metric: "Security", score: 95, fullMark: 100 },
      { metric: "Dev Activity", score: 92, fullMark: 100 },
      { metric: "Ecosystem", score: 88, fullMark: 100 },
      { metric: "Tokenomics", score: 82, fullMark: 100 },
      { metric: "Community", score: 90, fullMark: 100 },
      { metric: "Liquidity", score: 96, fullMark: 100 },
    ],
  },
  {
    id: "2",
    token: "SOL",
    price: "$187.30",
    change24h: -1.2,
    marketCap: "$82.4B",
    rank: 5,
    tvl: "$8.9B",
    activeAddresses: "1,234,567",
    aiScore: 7.2,
    aiVerdict: "Buy",
    aiSummary: "SOL ecosystem continues to expand with steady DeFi TVL growth. Firedancer client launching soon will significantly boost network performance. NFT market activity recovering, Jupiter DEX leading in volume. Watch for network stability risks and FTX legacy token unlock pressure.",
    securityScore: "A",
    devActivity: "High (1,523 commits/mo)",
    timestamp: "15 min ago",
    priceHistory: [
      { time: "Jan", price: 95 }, { time: "Feb", price: 110 },
      { time: "Mar", price: 145 }, { time: "Apr", price: 168 },
      { time: "May", price: 135 }, { time: "Jun", price: 155 },
      { time: "Jul", price: 142 }, { time: "Aug", price: 170 },
      { time: "Sep", price: 158 }, { time: "Oct", price: 175 },
      { time: "Nov", price: 192 }, { time: "Dec", price: 187 },
    ],
    radarData: [
      { metric: "Security", score: 75, fullMark: 100 },
      { metric: "Dev Activity", score: 80, fullMark: 100 },
      { metric: "Ecosystem", score: 82, fullMark: 100 },
      { metric: "Tokenomics", score: 68, fullMark: 100 },
      { metric: "Community", score: 88, fullMark: 100 },
      { metric: "Liquidity", score: 85, fullMark: 100 },
    ],
  },
];

const hotTokens = ["BTC", "ETH", "SOL", "AVAX", "ARB", "OP", "MATIC", "LINK"];

/* Custom tooltip for K-line chart */
function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-2.5 py-1.5 rounded-lg bg-card border border-border/40 shadow-lg">
      <p className="text-xs font-mono text-neon-cyan font-semibold">
        ${payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

export default function Research() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("1");
  const [isSearching, setIsSearching] = useState(false);
  const { t } = useI18n();

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-2 h-14">
          <Sparkles size={20} className="text-neon-purple" />
          <h1 className="text-lg font-semibold font-display">{t("research.title")}</h1>
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
            className="absolute right-1.5 top-1/2 -translate-y-[calc(50%+6px)] px-3 py-1.5 rounded-lg bg-neon-purple/20 text-neon-purple text-xs font-medium hover:bg-neon-purple/30 transition-colors"
          >
            {t("research.analyze")}
          </button>
        </div>

        {/* Hot tokens */}
        <div className="flex gap-2 pb-3 overflow-x-auto">
          {hotTokens.map((token) => (
            <button
              key={token}
              onClick={() => setSearchQuery(token)}
              className="shrink-0 px-3 py-1 rounded-lg bg-secondary/40 text-xs font-mono text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/10 border border-border/20 hover:border-neon-cyan/30 transition-all"
            >
              {token}
            </button>
          ))}
        </div>
      </header>

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
              Analyzing <span className="text-neon-purple font-mono">{searchQuery.toUpperCase()}</span>...
            </p>
            <div className="flex gap-2 text-[10px] text-muted-foreground font-mono">
              <span className="text-neon-green">✓ CoinGecko</span>
              <span className="text-neon-green">✓ DefiLlama</span>
              <span className="animate-pulse">⟳ AI Processing</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reports */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {mockReports.map((report, index) => {
          const isExpanded = expandedId === report.id;
          const isPositive = report.change24h >= 0;
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden"
            >
              {/* Report Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
                className="w-full px-4 py-3.5 text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-display">{report.token}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">
                      #{report.rank}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold">{report.price}</span>
                    <span className={`text-xs font-mono flex items-center gap-0.5 ${isPositive ? "text-neon-green" : "text-neon-red"}`}>
                      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {isPositive ? "+" : ""}{report.change24h}%
                    </span>
                  </div>
                </div>

                {/* Mini K-line chart (always visible) */}
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
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Key metrics grid */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: t("research.marketCap"), value: report.marketCap },
                    { label: t("research.tvl"), value: report.tvl },
                    { label: t("research.activeAddr"), value: report.activeAddresses },
                    { label: t("research.aiScore"), value: `${report.aiScore}/10` },
                  ].map((m) => (
                    <div key={m.label} className="text-center p-2 rounded-lg bg-secondary/30">
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                      <p className="text-xs font-mono font-semibold mt-0.5">{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* AI Verdict */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-neon-purple" />
                    <span className="text-xs font-medium">{t("research.aiVerdict")}</span>
                    <span className={`text-xs font-bold ${report.aiScore >= 8 ? "text-neon-green" : report.aiScore >= 6 ? "text-neon-cyan" : "text-neon-red"}`}>
                      {report.aiVerdict}
                    </span>
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
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4 border-t border-border/20 pt-3">

                      {/* Detailed K-line chart */}
                      <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                        <p className="text-[10px] text-muted-foreground mb-2 font-mono">12M Price Chart</p>
                        <div className="h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={report.priceHistory}>
                              <defs>
                                <linearGradient id={`gradient-detail-${report.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={isPositive ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"} stopOpacity={0.4} />
                                  <stop offset="100%" stopColor={isPositive ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"} stopOpacity={0.02} />
                                </linearGradient>
                              </defs>
                              <XAxis
                                dataKey="time"
                                tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }}
                                axisLine={false}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 9, fill: "oklch(0.55 0.02 260)" }}
                                axisLine={false}
                                tickLine={false}
                                domain={["dataMin - 100", "dataMax + 100"]}
                                tickFormatter={(v: number) => `$${v}`}
                                width={45}
                              />
                              <RechartsTooltip content={<ChartTooltip />} />
                              <Area
                                type="monotone"
                                dataKey="price"
                                stroke={isPositive ? "oklch(0.82 0.19 155)" : "oklch(0.65 0.25 25)"}
                                strokeWidth={2}
                                fill={`url(#gradient-detail-${report.id})`}
                                dot={false}
                                activeDot={{ r: 4, fill: "oklch(0.82 0.15 195)", stroke: "oklch(0.82 0.15 195)", strokeWidth: 2 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Radar Chart */}
                      <div className="p-3 rounded-xl bg-secondary/20 border border-border/15">
                        <p className="text-[10px] text-muted-foreground mb-2 font-mono">Multi-Dimensional Analysis</p>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={report.radarData} cx="50%" cy="50%" outerRadius="70%">
                              <PolarGrid
                                stroke="oklch(0.3 0.01 260)"
                                strokeDasharray="3 3"
                              />
                              <PolarAngleAxis
                                dataKey="metric"
                                tick={{ fontSize: 10, fill: "oklch(0.65 0.02 260)" }}
                              />
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
                      </div>

                      {/* AI Summary */}
                      <div className="p-3 rounded-xl bg-neon-purple/5 border border-neon-purple/15">
                        <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Sparkles size={12} className="text-neon-purple" />
                          {t("research.aiAnalysis")}
                        </p>
                        <p className="text-sm leading-relaxed">{report.aiSummary}</p>
                      </div>

                      {/* Additional metrics */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/30">
                          <Shield size={14} className="text-neon-green shrink-0" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">{t("research.security")}</p>
                            <p className="text-xs font-mono font-semibold text-neon-green">{report.securityScore}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/30">
                          <Code size={14} className="text-neon-cyan shrink-0" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">{t("research.devActivity")}</p>
                            <p className="text-xs font-mono font-semibold">{report.devActivity}</p>
                          </div>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <p className="text-[10px] text-muted-foreground text-right font-mono">
                        {t("research.generatedAt")} {report.timestamp}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
