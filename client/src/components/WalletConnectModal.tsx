/**
 * WalletConnectModal — 真实钱包连接弹窗
 * 使用 wagmi useConnect 实现多链钱包连接
 * 支持 MetaMask、WalletConnect QR 码、Coinbase Wallet 等
 */
import { useState } from "react";
import { useConnect, useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { Copy, ExternalLink, LogOut, CheckCircle2, Loader2, ChevronRight, Wifi } from "lucide-react";
import { mainnet, bsc, polygon, arbitrum, optimism, base } from "@/lib/wagmi";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CHAIN_INFO: Record<number, { name: string; icon: string; explorer: string }> = {
  [mainnet.id]:  { name: "Ethereum",  icon: "⟠",  explorer: "https://etherscan.io/address/" },
  [bsc.id]:      { name: "BNB Chain", icon: "🟡", explorer: "https://bscscan.com/address/" },
  [polygon.id]:  { name: "Polygon",   icon: "🟣", explorer: "https://polygonscan.com/address/" },
  [arbitrum.id]: { name: "Arbitrum",  icon: "🔵", explorer: "https://arbiscan.io/address/" },
  [optimism.id]: { name: "Optimism",  icon: "🔴", explorer: "https://optimistic.etherscan.io/address/" },
  [base.id]:     { name: "Base",      icon: "🔷", explorer: "https://basescan.org/address/" },
};

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
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showChainSwitch, setShowChainSwitch] = useState(false);

  if (!open) return null;

  const currentChain = chainId ? CHAIN_INFO[chainId] : null;
  const explorerUrl = currentChain
    ? `${currentChain.explorer}${address}`
    : `https://etherscan.io/address/${address}`;

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
          toast.success("钱包连接成功！");
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

  const handleSwitchChain = (targetChainId: number) => {
    switchChain(
      { chainId: targetChainId },
      {
        onSuccess: () => {
          toast.success(`已切换至 ${CHAIN_INFO[targetChainId]?.name}`);
          setShowChainSwitch(false);
        },
        onError: (err) => {
          toast.error("切换链失败: " + err.message);
        },
      }
    );
  };

  // Separate WalletConnect from injected wallets
  const walletConnectConnector = connectors.find(c =>
    c.id.toLowerCase().includes("walletconnect")
  );
  const injectedConnectors = connectors.filter(c =>
    !c.id.toLowerCase().includes("walletconnect")
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-[#0f1629]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
              {isConnected ? "已连接钱包" : t("wallet.title")}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {isConnected
                ? `${currentChain ? currentChain.icon + " " + currentChain.name : "未知网络"} · ${address?.slice(0, 6)}...${address?.slice(-4)}`
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
          <div className="px-6 pb-6 space-y-3">
            {/* Address card */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">已连接地址</p>
                  <p className="text-sm font-mono text-white truncate">{address}</p>
                </div>
              </div>
            </div>

            {/* Chain switcher */}
            <button
              onClick={() => setShowChainSwitch(!showChainSwitch)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Wifi size={14} className="text-[#00d4ff]" />
                <span className="text-sm text-gray-300">
                  当前网络：{currentChain ? `${currentChain.icon} ${currentChain.name}` : `Chain ${chainId}`}
                </span>
              </div>
              <ChevronRight size={14} className={`text-gray-500 transition-transform ${showChainSwitch ? "rotate-90" : ""}`} />
            </button>

            {showChainSwitch && (
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(CHAIN_INFO).map(([cid, info]) => {
                  const targetId = Number(cid);
                  const isActive = chainId === targetId;
                  return (
                    <button
                      key={cid}
                      onClick={() => !isActive && handleSwitchChain(targetId)}
                      disabled={isSwitching || isActive}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium transition-all ${
                        isActive
                          ? "bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff]"
                          : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                      } disabled:opacity-50`}
                    >
                      <span className="text-lg">{info.icon}</span>
                      <span className="leading-tight text-center">{info.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyAddress}
                className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#00d4ff]/10 text-[#00d4ff] text-sm font-medium hover:bg-[#00d4ff]/20 transition-colors border border-[#00d4ff]/20"
              >
                <Copy size={14} />复制地址
              </button>
              <button
                onClick={() => window.open(explorerUrl, "_blank")}
                className="flex items-center justify-center gap-2 h-10 rounded-xl bg-white/5 text-gray-300 text-sm font-medium hover:bg-white/10 transition-colors border border-white/10"
              >
                <ExternalLink size={14} />区块链浏览器
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
            {/* Injected wallets (MetaMask, Rabby, etc.) */}
            {injectedConnectors.length > 0 && (
              <div className="px-6 pt-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  {t("wallet.popular")}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {injectedConnectors.slice(0, 6).map((connector) => (
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
            )}

            {/* WalletConnect — scan QR with mobile wallet */}
            {walletConnectConnector && (
              <div className="px-6 pt-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  手机钱包扫码连接
                </p>
                <button
                  onClick={() => handleConnect(walletConnectConnector.id)}
                  disabled={!!connectingId || isPending}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-gradient-to-r from-[#3b99fc]/10 to-[#3b99fc]/5 border border-[#3b99fc]/30 hover:border-[#3b99fc]/60 hover:from-[#3b99fc]/20 hover:to-[#3b99fc]/10 transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#3b99fc]/20 flex items-center justify-center flex-shrink-0">
                    {connectingId === walletConnectConnector.id ? (
                      <Loader2 size={24} className="text-[#3b99fc] animate-spin" />
                    ) : (
                      <span className="text-2xl">🔗</span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white">WalletConnect</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      支持 Trust Wallet、imToken、TokenPocket 等 300+ 手机钱包
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-500 flex-shrink-0" />
                </button>
              </div>
            )}

            {/* No connectors fallback */}
            {connectors.length === 0 && (
              <div className="px-6 pt-4 pb-2">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-sm text-amber-300 mb-2">未检测到钱包扩展</p>
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#00d4ff] underline"
                  >
                    安装 MetaMask →
                  </a>
                </div>
              </div>
            )}

            {/* Supported chains hint */}
            <div className="px-6 pt-4 pb-6">
              <p className="text-xs text-gray-600 text-center">
                支持 Ethereum · BNB Chain · Polygon · Arbitrum · Optimism · Base
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="px-6 pb-4">
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                  {error.message.includes("User rejected") ? "用户取消了连接" : error.message}
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
