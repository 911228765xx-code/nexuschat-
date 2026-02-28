/*
 * Watchlist — 自选股管理页面
 * 支持价格预警设置、批量管理、排序筛选、快速跳转代币详情
 * Design: Cyberpunk dark theme with neon accents
 * v2: 接入 watchlist tRPC 接口，实现数据库持久化（跨设备同步）
 */
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft, Star, Bell, BellOff, Trash2, Plus, Search,
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  SortAsc, SortDesc, Filter, Sparkles, Target, ChevronRight,
  AlertTriangle, Check, X, Edit3, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";

interface WatchItem {
  id: string; token: string; icon: string; price: string; priceNum: number;
  change24h: number; change7d: number; aiScore: number;
  signal: "strongBuy" | "buy" | "neutral" | "sell" | "strongSell";
  alertEnabled: boolean; alertPrice: string; category: string;
  marketCap: string; volume24h: string;
}

type SortKey = "name" | "price" | "change24h" | "change7d" | "aiScore";
type SortDir = "asc" | "desc";

const initialWatchlist: WatchItem[] = [
  { id: "1", token: "BTC", icon: "₿", price: "$97,245", priceNum: 97245, change24h: 1.8, change7d: 5.2, aiScore: 9.2, signal: "strongBuy", alertEnabled: true, alertPrice: "100000", category: "L1", marketCap: "$1.91T", volume24h: "$42.8B" },
  { id: "2", token: "ETH", icon: "Ξ", price: "$3,842", priceNum: 3842, change24h: 2.4, change7d: 3.8, aiScore: 8.5, signal: "buy", alertEnabled: false, alertPrice: "", category: "L1", marketCap: "$461.8B", volume24h: "$18.5B" },
  { id: "3", token: "SOL", icon: "◎", price: "$187.30", priceNum: 187.3, change24h: -1.2, change7d: 2.1, aiScore: 7.2, signal: "buy", alertEnabled: true, alertPrice: "200", category: "L1", marketCap: "$82.4B", volume24h: "$5.2B" },
  { id: "4", token: "ARB", icon: "🔵", price: "$1.82", priceNum: 1.82, change24h: 4.5, change7d: 8.2, aiScore: 7.8, signal: "buy", alertEnabled: false, alertPrice: "", category: "L2", marketCap: "$7.3B", volume24h: "$890M" },
  { id: "5", token: "LINK", icon: "⬡", price: "$22.45", priceNum: 22.45, change24h: 3.1, change7d: 6.5, aiScore: 8.1, signal: "strongBuy", alertEnabled: false, alertPrice: "", category: "DeFi", marketCap: "$14.1B", volume24h: "$1.2B" },
  { id: "6", token: "RENDER", icon: "🎨", price: "$11.28", priceNum: 11.28, change24h: 8.5, change7d: 15.2, aiScore: 7.5, signal: "buy", alertEnabled: true, alertPrice: "15", category: "AI", marketCap: "$5.8B", volume24h: "$620M" },
];

const availableTokens = [
  { token: "AVAX", icon: "🔺", price: "$42.15", category: "L1" },
  { token: "PEPE", icon: "🐸", price: "$0.0000125", category: "Meme" },
  { token: "DOGE", icon: "🐕", price: "$0.182", category: "Meme" },
  { token: "MATIC", icon: "🟣", price: "$0.95", category: "L2" },
  { token: "UNI", icon: "🦄", price: "$12.80", category: "DeFi" },
  { token: "AAVE", icon: "👻", price: "$285.50", category: "DeFi" },
];

