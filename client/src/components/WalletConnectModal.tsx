/**
 * WalletConnectModal — 智能钱包连接弹窗 v2
 * 完全使用 window.ethereum 直接调用，无 wagmi/rainbowkit 依赖
 *
 * 移动端策略（三层降级）：
 *  1. 已检测到注入钱包 (window.ethereum) → 直接连接
 *  2. 未检测到 → 显示深度链接列表，点击直接跳转钱包 App 内置浏览器打开本站
 *  3. 深度链接跳转失败 → 降级到应用商店下载链接
 *
 * 桌面端：
 *  - 已安装扩展 → 直接连接
 *  - 未安装 → 显示推荐扩展下载链接
 */
import { useState, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { Copy, ExternalLink, LogOut, CheckCircle2, Loader2, X, AlertCircle, Smartphone, Monitor } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CHAIN_INFO: Record<string, { name: string; icon: string; explorer: string }> = {
  "0x1":    { name: "Ethereum",  icon: "⟠",  explorer: "https://etherscan.io/address/" },
  "0x38":   { name: "BNB Chain", icon: "🟡", explorer: "https://bscscan.com/address/" },
  "0x89":   { name: "Polygon",   icon: "🟣", explorer: "https://polygonscan.com/address/" },
  "0xa4b1": { name: "Arbitrum",  icon: "🔵", explorer: "https://arbiscan.io/address/" },
  "0xa":    { name: "Optimism",  icon: "🔴", explorer: "https://optimistic.etherscan.io/address/" },
  "0x2105": { name: "Base",      icon: "🔷", explorer: "https://basescan.org/address/" },
};

/**
 * 生成移动端深度链接 — 直接在钱包 App 内置浏览器中打开 DApp
 * 各钱包深度链接格式参考官方文档
 */
function buildDeepLink(walletId: string, dappUrl: string): string {
  const encoded = encodeURIComponent(dappUrl);
  switch (walletId) {
    case "metamask":
      // MetaMask: metamask://dapp/{url}
      return `https://metamask.app.link/dapp/${dappUrl.replace(/^https?:\/\//, "")}`;
    case "trust":
      // Trust Wallet: trust://open_url?coin_id=60&url={url}
      return `https://link.trustwallet.com/open_url?coin_id=60&url=${encoded}`;
    case "okx":
      // OKX Wallet: okx://wallet/dapp/url?dappUrl={url}
      return `okx://wallet/dapp/url?dappUrl=${encoded}`;
    case "coinbase":
      // Coinbase Wallet: https://go.cb-w.com/dapp?cb_url={url}
      return `https://go.cb-w.com/dapp?cb_url=${encoded}`;
    case "imtoken":
      // imToken: imtokenv2://navigate/DappView?url={url}
      return `imtokenv2://navigate/DappView?url=${encoded}`;
    case "tokenpocket":
      // TokenPocket: tpdapp://open?params={"url":"...","chain":"ETH"}
      return `tpdapp://open?params=${encodeURIComponent(JSON.stringify({ url: dappUrl, chain: "ETH" }))}`;
    case "bitget":
      // Bitget Wallet: bitkeep://open/dapp?url={url}
      return `bitkeep://open/dapp?url=${encoded}`;
    case "rainbow":
      // Rainbow: rainbow://dapp?url={url}
      return `rainbow://dapp?url=${encoded}`;
    default:
      return dappUrl;
  }
}

const MOBILE_WALLETS = [
  { id: "trust",       name: "Trust Wallet",  emoji: "🛡️", color: "#3375BB",
    iosStore: "https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409",
    androidStore: "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp" },
  { id: "metamask",    name: "MetaMask",      emoji: "🦊", color: "#E2761B",
    iosStore: "https://apps.apple.com/app/metamask-blockchain-wallet/id1438144202",
    androidStore: "https://play.google.com/store/apps/details?id=io.metamask" },
  { id: "okx",         name: "OKX Wallet",    emoji: "⭕", color: "#00B4D8",
    iosStore: "https://apps.apple.com/app/okx-buy-bitcoin-btc-crypto/id1327268470",
    androidStore: "https://play.google.com/store/apps/details?id=com.okinc.okex.gp" },
  { id: "coinbase",    name: "Coinbase",      emoji: "🔵", color: "#0052FF",
    iosStore: "https://apps.apple.com/app/coinbase-wallet-nfts-crypto/id1278383455",
    androidStore: "https://play.google.com/store/apps/details?id=org.toshi" },
  { id: "imtoken",     name: "imToken",       emoji: "💎", color: "#11C4D1",
    iosStore: "https://apps.apple.com/app/imtoken-btc-eth-wallet/id1384798940",
    androidStore: "https://play.google.com/store/apps/details?id=im.token.app" },
  { id: "tokenpocket", name: "TokenPocket",   emoji: "👛", color: "#2980FE",
    iosStore: "https://apps.apple.com/app/tp-crypto-defi-nft-wallet/id1436028697",
    androidStore: "https://play.google.com/store/apps/details?id=vip.mytokenpocket" },
  { id: "bitget",      name: "Bitget",        emoji: "🔶", color: "#00CED1",
    iosStore: "https://apps.apple.com/app/bitget-wallet-formerly-bitkeep/id1395301115",
    androidStore: "https://play.google.com/store/apps/details?id=com.bitkeep.wallet" },
  { id: "rainbow",     name: "Rainbow",       emoji: "🌈", color: "#9B59B6",
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
  const [deepLinkAttempted, setDeepLinkAttempted] = useState<string | null>(null);

  const mobile = isMobile();
  const ios = isIOS();
  const dappUrl = window.location.origin;

  useEffect(() => {
    if (!open) {
      setConnecting(false);
      setConnectError(null);
      setDeepLinkAttempted(null);
    }
  }, [open]);

  if (!open) return null;

  const currentChain = chainId ? CHAIN_INFO[chainId] : null;
  const explorerUrl = currentChain
    ? `${currentChain.explorer}${address}`
    : `https://etherscan.io/address/${address}`;

  const handleConnect = async () => {
    if (!window.ethereum) {
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

  /**
   * 移动端深度链接跳转
   * 尝试通过深度链接打开钱包 App 内置浏览器；
   * 若 1.5s 内页面未失焦（说明 App 未安装），则降级到应用商店
   */
  const handleDeepLink = (wallet: typeof MOBILE_WALLETS[0]) => {
    const deepLink = buildDeepLink(wallet.id, dappUrl);
    setDeepLinkAttempted(wallet.id);

    // Try deep link
    window.location.href = deepLink;

    // Fallback: if app not installed, redirect to store after 1.5s
    const storeUrl = ios ? wallet.iosStore : wallet.androidStore;
    const fallbackTimer = setTimeout(() => {
      // If we're still here, the deep link didn't work
      if (document.visibilityState !== "hidden") {
        window.open(storeUrl, "_blank");
        setDeepLinkAttempted(null);
      }
    }, 1500);

    // Cancel fallback if page becomes hidden (app opened successfully)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearTimeout(fallbackTimer);
        setDeepLinkAttempted(null);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
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
      {/* Backdrop — solid, no backdrop-filter */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.75)" }} onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-md border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#0f1629", maxHeight: "90dvh", overflowY: "auto" }}
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
                : mobile
                  ? <><Smartphone size={12} className="inline mr-1" />选择钱包 App 直接连接</>
                  : <><Monitor size={12} className="inline mr-1" />{t("wallet.desc")}</>
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* ── 已连接状态 ── */}
        {isConnected && address ? (
          <div className="px-6 pb-6 space-y-3">
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
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyAddress}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-300 text-sm"
              >
                <Copy size={14} />复制地址
              </button>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-gray-300 text-sm"
              >
                <ExternalLink size={14} />区块浏览器
              </a>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors text-red-400 text-sm font-medium"
            >
              <LogOut size={14} />断开连接
            </button>
          </div>

        ) : mobile ? (
          /* ── 移动端：深度链接列表 ── */
          <div className="px-6 pb-6">
            {/* If injected wallet available on mobile (already in wallet browser) */}
            {window.ethereum && (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="mb-3 w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[#00d4ff]/20 to-[#a855f7]/20 border border-[#00d4ff]/30 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {connecting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} className="text-[#00d4ff]" />}
                {connecting ? "连接中..." : "连接当前钱包"}
              </button>
            )}

            <p className="text-xs text-gray-500 mb-3">
              {window.ethereum
                ? "或选择其他钱包 App 打开本站："
                : "选择钱包 App，将在 App 内置浏览器中打开本站："}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {MOBILE_WALLETS.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleDeepLink(wallet)}
                  disabled={deepLinkAttempted === wallet.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5 text-left disabled:opacity-60"
                >
                  <span className="text-2xl leading-none">{wallet.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-tight">{wallet.name}</p>
                    <p className="text-gray-500 text-[10px] mt-0.5">
                      {deepLinkAttempted === wallet.id ? "跳转中..." : "点击打开"}
                    </p>
                  </div>
                  {deepLinkAttempted === wallet.id
                    ? <Loader2 size={12} className="text-[#00d4ff] animate-spin shrink-0" />
                    : <ExternalLink size={12} className="text-gray-600 shrink-0" />
                  }
                </button>
              ))}
            </div>

            {connectError && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-400 text-xs">{connectError}</p>
              </div>
            )}

            <p className="text-[10px] text-gray-600 text-center mt-4 leading-relaxed">
              点击后将跳转到钱包 App 内置浏览器。<br/>
              若未安装，将自动跳转到应用商店下载。
            </p>
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
                    <p className="text-gray-400 text-xs mt-0.5">已检测到钱包扩展，点击连接</p>
                  </div>
                  {connecting
                    ? <Loader2 size={16} className="text-[#00d4ff] animate-spin" />
                    : <CheckCircle2 size={16} className="text-[#00d4ff]" />
                  }
                </button>
                {connectError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-red-400 text-xs">{connectError}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm mb-4">未检测到 Web3 钱包扩展，请先安装：</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "MetaMask",    emoji: "🦊", url: "https://metamask.io/download/" },
                    { name: "OKX Wallet",  emoji: "⭕", url: "https://www.okx.com/web3" },
                    { name: "Rabby",       emoji: "🐰", url: "https://rabby.io/" },
                    { name: "Coinbase",    emoji: "🔵", url: "https://www.coinbase.com/wallet/downloads" },
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
                <p className="text-xs text-gray-600 mt-4">
                  安装后刷新页面即可连接
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
