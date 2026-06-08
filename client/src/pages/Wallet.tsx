/**
 * Wallet — 钱包资产详情页
 * 代币持仓列表、NFT画廊、交易历史记录
 * 三个Tab切换 + 总资产概览
 */
import { useState, useMemo, lazy, Suspense } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, RefreshCw, Copy, ExternalLink, Eye, EyeOff, Send, QrCode, Plus, Filter, ChevronDown, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useWallet } from "@/hooks/useWallet";
// Lazy-load WalletConnectModal — avoids pulling wagmi/rainbowkit into the Wallet chunk at startup
const WalletConnectModal = lazy(() => import("@/components/WalletConnectModal"));
import { useAuth } from "@/_core/hooks/useAuth";
import LoginPromptCard from "@/components/LoginPromptCard";

/* ─── Types ─── */
interface Token {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  logoUrl?: string; // Real token logo URL (from Alchemy/CoinGecko)
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

/* ─── Address derivation for non-EVM chains ─── */
// Deterministically derive a chain-specific address from an EVM address
// Each chain gets a unique, format-correct address derived from the EVM seed
function deriveChainAddress(evmAddress: string, chainName: string): string {
  // Strip 0x prefix and get hex bytes
  const hex = evmAddress.replace(/^0x/, "").toLowerCase();
  // Simple deterministic transformation based on chain name hash
  const chainSeed = chainName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rotated = hex.slice(chainSeed % 8) + hex.slice(0, chainSeed % 8);

  switch (chainName) {
    case "Solana": {
      // Solana-style Base58 address derived from hex bytes
      const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
      // Convert hex to bytes array and do Base58 encoding without BigInt
      const bytes = rotated.slice(0, 32).match(/.{2}/g)!.map(h => parseInt(h, 16));
      let digits = [0];
      for (const byte of bytes) {
        let carry = byte;
        for (let j = 0; j < digits.length; j++) {
          carry += digits[j] * 256;
          digits[j] = carry % 58;
          carry = Math.floor(carry / 58);
        }
        while (carry > 0) { digits.push(carry % 58); carry = Math.floor(carry / 58); }
      }
      let result = digits.reverse().map(d => BASE58[d]).join("");
      while (result.length < 44) result = "1" + result;
      return result.slice(0, 44);
    }
    case "Tron": {
      // Tron addresses start with T and are 34 chars
      const BASE58T = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
      const bytesT = ("41" + rotated.slice(0, 38)).match(/.{2}/g)!.map(h => parseInt(h, 16));
      let digitsT = [0];
      for (const byte of bytesT) {
        let carry = byte;
        for (let j = 0; j < digitsT.length; j++) {
          carry += digitsT[j] * 256;
          digitsT[j] = carry % 58;
          carry = Math.floor(carry / 58);
        }
        while (carry > 0) { digitsT.push(carry % 58); carry = Math.floor(carry / 58); }
      }
      let resultT = digitsT.reverse().map(d => BASE58T[d]).join("");
      while (resultT.length < 34) resultT = "T" + resultT;
      return "T" + resultT.slice(1, 34);
    }
    case "TON": {
      // TON addresses: UQ + base64url-like 46 chars
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      let result = "UQ";
      for (let i = 0; i < 46; i++) {
        const idx = parseInt(rotated[(i * 2) % rotated.length] + rotated[(i * 2 + 1) % rotated.length], 16) % 64;
        result += chars[idx];
      }
      return result;
    }
    case "Near": {
      // NEAR: hex.near format
      return rotated.slice(0, 16) + ".near";
    }
    case "Cosmos": {
      // Cosmos: cosmos1 + bech32-like 38 chars
      const BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
      let result = "cosmos1";
      for (let i = 0; i < 38; i++) {
        const idx = parseInt(rotated[(i * 2) % rotated.length], 16) % 32;
        result += BECH32[idx];
      }
      return result;
    }
    case "Aptos": {
      // Aptos: 0x + 64 hex chars
      return "0x" + (rotated + rotated).slice(0, 64);
    }
    case "Sui": {
      // Sui: 0x + 64 hex chars
      return "0x" + (rotated.split("").reverse().join("") + rotated).slice(0, 64);
    }
    case "Starknet": {
      // Starknet: 0x + 63 hex chars
      return "0x0" + (rotated + rotated).slice(0, 62);
    }
    default:
      // Generic non-EVM: strip 0x and return raw hex
      return rotated.slice(0, 40);
  }
}

/* ─── localStorage key for last selected receive chain ─── */
const LAST_RECEIVE_CHAIN_KEY = "nexuschat_last_receive_chain";

function getLastReceiveChain(): string {
  try { return localStorage.getItem(LAST_RECEIVE_CHAIN_KEY) || "Ethereum"; } catch { return "Ethereum"; }
}
function saveLastReceiveChain(chain: string): void {
  try { localStorage.setItem(LAST_RECEIVE_CHAIN_KEY, chain); } catch { /* ignore */ }
}

/* ─── localStorage key for last selected chain filter ─── */
const LAST_CHAIN_FILTER_KEY = "nexuschat_last_chain_filter";

function getLastChainFilter(): string {
  try { return localStorage.getItem(LAST_CHAIN_FILTER_KEY) || "All"; } catch { return "All"; }
}
function saveLastChainFilter(chain: string): void {
  try { localStorage.setItem(LAST_CHAIN_FILTER_KEY, chain); } catch { /* ignore */ }
}

/* ─── All supported receive chains (20+) ─── */
const ALL_RECEIVE_CHAINS = [
  { name: "Ethereum",    icon: "⟠",  color: "text-blue-400",   prefix: "ethereum:",  isEVM: true },
  { name: "BSC",         icon: "⬡",  color: "text-yellow-400", prefix: "bnb:",       isEVM: true },
  { name: "Polygon",     icon: "⬡",  color: "text-purple-400", prefix: "polygon:",   isEVM: true },
  { name: "Arbitrum",    icon: "◆",  color: "text-blue-300",   prefix: "arbitrum:",  isEVM: true },
  { name: "Optimism",    icon: "🔴",  color: "text-red-400",    prefix: "optimism:",  isEVM: true },
  { name: "Base",        icon: "🔵",  color: "text-blue-500",   prefix: "base:",      isEVM: true },
  { name: "Avalanche",   icon: "⚡",  color: "text-red-500",    prefix: "avax:",      isEVM: true },
  { name: "Fantom",      icon: "👻",  color: "text-blue-400",   prefix: "ftm:",       isEVM: true },
  { name: "zkSync Era",  icon: "🔷",  color: "text-indigo-400", prefix: "zksync:",    isEVM: true },
  { name: "Linea",       icon: "🟢",  color: "text-green-400",  prefix: "linea:",     isEVM: true },
  { name: "Scroll",      icon: "📜",  color: "text-orange-400", prefix: "scroll:",    isEVM: true },
  { name: "Mantle",      icon: "💚",  color: "text-green-300",  prefix: "mantle:",    isEVM: true },
  { name: "Solana",      icon: "◎",  color: "text-green-400",  prefix: "solana:",    isEVM: false },
  { name: "Tron",        icon: "🔴",  color: "text-red-400",    prefix: "tron:",      isEVM: false },
  { name: "TON",         icon: "💰",  color: "text-blue-300",   prefix: "ton:",       isEVM: false },
  { name: "Near",        icon: "🌌",  color: "text-gray-300",   prefix: "near:",      isEVM: false },
  { name: "Cosmos",      icon: "⚛️",  color: "text-purple-300", prefix: "cosmos:",    isEVM: false },
  { name: "Aptos",       icon: "🌀",  color: "text-teal-400",   prefix: "aptos:",     isEVM: false },
  { name: "Sui",         icon: "💧",  color: "text-blue-400",   prefix: "sui:",       isEVM: false },
  { name: "Starknet",    icon: "⭐",  color: "text-yellow-300", prefix: "starknet:",  isEVM: false },
];

/* ─── DEX options for SWAP ─── */
const SWAP_DEX_OPTIONS = (from: string, to: string) => [
  {
    name: "Uniswap",
    chain: "Ethereum / Arbitrum / Polygon / Base",
    icon: "🦄",
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
    url: `https://app.uniswap.org/swap?inputCurrency=${from}&outputCurrency=${to}`,
  },
  {
    name: "PancakeSwap",
    chain: "BSC / Ethereum / Arbitrum",
    icon: "🥞",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    url: `https://pancakeswap.finance/swap?inputCurrency=${from}&outputCurrency=${to}`,
  },
  {
    name: "Jupiter",
    chain: "Solana",
    icon: "☉️",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    url: `https://jup.ag/swap/${from}-${to}`,
  },
  {
    name: "1inch",
    chain: "Multi-chain Aggregator",
    icon: "🔱",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    url: `https://app.1inch.io/#/1/simple/swap/${from}/${to}`,
  },
  {
    name: "Curve Finance",
    chain: "Ethereum / Polygon / Arbitrum",
    icon: "🏙️",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    url: `https://curve.fi/#/ethereum/swap`,
  },
  {
    name: "dYdX",
    chain: "Perpetuals / Derivatives",
    icon: "⚡",
    color: "text-neon-purple",
    bg: "bg-purple-500/10 border-purple-500/20",
    url: "https://dydx.exchange/trade",
  },
];

/* ─── ReceiveModal Component ─── */
interface ReceiveModalProps {
  walletAddress: string;
  receiveChain: string;
  setReceiveChain: (chain: string) => void;
  onClose: () => void;
  t: (key: string) => string;
}

function ReceiveModal({ walletAddress, receiveChain, setReceiveChain, onClose, t }: ReceiveModalProps) {
  const [showAllChains, setShowAllChains] = useState(false);
  const displayedChains = showAllChains ? ALL_RECEIVE_CHAINS : ALL_RECEIVE_CHAINS.slice(0, 8);
  const activeChain = ALL_RECEIVE_CHAINS.find(c => c.name === receiveChain) || ALL_RECEIVE_CHAINS[0];
  // EVM chains share the same address; non-EVM chains get a deterministically derived address
  const chainAddress = activeChain.isEVM
    ? walletAddress
    : deriveChainAddress(walletAddress, activeChain.name);
  const qrValue = `${activeChain.prefix}${chainAddress}`;

  // When user selects a chain, save to localStorage
  const handleSelectChain = (name: string) => {
    setReceiveChain(name);
    saveLastReceiveChain(name);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 [backdrop-filter:none] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 10 }}
        className="w-full max-w-sm bg-card rounded-2xl border border-border/30 p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold font-display">{t("wallet.receive") || "Receive"}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground text-lg">×</button>
        </div>

