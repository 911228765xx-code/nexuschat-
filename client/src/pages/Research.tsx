/*
 * Research — AI投研机器人页面
 * 输入代币名称生成投研报告卡片
 */
import { useState } from "react";
import { Search, TrendingUp, TrendingDown, Shield, Activity, Code, Globe, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    aiVerdict: "强烈看好",
    aiSummary: "ETH 基本面强劲，质押率持续上升至 27.3%，L2 生态（Arbitrum、Optimism、Base）蓬勃发展。EIP-4844 实施后 L2 费用大幅下降，推动链上活跃度创新高。机构持仓稳步增加，Grayscale ETH Trust 溢价转正。建议长期持有，关注 $4,000 阻力位突破情况。",
    securityScore: "A+",
    devActivity: "极高 (2,847 commits/月)",
    timestamp: "2分钟前",
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
    aiVerdict: "看好",
    aiSummary: "SOL 生态持续扩张，DeFi TVL 稳步增长。Firedancer 客户端即将上线，将显著提升网络性能。NFT 市场活跃度回升，Jupiter DEX 交易量领先。需关注网络稳定性风险和 FTX 遗留代币解锁压力。",
    securityScore: "A",
    devActivity: "高 (1,523 commits/月)",
    timestamp: "15分钟前",
  },
];

const hotTokens = ["BTC", "ETH", "SOL", "AVAX", "ARB", "OP", "MATIC", "LINK"];

export default function Research() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("1");
  const [isSearching, setIsSearching] = useState(false);

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
          <h1 className="text-lg font-semibold font-display">AI 投研</h1>
        </div>

        {/* Search */}
        <div className="relative pb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-[calc(50%+6px)] text-muted-foreground" />
          <input
            type="text"
            placeholder="输入代币名称，如 BTC、ETH、SOL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full h-10 pl-9 pr-20 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20 transition-all"
          />
          <button
            onClick={handleSearch}
            className="absolute right-1.5 top-1/2 -translate-y-[calc(50%+6px)] px-3 py-1.5 rounded-lg bg-neon-purple/20 text-neon-purple text-xs font-medium hover:bg-neon-purple/30 transition-colors"
          >
            分析
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
              正在分析 <span className="text-neon-purple font-mono">{searchQuery.toUpperCase()}</span>...
            </p>
            <div className="flex gap-2 text-[10px] text-muted-foreground font-mono">
              <span className="text-neon-green">✓ CoinGecko</span>
              <span className="text-neon-green">✓ DefiLlama</span>
              <span className="animate-pulse">⟳ AI分析中</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reports */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {mockReports.map((report, index) => {
          const isExpanded = expandedId === report.id;
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-2xl border border-border/30 bg-card/50 overflow-hidden"
            >
              {/* Report Header - Always visible */}
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
                    <span className={`text-xs font-mono flex items-center gap-0.5 ${report.change24h >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                      {report.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {report.change24h >= 0 ? "+" : ""}{report.change24h}%
                    </span>
                  </div>
                </div>

                {/* Key metrics grid */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: "市值", value: report.marketCap },
                    { label: "TVL", value: report.tvl },
                    { label: "活跃地址", value: report.activeAddresses },
                    { label: "AI评分", value: `${report.aiScore}/10` },
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
                    <span className="text-xs font-medium">AI 判定：</span>
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
                    <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">
                      {/* AI Summary */}
                      <div className="p-3 rounded-xl bg-neon-purple/5 border border-neon-purple/15">
                        <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Sparkles size={12} className="text-neon-purple" />
                          AI 综合分析
                        </p>
                        <p className="text-sm leading-relaxed">{report.aiSummary}</p>
                      </div>

                      {/* Additional metrics */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/30">
                          <Shield size={14} className="text-neon-green shrink-0" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">安全评级</p>
                            <p className="text-xs font-mono font-semibold text-neon-green">{report.securityScore}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/30">
                          <Code size={14} className="text-neon-cyan shrink-0" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">开发活跃度</p>
                            <p className="text-xs font-mono font-semibold">{report.devActivity}</p>
                          </div>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <p className="text-[10px] text-muted-foreground text-right font-mono">
                        生成于 {report.timestamp}
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
