/**
 * WalletConnectModal — 智能钱包连接弹窗
 * 完全使用 window.ethereum 直接调用，无 wagmi/rainbowkit 依赖
 * - 移动端：显示热门钱包列表 + 深度链接直接跳转钱包 App
 * - 桌面端：浏览器扩展钱包（MetaMask、OKX、Rabby 等）
 */
import { useState, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { Copy, ExternalLink, LogOut, CheckCircle2, Loader2, X, AlertCircle } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Chain info by chain ID (hex string)
const CHAIN_INFO: Record<string, { name: string; icon: string; explorer: string }> = {
  "0x1":    { name: "Ethereum",  icon: "⟠",  explorer: "https://etherscan.io/address/" },
  "0x38":   { name: "BNB Chain", icon: "🟡", explorer: "https://bscscan.com/address/" },
  "0x89":   { name: "Polygon",   icon: "🟣", explorer: "https://polygonscan.com/address/" },
  "0xa4b1": { name: "Arbitrum",  icon: "🔵", explorer: "https://arbiscan.io/address/" },
  "0xa":    { name: "Optimism",  icon: "🔴", explorer: "https://optimistic.etherscan.io/address/" },
  "0x2105": { name: "Base",      icon: "🔷", explorer: "https://basescan.org/address/" },
};

// 热门移动端钱包配置
const MOBILE_WALLETS = [
  { id: "trust",       name: "Trust Wallet",  emoji: "🛡️",
    iosStore: "https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409",
    androidStore: "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp" },
  { id: "metamask",    name: "MetaMask",      emoji: "🦊",
    iosStore: "https://apps.apple.com/app/metamask-blockchain-wallet/id1438144202",
    androidStore: "https://play.google.com/store/apps/details?id=io.metamask" },
  { id: "okx",         name: "OKX Wallet",    emoji: "⭕",
    iosStore: "https://apps.apple.com/app/okx-buy-bitcoin-btc-crypto/id1327268470",
    androidStore: "https://play.google.com/store/apps/details?id=com.okinc.okex.gp" },
  { id: "imtoken",     name: "imToken",       emoji: "💎",
    iosStore: "https://apps.apple.com/app/imtoken-btc-eth-wallet/id1384798940",
    androidStore: "https://play.google.com/store/apps/details?id=im.token.app" },
  { id: "tokenpocket", name: "TokenPocket",   emoji: "👛",
    iosStore: "https://apps.apple.com/app/tp-crypto-defi-nft-wallet/id1436028697",
    androidStore: "https://play.google.com/store/apps/details?id=vip.mytokenpocket" },
  { id: "coinbase",    name: "Coinbase",      emoji: "🔵",
    iosStore: "https://apps.apple.com/app/coinbase-wallet-nfts-crypto/id1278383455",
    androidStore: "https://play.google.com/store/apps/details?id=org.toshi" },
  { id: "bitget",      name: "Bitget",        emoji: "🔶",
    iosStore: "https://apps.apple.com/app/bitget-wallet-formerly-bitkeep/id1395301115",
    androidStore: "https://play.google.com/store/apps/details?id=com.bitkeep.wallet" },
  { id: "rainbow",     name: "Rainbow",       emoji: "🌈",
    iosStore: "https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021",
    androidStore: "https://play.google.com/store/apps/details?id=me.rainbow" },
];

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
      isOKExWallet?: boolean;
      isCoinbaseWallet?: boolean;
    };
  }
}