// Token metadata map for DB-backed items
const TOKEN_META: Record<string, { icon: string; category: string; name: string }> = {
  BTC: { icon: "₿", category: "L1", name: "Bitcoin" },
  ETH: { icon: "Ξ", category: "L1", name: "Ethereum" },
  SOL: { icon: "◎", category: "L1", name: "Solana" },
  ARB: { icon: "🔵", category: "L2", name: "Arbitrum" },
  LINK: { icon: "⬡", category: "DeFi", name: "Chainlink" },
  RENDER: { icon: "🎨", category: "AI", name: "Render" },
  AVAX: { icon: "🔺", category: "L1", name: "Avalanche" },
  PEPE: { icon: "🐸", category: "Meme", name: "Pepe" },
  DOGE: { icon: "🐕", category: "Meme", name: "Dogecoin" },
  MATIC: { icon: "🟣", category: "L2", name: "Polygon" },
  UNI: { icon: "🦄", category: "DeFi", name: "Uniswap" },
  AAVE: { icon: "👻", category: "DeFi", name: "Aave" },
};

export default function Watchlist() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // ─── tRPC: load watchlist from DB when authenticated ────────────────────────
  const { data: dbWatchlist } = trpc.watchlist.getWatchlist.useQuery(
    undefined,
    { enabled: isAuthenticated, staleTime: 30_000 }
  );

  // tRPC mutations for add/remove
  const addTokenMutation = trpc.watchlist.addToken.useMutation({
    onSuccess: (res) => {
      utils.watchlist.getWatchlist.invalidate();
      if (!res.alreadyExists) toast.success(t("research.addedToWatchlist") || "Added to watchlist");
    },
    onError: (e) => toast.error(e.message),
  });
  const removeTokenMutation = trpc.watchlist.removeToken.useMutation({
    onSuccess: () => {
      utils.watchlist.getWatchlist.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Build WatchItem list from DB data
  const dbItems: WatchItem[] = useMemo(() => {
    if (!dbWatchlist) return [];
    return dbWatchlist.map(row => {
      const meta = TOKEN_META[row.tokenSymbol] ?? { icon: "🪙", category: "Other", name: row.tokenName };
      return {
        id: String(row.id),
        token: row.tokenSymbol,
        icon: meta.icon,
        price: "—",
        priceNum: 0,
        change24h: 0,
        change7d: 0,
        aiScore: 7.0,
        signal: "neutral" as const,
        alertEnabled: false,
        alertPrice: "",
        category: meta.category,
        marketCap: "—",
        volume24h: "—",
      };
    });
  }, [dbWatchlist]);

  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [sortKey, setSortKey] = useState<SortKey>("aiScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [alertInput, setAlertInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Sync DB items into local state when authenticated
  useEffect(() => {
    if (isAuthenticated && dbWatchlist !== undefined) {
      // Preserve alert settings from existing local state when syncing
      setWatchlist(prev => {
        if (dbItems.length === 0) return [];
        const alertMap = new Map(prev.map(w => [w.token, { alertEnabled: w.alertEnabled, alertPrice: w.alertPrice }]));
        return dbItems.map(item => {
          const alert = alertMap.get(item.token);
          return alert ? { ...item, ...alert } : item;
        });
      });
    }
  }, [isAuthenticated, dbItems, dbWatchlist]);

  const signalColor = (s: string) => s === "strongBuy" ? "text-neon-green" : s === "buy" ? "text-neon-green/80" : s === "neutral" ? "text-yellow-500" : s === "sell" ? "text-neon-red/80" : "text-neon-red";
  const signalBg = (s: string) => s === "strongBuy" ? "bg-neon-green/10" : s === "buy" ? "bg-neon-green/8" : s === "neutral" ? "bg-yellow-500/10" : s === "sell" ? "bg-neon-red/8" : "bg-neon-red/10";
  const signalLabel = (s: string) => s === "strongBuy" ? "Strong Buy" : s === "buy" ? "Buy" : s === "neutral" ? "Neutral" : s === "sell" ? "Sell" : "Strong Sell";

  const sorted = useMemo(() => {
    let list = [...watchlist];
    if (searchQuery) {
      list = list.filter(w => w.token.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.token.localeCompare(b.token); break;
        case "price": cmp = a.priceNum - b.priceNum; break;
        case "change24h": cmp = a.change24h - b.change24h; break;
        case "change7d": cmp = a.change7d - b.change7d; break;
        case "aiScore": cmp = a.aiScore - b.aiScore; break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [watchlist, sortKey, sortDir, searchQuery]);

  const filteredAvailable = useMemo(() => {
    const existing = new Set(watchlist.map(w => w.token));
    return availableTokens.filter(t =>
      !existing.has(t.token) && (addSearch ? t.token.toLowerCase().includes(addSearch.toLowerCase()) : true)
    );
  }, [watchlist, addSearch]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const handleSetAlert = (id: string) => {
    if (!alertInput.trim()) return;
    setWatchlist(prev => prev.map(w => w.id === id ? { ...w, alertEnabled: true, alertPrice: alertInput } : w));
    setEditingAlert(null);
    setAlertInput("");
    const item = watchlist.find(w => w.id === id);
    toast.success(`${t("research.alertSet")} ${item?.token} @ $${alertInput}`);
  };

  const handleRemoveAlert = (id: string) => {
    setWatchlist(prev => prev.map(w => w.id === id ? { ...w, alertEnabled: false, alertPrice: "" } : w));
    toast.info(t("research.alertRemoved"));
  };

  const handleRemove = (id: string) => {
    const item = watchlist.find(w => w.id === id);
    // Optimistic remove
    setWatchlist(prev => prev.filter(w => w.id !== id));
    if (isAuthenticated && item) {
      removeTokenMutation.mutate({ tokenId: item.token.toLowerCase() });
    } else {
      toast.info(t("research.removedFromWatchlist"));
    }
  };

  const handleBulkRemove = () => {
    const toRemove = watchlist.filter(w => selectedItems.has(w.id));
    setWatchlist(prev => prev.filter(w => !selectedItems.has(w.id)));
    if (isAuthenticated) {
      toRemove.forEach(item => removeTokenMutation.mutate({ tokenId: item.token.toLowerCase() }));
    }
    toast.info(`${selectedItems.size} ${t("research.tokensRemoved")}`);
    setSelectedItems(new Set());
    setIsEditing(false);
  };

  const handleAdd = (token: typeof availableTokens[0]) => {
    const newItem: WatchItem = {
      id: `new-${Date.now()}`, token: token.token, icon: token.icon, price: token.price,
      priceNum: parseFloat(token.price.replace(/[$,]/g, "")), change24h: Math.round((Math.random() - 0.3) * 10 * 10) / 10,
      change7d: Math.round((Math.random() - 0.2) * 15 * 10) / 10, aiScore: Math.round((6 + Math.random() * 3) * 10) / 10,
      signal: "neutral", alertEnabled: false, alertPrice: "", category: token.category,
      marketCap: "—", volume24h: "—",
    };
    if (isAuthenticated) {
      // Persist to DB; invalidate will sync list
      const meta = TOKEN_META[token.token] ?? { name: token.token };
      addTokenMutation.mutate({
        tokenId: token.token.toLowerCase(),
        tokenSymbol: token.token,
        tokenName: meta.name ?? token.token,
      });
      // Optimistic local add
      setWatchlist(prev => {
        if (prev.some(w => w.token === token.token)) return prev;
        return [...prev, newItem];
      });
    } else {
      setWatchlist(prev => [...prev, newItem]);
      toast.success(`${token.token} ${t("research.addedToWatchlist")}`);
    }
    setShowAddModal(false);
  };

  // tRPC: real-time prices from CoinGecko (refresh every 60s)
  const watchlistSymbols = useMemo(() => watchlist.map(w => w.token), [watchlist]);
  const { data: livePrices } = trpc.trading.getPrices.useQuery(
    { symbols: watchlistSymbols },
    { staleTime: 30_000, refetchInterval: 60_000, enabled: watchlistSymbols.length > 0 }
  );

  // Merge live prices into watchlist
  useEffect(() => {
    if (!livePrices || livePrices.length === 0) return;
    setWatchlist(prev => prev.map(item => {
      const live = livePrices.find(p => p.symbol === item.token);
      if (!live) return item;
      const priceNum = live.price;
      const price = `$${priceNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: priceNum < 1 ? 6 : 2 })}`;
      const marketCap = live.marketCap > 0 ? `$${(live.marketCap / 1e9).toFixed(2)}B` : item.marketCap;
      const volume24h = live.volume > 0 ? `$${(live.volume / 1e6).toFixed(1)}M` : item.volume24h;
      return { ...item, price, priceNum, change24h: live.change, marketCap, volume24h };
    }));
  }, [livePrices]);

  const alertCount = watchlist.filter(w => w.alertEnabled).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/app/research")}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary/40 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-base font-bold font-display flex items-center gap-1.5">
                <Star size={16} className="text-yellow-500" fill="currentColor" />
                {t("research.watchlist")}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {watchlist.length} {t("research.tokens")} · {alertCount} {t("research.alerts")}
                {isAuthenticated && <span className="ml-1 text-neon-cyan/60">· Synced</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => { setIsEditing(!isEditing); setSelectedItems(new Set()); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isEditing ? "bg-neon-red/15 text-neon-red" : "text-muted-foreground hover:bg-secondary/40"
              }`}>
              {isEditing ? t("research.done") : <Edit3 size={14} />}
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="p-1.5 rounded-lg bg-neon-purple/15 text-neon-purple hover:bg-neon-purple/25 transition-colors">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2 pb-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("research.searchTokens")}
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-secondary/50 border border-border/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50" />
          </div>
          <div className="flex gap-1">
            {([
              { key: "aiScore" as SortKey, label: "AI" },
              { key: "change24h" as SortKey, label: "24h" },
              { key: "change7d" as SortKey, label: "7d" },
            ]).map((s) => (
              <button key={s.key} onClick={() => handleSort(s.key)}
                className={`px-2 py-1 rounded text-[9px] font-mono font-medium transition-all flex items-center gap-0.5 ${
                  sortKey === s.key ? "bg-neon-cyan/20 text-neon-cyan" : "text-muted-foreground hover:text-foreground"
                }`}>
                {s.label}
                {sortKey === s.key && (sortDir === "desc" ? <SortDesc size={9} /> : <SortAsc size={9} />)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Bulk Actions */}
      <AnimatePresence>
        {isEditing && selectedItems.size > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/20">
            <div className="flex items-center justify-between px-4 py-2 bg-neon-red/5">
              <span className="text-xs text-muted-foreground">{selectedItems.size} {t("research.selected")}</span>
              <button onClick={handleBulkRemove}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-neon-red/15 text-neon-red text-xs font-medium hover:bg-neon-red/25 transition-colors">
                <Trash2 size={12} /> {t("research.removeSelected")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sorted.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Star size={40} className="text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">{t("research.emptyWatchlist")}</p>
            <button onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-neon-purple/15 text-neon-purple text-xs font-medium hover:bg-neon-purple/25 transition-colors">
              <Plus size={12} className="inline mr-1" /> {t("research.addTokens")}
            </button>
          </div>
        ) : (
          sorted.map((item, idx) => (
            <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="p-3 rounded-2xl bg-secondary/20 border border-border/15 hover:border-neon-purple/20 transition-all">
              <div className="flex items-center gap-3">
                {/* Edit checkbox */}
                {isEditing && (
                  <button onClick={() => {
                    setSelectedItems(prev => {
                      const next = new Set(prev);
                      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                      return next;
                    });
                  }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                      selectedItems.has(item.id) ? "bg-neon-red border-neon-red" : "border-muted-foreground/30"
                    }`}>
                    {selectedItems.has(item.id) && <Check size={11} className="text-white" />}
                  </button>
                )}

                {/* Token Icon */}
                <div className="w-9 h-9 rounded-xl bg-secondary/60 flex items-center justify-center text-lg shrink-0">
                  {item.icon}
                </div>

                {/* Token Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold font-mono">{item.token}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${signalBg(item.signal)} ${signalColor(item.signal)}`}>
                      {signalLabel(item.signal)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{item.category}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{item.marketCap}</span>
                  </div>
                </div>

                {/* Price & Change */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono">{item.price}</p>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className={`text-[10px] font-mono font-medium flex items-center gap-0.5 ${item.change24h >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                      {item.change24h >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {Math.abs(item.change24h).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => {
                        if (editingAlert === item.id) { setEditingAlert(null); setAlertInput(""); }
                        else { setEditingAlert(item.id); setAlertInput(item.alertPrice); }
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${item.alertEnabled ? "text-neon-cyan bg-neon-cyan/10" : "text-muted-foreground hover:bg-secondary/40"}`}>
                      {item.alertEnabled ? <Bell size={13} /> : <BellOff size={13} />}
                    </button>
                    <button onClick={() => handleRemove(item.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-neon-red/10 hover:text-neon-red transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* AI Score bar */}
              <div className="flex items-center gap-2 mt-2">
                <Sparkles size={10} className="text-neon-purple shrink-0" />
                <div className="flex-1 h-1 rounded-full bg-secondary/60">
                  <div className="h-full rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan transition-all"
                    style={{ width: `${(item.aiScore / 10) * 100}%` }} />
                </div>
                <span className="text-[10px] font-mono text-neon-purple shrink-0">{item.aiScore.toFixed(1)}</span>
              </div>

              {/* Alert Input */}
              <AnimatePresence>
                {editingAlert === item.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/10">
                      <Bell size={12} className="text-neon-cyan shrink-0" />
                      <input type="number" value={alertInput} onChange={(e) => setAlertInput(e.target.value)}
                        placeholder={`${t("research.alertPrice")} (USD)`}
                        className="flex-1 h-7 px-2 rounded-lg bg-background/40 border border-border/20 text-[11px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50"
                        autoFocus />
                      <button onClick={() => handleSetAlert(item.id)}
                        className="px-2.5 h-7 rounded-lg bg-neon-cyan/20 text-neon-cyan text-[10px] font-medium hover:bg-neon-cyan/30 transition-colors">
                        <Check size={12} />
                      </button>
                      <button onClick={() => { setEditingAlert(null); setAlertInput(""); }}
                        className="px-2 h-7 rounded-lg text-muted-foreground hover:bg-secondary/40 transition-colors">
                        <X size={12} />
                      </button>
                      {item.alertEnabled && (
                        <button onClick={() => handleRemoveAlert(item.id)}
                          className="px-2 h-7 rounded-lg text-neon-red/70 hover:bg-neon-red/10 transition-colors">
                          <BellOff size={12} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Alert Badge */}
              {item.alertEnabled && editingAlert !== item.id && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/10">
                  <Bell size={10} className="text-neon-cyan" />
                  <span className="text-[10px] text-muted-foreground">{t("research.alertAt")}</span>
                  <span className="text-[10px] font-mono font-semibold text-neon-cyan">${item.alertPrice}</span>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Add Token Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-card border-t border-border/30 rounded-t-3xl p-4 space-y-4 max-h-[70vh]">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold font-display flex items-center gap-1.5">
                  <Plus size={14} className="text-neon-purple" />
                  {t("research.addToWatchlist")}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={addSearch} onChange={(e) => setAddSearch(e.target.value)}
                  placeholder={t("research.searchTokens")}
                  className="w-full h-9 pl-8 pr-3 rounded-xl bg-secondary/50 border border-border/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50" />
              </div>
              <div className="space-y-1.5 overflow-y-auto max-h-[40vh]">
                {filteredAvailable.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">{t("research.noTokensFound")}</p>
                ) : (
                  filteredAvailable.map((token) => (
                    <div key={token.token} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/20 border border-border/15">
                      <span className="text-lg">{token.icon}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold">{token.token}</p>
                        <p className="text-[10px] text-muted-foreground">{token.price} · {token.category}</p>
                      </div>
                      <button onClick={() => handleAdd(token)}
                        className="px-3 py-1.5 rounded-lg bg-neon-purple/15 text-neon-purple text-[10px] font-medium hover:bg-neon-purple/25 transition-colors">
                        <Plus size={10} className="inline mr-0.5" /> {t("research.add")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
