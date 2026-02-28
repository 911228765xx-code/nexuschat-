/**
 * WalletConnectModal — 真实钱包连接弹窗
 * 使用 wagmi useConnect 实现 BSC 钱包连接
 * 支持 MetaMask、WalletConnect、Coinbase Wallet 等
 */
import { useState } from "react";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { Copy, ExternalLink, LogOut, CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const WALLET_ICONS: Record<string, string> = {
  metamask: "🦊",
  walletconnect: "🔗",
  coinbasewallet: "🔵",
  injected: "🌐",
  trust: "🛡️",
  okx: "⭕",
  rabby: "🐰",
  rainbow: "🌈",
};

function getWalletIcon(connectorId: string, connectorName: string): string {
  const key = (connectorId + connectorName).toLowerCase();
  for (const [k, icon] of Object.entries(WALLET_ICONS)) {
    if (key.includes(k)) return icon;
  }
  return "💼";
}

export default function WalletConnectModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const { connectors, connect, isPending, error } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  if (!open) return null;

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId);
    if (!connector) {
      toast.error("该钱包未安装或不可用");
      return;
    }
    setConnectingId(connectorId);
    connect(
      { connector },
      {
        onSuccess: () => {
          setConnectingId(null);
          toast.success("钱包连接成功！已切换至 BSC 主网");
          onClose();
        },
        onError: (err) => {
          setConnectingId(null);
          if (err.message.includes("User rejected")) {
            toast.error("用户取消了连接");
          } else {
            toast.error("连接失败: " + err.message);
          }
        },
      }
    );
  };

  const handleDisconnect = () => {
    disconnect();
    toast.info("钱包已断开连接");
    onClose();
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("地址已复制");
    }
  };

  const popular = connectors.slice(0, 3);
  const more = connectors.slice(3);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-[#0f1629]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <div>
            <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
              {isConnected ? "已连接钱包" : t("wallet.title")}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {isConnected
                ? `BSC 主网 · ${address?.slice(0, 6)}...${address?.slice(-4)}`
                : t("wallet.desc")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isConnected ? (
          /* Connected State */
          <div className="px-6 pt-4 pb-6 space-y-3">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">已连接地址</p>
                  <p className="text-sm font-mono text-white truncate">{address}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyAddress}
                className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#00d4ff]/10 text-[#00d4ff] text-sm font-medium hover:bg-[#00d4ff]/20 transition-colors border border-[#00d4ff]/20"
              >
                <Copy size={14} />复制地址
              </button>
              <button
                onClick={() => window.open(`https://bscscan.com/address/${address}`, "_blank")}
                className="flex items-center justify-center gap-2 h-10 rounded-xl bg-white/5 text-gray-300 text-sm font-medium hover:bg-white/10 transition-colors border border-white/10"
              >
                <ExternalLink size={14} />查看区块链
              </button>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors border border-red-500/20"
            >
              <LogOut size={14} />断开连接
            </button>
          </div>
        ) : (
          <>
            {/* Popular wallets */}
            <div className="px-6 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{t("wallet.popular")}</p>
              <div className="grid grid-cols-3 gap-3">
                {popular.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => handleConnect(connector.id)}
                    disabled={!!connectingId || isPending}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-[#00d4ff]/30 hover:bg-white/10 transition-all group disabled:opacity-50"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">
                      {getWalletIcon(connector.id, connector.name)}
                    </span>
                    <span className="text-xs text-gray-300 font-medium text-center leading-tight">
                      {connector.name}
                    </span>
                    {connectingId === connector.id && (
                      <Loader2 size={12} className="text-[#00d4ff] animate-spin" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* More wallets */}
            {more.length > 0 && (
              <div className="px-6 pt-5 pb-6">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{t("wallet.more")}</p>
                <div className="space-y-2">
                  {more.map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => handleConnect(connector.id)}
                      disabled={!!connectingId || isPending}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#00d4ff]/30 hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                      <span className="text-2xl">{getWalletIcon(connector.id, connector.name)}</span>
                      <span className="text-sm text-gray-300 font-medium flex-1 text-left">{connector.name}</span>
                      {connectingId === connector.id ? (
                        <Loader2 size={14} className="text-[#00d4ff] animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="px-6 pb-4">
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                  {error.message.includes("User rejected") ? "用户取消了连接" : error.message}
                </p>
              </div>
            )}

            {/* No connectors fallback */}
            {connectors.length === 0 && (
              <div className="px-6 pb-6">
                <p className="text-sm text-gray-400 text-center">
                  未检测到钱包扩展，请先安装{" "}
                  <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] underline">
                    MetaMask
                  </a>
                </p>
              </div>
            )}
          </>
        )}

        {/* Glow effects */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00d4ff]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#a855f7]/10 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
}
