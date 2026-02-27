/*
 * Watchlist — 自选股管理页面
 * 支持价格预警设置、批量管理、排序筛选、快速跳转代币详情
 * Design: Cyberpunk dark theme with neon accents
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
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

export default function Watchlist() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
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
    setWatchlist(prev => prev.filter(w => w.id !== id));
    toast.info(t("research.removedFromWatchlist"));
  };

  const handleBulkRemove = () => {
    setWatchlist(prev => prev.filter(w => !selectedItems.has(w.id)));
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
    setWatchlist(prev => [...prev, newItem]);
    toast.success(`${token.token} ${t("research.addedToWatchlist")}`);
  };

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
              <p className="text-[10px] text-muted-foreground">{watchlist.length} {t("research.tokens")} · {alertCount} {t("research.alerts")}</p>
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
                    {selectedItems.has(item.id) && <Check size={10} className="text-white" />}
                  </button>
                )}

                {/* Token info */}
                <button onClick={() => !isEditing && setLocation(`/app/research/${item.token.toLowerCase()}`)}
                  className="flex items-center gap-3 flex-1 text-left">
                  <div className="w-10 h-10 rounded-xl bg-neon-purple/15 flex items-center justify-center text-xl border border-neon-purple/20 shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-display">{item.token}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground font-mono">{item.category}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${signalBg(item.signal)} ${signalColor(item.signal)}`}>
                        {signalLabel(item.signal)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs font-mono font-semibold">{item.price}</span>
                      <span className={`text-[10px] font-mono flex items-center gap-0.5 ${item.change24h >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                        {item.change24h >= 0 ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                        {item.change24h >= 0 ? "+" : ""}{item.change24h}%
                      </span>
                      <span className={`text-[10px] font-mono ${item.change7d >= 0 ? "text-neon-green/70" : "text-neon-red/70"}`}>
                        7d: {item.change7d >= 0 ? "+" : ""}{item.change7d}%
                      </span>
                    </div>
                  </div>
                </button>

                {/* AI Score & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-center">
                    <p className={`text-sm font-mono font-bold ${item.aiScore >= 8 ? "text-neon-green" : item.aiScore >= 6 ? "text-neon-cyan" : "text-neon-red"}`}>
                      {item.aiScore}
                    </p>
                    <p className="text-[8px] text-muted-foreground">AI</p>
                  </div>
                  {!isEditing && (
                    <div className="flex flex-col gap-1">
                      <button onClick={(e) => {
                        e.stopPropagation();
                        if (item.alertEnabled) handleRemoveAlert(item.id);
                        else { setEditingAlert(item.id); setAlertInput(item.alertPrice); }
                      }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.alertEnabled ? "text-neon-cyan bg-neon-cyan/10" : "text-muted-foreground hover:bg-secondary/40"
                        }`}>
                        {item.alertEnabled ? <Bell size={13} fill="currentColor" /> : <BellOff size={13} />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-neon-red hover:bg-neon-red/10 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
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
                      <button onClick={() => setEditingAlert(null)}
                        className="px-2 h-7 rounded-lg text-muted-foreground hover:bg-secondary/40 transition-colors">
                        <X size={12} />
                      </button>
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
