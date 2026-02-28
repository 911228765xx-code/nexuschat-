/**
 * Wallet — 钱包资产详情页
 * 代币持仓列表、NFT画廊、交易历史记录
 * 三个Tab切换 + 总资产概览
 */
import { useState, useMemo } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, RefreshCw, Copy, ExternalLink, Eye, EyeOff, Send, QrCode, Plus, Filter, ChevronDown, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useWallet } from "@/contexts/WalletContext";

/* ─── Types ─── */
interface Token {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  balance: number;
  value: number;
  price: number;
  change24h: number;
  chain: string;
}

interface NFT {
  id: string;
  name: string;
  collection: string;
  image: string;
  floorPrice: number;
  chain: string;
  rarity?: string;
}

interface Transaction {
  id: string;
  type: "send" | "receive" | "swap" | "approve" | "mint" | "stake";
  token: string;
  tokenIcon: string;
  amount: string;
  value: string;
  from: string;
  to: string;
  time: string;
  status: "confirmed" | "pending" | "failed";
  hash: string;
  chain: string;
}

// Mock data removed — now using real BSC chain data from backend

/* ─── Tab types ─── */
type WalletTab = "tokens" | "nfts" | "history";

export default function Wallet() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<WalletTab>("tokens");
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [selectedChain, setSelectedChain] = useState("All");
  const [showChainFilter, setShowChainFilter] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [sendAmount, setSendAmount] = useState("");
  const [sendAddress, setSendAddress] = useState("");
  const [sendToken, setSendToken] = useState("BNB");
  const [swapFrom, setSwapFrom] = useState("BNB");
  const [swapTo, setSwapTo] = useState("USDT");
  const [swapAmount, setSwapAmount] = useState("");

  // ─── Real wallet from WalletContext ───
  const { address: connectedAddress } = useWallet();
  const walletAddress = connectedAddress || "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18";

  // ─── BscScan API queries ───
  const isValidBscAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
  const { data: bnbData, isLoading: bnbLoading } = trpc.wallet.getBalance.useQuery(
    { address: walletAddress },
    { enabled: isValidBscAddress, staleTime: 30_000 }
  );
  const { data: tokenData, isLoading: tokensLoading } = trpc.wallet.getTokenBalances.useQuery(
    { address: walletAddress },
    { enabled: isValidBscAddress, staleTime: 60_000 }
  );
  const { data: txData, isLoading: txLoading } = trpc.wallet.getTransactions.useQuery(
    { address: walletAddress, page: 1, offset: 20 },
    { enabled: isValidBscAddress && activeTab === "history", staleTime: 30_000 }
  );

  // ─── Merge real data with mock fallback ───
  const displayTokens = useMemo(() => {
    if (!isValidBscAddress || (!bnbData && !tokenData)) return [];
    const result: Token[] = [];
    if (bnbData && parseFloat(bnbData.bnbBalanceFormatted) > 0) {
      result.push({
        id: "bnb",
        symbol: "BNB",
        name: "BNB",
        icon: "⬡",
        balance: parseFloat(bnbData.bnbBalanceFormatted),
        value: bnbData.usdValue ? parseFloat(bnbData.usdValue) : 0,
        price: bnbData.usdValue && parseFloat(bnbData.bnbBalanceFormatted) > 0
          ? parseFloat(bnbData.usdValue) / parseFloat(bnbData.bnbBalanceFormatted)
          : 0,
        change24h: 0,
        chain: "BSC",
      });
    }
    if (tokenData) {
      tokenData.forEach((tk) => {
        result.push({
          id: tk.contractAddress,
          symbol: tk.symbol,
          name: tk.name,
          icon: tk.symbol.charAt(0),
          balance: parseFloat(tk.balanceFormatted),
          value: 0,
          price: 0,
          change24h: 0,
          chain: "BSC",
        });
      });
    }
    return result;
  }, [bnbData, tokenData, isValidBscAddress]);

  const displayTxs = useMemo((): Transaction[] => {
    if (!txData || txData.length === 0) return [];
    return txData.map((tx) => ({
      id: tx.hash,
      type: (tx.isIncoming ? "receive" : "send") as Transaction["type"],
      token: "BNB",
      tokenIcon: "⬡",
      amount: `${tx.isIncoming ? "+" : "-"}${tx.valueFormatted} BNB`,
      value: "",
      from: tx.from,
      to: tx.to,
      time: new Date(tx.timestamp).toLocaleString(),
      status: (tx.isError ? "failed" : "confirmed") as Transaction["status"],
      hash: tx.hash,
      chain: "BSC",
    }));
  }, [txData]);

  // Use real data when available, fallback to mock
  const totalBalance = displayTokens.reduce((sum, t) => sum + t.value, 0);
  const nfts: NFT[] = []; // NFT data not yet available from backend
  const totalNFTValue = nfts.reduce((sum, n) => sum + n.floorPrice, 0);
  const totalChange = displayTokens.reduce((sum, t) => sum + (t.value * t.change24h / 100), 0);
  const totalChangePercent = totalBalance > 0 ? (totalChange / totalBalance) * 100 : 0;

  const chains = ["All", "BSC", "Ethereum", "Solana", "Polygon", "Arbitrum"];

  const filteredTokens = selectedChain === "All" ? displayTokens : displayTokens.filter(t => t.chain === selectedChain);
  const filteredNFTs = selectedChain === "All" ? nfts : nfts.filter(n => n.chain === selectedChain);
  const filteredTxs = selectedChain === "All" ? displayTxs : displayTxs.filter(tx => tx.chain === selectedChain);
  const isLoadingData = bnbLoading || tokensLoading;

  const txTypeIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "send": return <ArrowUpRight size={16} className="text-red-400" />;
      case "receive": return <ArrowDownLeft size={16} className="text-neon-green" />;
      case "swap": return <RefreshCw size={16} className="text-neon-cyan" />;
      case "approve": return <ExternalLink size={16} className="text-yellow-400" />;
      case "mint": return <Plus size={16} className="text-neon-purple" />;
      case "stake": return <TrendingUp size={16} className="text-blue-400" />;
    }
  };

  const txTypeLabel = (type: Transaction["type"]) => {
    switch (type) {
      case "send": return t("wallet.send") || "Send";
      case "receive": return t("wallet.receive") || "Receive";
      case "swap": return "Swap";
      case "approve": return "Approve";
      case "mint": return "Mint";
      case "stake": return "Stake";
    }
  };

  const tabs: { key: WalletTab; label: string }[] = [
    { key: "tokens", label: t("wallet.tokens") || "Tokens" },
    { key: "nfts", label: "NFTs" },
    { key: "history", label: t("wallet.history") || "History" },
  ];

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b border-border/30">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => setLocation("/app/profile")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold font-display flex-1">{t("wallet.title") || "My Wallet"}</h1>
          <button
            onClick={() => setShowQR(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
          >
            <QrCode size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Balance Overview Card */}
      <div className="px-4 pt-4 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neon-cyan/10 via-neon-purple/10 to-neon-green/5 border border-neon-cyan/20 p-5"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-neon-purple/5 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground font-medium">{t("wallet.totalBalance") || "Total Balance"}</span>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/40 transition-colors"
              >
                {balanceVisible ? <Eye size={14} className="text-muted-foreground" /> : <EyeOff size={14} className="text-muted-foreground" />}
              </button>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold font-display tracking-tight">
                {balanceVisible ? `$${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "••••••"}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`text-sm font-mono flex items-center gap-1 ${totalChange >= 0 ? "text-neon-green" : "text-red-400"}`}>
                {totalChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {totalChange >= 0 ? "+" : ""}{totalChangePercent.toFixed(2)}%
              </span>
              <span className="text-xs text-muted-foreground">
                ({totalChange >= 0 ? "+" : ""}${Math.abs(totalChange).toFixed(2)}) 24h
              </span>
            </div>

            {/* Wallet Address */}
            <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-lg bg-background/20 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <span className="flex-1 text-[10px] font-mono text-muted-foreground truncate">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(walletAddress); toast.success("Address copied!"); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy size={11} />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {[
                { icon: ArrowUpRight, label: t("wallet.send") || "Send", color: "bg-neon-cyan/20 text-neon-cyan" },
                { icon: ArrowDownLeft, label: t("wallet.receive") || "Receive", color: "bg-neon-green/20 text-neon-green" },
                { icon: RefreshCw, label: "Swap", color: "bg-neon-purple/20 text-neon-purple" },
                { icon: Copy, label: t("wallet.copy") || "Copy", color: "bg-secondary/60 text-foreground" },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => {
                      if (action.label === (t("wallet.copy") || "Copy")) {
                        navigator.clipboard.writeText(walletAddress);
                        toast.success("Wallet address copied!");
                      } else if (action.label === (t("wallet.send") || "Send")) {
                        setShowSend(true);
                      } else if (action.label === (t("wallet.receive") || "Receive")) {
                        setShowReceive(true);
                      } else if (action.label === "Swap") {
                        setShowSwap(true);
                      }
                    }}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl ${action.color} hover:opacity-80 transition-all`}
                  >
                    <Icon size={16} />
                    <span className="text-[10px] font-medium">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chain Filter + Tabs */}
      <div className="px-4 pt-2 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-secondary/30 rounded-xl p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === tab.key
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="walletTab"
                  className="absolute inset-0 bg-secondary/80 rounded-lg border border-border/30"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Chain filter */}
        <div className="relative">
          <button
            onClick={() => setShowChainFilter(!showChainFilter)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/30 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Filter size={12} />
            {selectedChain}
            <ChevronDown size={12} className={`transition-transform ${showChainFilter ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {showChainFilter && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded-xl shadow-xl z-20 overflow-hidden"
              >
                {chains.map((chain) => (
                  <button
                    key={chain}
                    onClick={() => { setSelectedChain(chain); setShowChainFilter(false); }}
                    className={`w-full px-3 py-2 text-xs text-left hover:bg-secondary/60 transition-colors ${
                      selectedChain === chain ? "text-neon-cyan bg-neon-cyan/10" : "text-foreground"
                    }`}
                  >
                    {chain}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <AnimatePresence mode="wait">
          {/* Tokens Tab */}
          {activeTab === "tokens" && (
            <motion.div
              key="tokens"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-1.5 pt-2"
            >
              {filteredTokens.map((token, i) => (
                <motion.div
                  key={token.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-secondary/60 flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                    {token.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{token.symbol}</span>
                      <span className="text-sm font-mono font-medium">
                        {balanceVisible ? `$${token.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "••••"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{token.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {balanceVisible ? token.balance.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "••••"}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                          token.change24h >= 0
                            ? "text-neon-green bg-neon-green/10"
                            : "text-red-400 bg-red-400/10"
                        }`}>
                          {token.change24h >= 0 ? "+" : ""}{token.change24h}%
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* NFTs Tab */}
          {activeTab === "nfts" && (
            <motion.div
              key="nfts"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="pt-2"
            >
              {/* NFT Summary */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs text-muted-foreground">{filteredNFTs.length} NFTs</span>
                <span className="text-xs text-muted-foreground">
                  Est. Value: <span className="text-neon-cyan font-mono">{totalNFTValue.toFixed(1)} ETH</span>
                </span>
              </div>

              {/* NFT Grid */}
              <div className="grid grid-cols-2 gap-3">
                {filteredNFTs.map((nft, i) => (
                  <motion.div
                    key={nft.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl overflow-hidden border border-border/30 hover:border-neon-cyan/30 transition-all cursor-pointer group"
                    onClick={() => setSelectedNFT(nft)}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {nft.rarity && (
                        <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm ${
                          nft.rarity === "Legendary" ? "bg-yellow-500/80 text-black" :
                          nft.rarity === "Epic" ? "bg-purple-500/80 text-white" :
                          nft.rarity === "Rare" ? "bg-blue-500/80 text-white" :
                          "bg-green-500/80 text-white"
                        }`}>
                          {nft.rarity}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 bg-card">
                      <p className="text-xs font-semibold truncate">{nft.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">{nft.collection}</span>
                        <span className="text-[10px] text-neon-cyan font-mono">⟠ {nft.floorPrice}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-1 pt-2"
            >
              {filteredTxs.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => { navigator.clipboard.writeText(tx.hash); toast.success(`Tx hash copied: ${tx.hash.slice(0, 10)}...`); }}
                >
                  <div className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center shrink-0">
                    {txTypeIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{txTypeLabel(tx.type)}</span>
                        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/50">{tx.chain}</span>
                      </div>
                      <span className={`text-sm font-mono font-medium ${
                        tx.type === "receive" ? "text-neon-green" :
                        tx.type === "send" ? "text-red-400" :
                        "text-foreground"
                      }`}>
                        {tx.amount.split(" ")[0]} {tx.token.split(" ")[0]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-muted-foreground truncate max-w-[60%]">
                        {tx.type === "swap" ? tx.token : tx.type === "receive" ? `From: ${tx.from}` : `To: ${tx.to}`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{tx.time}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          tx.status === "confirmed" ? "bg-neon-green" :
                          tx.status === "pending" ? "bg-yellow-400" :
                          "bg-red-400"
                        }`} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    {/* QR Code Modal */}
    <AnimatePresence>
      {showQR && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm bg-card rounded-2xl border border-border/30 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-center font-bold font-display mb-4">{t("wallet.receiveQR") || "Receive"}</h3>
            <div className="bg-white rounded-xl p-4 mx-auto w-48 h-48 flex items-center justify-center mb-4">
              <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0id2hpdGUiLz48cmVjdCB4PSIxMCIgeT0iMTAiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0iYmxhY2siLz48cmVjdCB4PSIxMTAiIHk9IjEwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iMTAiIHk9IjExMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSJ3aGl0ZSIvPjxyZWN0IHg9IjEyMCIgeT0iMjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0id2hpdGUiLz48cmVjdCB4PSIyMCIgeT0iMTIwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IndoaXRlIi8+PHJlY3QgeD0iNjAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iODAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iNjAiIHk9IjMwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iNzAiIHk9IjYwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iNjAiIHk9IjgwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iODAiIHk9IjcwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iMTEwIiB5PSI2MCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjEzMCIgeT0iNzAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgZmlsbD0iYmxhY2siLz48cmVjdCB4PSI2MCIgeT0iMTEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iODAiIHk9IjEyMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSJibGFjayIvPjxyZWN0IHg9IjExMCIgeT0iMTEwIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9ImJsYWNrIi8+PHJlY3QgeD0iMTIwIiB5PSIxMjAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=')] bg-contain bg-center bg-no-repeat" />
            </div>
            <p className="text-center text-xs text-muted-foreground font-mono break-all px-4 mb-4">{walletAddress}</p>
            <button onClick={() => { navigator.clipboard.writeText(walletAddress); toast.success("Address copied!"); }} className="w-full h-10 rounded-xl bg-neon-cyan/20 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 transition-colors flex items-center justify-center gap-2">
              <Copy size={14} /> {t("wallet.copyAddress") || "Copy Address"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Send Modal */}
    <AnimatePresence>
      {showSend && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowSend(false)}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-md bg-card rounded-t-2xl border-t border-border/30 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold font-display mb-4">{t("wallet.send") || "Send"}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Token</label>
                <select value={sendToken} onChange={(e) => setSendToken(e.target.value)} className="w-full h-10 rounded-xl bg-secondary/60 border border-border/30 px-3 text-sm">
                  {displayTokens.map(tk => <option key={tk.symbol} value={tk.symbol}>{tk.symbol} — {tk.balance}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("wallet.recipientAddress") || "Recipient Address"}</label>
                <input value={sendAddress} onChange={(e) => setSendAddress(e.target.value)} placeholder="0x..." className="w-full h-10 rounded-xl bg-secondary/60 border border-border/30 px-3 text-sm placeholder:text-muted-foreground focus:border-neon-cyan/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("wallet.amount") || "Amount"}</label>
                <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="0.00" className="w-full h-10 rounded-xl bg-secondary/60 border border-border/30 px-3 text-sm placeholder:text-muted-foreground focus:border-neon-cyan/50 focus:outline-none" />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Gas Fee: ~$2.50</span>
                <span>Network: Ethereum</span>
              </div>
              <button onClick={() => { toast.success(`Sent ${sendAmount} ${sendToken}`); setShowSend(false); setSendAmount(""); setSendAddress(""); }} disabled={!sendAmount || !sendAddress} className="w-full h-11 rounded-xl bg-neon-cyan text-background font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity">
                {t("wallet.confirmSend") || "Confirm Send"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Receive Modal */}
    <AnimatePresence>
      {showReceive && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReceive(false)}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-sm bg-card rounded-2xl border border-border/30 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-center font-bold font-display mb-2">{t("wallet.receive") || "Receive"}</h3>
            <p className="text-center text-xs text-muted-foreground mb-4">{t("wallet.receiveDesc") || "Share your address to receive tokens"}</p>
            <div className="space-y-3">
              {["Ethereum", "Solana", "Bitcoin"].map(chain => (
                <button key={chain} onClick={() => { navigator.clipboard.writeText(walletAddress); toast.success(`${chain} address copied!`); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/20 hover:border-neon-cyan/30 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center text-xs font-bold text-neon-cyan">{chain[0]}</div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{chain}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{walletAddress.slice(0, 12)}...{walletAddress.slice(-6)}</p>
                  </div>
                  <Copy size={14} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Swap Modal */}
    <AnimatePresence>
      {showSwap && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowSwap(false)}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-md bg-card rounded-t-2xl border-t border-border/30 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold font-display mb-4">Swap</h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/20">
                <label className="text-xs text-muted-foreground mb-1 block">From</label>
                <div className="flex items-center gap-2">
                  <select value={swapFrom} onChange={(e) => setSwapFrom(e.target.value)} className="h-9 rounded-lg bg-secondary/60 border border-border/30 px-2 text-sm">
                    {displayTokens.map(tk => <option key={tk.symbol} value={tk.symbol}>{tk.symbol}</option>)}
                  </select>
                  <input type="number" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} placeholder="0.00" className="flex-1 h-9 rounded-lg bg-transparent text-right text-sm font-mono focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-center"><div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center"><RefreshCw size={14} className="text-neon-purple" /></div></div>
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/20">
                <label className="text-xs text-muted-foreground mb-1 block">To</label>
                <div className="flex items-center gap-2">
                  <select value={swapTo} onChange={(e) => setSwapTo(e.target.value)} className="h-9 rounded-lg bg-secondary/60 border border-border/30 px-2 text-sm">
                    {displayTokens.map(tk => <option key={tk.symbol} value={tk.symbol}>{tk.symbol}</option>)}
                  </select>
                  <span className="flex-1 text-right text-sm font-mono text-muted-foreground">{swapAmount ? (parseFloat(swapAmount) * 1.05).toFixed(4) : "0.00"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Rate: 1 {swapFrom} ≈ 1.05 {swapTo}</span>
                <span>Slippage: 0.5%</span>
              </div>
              <button onClick={() => { toast.success(`Swapped ${swapAmount} ${swapFrom} → ${swapTo}`); setShowSwap(false); setSwapAmount(""); }} disabled={!swapAmount} className="w-full h-11 rounded-xl bg-neon-purple text-white font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity">
                Swap
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* NFT Detail Modal */}
    <AnimatePresence>
      {selectedNFT && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedNFT(null)}>
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-sm bg-card rounded-2xl border border-border/30 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-square">
              <img src={selectedNFT.image} alt={selectedNFT.name} className="w-full h-full object-cover" />
              {selectedNFT.rarity && (
                <span className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-lg backdrop-blur-sm ${
                  selectedNFT.rarity === "Legendary" ? "bg-yellow-500/80 text-black" :
                  selectedNFT.rarity === "Epic" ? "bg-purple-500/80 text-white" :
                  selectedNFT.rarity === "Rare" ? "bg-blue-500/80 text-white" : "bg-green-500/80 text-white"
                }`}>{selectedNFT.rarity}</span>
              )}
            </div>
            <div className="p-4 space-y-3">
              <h3 className="font-bold font-display text-lg">{selectedNFT.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{selectedNFT.collection}</span>
                <span className="text-sm text-neon-cyan font-mono">⟠ {selectedNFT.floorPrice} ETH</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-secondary/40 text-center">
                  <p className="text-[10px] text-muted-foreground">Chain</p>
                  <p className="text-xs font-medium">{selectedNFT.chain}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary/40 text-center">
                  <p className="text-[10px] text-muted-foreground">Floor</p>
                  <p className="text-xs font-medium font-mono">⟠ {selectedNFT.floorPrice}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { toast.success("Listed for sale!"); setSelectedNFT(null); }} className="flex-1 h-10 rounded-xl bg-neon-cyan/20 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 transition-colors">List for Sale</button>
                <button onClick={() => { toast.success("Transfer initiated"); setSelectedNFT(null); }} className="flex-1 h-10 rounded-xl bg-secondary/60 text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">Transfer</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
    </>
  );
}