export default function WalletConnectModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const { address, isConnected, chainId, connect, disconnect } = useWallet();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const mobile = isMobile();
  const ios = isIOS();

  useEffect(() => {
    if (!open) {
      setConnecting(false);
      setConnectError(null);
    }
  }, [open]);

  if (!open) return null;

  const currentChain = chainId ? CHAIN_INFO[chainId] : null;
  const explorerUrl = currentChain
    ? `${currentChain.explorer}${address}`
    : `https://etherscan.io/address/${address}`;

  const handleConnect = async () => {
    if (!window.ethereum) {
      if (mobile) {
        // On mobile without injected wallet, show wallet list
        return;
      }
      toast.error("请先安装 MetaMask 或其他 Web3 钱包扩展");
      return;
    }
    setConnecting(true);
    setConnectError(null);
    try {
      await connect();
      toast.success("钱包连接成功！");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("User rejected") || msg.includes("4001")) {
        toast.error("用户取消了连接");
      } else {
        setConnectError(msg);
        toast.error("连接失败，请重试");
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleMobileWalletOpen = (wallet: typeof MOBILE_WALLETS[0]) => {
    const storeUrl = ios ? wallet.iosStore : wallet.androidStore;
    window.open(storeUrl, "_blank");
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address).then(() => toast.success("地址已复制"));
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success("已断开钱包连接");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-md border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-black/50 overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ background: "#0f1629" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
              {isConnected ? "已连接钱包" : t("wallet.title")}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {isConnected
                ? `${currentChain ? currentChain.icon + " " + currentChain.name : "未知网络"} · ${address?.slice(0, 6)}...${address?.slice(-4)}`
                : (mobile ? "选择您的钱包 App" : t("wallet.desc"))}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {isConnected && address ? (
          /* ── 已连接状态 ── */
          <div className="px-6 pb-6 space-y-3">
            {/* Address card */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center text-white font-bold text-sm">
                  {address.slice(2, 4).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-mono text-sm truncate">{address}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {currentChain ? `${currentChain.icon} ${currentChain.name}` : "未知网络"}
                  </p>
                </div>
                <CheckCircle2 size={18} className="text-[#00ff88] shrink-0" />
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyAddress}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-300 text-sm"
              >
                <Copy size={14} />
                复制地址
              </button>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-300 text-sm"
              >
                <ExternalLink size={14} />
                区块浏览器
              </a>
            </div>

            {/* Disconnect */}
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors text-red-400 text-sm font-medium"
            >
              <LogOut size={14} />
              断开连接
            </button>
          </div>
        ) : mobile ? (
          /* ── 移动端：钱包列表 ── */
          <div className="px-6 pb-6">
            <p className="text-xs text-gray-500 mb-3">点击下载并安装钱包 App，然后在钱包内访问本站</p>
            <div className="grid grid-cols-2 gap-2">
              {MOBILE_WALLETS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleMobileWalletOpen(wallet)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-left"
                >
                  <span className="text-2xl">{wallet.emoji}</span>
                  <span className="text-white text-sm font-medium">{wallet.name}</span>
                </button>
              ))}
            </div>

            {/* If injected wallet available on mobile */}
            {window.ethereum && (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="mt-3 w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[#00d4ff]/20 to-[#a855f7]/20 border border-[#00d4ff]/30 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {connecting ? <Loader2 size={16} className="animate-spin" /> : <span>🌐</span>}
                {connecting ? "连接中..." : "使用已安装的钱包"}
              </button>
            )}

            {connectError && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-400 text-xs">{connectError}</p>
              </div>
            )}
          </div>
        ) : (
          /* ── 桌面端：浏览器扩展钱包 ── */
          <div className="px-6 pb-6 space-y-3">
            {window.ethereum ? (
              <>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10 disabled:opacity-50"
                >
                  <span className="text-2xl">
                    {window.ethereum.isMetaMask ? "🦊" : window.ethereum.isOKExWallet ? "⭕" : window.ethereum.isCoinbaseWallet ? "🔵" : "🌐"}
                  </span>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium text-sm">
                      {window.ethereum.isMetaMask ? "MetaMask" : window.ethereum.isOKExWallet ? "OKX Wallet" : window.ethereum.isCoinbaseWallet ? "Coinbase Wallet" : "浏览器钱包"}
                    </p>
                    <p className="text-gray-400 text-xs">已检测到钱包扩展</p>
                  </div>
                  {connecting ? (
                    <Loader2 size={16} className="text-[#00d4ff] animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} className="text-[#00d4ff]" />
                  )}
                </button>

                {connectError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-red-400 text-xs">{connectError}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm mb-4">未检测到 Web3 钱包扩展</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "MetaMask", emoji: "🦊", url: "https://metamask.io/download/" },
                    { name: "OKX Wallet", emoji: "⭕", url: "https://www.okx.com/web3" },
                    { name: "Rabby", emoji: "🐰", url: "https://rabby.io/" },
                    { name: "Coinbase", emoji: "🔵", url: "https://www.coinbase.com/wallet/downloads" },
                  ].map((w) => (
                    <a
                      key={w.name}
                      href={w.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-sm text-gray-300"
                    >
                      <span className="text-xl">{w.emoji}</span>
                      {w.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
