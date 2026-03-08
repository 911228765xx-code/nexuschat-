/**
 * AI Consulting Center — 付费 AI 咨询中心首页
 * 用户可提问加密相关问题，AI 生成专业深度分析报告
 * 支付方式：BSC 链 USDT 直接支付 10U
 * Design: Cyberpunk dark theme, #0a0e27 bg, #00d4ff + #a855f7 accents
 */
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Shield,
  TrendingUp,
  ChevronRight,
  Clock,
  Sparkles,
  Lock,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  History,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";

// ─── Types ────────────────────────────────────────────────────────────────────
type QueryType = "project" | "security" | "market";

interface QueryTypeConfig {
  id: QueryType;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  desc: string;
  color: string;
  bgColor: string;
  borderColor: string;
  examples: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const QUERY_TYPES: QueryTypeConfig[] = [
  {
    id: "project",
    icon: Brain,
    label: "项目评估",
    desc: "全面分析项目基本面、代币经济学、团队背景与投资价值",
    color: "text-[#00d4ff]",
    bgColor: "bg-[#00d4ff]/10",
    borderColor: "border-[#00d4ff]/30",
    examples: [
      "分析 Solana (SOL) 的投资价值和风险",
      "评估 Uniswap V4 的竞争优势",
      "分析 Arbitrum 生态系统的发展前景",
    ],
  },
  {
    id: "security",
    icon: Shield,
    label: "安全审计",
    desc: "智能合约漏洞分析、DeFi 安全评估、风险等级评定",
    color: "text-[#a855f7]",
    bgColor: "bg-[#a855f7]/10",
    borderColor: "border-[#a855f7]/30",
    examples: [
      "审计 Compound V3 智能合约安全性",
      "分析某 DeFi 协议的闪电贷攻击风险",
      "评估 NFT 项目合约的安全隐患",
    ],
  },
  {
    id: "market",
    icon: TrendingUp,
    label: "市场分析",
    desc: "技术分析、链上数据、市场情绪与价格走势预判",
    color: "text-[#00ff88]",
    bgColor: "bg-[#00ff88]/10",
    borderColor: "border-[#00ff88]/30",
    examples: [
      "分析 BTC 当前市场结构和短期走势",
      "ETH 的链上数据和机构持仓分析",
      "分析 PEPE 的市场情绪和操作策略",
    ],
  },
];

const PRICE_USDT = "10";
const RECEIVING_ADDRESS = "0x15aD376E5B9D7275B143d0398ccF8a5c499cc72B";

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const configs = {
    pending_payment: { label: "待支付", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    generating: { label: "生成中", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    completed: { label: "已完成", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    failed: { label: "失败", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  };
  const config = configs[status as keyof typeof configs] || configs.pending_payment;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${config.color}`}>
      {config.label}
    </span>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────
function HistoryItem({
  item,
  onClick,
}: {
  item: {
    id: number;
    queryType: string;
    queryText: string;
    status: string;
    createdAt: Date;
  };
  onClick: () => void;
}) {
  const typeConfig = QUERY_TYPES.find((t) => t.id === item.queryType) || QUERY_TYPES[0];
  const Icon = typeConfig.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border ${typeConfig.borderColor} bg-[#0d1130]/60 hover:bg-[#0d1130] transition-colors group`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${typeConfig.bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
          <Icon size={15} className={typeConfig.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${typeConfig.color}`}>{typeConfig.label}</span>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-sm text-gray-300 truncate">{item.queryText}</p>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(item.createdAt).toLocaleDateString("zh-CN", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-300 transition-colors shrink-0 mt-2" />
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Consulting() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [selectedType, setSelectedType] = useState<QueryType>("project");
  const [queryText, setQueryText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: history, refetch: refetchHistory } = trpc.consulting.getHistory.useQuery(
    { limit: 10 },
    { enabled: isAuthenticated }
  );

  const createReport = trpc.consulting.createReport.useMutation({
    onSuccess: (data) => {
      setIsCreating(false);
      // Navigate to payment page
      setLocation(`/app/consulting/pay/${data.reportId}`);
    },
    onError: (err) => {
      setIsCreating(false);
      toast.error(err.message || "创建失败，请重试");
    },
  });

  const handleSubmit = useCallback(() => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/app/consulting");
      return;
    }
    if (!queryText.trim() || queryText.trim().length < 10) {
      toast.error("请输入至少 10 个字符的问题描述");
      return;
    }
    setIsCreating(true);
    createReport.mutate({
      queryType: selectedType,
      queryText: queryText.trim(),
    });
  }, [isAuthenticated, queryText, selectedType, createReport]);

  const handleExampleClick = (example: string) => {
    setQueryText(example);
  };

  const handleHistoryItemClick = (item: { id: number; status: string }) => {
    if (item.status === "completed") {
      setLocation(`/app/consulting/report/${item.id}`);
    } else if (item.status === "pending_payment" || item.status === "generating") {
      setLocation(`/app/consulting/pay/${item.id}`);
    }
  };

  const currentType = QUERY_TYPES.find((t) => t.id === selectedType)!;

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0e27]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">AI 咨询中心</h1>
              <p className="text-xs text-gray-400">专业加密分析 · 10 USDT/次</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) refetchHistory();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300"
          >
            <History size={14} />
            <span>历史</span>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        {/* History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-white/10 bg-[#0d1130]/80 p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-[#00d4ff]" />
                  最近咨询记录
                </h3>
                {!isAuthenticated ? (
                  <p className="text-sm text-gray-500 text-center py-4">登录后查看历史记录</p>
                ) : !history || history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">暂无咨询记录</p>
                ) : (
                  <div className="space-y-2">
                    {history.map((item) => (
                      <HistoryItem
                        key={item.id}
                        item={item}
                        onClick={() => handleHistoryItemClick(item)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Value Proposition */}
        <div className="rounded-2xl border border-[#00d4ff]/20 bg-gradient-to-br from-[#00d4ff]/5 to-[#a855f7]/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-[#00d4ff]" />
            <span className="text-sm font-semibold text-[#00d4ff]">专业级加密投研报告</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Brain, label: "AI 深度分析", desc: "基于海量数据" },
              { icon: Shield, label: "安全审计", desc: "漏洞全面检测" },
              { icon: TrendingUp, label: "市场预判", desc: "精准操作建议" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-1.5">
                    <Icon size={18} className="text-[#a855f7]" />
                  </div>
                  <p className="text-xs font-medium text-white">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Query Type Selector */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">选择分析类型</p>
          <div className="grid grid-cols-3 gap-2">
            {QUERY_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? `${type.borderColor} ${type.bgColor}`
                      : "border-white/10 bg-white/3 hover:bg-white/5"
                  }`}
                >
                  <Icon size={18} className={isSelected ? type.color : "text-gray-400"} />
                  <p className={`text-xs font-medium mt-1.5 ${isSelected ? type.color : "text-gray-300"}`}>
                    {type.label}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">{currentType.desc}</p>
        </div>

        {/* Query Input */}
        <div>
          <p className="text-sm font-medium text-gray-300 mb-2">描述您的问题</p>
          <Textarea
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={`例如：${currentType.examples[0]}`}
            className="min-h-[120px] bg-[#0d1130] border-white/10 text-white placeholder:text-gray-600 focus:border-[#00d4ff]/50 resize-none rounded-xl text-sm"
            maxLength={2000}
          />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-gray-600">{queryText.length}/2000 字</p>
            {queryText.length < 10 && queryText.length > 0 && (
              <p className="text-xs text-yellow-500">至少需要 10 个字符</p>
            )}
          </div>
        </div>

        {/* Example Prompts */}
        <div>
          <p className="text-xs text-gray-500 mb-2">快速示例</p>
          <div className="flex flex-wrap gap-2">
            {currentType.examples.map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/3 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Info */}
        <div className="rounded-xl border border-white/10 bg-[#0d1130]/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-[#a855f7]" />
              <span className="text-sm font-medium text-gray-300">支付方式</span>
            </div>
            <span className="text-sm font-bold text-white">{PRICE_USDT} USDT</span>
          </div>
          <div className="space-y-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-green-400 shrink-0" />
              <span>BSC 链 USDT 直接支付（链上确认）</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-green-400 shrink-0" />
              <span>支付后 AI 立即生成专业深度报告</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-green-400 shrink-0" />
              <span>报告永久保存，随时查看</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isCreating || queryText.trim().length < 10}
          className="w-full h-12 bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white font-semibold text-base hover:opacity-90 disabled:opacity-50 rounded-xl"
        >
          {isCreating ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              正在生成摘要预览...
            </>
          ) : (
            <>
              <Sparkles size={18} className="mr-2" />
              生成报告摘要（免费预览）
              <ArrowRight size={16} className="ml-2" />
            </>
          )}
        </Button>

        {!isAuthenticated && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <AlertCircle size={14} className="text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-300">请先登录后再使用 AI 咨询服务</p>
          </div>
        )}

        {/* Feature Comparison */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1130]/40 p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <FileText size={14} className="text-[#00d4ff]" />
            报告内容预览
          </h3>
          <div className="space-y-2">
            {[
              { label: "摘要预览（200字）", free: true },
              { label: "完整深度分析报告", free: false },
              { label: "风险评估与评分", free: false },
              { label: "可执行操作建议", free: false },
              { label: "数据来源与引用", free: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{item.label}</span>
                {item.free ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    免费
                  </span>
                ) : (
                  <span className="text-[#00d4ff] flex items-center gap-1">
                    <Lock size={10} />
                    付费解锁
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
