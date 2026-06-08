/**
 * AI Consulting Payment Page
 * Shows summary preview, payment instructions, and waits for txHash submission
 * After payment confirmation, redirects to report page
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  CheckCircle2,
  Loader2,
  ExternalLink,
  AlertCircle,
  Wallet,
  Sparkles,
  Clock,
  Shield,
  ChevronRight,
  RefreshCw,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Constants ────────────────────────────────────────────────────────────────
const RECEIVING_ADDRESS = "0x15aD376E5B9D7275B143d0398ccF8a5c499cc72B";
const USDT_CONTRACT_BSC = "0x55d398326f99059fF775485246999027B3197955";
const PRICE_USDT = "10";
const BSC_CHAIN_ID = "0x38"; // 56 in hex

const QUERY_TYPE_LABELS: Record<string, string> = {
  project: "项目评估",
  security: "安全审计",
  market: "市场分析",
};

const QUERY_TYPE_COLORS: Record<string, string> = {
  project: "text-[#00d4ff]",
  security: "text-[#a855f7]",
  market: "text-[#00ff88]",
};

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: number }) {
  const steps = ["摘要预览", "链上支付", "生成报告"];
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                i < step
                  ? "bg-[#00d4ff] border-[#00d4ff] text-black"
                  : i === step
                  ? "border-[#00d4ff] text-[#00d4ff] bg-transparent"
                  : "border-white/20 text-gray-500 bg-transparent"
              }`}
            >
              {i < step ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span
              className={`text-xs mt-1 whitespace-nowrap ${
                i <= step ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 w-12 mx-1 mb-4 transition-colors ${
                i < step ? "bg-[#00d4ff]" : "bg-white/10"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ConsultingPayment() {
  const params = useParams<{ id: string }>();
  const reportId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const [step, setStep] = useState(0); // 0=summary, 1=payment, 2=waiting
  const [txHash, setTxHash] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Fetch report status
  const { data: report, refetch: refetchStatus } = trpc.consulting.getStatus.useQuery(
    { reportId },
    {
      enabled: isAuthenticated && reportId > 0,
      refetchInterval: isPolling ? 5000 : false,
    }
  );

  // Submit payment mutation
  const submitPayment = trpc.consulting.submitPayment.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      setStep(2);
      setIsPolling(true);
      toast.success("支付已提交，正在验证交易...");
    },
    onError: (err) => {
      setIsSubmitting(false);
      toast.error(err.message || "提交失败，请检查交易哈希格式");
    },
  });

  // Retry verification
  const retryVerification = trpc.consulting.retryVerification.useMutation({
    onSuccess: () => {
      toast.success("已重新提交验证");
      setIsPolling(true);
    },
    onError: (err) => toast.error(err.message),
  });

  // Watch for completion
  useEffect(() => {
    if (report?.status === "completed") {
      setIsPolling(false);
      toast.success("报告生成完成！");
      setTimeout(() => setLocation(`/app/consulting/report/${reportId}`), 1500);
    } else if (report?.status === "failed") {
      setIsPolling(false);
      toast.error("支付验证失败，请重试");
    }
  }, [report?.status, reportId, setLocation]);

  // Auto-advance to payment step if already has txHash
  useEffect(() => {
    if (report?.txHash && report.status === "generating") {
      setStep(2);
      setIsPolling(true);
    }
  }, [report?.txHash, report?.status]);

  const handleCopyAddress = useCallback(async () => {
    await navigator.clipboard.writeText(RECEIVING_ADDRESS);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  }, []);

  const handleCopyContract = useCallback(async () => {
    await navigator.clipboard.writeText(USDT_CONTRACT_BSC);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  }, []);

  const handleSubmitPayment = useCallback(() => {
    if (!txHash.match(/^0x[a-fA-F0-9]{64}$/)) {
      toast.error("请输入有效的交易哈希（0x 开头的 66 位十六进制字符串）");
      return;
    }
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error("请输入有效的钱包地址（0x 开头的 42 位十六进制字符串）");
      return;
    }
    setIsSubmitting(true);
    submitPayment.mutate({ reportId, txHash, walletAddress });
  }, [txHash, walletAddress, reportId, submitPayment]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <p className="text-gray-400">请先登录</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[#00d4ff]" />
      </div>
    );
  }

  const queryTypeLabel = QUERY_TYPE_LABELS[report.queryType] || "项目评估";
  const queryTypeColor = QUERY_TYPE_COLORS[report.queryType] || "text-[#00d4ff]";

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0e27]/95 backdrop-blur-sm border-b border-white/5 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => setLocation("/app/consulting")}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">支付 & 生成报告</h1>
            <p className={`text-xs ${queryTypeColor}`}>{queryTypeLabel}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
        {/* Step Indicator */}
        <div className="flex justify-center">
          <StepIndicator step={step} />
        </div>

        {/* Step 0: Summary Preview */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Query Info */}
              <div className="rounded-2xl border border-white/10 bg-[#0d1130]/80 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium ${queryTypeColor}`}>{queryTypeLabel}</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{report.queryText}</p>
              </div>

              {/* Summary Preview */}
              <div className="rounded-2xl border border-[#00d4ff]/20 bg-gradient-to-br from-[#00d4ff]/5 to-transparent p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-[#00d4ff]" />
                  <span className="text-sm font-semibold text-[#00d4ff]">AI 摘要预览（免费）</span>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {report.summary || "正在生成摘要..."}
                </p>
                {/* Blur overlay for "more content" hint */}
                <div className="mt-3 relative">
                  <div className="h-16 bg-gradient-to-b from-transparent to-[#0d1130] rounded-lg overflow-hidden">
                    <p className="text-xs text-gray-600 blur-sm select-none">
                      完整报告包含详细的技术分析、风险评估、投资建议、链上数据分析、竞争格局分析、代币经济学深度解读...
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-[#a855f7] bg-[#0d1130]/90 px-3 py-1 rounded-full border border-[#a855f7]/30">
                      🔒 支付后解锁完整报告
                    </span>
                  </div>
                </div>
              </div>

              {/* Price Info */}
              <div className="rounded-xl border border-white/10 bg-[#0d1130]/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">完整报告费用</span>
                  <span className="text-xl font-bold text-white">{PRICE_USDT} USDT</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">BSC 链 USDT · 链上支付</p>
              </div>

              <Button
                onClick={() => setStep(1)}
                className="w-full h-12 bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white font-semibold text-base hover:opacity-90 rounded-xl"
              >
                <Wallet size={18} className="mr-2" />
                立即支付 {PRICE_USDT} USDT
                <ChevronRight size={16} className="ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 1: Payment Instructions */}
          {step === 1 && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Payment Instructions */}
              <div className="rounded-2xl border border-[#a855f7]/30 bg-[#a855f7]/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-[#a855f7]" />
                  <span className="text-sm font-semibold text-[#a855f7]">支付说明</span>
                </div>
                <ol className="space-y-2 text-sm text-gray-300">
                  <li className="flex gap-2">
                    <span className="text-[#a855f7] font-bold shrink-0">1.</span>
                    <span>打开您的 BSC 钱包（MetaMask / OKX Wallet / TokenPocket）</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#a855f7] font-bold shrink-0">2.</span>
                    <span>确保网络切换到 BSC（币安智能链）主网</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#a855f7] font-bold shrink-0">3.</span>
                    <span>发送 <strong className="text-white">10 USDT</strong> 到下方收款地址</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#a855f7] font-bold shrink-0">4.</span>
                    <span>复制交易哈希（TxHash）填入下方表单</span>
                  </li>
                </ol>
              </div>

              {/* Receiving Address */}
              <div className="rounded-xl border border-white/10 bg-[#0d1130]/80 p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">收款地址（BSC 链）</p>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border border-white/10">
                    <code className="flex-1 text-xs text-[#00d4ff] break-all font-mono">
                      {RECEIVING_ADDRESS}
                    </code>
                    <button
                      onClick={handleCopyAddress}
                      className="shrink-0 p-1.5 rounded-md hover:bg-white/10 transition-colors"
                    >
                      {copiedAddress ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1.5">USDT 合约地址（BSC）</p>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border border-white/10">
                    <code className="flex-1 text-xs text-gray-400 break-all font-mono">
                      {USDT_CONTRACT_BSC}
                    </code>
                    <button
                      onClick={handleCopyContract}
                      className="shrink-0 p-1.5 rounded-md hover:bg-white/10 transition-colors"
                    >
                      {copiedContract ? (
                        <CheckCircle2 size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} className="text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertCircle size={12} className="text-yellow-400 shrink-0" />
                  <p className="text-xs text-yellow-300">
                    请确保在 BSC 主网发送 USDT，发送其他代币或错误网络将无法退款
                  </p>
                </div>
              </div>

              {/* TxHash Input */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-1.5">您的钱包地址</p>
                  <Input
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x... (发送方钱包地址)"
                    className="bg-[#0d1130] border-white/10 text-white placeholder:text-gray-600 focus:border-[#00d4ff]/50 font-mono text-sm"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-1.5">交易哈希（TxHash）</p>
                  <Input
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="0x... (从钱包或 BSCScan 复制)"
                    className="bg-[#0d1130] border-white/10 text-white placeholder:text-gray-600 focus:border-[#00d4ff]/50 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    在钱包的交易记录中找到此笔转账，复制 TxHash
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="flex-1 h-11 border-white/20 text-gray-300 hover:bg-white/5 bg-transparent"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  返回
                </Button>
                <Button
                  onClick={handleSubmitPayment}
                  disabled={isSubmitting || !txHash || !walletAddress}
                  className="flex-2 h-11 bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white font-semibold hover:opacity-90 disabled:opacity-50 rounded-xl flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} className="mr-2" />
                      确认支付
                    </>
                  )}
                </Button>
              </div>

              {/* BSCScan Link */}
              <a
                href={`https://bscscan.com/address/${RECEIVING_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ExternalLink size={12} />
                在 BSCScan 上查看收款地址
              </a>
            </motion.div>
          )}

          {/* Step 2: Waiting for Confirmation */}
          {step === 2 && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              {/* Status Card */}
              <div className="rounded-2xl border border-[#00d4ff]/20 bg-gradient-to-br from-[#00d4ff]/5 to-[#a855f7]/5 p-6 text-center">
                {report.status === "completed" ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={32} className="text-green-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">报告生成完成！</h2>
                    <p className="text-sm text-gray-400">正在跳转到报告页面...</p>
                  </>
                ) : report.status === "failed" ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle size={32} className="text-red-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">验证失败</h2>
                    <p className="text-sm text-gray-400 mb-4">
                      未能验证您的支付，请检查交易哈希是否正确
                    </p>
                    <Button
                      onClick={() => retryVerification.mutate({ reportId })}
                      disabled={retryVerification.isPending}
                      className="bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30 hover:bg-[#a855f7]/30"
                      variant="outline"
                    >
                      <RefreshCw size={14} className="mr-2" />
                      重新验证
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#00d4ff]/10 flex items-center justify-center mx-auto mb-4">
                      <div className="relative">
                        <Loader2 size={32} className="animate-spin text-[#00d4ff]" />
                        <Sparkles size={14} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#a855f7]" />
                      </div>
                    </div>
                    <h2 className="text-lg font-bold text-white mb-2">
                      {report.status === "generating" ? "AI 正在生成报告..." : "等待交易确认..."}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {report.status === "generating"
                        ? "AI 正在深度分析，通常需要 30-60 秒"
                        : "正在验证 BSC 链上交易，通常需要 15-30 秒"}
                    </p>
                  </>
                )}
              </div>

              {/* TxHash Display */}
              {report.txHash && (
                <div className="rounded-xl border border-white/10 bg-[#0d1130]/60 p-4">
                  <p className="text-xs text-gray-500 mb-2">交易哈希</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-gray-400 font-mono truncate">
                      {report.txHash}
                    </code>
                    <a
                      href={`https://bscscan.com/tx/${report.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1.5 rounded-md hover:bg-white/10 transition-colors"
                    >
                      <ExternalLink size={14} className="text-[#00d4ff]" />
                    </a>
                  </div>
                </div>
              )}

              {/* Progress Steps */}
              <div className="rounded-xl border border-white/10 bg-[#0d1130]/60 p-4 space-y-3">
                {[
                  {
                    label: "支付已提交",
                    done: true,
                    icon: CheckCircle2,
                    color: "text-green-400",
                  },
                  {
                    label: "BSC 链上确认",
                    done: report.status !== "pending_payment",
                    icon: report.status === "pending_payment" ? Clock : CheckCircle2,
                    color: report.status === "pending_payment" ? "text-yellow-400" : "text-green-400",
                  },
                  {
                    label: "AI 生成深度报告",
                    done: report.status === "completed",
                    icon: report.status === "completed" ? CheckCircle2 : Sparkles,
                    color: report.status === "completed" ? "text-green-400" : "text-[#a855f7]",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <Icon size={16} className={item.color} />
                      <span className={`text-sm ${item.done ? "text-gray-300" : "text-gray-500"}`}>
                        {item.label}
                      </span>
                      {!item.done && report.status !== "failed" && (
                        <Loader2 size={12} className="animate-spin text-gray-500 ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Manual retry */}
              {report.status !== "completed" && report.status !== "failed" && (
                <p className="text-xs text-gray-600 text-center">
                  页面将自动刷新，请勿关闭。如长时间未更新，可
                  <button
                    onClick={() => refetchStatus()}
                    className="text-[#00d4ff] hover:underline mx-1"
                  >
                    手动刷新
                  </button>
                  状态
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
