/**
 * WalletConnectModal — 智能钱包连接弹窗
 * - 移动端：显示热门钱包列表 + 深度链接直接跳转钱包 App
 * - 桌面端：WalletConnect 二维码扫描 + 浏览器扩展钱包
 */
import { useState, useEffect } from "react";
import { useConnect, useAccount, useDisconnect, useSwitchChain } from "wagmi";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { Copy, ExternalLink, LogOut, CheckCircle2, Loader2, ChevronRight, Wifi, Smartphone, Monitor, X, AlertCircle } from "lucide-react";
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

// 热门移动端钱包配置
const MOBILE_WALLETS = [
  { id: "trust", name: "Trust Wallet", emoji: "🛡️",
    universalLink: (uri: string) => `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`,
    androidStore: "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp",
    iosStore: "https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409" },
  { id: "metamask", name: "MetaMask", emoji: "🦊",
    universalLink: (uri: string) => `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`,
    androidStore: "https://play.google.com/store/apps/details?id=io.metamask",
    iosStore: "https://apps.apple.com/app/metamask-blockchain-wallet/id1438144202" },
  { id: "okx", name: "OKX Wallet", emoji: "⭕",
    universalLink: (uri: string) => `https://www.okx.com/download?deeplink=${encodeURIComponent("okex://main/wc?uri=" + encodeURIComponent(uri))}`,
    androidStore: "https://play.google.com/store/apps/details?id=com.okinc.okex.gp",
    iosStore: "https://apps.apple.com/app/okx-buy-bitcoin-btc-crypto/id1327268470" },
  { id: "imtoken", name: "imToken", emoji: "💎",
    universalLink: (uri: string) => `https://token.im/download?deeplink=${encodeURIComponent("imtokenv2://wc?uri=" + encodeURIComponent(uri))}`,
    androidStore: "https://play.google.com/store/apps/details?id=im.token.app",
    iosStore: "https://apps.apple.com/app/imtoken-btc-eth-wallet/id1384798940" },
  { id: "tokenpocket", name: "TokenPocket", emoji: "👛",
    universalLink: (uri: string) => `https://tokenpocket.pro/download?deeplink=${encodeURIComponent(uri)}`,
    androidStore: "https://play.google.com/store/apps/details?id=vip.mytokenpocket",
    iosStore: "https://apps.apple.com/app/tp-crypto-defi-nft-wallet/id1436028697" },
  { id: "coinbase", name: "Coinbase", emoji: "🔵",
    universalLink: (uri: string) => `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`,
    androidStore: "https://play.google.com/store/apps/details?id=org.toshi",
    iosStore: "https://apps.apple.com/app/coinbase-wallet-nfts-crypto/id1278383455" },
  { id: "bitget", name: "Bitget", emoji: "🔶",
    universalLink: (uri: string) => `https://bkcode.vip?action=wc&value=${encodeURIComponent(uri)}`,
    androidStore: "https://play.google.com/store/apps/details?id=com.bitkeep.wallet",
    iosStore: "https://apps.apple.com/app/bitget-wallet-formerly-bitkeep/id1395301115" },
  { id: "rainbow", name: "Rainbow", emoji: "🌈",
    universalLink: (uri: string) => `https://rnbwapp.com/wc?uri=${encodeURIComponent(uri)}`,
    androidStore: "https://play.google.com/store/apps/details?id=me.rainbow",
    iosStore: "https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021" },
];

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
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
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showChainSwitch, setShowChainSwitch] = useState(false);
  const [mobileTab, setMobileTab] = useState<"list" | "qr">("list");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [pendingWalletId, setPendingWalletId] = useState<string | null>(null);

  const mobile = isMobile();
  const ios = isIOS();

  useEffect(() => {
    if (!open) {
      setConnectingId(null);
      setConnectError(null);
      setMobileTab("list");
      setPendingWalletId(null);
    }
  }, [open]);

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
    setConnectError(null);
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
          } else if (err.message.includes("Already processing")) {
            toast.error("请在钱包中确认连接请求");
          } else {
            setConnectError(err.message);
            toast.error("连接失败，请重试");
          }
        },
      }
    );
  };

  // 移动端深度链接：触发 WalletConnect 会话，轮询 URI 后跳转到对应钱包 App
  const handleMobileWalletDeepLink = async (wallet: typeof MOBILE_WALLETS[0]) => {
    if (!walletConnectConnector) {
      window.open(ios ? wallet.iosStore : wallet.androidStore, "_blank");
      return;
    }
    setPendingWalletId(wallet.id);
    setConnectError(null);
    connect({ connector: walletConnectConnector }, {
      onSuccess: () => { setPendingWalletId(null); toast.success("钱包连接成功！"); onClose(); },
      onError: (err) => {
        setPendingWalletId(null);
        if (!err.message.includes("User rejected")) setConnectError(`连接 ${wallet.name} 失败，请确保已安装该钱包 App`);
      },
    });
    let uri: string | null = null;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const provider = await walletConnectConnector.getProvider() as Record<string, unknown>;
        const signer = provider?.signer as Record<string, unknown> | undefined;
        const session = provider?.session as Record<string, unknown> | undefined;
        const conn = provider?.connector as Record<string, unknown> | undefined;
        const candidate = (signer?.uri as string) || (session?.uri as string) || (conn?.uri as string) || (provider?.uri as string);
        if (candidate && candidate.startsWith("wc:")) { uri = candidate; break; }
      } catch { /* continue */ }
    }
    if (uri) {
      window.location.href = wallet.universalLink(uri);
    } else {
      toast.info(`正在跳转到 ${wallet.name} 下载页...`);
      window.open(ios ? wallet.iosStore : wallet.androidStore, "_blank");
    }
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
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-[#0f1629]/95 backdrop-blur-xl border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-black/50 overflow-hidden max-h-[90vh] overflow-y-auto">
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
              onClick={() => { disconnect(); toast.info("钱包已断开连接"); onClose(); }}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors border border-red-500/20"
            >
              <LogOut size={14} />断开连接
            </button>
          </div>
        ) : mobile ? (
          /* ── 移动端：热门钱包列表 + 深度链接 ── */
          <div className="px-6 pb-6">
            {/* 模式切换 Tab */}
            <div className="flex gap-2 mb-5 p-1 bg-white/5 rounded-xl">
              <button onClick={() => setMobileTab("list")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  mobileTab === "list" ? "bg-[#00d4ff]/20 text-[#00d4ff]" : "text-gray-500 hover:text-gray-300"
                }`}>
                <Smartphone size={12} />钱包 App
              </button>
              <button onClick={() => setMobileTab("qr")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  mobileTab === "qr" ? "bg-[#00d4ff]/20 text-[#00d4ff]" : "text-gray-500 hover:text-gray-300"
                }`}>
                <Monitor size={12} />扫码连接
              </button>
            </div>

            {mobileTab === "list" ? (
              <>
                {/* 热门钱包 4×2 网格 */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {MOBILE_WALLETS.map((wallet) => {
                    const isLoading = pendingWalletId === wallet.id;
                    return (
                      <button key={wallet.id} onClick={() => handleMobileWalletDeepLink(wallet)}
                        disabled={!!pendingWalletId || isPending}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all disabled:opacity-50 active:scale-95">
                        {isLoading ? <Loader2 size={28} className="text-[#00d4ff] animate-spin" /> : <span className="text-2xl">{wallet.emoji}</span>}
                        <span className="text-[10px] text-gray-400 font-medium text-center leading-tight">{wallet.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-300 leading-relaxed">点击钱包图标将自动跳转到对应 App 完成连接。若未安装，将跳转到应用商店下载。</p>
                  </div>
                </div>
                {injectedConnectors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-2">已安装的扩展钱包</p>
                    <div className="space-y-2">
                      {injectedConnectors.map((connector) => (
                        <button key={connector.id} onClick={() => handleConnect(connector.id)}
                          disabled={!!connectingId || isPending}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all disabled:opacity-50">
                          <span className="text-xl">{getWalletIcon(connector.id, connector.name)}</span>
                          <span className="text-sm text-gray-300 font-medium">{connector.name}</span>
                          {connectingId === connector.id && <Loader2 size={14} className="text-[#00d4ff] animate-spin ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* 扫码连接 Tab */
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-[#3b99fc]/20 flex items-center justify-center mx-auto mb-3">
                  {connectingId ? <Loader2 size={32} className="text-[#3b99fc] animate-spin" /> : <span className="text-3xl">🔗</span>}
                </div>
                <p className="text-sm text-white font-medium mb-1">WalletConnect 扫码</p>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">在桌面浏览器打开 nexuschat.best，<br />点击"连接钱包"后用手机钱包扫描二维码</p>
                {walletConnectConnector && (
                  <button onClick={() => handleConnect(walletConnectConnector.id)}
                    disabled={!!connectingId || isPending}
                    className="px-6 py-3 rounded-xl bg-[#3b99fc]/20 border border-[#3b99fc]/40 text-[#3b99fc] text-sm font-medium hover:bg-[#3b99fc]/30 transition-colors disabled:opacity-50">
                    {connectingId ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />正在连接...</span> : "打开 WalletConnect"}
                  </button>
                )}
                <p className="text-xs text-gray-600 mt-4">支持 Trust · MetaMask · OKX · imToken · TokenPocket 等 300+ 钱包</p>
              </div>
            )}

            {(connectError || error) && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-red-400 leading-relaxed">{connectError || (error?.message.includes("User rejected") ? "用户取消了连接" : error?.message)}</p>
                    <p className="text-xs text-gray-500 mt-1">请确保已安装对应钱包 App，或切换到"扫码连接"方式</p>
                  </div>
                </div>
              </div>
            )}
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
            {(connectError || error) && (
              <div className="px-6 pb-4">
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                  {connectError || (error?.message.includes("User rejected") ? "用户取消了连接" : error?.message)}
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
