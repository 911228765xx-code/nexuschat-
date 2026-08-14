/**
 * AI Consulting Report Detail Page
 * Shows full AI-generated report with markdown rendering
 * Only accessible after payment confirmation
 */
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowLeft,
  Brain,
  Shield,
  TrendingUp,
  Copy,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Calendar,
  Hash,
  Share2,
  Download,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LightMarkdown from "@/components/LightMarkdown";

// ─── Constants ────────────────────────────────────────────────────────────────
const QUERY_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  project: {
    label: "项目评估",
    icon: Brain,
    color: "text-[#00d4ff]",
    bgColor: "bg-[#00d4ff]/10",
    borderColor: "border-[#00d4ff]/20",
  },
  security: {
    label: "安全审计",
    icon: Shield,
    color: "text-[#a855f7]",
    bgColor: "bg-[#a855f7]/10",
    borderColor: "border-[#a855f7]/20",
  },
  market: {
    label: "市场分析",
    icon: TrendingUp,
    color: "text-[#00ff88]",
    bgColor: "bg-[#00ff88]/10",
    borderColor: "border-[#00ff88]/20",
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConsultingReport() {
  const params = useParams<{ id: string }>();
  const reportId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [copiedTx, setCopiedTx] = useState(false);

  const { data: report, isLoading, error } = trpc.consulting.getFullReport.useQuery(
    { reportId },
    { enabled: isAuthenticated && reportId > 0 }
  );

  const handleCopyTx = async () => {
    if (!report?.txHash) return;
    await navigator.clipboard.writeText(report.txHash);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  const handleShare = async () => {
    const text = `我刚刚使用 BitChat AI 咨询中心获取了一份专业的加密分析报告！\n\n问题：${report?.queryText?.slice(0, 100)}...\n\n#BitChat #AI分析 #Web3`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("已复制分享内容");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <p className="text-gray-400">请先登录</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-[#00d4ff] mx-auto mb-3" />
          <p className="text-gray-400 text-sm">加载报告中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white mb-2">无法访问报告</h2>
          <p className="text-sm text-gray-400 max-w-xs">
            {error.message || "请先完成支付后再查看完整报告"}
          </p>
        </div>
        <Button
          onClick={() => setLocation(`/app/consulting/pay/${reportId}`)}
          className="bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white"
        >
          前往支付
        </Button>
      </div>
    );
  }

  if (!report) return null;

  const typeConfig = QUERY_TYPE_CONFIG[report.queryType] || QUERY_TYPE_CONFIG.project;
  const TypeIcon = typeConfig.icon;

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0e27]/95 backdrop-blur-sm border-b border-white/5 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/app/consulting")}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${typeConfig.bgColor} flex items-center justify-center`}>
                <TypeIcon size={14} className={typeConfig.color} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">AI 分析报告</h1>
                <p className={`text-xs ${typeConfig.color}`}>{typeConfig.label}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <Share2 size={15} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        {/* Report Meta */}
        <div className={`rounded-2xl border ${typeConfig.borderColor} ${typeConfig.bgColor} p-4`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0`}>
              <TypeIcon size={20} className={typeConfig.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold ${typeConfig.color}`}>{typeConfig.label}</span>
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  已完成
                </span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{report.queryText}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={10} />
                  {new Date(report.createdAt).toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Proof */}
        {report.txHash && (
          <div className="rounded-xl border border-white/10 bg-[#0d1130]/60 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Hash size={12} className="text-gray-500 shrink-0" />
                <span className="text-xs text-gray-500">支付凭证</span>
                <code className="text-xs text-gray-400 font-mono truncate">
                  {report.txHash.slice(0, 20)}...{report.txHash.slice(-8)}
                </code>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCopyTx}
                  className="p-1.5 rounded hover:bg-white/10 transition-colors"
                >
                  {copiedTx ? (
                    <CheckCircle2 size={12} className="text-green-400" />
                  ) : (
                    <Copy size={12} className="text-gray-500" />
                  )}
                </button>
                <a
                  href={`https://bscscan.com/tx/${report.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded hover:bg-white/10 transition-colors"
                >
                  <ExternalLink size={12} className="text-[#00d4ff]" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Report Content */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1130]/80 overflow-hidden">
          {/* Report Header */}
          <div className="px-5 pt-5 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#00d4ff]" />
              <span className="text-sm font-semibold text-[#00d4ff]">AI 深度分析报告</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">由 BitChat AI 生成 · 仅供参考，不构成投资建议</p>
          </div>

          {/* Markdown Content */}
          <div className="px-5 py-4">
            <div className="prose prose-invert prose-sm max-w-none
              prose-headings:text-white prose-headings:font-bold
              prose-h1:text-xl prose-h1:mb-4 prose-h1:mt-6
              prose-h2:text-lg prose-h2:mb-3 prose-h2:mt-5 prose-h2:text-[#00d4ff]
              prose-h3:text-base prose-h3:mb-2 prose-h3:mt-4 prose-h3:text-[#a855f7]
              prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-3
              prose-strong:text-white prose-strong:font-semibold
              prose-em:text-gray-400
              prose-ul:text-gray-300 prose-ul:space-y-1
              prose-ol:text-gray-300 prose-ol:space-y-1
              prose-li:marker:text-[#00d4ff]
              prose-code:text-[#00ff88] prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
              prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl
              prose-blockquote:border-l-[#a855f7] prose-blockquote:text-gray-400 prose-blockquote:bg-[#a855f7]/5 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:pr-3
              prose-table:text-sm prose-th:text-[#00d4ff] prose-th:font-semibold prose-td:text-gray-300
              prose-hr:border-white/10
            ">
              <LightMarkdown>{report.fullContent || ""}</LightMarkdown>
            </div>
          </div>

          {/* Footer Disclaimer */}
          <div className="px-5 py-4 border-t border-white/5 bg-black/20">
            <p className="text-xs text-gray-600 leading-relaxed">
              ⚠️ 本报告由 AI 自动生成，仅供参考，不构成任何投资建议。加密货币市场风险极高，请在充分了解风险的前提下做出独立判断。过去的表现不代表未来的结果。
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => setLocation("/app/consulting")}
            variant="outline"
            className="flex-1 h-11 border-white/20 text-gray-300 hover:bg-white/5 bg-transparent"
          >
            新建咨询
          </Button>
          <Button
            onClick={handleShare}
            className="flex-1 h-11 bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30 hover:bg-[#a855f7]/30"
            variant="outline"
          >
            <Share2 size={15} className="mr-2" />
            分享报告
          </Button>
        </div>
      </div>
    </div>
  );
}