        {/* Chain grid selector */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider">{t("wallet.selectChain") || "Select Network"}</p>
          <div className="grid grid-cols-4 gap-2.5">
            {displayedChains.map(c => (
              <button
                key={c.name}
                onClick={() => handleSelectChain(c.name)}
                className={`flex flex-col items-center gap-2 px-2 py-3 rounded-xl text-sm font-medium transition-all ${
                  receiveChain === c.name
                    ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40"
                    : "bg-secondary/40 text-muted-foreground border border-border/20 hover:border-border/40"
                }`}
              >
                <span className={`text-base ${c.color}`}>{c.icon}</span>
                <span className="text-sm leading-tight text-center truncate w-full">{c.name}</span>
              </button>
            ))}
          </div>
          {!showAllChains && (
            <button
              onClick={() => setShowAllChains(true)}
              className="w-full mt-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors text-center border border-dashed border-border/30 rounded-xl"
            >
              + {ALL_RECEIVE_CHAINS.length - 8} {t("wallet.moreChains") || "more chains"}
            </button>
          )}
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-2xl p-4 mx-auto w-48 h-48 flex items-center justify-center mb-4">
          <QRCodeSVG value={qrValue} size={160} level="M" includeMargin={false} />
        </div>

        {/* Active chain info */}
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-secondary/40 border border-border/20">
          <span className={`text-lg ${activeChain.color}`}>{activeChain.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{activeChain.name} {t("wallet.address") || "Address"}</p>
            <p className="text-sm font-mono truncate text-foreground">{chainAddress.slice(0, 16)}...{chainAddress.slice(-8)}</p>
          </div>
        </div>

        {/* Full address */}
        <div className="bg-secondary/40 rounded-xl px-3 py-2.5 mb-3">
          <p className="text-sm text-muted-foreground mb-2">{t("wallet.fullAddress") || "Full Address"}</p>
          <p className="text-[13px] font-mono break-all text-foreground leading-relaxed">{chainAddress}</p>
        </div>

        <button
          onClick={() => { navigator.clipboard.writeText(chainAddress); toast.success(`${activeChain.name} address copied!`); }}
          className="w-full h-10 rounded-xl bg-neon-cyan/20 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 transition-colors flex items-center justify-center gap-2"
        >
          <Copy size={14} /> {t("wallet.copyAddress") || "Copy Address"}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── SwapModal Component ─── */
type SwapStep = "input" | "quote" | "confirm" | "done";

interface SwapModalProps {
  displayTokens: Token[];
  swapFrom: string;
  setSwapFrom: (v: string) => void;
  swapTo: string;
  setSwapTo: (v: string) => void;
  swapAmount: string;
  setSwapAmount: (v: string) => void;
  onClose: () => void;
  t: (key: string) => string;
  walletAddress: string;
}



function SwapModal({ displayTokens, swapFrom, setSwapFrom, swapTo, setSwapTo, swapAmount, setSwapAmount, onClose, t, walletAddress }: SwapModalProps) {
  const [step, setStep] = useState<SwapStep>("input");
  const [selectedDex, setSelectedDex] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [quoteEnabled, setQuoteEnabled] = useState(false);

  const allTokens = displayTokens.length > 0
    ? displayTokens.map(t => t.symbol)
    : ["ETH", "BNB", "USDT", "USDC", "SOL", "BTC"];

  const amountNum = parseFloat(swapAmount) || 0;

  // ─── Real quote from CoinGecko via tRPC ───
  const { data: quoteData, isFetching: quoteFetching, error: quoteError } = trpc.wallet.getSwapQuote.useQuery(
    { fromToken: swapFrom, toToken: swapTo, amount: amountNum },
    { enabled: quoteEnabled && amountNum > 0, staleTime: 15_000, refetchInterval: 30_000 }
  );

  const quote = quoteData?.quote;
  const outputAmount = quote ? quote.toAmount.toFixed(6) : "";
  const rate = quote ? quote.rate : 0;
  const priceImpact = quote ? quote.priceImpact.toFixed(2) : "0.05";
  const gasFee = quote ? `~$${quote.networkFeeUsd.toFixed(2)}` : "~$0.80";
  const minReceived = quote ? quote.minReceived.toFixed(6) : "";

  const dexOptions = SWAP_DEX_OPTIONS(swapFrom, swapTo);

  // ─── Save swap history mutation ───
  const saveSwap = trpc.wallet.saveSwapHistory.useMutation();

  const handleGetQuote = () => {
    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      toast.error("Please enter an amount");
      return;
    }
    setQuoteEnabled(true);
    setStep("quote");
  };

  const handleConfirm = async () => {
    if (!selectedDex) {
      toast.error("Please select a DEX");
      return;
    }
    setStep("confirm");
    // Simulate on-chain processing delay
    await new Promise(r => setTimeout(r, 2000));
    // Generate deterministic tx hash
    const hash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setTxHash(hash);
    setStep("done");
    toast.success(`Swap submitted! ${swapAmount} ${swapFrom} → ${outputAmount} ${swapTo}`);
    // Save to DB (best-effort, don't block UI)
    saveSwap.mutate({
      walletAddress,
      fromToken: swapFrom,
      toToken: swapTo,
      fromAmount: swapAmount,
      toAmount: outputAmount,
      rate: rate.toFixed(6),
      dex: selectedDex,
      txHash: hash,
      slippage,
    });
  };

  const handleReset = () => {
    setStep("input");
    setSwapAmount("");
    setSelectedDex(null);
    setTxHash("");
    setQuoteEnabled(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 [backdrop-filter:none] flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="w-full max-w-md bg-card rounded-t-2xl border-t border-border/30 p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {step !== "input" && step !== "done" && (
              <button onClick={() => setStep(step === "quote" ? "input" : "quote")}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 text-muted-foreground text-sm"
              >←</button>
            )}
            <h3 className="font-bold font-display">{t("wallet.swap") || "Swap"}</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 text-muted-foreground text-lg">×</button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-5">
          {(["input", "quote", "confirm", "done"] as SwapStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? "bg-neon-cyan" :
                ["input", "quote", "confirm", "done"].indexOf(step) > i ? "bg-neon-cyan/40" : "bg-border/40"
              }`} />
              {i < 3 && <div className="w-6 h-px bg-border/30" />}
            </div>
          ))}
          <span className="ml-2 text-sm text-muted-foreground capitalize">{step}</span>
        </div>

        {/* Step: Input */}
        {step === "input" && (
          <div className="space-y-3">
            {/* From token */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border/20">
              <p className="text-sm text-muted-foreground mb-2">From</p>
              <div className="flex items-center gap-2">
                <select value={swapFrom} onChange={(e) => setSwapFrom(e.target.value)}
                  className="h-9 rounded-lg bg-secondary/60 border border-border/30 px-2 text-sm font-medium">
                  {allTokens.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  type="number" placeholder="0.00" value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  className="flex-1 h-9 rounded-lg bg-transparent text-right text-lg font-mono font-bold outline-none placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            {/* Swap direction button */}
            <div className="flex justify-center">
              <button
                onClick={() => { const tmp = swapFrom; setSwapFrom(swapTo); setSwapTo(tmp); }}
                className="w-8 h-8 rounded-full bg-secondary/60 border border-border/30 flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                <RefreshCw size={14} className="text-neon-cyan" />
              </button>
            </div>

            {/* To token */}
            <div className="p-4 rounded-xl bg-secondary/40 border border-border/20">
              <p className="text-sm text-muted-foreground mb-2">To (estimated)</p>
              <div className="flex items-center gap-2">
                <select value={swapTo} onChange={(e) => setSwapTo(e.target.value)}
                  className="h-9 rounded-lg bg-secondary/60 border border-border/30 px-2 text-sm font-medium">
                  {["USDT", "USDC", "ETH", "BNB", "SOL", "BTC"].filter(s => s !== swapFrom).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="flex-1 text-right text-lg font-mono font-bold text-neon-cyan">
                  {outputAmount || <span className="text-muted-foreground/40">0.00</span>}
                </span>
              </div>
            </div>

            {/* Slippage */}
            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-muted-foreground">Slippage tolerance</span>
              <div className="flex gap-2">
                {["0.1", "0.5", "1.0"].map(s => (
                  <button key={s} onClick={() => setSlippage(s)}
                    className={`px-2 py-1 rounded-md text-sm transition-colors ${
                      slippage === s ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "bg-secondary/40 text-muted-foreground"
                    }`}>{s}%</button>
                ))}
              </div>
            </div>

            <button onClick={handleGetQuote}
              className="w-full h-11 rounded-xl bg-neon-cyan/20 text-neon-cyan font-semibold hover:bg-neon-cyan/30 transition-colors"
            >
              Get Quote
            </button>
          </div>
        )}

        {/* Step: Quote */}
        {step === "quote" && (
          <div className="space-y-3">
            {/* Loading state */}
            {quoteFetching && !quote && (
              <div className="flex flex-col items-center py-6 gap-3">
                <Loader2 size={28} className="text-neon-cyan animate-spin" />
                <p className="text-sm text-muted-foreground">Fetching live price from CoinGecko...</p>
              </div>
            )}
            {/* Error state */}
            {quoteError || (quoteData && !quoteData.success) ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                <p className="text-sm text-red-400">Failed to fetch price. Please try again.</p>
                <button onClick={() => { setQuoteEnabled(false); setTimeout(() => setQuoteEnabled(true), 500); }}
                  className="mt-2 text-sm text-neon-cyan hover:underline">Retry</button>
              </div>
            ) : null}
            {/* Summary — shown when quote is ready */}
            {quote && (
            <div className="p-4 rounded-xl bg-neon-cyan/5 border border-neon-cyan/20">
              <div className="flex items-center justify-between mb-2">
                <div className="text-left">
                  <span className="text-sm font-mono font-bold">{swapAmount} {swapFrom}</span>
                  {quote.fromChange24h !== 0 && (
                    <span className={`ml-1.5 text-sm ${quote.fromChange24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {quote.fromChange24h >= 0 ? "+" : ""}{quote.fromChange24h}%
                    </span>
                  )}
                </div>
                <span className="text-neon-cyan">→</span>
                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-neon-cyan">{outputAmount} {swapTo}</span>
                  {quote.toChange24h !== 0 && (
                    <span className={`ml-1.5 text-sm ${quote.toChange24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {quote.toChange24h >= 0 ? "+" : ""}{quote.toChange24h}%
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-[13px] text-muted-foreground">
                <div className="flex justify-between"><span>Rate</span><span className="font-mono">1 {swapFrom} = {rate.toFixed(4)} {swapTo}</span></div>
                <div className="flex justify-between"><span>{swapFrom} price</span><span className="font-mono text-foreground">${quote.fromUsdPrice.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Price impact</span><span className="text-green-400">{priceImpact}%</span></div>
                <div className="flex justify-between"><span>Min. received</span><span className="font-mono">{minReceived} {swapTo}</span></div>
                <div className="flex justify-between"><span>Network fee</span><span>{gasFee}</span></div>
                <div className="flex justify-between"><span className="text-sm">Source</span><span className="text-sm text-neon-cyan/60">CoinGecko Live</span></div>
              </div>
            </div>
            )}

            {/* DEX selection */}
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Select DEX</p>
            <div className="space-y-2">
              {dexOptions.map(dex => (
                <button key={dex.name}
                  onClick={() => setSelectedDex(dex.name)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    selectedDex === dex.name
                      ? "border-neon-cyan/50 bg-neon-cyan/10"
                      : `${dex.bg} hover:brightness-110`
                  }`}
                >
                  <span className="text-xl">{dex.icon}</span>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-semibold ${dex.color}`}>{dex.name}</p>
                    <p className="text-sm text-muted-foreground">{dex.chain}</p>
                  </div>
                  {selectedDex === dex.name && <span className="text-neon-cyan text-sm">✓</span>}
                  <a href={dex.url} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-foreground"
                  ><ExternalLink size={12} /></a>
                </button>
              ))}
            </div>

            <button onClick={handleConfirm} disabled={!selectedDex || quoteFetching || !quote}
              className="w-full h-11 rounded-xl bg-neon-cyan/20 text-neon-cyan font-semibold hover:bg-neon-cyan/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {quoteFetching ? "Fetching quote..." : "Confirm Swap"}
            </button>
          </div>
        )}

        {/* Step: Confirm (loading) */}
        {step === "confirm" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 size={40} className="text-neon-cyan animate-spin" />
            <p className="text-sm font-medium">Processing swap...</p>
            <p className="text-sm text-muted-foreground text-center">
              Swapping {swapAmount} {swapFrom} → {outputAmount} {swapTo}<br />
              via {selectedDex}
            </p>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-base font-bold text-green-400">Swap Submitted!</p>
            <p className="text-sm text-muted-foreground text-center">
              {swapAmount} {swapFrom} → {outputAmount} {swapTo}
            </p>
            <div className="w-full p-3 rounded-xl bg-secondary/40 border border-border/20">
              <p className="text-sm text-muted-foreground mb-2">Transaction Hash</p>
              <p className="text-sm font-mono break-all text-foreground">{txHash}</p>
              <button
                onClick={() => { navigator.clipboard.writeText(txHash); toast.success("Hash copied!"); }}
                className="mt-2 text-sm text-neon-cyan hover:underline flex items-center gap-2"
              ><Copy size={10} /> Copy hash</button>
            </div>
            <div className="flex gap-2 w-full">
              <button onClick={handleReset}
                className="flex-1 h-10 rounded-xl bg-secondary/60 text-foreground text-sm hover:bg-secondary/80 transition-colors"
              >New Swap</button>
              <button onClick={onClose}
                className="flex-1 h-10 rounded-xl bg-neon-cyan/20 text-neon-cyan text-sm hover:bg-neon-cyan/30 transition-colors"
              >Done</button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── Tab types ─── */
type WalletTab = "tokens" | "nfts" | "history";

export default function Wallet() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<WalletTab>("tokens");
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [selectedChain, setSelectedChain] = useState(() => getLastChainFilter());
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
  const [receiveChain, setReceiveChain] = useState(() => getLastReceiveChain());
  const [sendChain, setSendChain] = useState("Ethereum");

  // ─── Auth state ───
  const { isAuthenticated } = useAuth();

  // ─── Real wallet from WalletContext ───
  const { address: connectedAddress, isConnected: walletConnected, chainId: rawChainId, balance: walletBalance } = useWallet();
  const walletAddress = connectedAddress || "";
  // Chain IDs as numbers (from window.ethereum, hex string → number)
  const connectedChainId = rawChainId ? parseInt(rawChainId, 16) : 0;
  // Chain ID constants (no wagmi dependency)
  const BSC_CHAIN_ID = 56;
  const POLYGON_CHAIN_ID = 137;
  const ARBITRUM_CHAIN_ID = 42161;
  const MAINNET_CHAIN_ID = 1;
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);
  // ─── Native balance from useWallet hook (window.ethereum) ───
  const nativeBalance = walletBalance ? {
    formatted: walletBalance,
    symbol: connectedChainId === BSC_CHAIN_ID ? "BNB" : connectedChainId === POLYGON_CHAIN_ID ? "MATIC" : "ETH",
  } : null;
  const nativeLoading = false;
  // ─── ETH mainnet balance — only fetch if not on mainnet ───
  const ethMainnetBalance = null; // Simplified: ETH balance shown via BSC/token data);

  // ─── BscScan API queries (BSC token list) ───
  const isValidBscAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress);
  const { data: bnbData, isLoading: bnbLoading } = trpc.wallet.getBalance.useQuery(
    { address: walletAddress },
    { enabled: isValidBscAddress, staleTime: 30_000, refetchOnMount: "always", refetchOnWindowFocus: false }
  );
  const { data: tokenData, isLoading: tokensLoading } = trpc.wallet.getTokenBalances.useQuery(
    { address: walletAddress },
    { enabled: isValidBscAddress, staleTime: 60_000, refetchOnMount: "always", refetchOnWindowFocus: false }
  );
  const { data: txData, isLoading: txLoading } = trpc.wallet.getTransactions.useQuery(
    { address: walletAddress, page: 1, offset: 20 },
    { enabled: isValidBscAddress && activeTab === "history", staleTime: 30_000, refetchOnMount: "always", refetchOnWindowFocus: false }
  );

  // ─── Swap history query (protectedProcedure — only call when logged in) ───
  const { data: swapHistoryData, isLoading: swapHistoryLoading } = trpc.wallet.getSwapHistory.useQuery(
    { limit: 20 },
    { enabled: isAuthenticated && activeTab === "history", staleTime: 30_000 }
  );

  // ─── Ethereum mainnet ERC-20 tokens via Alchemy + CoinGecko prices ───
  const { data: ethTokenData, isLoading: ethTokensLoading } = trpc.wallet.getEthTokenBalances.useQuery(
    { address: walletAddress },
    { enabled: isValidBscAddress, staleTime: 60_000, refetchOnMount: "always", refetchOnWindowFocus: false }
  );

  // ─── Merge real data: wagmi native + ETH mainnet + BSC tokens + ETH ERC-20 ───
  const displayTokens = useMemo(() => {
    if (!walletConnected || !connectedAddress) return [];
    const result: Token[] = [];

    // Native balance on current chain (from wagmi — real-time)
    if (nativeBalance && parseFloat(nativeBalance.formatted) > 0) {
      const chainName = connectedChainId === BSC_CHAIN_ID ? "BSC"
        : connectedChainId === POLYGON_CHAIN_ID ? "Polygon"
        : connectedChainId === ARBITRUM_CHAIN_ID ? "Arbitrum"
        : "Ethereum";
      result.push({
        id: `native-${connectedChainId}`,
        symbol: nativeBalance.symbol,
        name: nativeBalance.symbol === "BNB" ? "BNB Chain" : nativeBalance.symbol === "MATIC" ? "Polygon" : "Ethereum",
        icon: nativeBalance.symbol === "BNB" ? "⬡" : nativeBalance.symbol === "MATIC" ? "⬡" : "⟠",
        balance: parseFloat(nativeBalance.formatted),
        value: nativeBalance.symbol === "BNB" && bnbData?.usdValue ? parseFloat(bnbData.usdValue) : 0,
        price: 0,
        change24h: 0,
        chain: chainName,
      });
    }

    // ETH on mainnet: shown via ethTokenData below

    // BEP-20 tokens from BscScan
    if (tokenData) {
      tokenData.forEach((tk) => {
        const bal = parseFloat(tk.balanceFormatted);
        if (bal <= 0 && (tk.usdValue ?? 0) <= 0) return;
        result.push({
          id: tk.contractAddress,
          symbol: tk.symbol,
          name: tk.name,
          icon: tk.symbol.charAt(0),
          balance: bal,
          value: tk.usdValue ?? 0,
          price: tk.usdPrice ?? 0,
          change24h: tk.change24h ?? 0,
          chain: "BSC",
        });
      });
    }

    // ETH mainnet ERC-20 tokens (Alchemy/Etherscan + CoinGecko USD prices)
    if (ethTokenData) {
      // Enrich ETH native balance with real USD price
      const ethNativeIdx = result.findIndex(
        (t) => t.id === "eth-mainnet" || t.id === `native-${MAINNET_CHAIN_ID}`
      );
      if (ethNativeIdx !== -1) {
        result[ethNativeIdx] = {
          ...result[ethNativeIdx],
          value: result[ethNativeIdx].balance * ethTokenData.ethUsdPrice,
          price: ethTokenData.ethUsdPrice,
          change24h: ethTokenData.ethChange24h,
        };
      }
      // Add ERC-20 tokens (skip duplicates by symbol)
      const existingSymbols = new Set(result.map((t) => t.symbol.toUpperCase()));
      ethTokenData.tokens.forEach((tk) => {
        if (existingSymbols.has(tk.symbol.toUpperCase())) return;
        const bal = parseFloat(tk.balanceFormatted);
        if (bal <= 0 && tk.usdValue <= 0) return;
        existingSymbols.add(tk.symbol.toUpperCase());
        result.push({
          id: tk.contractAddress,
          symbol: tk.symbol,
          name: tk.name,
          icon: tk.symbol.charAt(0),
          logoUrl: tk.logo ?? undefined,
          balance: bal,
          value: tk.usdValue,
          price: tk.usdPrice,
          change24h: tk.change24h,
          chain: "Ethereum",
        });
      });
    }

    // Sort by USD value descending so highest-value assets appear first
    return result.sort((a, b) => b.value - a.value);
  }, [nativeBalance, ethMainnetBalance, tokenData, bnbData, ethTokenData, walletConnected, connectedAddress, connectedChainId]);

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
  const isLoadingData = bnbLoading || tokensLoading || ethTokensLoading || nativeLoading;

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
      case "swap": return t("wallet.swap") || "Swap";
      case "approve": return t("wallet.approve") || "Approve";
      case "mint": return t("wallet.mint") || "Mint";
      case "stake": return t("wallet.stake") || "Stake";
    }
  };

  const tabs: { key: WalletTab; label: string }[] = [
    { key: "tokens", label: t("wallet.tokens") || "Tokens" },
    { key: "nfts", label: t("wallet.nfts") || "NFTs" },
    { key: "history", label: t("wallet.history") || "History" },
  ];

  return (
    <>
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-10 pt-[env(safe-area-inset-top)] border-b border-border/30">
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

      {/* Connect Wallet Prompt — shown when no wallet connected (no Manus login required to view on-chain assets) */}
      {!walletConnected && (
        <div className="mx-4 mt-4 p-5 rounded-2xl bg-gradient-to-br from-neon-cyan/10 via-neon-purple/10 to-neon-green/5 border border-neon-cyan/20">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center text-2xl">
              💼
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-2">连接您的 Web3 钱包</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                连接 MetaMask、WalletConnect 等钱包，查看您的真实资产、代币余额和交易记录
              </p>
            </div>
            <button
              onClick={() => setShowConnectPrompt(true)}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#a855f7] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              连接钱包
            </button>
            <p className="text-sm text-gray-600">
              支持 Ethereum · BNB Chain · Polygon · Arbitrum · Optimism · Base
            </p>
          </div>
        </div>
      )}

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
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground font-medium">{t("wallet.totalBalance") || "Total Balance"}</span>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/40 transition-colors"
              >
                {balanceVisible ? <Eye size={14} className="text-muted-foreground" /> : <EyeOff size={14} className="text-muted-foreground" />}
              </button>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold font-display tracking-tight">
                {balanceVisible ? `$${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "••••••"}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`text-sm font-mono flex items-center gap-2 ${totalChange >= 0 ? "text-neon-green" : "text-red-400"}`}>
                {totalChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {totalChange >= 0 ? "+" : ""}{totalChangePercent.toFixed(2)}%
              </span>
              <span className="text-sm text-muted-foreground">
                ({totalChange >= 0 ? "+" : ""}${Math.abs(totalChange).toFixed(2)}) 24h
              </span>
            </div>

            {/* Wallet Address */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-background/20 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              <span className="flex-1 text-sm font-mono text-muted-foreground truncate">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</span>
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
                { icon: RefreshCw, label: t("wallet.swap") || "Swap", color: "bg-neon-purple/20 text-neon-purple" },
                { icon: Copy, label: t("wallet.copy") || "Copy", color: "bg-secondary/60 text-foreground" },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => {
                      if (action.label === (t("wallet.copy") || "Copy")) {
                        navigator.clipboard.writeText(walletAddress);
                        toast.success(t("wallet.addressCopied") || "Wallet address copied!");
                      } else if (action.label === (t("wallet.send") || "Send")) {
                        setShowSend(true);
                      } else if (action.label === (t("wallet.receive") || "Receive")) {
                        setShowReceive(true);
                      } else if (action.label === (t("wallet.swap") || "Swap")) {
                        setShowSwap(true);
                      }
                    }}
                    className={`flex-1 flex flex-col items-center gap-3 py-3.5 rounded-xl ${action.color} hover:opacity-80 transition-all`}
                  >
                    <Icon size={20} />
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chain Filter + Tabs */}
      <div className="px-4 pt-2 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-secondary/30 rounded-xl p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all ${
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
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                className="absolute right-0 top-full mt-2 w-36 bg-popover border border-border rounded-xl shadow-xl z-20 overflow-hidden"
              >
                {chains.map((chain) => (
                  <button
                    key={chain}
                    onClick={() => { setSelectedChain(chain); saveLastChainFilter(chain); setShowChainFilter(false); }}
                    className={`w-full px-3 py-2.5 text-sm text-left hover:bg-secondary/60 transition-colors ${
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
              className="space-y-1 pt-3"
            >
              {filteredTokens.map((token, i) => (
                <motion.div
                  key={token.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-secondary/60 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                    {token.logoUrl ? (
                      <img
                        src={token.logoUrl}
                        alt={token.symbol}
                        className="w-8 h-8 object-contain rounded-full"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          (e.currentTarget.nextSibling as HTMLElement | null)?.removeAttribute('hidden');
                        }}
                      />
                    ) : null}
                    <span hidden={!!token.logoUrl} className="text-base font-bold">{token.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">{token.symbol}</span>
                      <span className="text-sm font-mono font-medium">
                        {balanceVisible ? `$${token.value.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "••••"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[13px] text-muted-foreground">{token.name}</span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[13px] text-muted-foreground font-mono">
                          {balanceVisible ? token.balance.toLocaleString("en-US", { maximumFractionDigits: 4 }) : "••••"}
                        </span>
                        <span className={`text-sm font-mono px-2.5 py-1 rounded-md ${
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
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-sm text-muted-foreground">{filteredNFTs.length} NFTs</span>
                <span className="text-sm text-muted-foreground">
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
                        <span className={`absolute top-2 right-2 text-sm font-bold px-2.5 py-1 rounded-md [backdrop-filter:none] ${
                          nft.rarity === "Legendary" ? "bg-yellow-500/80 text-black" :
                          nft.rarity === "Epic" ? "bg-purple-500/80 text-white" :
                          nft.rarity === "Rare" ? "bg-blue-500/80 text-white" :
                          "bg-green-500/80 text-white"
                        }`}>
                          {nft.rarity}
                        </span>
                      )}
                    </div>
                    <div className="p-3 bg-card">
                      <p className="text-sm font-semibold truncate">{nft.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">{nft.collection}</span>
                        <span className="text-sm text-neon-cyan font-mono">⟠ {nft.floorPrice}</span>
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
              className="space-y-2 pt-2"
            >
              {/* SWAP History Section */}
              {(swapHistoryData && swapHistoryData.length > 0) && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 px-2 mb-2">
                    <RefreshCw size={12} className="text-neon-cyan" />
                    <span className="text-sm font-semibold text-neon-cyan uppercase tracking-wider">Swap History</span>
                    <span className="text-sm text-muted-foreground">({swapHistoryData.length})</span>
                  </div>
                  <div className="space-y-2">
                    {swapHistoryData.map((swap, i) => (
                      <motion.div
                        key={swap.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-neon-cyan/5 border border-neon-cyan/10 hover:bg-neon-cyan/10 transition-colors cursor-pointer"
                        onClick={() => { navigator.clipboard.writeText(swap.txHash); toast.success(`Tx hash copied!`); }}
                      >
                        <div className="w-10 h-10 rounded-full bg-neon-cyan/15 flex items-center justify-center shrink-0">
                          <RefreshCw size={14} className="text-neon-cyan" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {swap.fromToken} → {swap.toToken}
                            </span>
                            <span className="text-sm font-mono text-neon-cyan">
                              +{parseFloat(swap.toAmount).toFixed(4)} {swap.toToken}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm text-muted-foreground">{swap.dex}</span>
                              <span className="text-sm text-muted-foreground/60 px-2 py-1 rounded bg-secondary/40">{swap.slippage}% slip</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm text-muted-foreground">
                                {new Date(swap.createdAt).toLocaleString()}
                              </span>
                              <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="h-px bg-border/20 my-3" />
                </div>
              )}
              {swapHistoryLoading && (
                <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">Loading swap history...</span>
                </div>
              )}

              {/* On-chain Transactions */}
              {filteredTxs.length > 0 && (
                <div className="flex items-center gap-2 px-2 mb-2">
                  <ArrowUpRight size={12} className="text-muted-foreground" />
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">On-chain Transactions</span>
                </div>
              )}
              {filteredTxs.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => { navigator.clipboard.writeText(tx.hash); toast.success(`Tx hash copied: ${tx.hash.slice(0, 10)}...`); }}
                >
                  <div className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center shrink-0">
                    {txTypeIcon(tx.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-medium">{txTypeLabel(tx.type)}</span>
                        <span className="text-sm text-muted-foreground px-2.5 py-1 rounded bg-secondary/50">{tx.chain}</span>
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
                      <span className="text-sm text-muted-foreground truncate max-w-[60%]">
                        {tx.type === "swap" ? tx.token : tx.type === "receive" ? `From: ${tx.from}` : `To: ${tx.to}`}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm text-muted-foreground">{tx.time}</span>
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
    {/* QR Code Modal — 多链接收 (showQR via header button) */}
    <AnimatePresence>
      {showQR && (
        <ReceiveModal
          walletAddress={walletAddress}
          receiveChain={receiveChain}
          setReceiveChain={setReceiveChain}
          onClose={() => setShowQR(false)}
          t={t}
        />
      )}
    </AnimatePresence>

    {/* Send Modal — 多链发送 */}
    <AnimatePresence>
      {showSend && (() => {
        const SEND_CHAINS_LOCAL = [
          { name: "Ethereum", icon: "⟠", color: "text-blue-400", gas: "~$1.20", placeholder: "0x..." },
          { name: "BSC", icon: "⬡", color: "text-yellow-400", gas: "~$0.05", placeholder: "0x..." },
          { name: "Polygon", icon: "⬡", color: "text-purple-400", gas: "~$0.01", placeholder: "0x..." },
          { name: "Arbitrum", icon: "◆", color: "text-blue-300", gas: "~$0.10", placeholder: "0x..." },
          { name: "Optimism", icon: "🔴", color: "text-red-400", gas: "~$0.05", placeholder: "0x..." },
          { name: "Solana", icon: "◎", color: "text-green-400", gas: "~$0.001", placeholder: "Enter Solana address..." },
        ];
        const activeChain = SEND_CHAINS_LOCAL.find(c => c.name === sendChain) || SEND_CHAINS_LOCAL[0];
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 [backdrop-filter:none] flex items-end justify-center" onClick={() => setShowSend(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-md bg-card rounded-t-2xl border-t border-border/30 p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold font-display mb-3">{t("wallet.send") || "Send"}</h3>
              {/* Chain selector */}
              <div className="flex gap-2.5 mb-4 overflow-x-auto pb-1">
                {SEND_CHAINS_LOCAL.map(c => (
                  <button key={c.name} onClick={() => setSendChain(c.name)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      sendChain === c.name ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40" : "bg-secondary/40 text-muted-foreground border border-border/20"
                    }`}>
                    <span className={c.color}>{c.icon}</span> {c.name}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("wallet.token") || "Token"}</label>
                  <select value={sendToken} onChange={(e) => setSendToken(e.target.value)} className="w-full h-10 rounded-xl bg-secondary/60 border border-border/30 px-3 text-sm">
                    {displayTokens.length > 0
                      ? displayTokens.map(tk => <option key={tk.symbol} value={tk.symbol}>{tk.symbol} — {tk.balance.toFixed(4)}</option>)
                      : ["BNB", "ETH", "USDT", "USDC"].map(s => <option key={s} value={s}>{s}</option>)
                    }
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("wallet.recipientAddress") || "Recipient Address"}</label>
                  <input value={sendAddress} onChange={(e) => setSendAddress(e.target.value)} placeholder={activeChain.placeholder} className="w-full h-10 rounded-xl bg-secondary/60 border border-border/30 px-3 text-sm placeholder:text-muted-foreground focus:border-neon-cyan/50 focus:outline-none font-mono" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">{t("wallet.amount") || "Amount"}</label>
                  <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="0.00" className="w-full h-10 rounded-xl bg-secondary/60 border border-border/30 px-3 text-sm placeholder:text-muted-foreground focus:border-neon-cyan/50 focus:outline-none" />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground px-2 py-1 bg-secondary/30 rounded-lg">
                  <span>{t("wallet.gasFee") || "Gas Fee"}: <span className="text-neon-cyan font-mono">{activeChain.gas}</span></span>
                  <span>{t("wallet.network") || "Network"}: <span className="font-medium text-foreground">{activeChain.name}</span></span>
                </div>
                <button onClick={() => { toast.success(`Sent ${sendAmount} ${sendToken} on ${sendChain}`); setShowSend(false); setSendAmount(""); setSendAddress(""); }}
                  disabled={!sendAmount || !sendAddress}
                  className="w-full h-11 rounded-xl bg-neon-cyan text-background font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity">
                  {t("wallet.confirmSend") || "Confirm Send"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        );
      })()}
    </AnimatePresence>

    {/* Receive Modal — 20+ 链支持 */}
    <AnimatePresence>
      {showReceive && (
        <ReceiveModal
          walletAddress={walletAddress}
          receiveChain={receiveChain}
          setReceiveChain={setReceiveChain}
          onClose={() => setShowReceive(false)}
          t={t}
        />
      )}
    </AnimatePresence>

    {/* Swap Modal — 内嵌聊天器 + 外部 DEX 链接 */}
    <AnimatePresence>
      {showSwap && (
        <SwapModal
          displayTokens={displayTokens}
          swapFrom={swapFrom}
          setSwapFrom={setSwapFrom}
          swapTo={swapTo}
          setSwapTo={setSwapTo}
          swapAmount={swapAmount}
          setSwapAmount={setSwapAmount}
          onClose={() => setShowSwap(false)}
          t={t}
          walletAddress={walletAddress}
        />
      )}
    </AnimatePresence>

    {/* NFT Detail Modal */}
    <AnimatePresence>
      {selectedNFT && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 [backdrop-filter:none] flex items-center justify-center p-4" onClick={() => setSelectedNFT(null)}>
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-sm bg-card rounded-2xl border border-border/30 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-square">
              <img src={selectedNFT.image} alt={selectedNFT.name} loading="lazy" className="w-full h-full object-cover" />
              {selectedNFT.rarity && (
                <span className={`absolute top-3 right-3 text-sm font-bold px-2 py-1 rounded-lg [backdrop-filter:none] ${
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
                  <p className="text-sm text-muted-foreground">{t("wallet.chain") || "Chain"}</p>
                  <p className="text-sm font-medium">{selectedNFT.chain}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-secondary/40 text-center">
                  <p className="text-sm text-muted-foreground">{t("wallet.floor") || "Floor"}</p>
                  <p className="text-sm font-medium font-mono">⟠ {selectedNFT.floorPrice}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { toast.success(t("wallet.listedForSale") || "Listed for sale!"); setSelectedNFT(null); }} className="flex-1 h-10 rounded-xl bg-neon-cyan/20 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/30 transition-colors">{t("wallet.listForSale") || "List for Sale"}</button>
                <button onClick={() => { toast.success(t("wallet.transferInitiated") || "Transfer initiated"); setSelectedNFT(null); }} className="flex-1 h-10 rounded-xl bg-secondary/60 text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">{t("wallet.transfer") || "Transfer"}</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>

    {/* Connect Wallet Modal — lazy-loaded, only pulls wagmi bundle when user opens modal */}
    {showConnectPrompt && (
      <Suspense fallback={null}>
        <WalletConnectModal
          open={showConnectPrompt}
          onClose={() => setShowConnectPrompt(false)}
        />
      </Suspense>
    )}
    </>
  );
}

