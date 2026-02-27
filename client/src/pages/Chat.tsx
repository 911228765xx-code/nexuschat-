/*
 * Chat — 消息列表页
 * Cyberpunk Noir: 深色背景 + 霓虹强调色
 * v1.6: 全局消息搜索 + 对话置顶 + 长按上下文菜单
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Search, Plus, Users, Lock, Shield, X, Clock, ArrowUp,
  Pin, BellOff, Bell, Trash2, Archive, MoreHorizontal, Filter,
  MessageSquare, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isGroup: boolean;
  isTokenGated: boolean;
  isOnline?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
}

interface SearchResult {
  id: string;
  chatName: string;
  chatAvatar: string;
  message: string;
  sender: string;
  time: string;
  highlight: string;
}

const initialConversations: Conversation[] = [
  {
    id: "1", name: "vitalik.eth", avatar: "V",
    lastMessage: "ETH 2.0 staking yield looks great 🚀",
    time: "now", unread: 3, isGroup: false, isTokenGated: false, isOnline: true,
  },
  {
    id: "2", name: "BAYC Holders 🐵", avatar: "🐵",
    lastMessage: "Alice: New roadmap is out!",
    time: "5m", unread: 12, isGroup: true, isTokenGated: true,
  },
  {
    id: "3", name: "0xDeFi...3a9b", avatar: "D",
    lastMessage: "/research SOL report generated",
    time: "15m", unread: 0, isGroup: false, isTokenGated: false, isOnline: true,
  },
  {
    id: "4", name: "NexusChat Official", avatar: "N",
    lastMessage: "Admin: v0.2.0 released!",
    time: "1h", unread: 5, isGroup: true, isTokenGated: false,
  },
  {
    id: "5", name: "satoshi.btc", avatar: "S",
    lastMessage: "BTC on-chain data shows whale accumulation",
    time: "2h", unread: 0, isGroup: false, isTokenGated: false, isOnline: false,
  },
  {
    id: "6", name: "DeFi Alpha 🔒", avatar: "🔑",
    lastMessage: "Bob: This new LP has 200%+ APY",
    time: "3h", unread: 0, isGroup: true, isTokenGated: true,
  },
  {
    id: "7", name: "punk6529.eth", avatar: "P",
    lastMessage: "NFT market is recovering, watch Blur data",
    time: "1d", unread: 0, isGroup: false, isTokenGated: false, isOnline: false,
  },
];

const mockSearchResults: SearchResult[] = [
  {
    id: "s1", chatName: "vitalik.eth", chatAvatar: "V",
    message: "ETH 2.0 staking yield is now at 4.2%, which is very competitive compared to traditional finance",
    sender: "vitalik.eth", time: "Today 14:32",
    highlight: "staking yield",
  },
  {
    id: "s2", chatName: "BAYC Holders 🐵", chatAvatar: "🐵",
    message: "The new staking mechanism for BAYC holders will launch next week with enhanced rewards",
    sender: "Alice", time: "Today 10:15",
    highlight: "staking",
  },
  {
    id: "s3", chatName: "0xDeFi...3a9b", chatAvatar: "D",
    message: "Lido staking TVL just crossed $20B, bullish signal for the ecosystem",
    sender: "0xDeFi...3a9b", time: "Yesterday 22:08",
    highlight: "staking TVL",
  },
  {
    id: "s4", chatName: "DeFi Alpha 🔒", chatAvatar: "🔑",
    message: "New liquid staking derivative protocol launching on Arbitrum, early APY looks insane",
    sender: "Bob", time: "Feb 24",
    highlight: "staking derivative",
  },
  {
    id: "s5", chatName: "satoshi.btc", chatAvatar: "S",
    message: "Bitcoin staking via Babylon protocol is gaining traction, worth watching",
    sender: "satoshi.btc", time: "Feb 23",
    highlight: "staking",
  },
];

const searchFilters = ["All", "Messages", "Files", "Links", "Media"];
const timeFilters = ["Any Time", "Today", "This Week", "This Month"];

export default function Chat() {
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState(initialConversations);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeTimeFilter, setActiveTimeFilter] = useState("Any Time");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  // Sort: pinned first, then by time
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const filtered = sortedConversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Global search handler
  const handleGlobalSearch = useCallback(() => {
    if (!globalSearch.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setTimeout(() => {
      setSearchResults(mockSearchResults.filter(r =>
        r.message.toLowerCase().includes(globalSearch.toLowerCase()) ||
        r.chatName.toLowerCase().includes(globalSearch.toLowerCase())
      ));
      setIsSearching(false);
    }, 800);
  }, [globalSearch]);

  useEffect(() => {
    if (globalSearch.trim().length >= 2) {
      const timer = setTimeout(handleGlobalSearch, 400);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [globalSearch, handleGlobalSearch]);

  // Long press for context menu
  const handleTouchStart = (id: string, e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    longPressTimer.current = setTimeout(() => {
      setContextMenu({ id, x: clientX, y: clientY });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Context menu actions
  const togglePin = (id: string) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, isPinned: !c.isPinned } : c
    ));
    const conv = conversations.find(c => c.id === id);
    toast.success(conv?.isPinned ? t("chat.unpinned") : t("chat.pinned"));
    setContextMenu(null);
  };

  const toggleMute = (id: string) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, isMuted: !c.isMuted } : c
    ));
    const conv = conversations.find(c => c.id === id);
    toast.success(conv?.isMuted ? t("chat.unmuted") : t("chat.muted"));
    setContextMenu(null);
  };

  const markAsRead = (id: string) => {
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, unread: 0 } : c
    ));
    toast.success(t("chat.markedRead"));
    setContextMenu(null);
  };

  const deleteChat = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    toast.success(t("chat.deleted"));
    setContextMenu(null);
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    if (contextMenu) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [contextMenu]);

  // Highlight matched text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="text-neon-cyan bg-neon-cyan/15 px-0.5 rounded">{part}</span>
      ) : part
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-neon-cyan" />
            <h1 className="text-lg font-semibold font-display">{t("chat.title")}</h1>
            <span className="text-[10px] font-mono text-neon-cyan bg-neon-cyan/10 px-1.5 py-0.5 rounded-full">
              {t("chat.e2e")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearchPanel(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/80 transition-colors"
            >
              <Search size={18} className="text-muted-foreground" />
            </button>
            <Link href="/app/notifications">
              <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/80 transition-colors">
                <Bell size={18} className="text-muted-foreground" />
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-neon-red" style={{ boxShadow: "0 0 6px oklch(0.65 0.25 25 / 0.5)" }} />
              </button>
            </Link>
            <Link href="/app/create-group">
              <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
                <Plus size={18} className="text-neon-cyan" />
              </button>
            </Link>
          </div>
        </div>

        {/* Quick search */}
        <div className="relative pb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-[calc(50%+6px)] text-muted-foreground"
          />
          <input
            type="text"
            placeholder={t("chat.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
          />
        </div>
      </header>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((conv, index) => {
          const isPinned = conv.isPinned;
          return (
            <Link key={conv.id} href={`/app/chat/${conv.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 active:bg-secondary/60 transition-colors cursor-pointer border-b border-border/10 ${isPinned ? "bg-neon-cyan/[0.03]" : ""}`}
                onMouseDown={(e) => handleTouchStart(conv.id, e)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onTouchStart={(e) => handleTouchStart(conv.id, e)}
                onTouchEnd={handleTouchEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ id: conv.id, x: e.clientX, y: e.clientY });
                }}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar className={`w-12 h-12 ${conv.isTokenGated ? "ring-2 ring-neon-purple/60" : ""}`}>
                    <AvatarFallback className="bg-secondary text-foreground text-lg font-display">
                      {conv.avatar}
                    </AvatarFallback>
                  </Avatar>
                  {conv.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-neon-green border-2 border-background" />
                  )}
                  {conv.isGroup && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-secondary flex items-center justify-center">
                      {conv.isTokenGated ? (
                        <Lock size={8} className="text-neon-purple" />
                      ) : (
                        <Users size={8} className="text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isPinned && (
                        <Pin size={10} className="text-neon-cyan shrink-0 rotate-45" />
                      )}
                      <span className="font-medium text-sm truncate font-display">
                        {conv.name}
                      </span>
                      {conv.isMuted && (
                        <BellOff size={10} className="text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {conv.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage}
                  </p>
                </div>

                {/* Unread badge */}
                {conv.unread > 0 && (
                  <div className={`shrink-0 min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center ${conv.isMuted ? "bg-muted-foreground/30" : "bg-neon-cyan"}`}>
                    <span className={`text-[10px] font-bold leading-none ${conv.isMuted ? "text-muted-foreground" : "text-background"}`}>
                      {conv.unread > 99 ? "99+" : conv.unread}
                    </span>
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              ref={contextMenuRef}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 w-52 rounded-2xl bg-card border border-border/40 shadow-2xl overflow-hidden py-1.5"
              style={{
                left: Math.min(contextMenu.x, window.innerWidth - 220),
                top: Math.min(contextMenu.y, window.innerHeight - 280),
              }}
            >
              {(() => {
                const conv = conversations.find(c => c.id === contextMenu.id);
                if (!conv) return null;
                const menuItems = [
                  { icon: Pin, label: conv.isPinned ? t("chat.unpin") : t("chat.pin"), action: () => togglePin(contextMenu.id), color: "text-neon-cyan" },
                  { icon: BellOff, label: conv.isMuted ? t("chat.unmute") : t("chat.mute"), action: () => toggleMute(contextMenu.id), color: "text-neon-purple" },
                  { icon: MessageSquare, label: t("chat.markRead"), action: () => markAsRead(contextMenu.id), color: "text-neon-green" },
                  { icon: Archive, label: t("chat.archive"), action: () => { toast.success("Feature coming soon"); setContextMenu(null); }, color: "text-muted-foreground" },
                  { icon: Trash2, label: t("chat.delete"), action: () => deleteChat(contextMenu.id), color: "text-neon-red" },
                ];
                return menuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); item.action(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                  >
                    <item.icon size={16} className={item.color} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ));
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global Search Panel */}
      <AnimatePresence>
        {showSearchPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            {/* Search Header */}
            <header className="px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
              <div className="flex items-center gap-3 h-14">
                <button
                  onClick={() => { setShowSearchPanel(false); setGlobalSearch(""); setSearchResults([]); }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors shrink-0"
                >
                  <X size={20} className="text-muted-foreground" />
                </button>
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t("chat.globalSearch")}
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    autoFocus
                    className="w-full h-10 pl-9 pr-4 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
                  />
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-2 pb-3 overflow-x-auto">
                {searchFilters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeFilter === f
                        ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                        : "bg-secondary/40 text-muted-foreground border border-border/20 hover:bg-secondary/60"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Time filter */}
              <div className="flex gap-2 pb-3 overflow-x-auto">
                <Filter size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                {timeFilters.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setActiveTimeFilter(tf)}
                    className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] transition-all ${
                      activeTimeFilter === tf
                        ? "bg-neon-purple/15 text-neon-purple"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </header>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto">
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan animate-spin" />
                  <p className="text-sm text-muted-foreground">{t("chat.searching")}</p>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-3 font-mono">
                    {searchResults.length} {t("chat.resultsFound")}
                  </p>
                  <div className="space-y-1">
                    {searchResults.map((result, index) => (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/40 transition-colors cursor-pointer"
                        onClick={() => {
                          setShowSearchPanel(false);
                          setGlobalSearch("");
                        }}
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarFallback className="bg-secondary text-foreground text-sm font-display">
                            {result.chatAvatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium font-display">{result.chatName}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock size={10} />
                              {result.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mb-0.5">{result.sender}:</p>
                          <p className="text-xs leading-relaxed">
                            {highlightText(result.message, globalSearch)}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-1" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {!isSearching && globalSearch.trim().length >= 2 && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center">
                    <Search size={28} className="text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("chat.noResults")}</p>
                  <p className="text-xs text-muted-foreground/60">{t("chat.tryDifferent")}</p>
                </div>
              )}

              {!isSearching && globalSearch.trim().length < 2 && (
                <div className="px-4 py-6">
                  <p className="text-xs text-muted-foreground mb-4 font-medium">{t("chat.recentSearches")}</p>
                  <div className="space-y-1">
                    {["staking yield", "NFT roadmap", "SOL report", "whale accumulation"].map((term) => (
                      <button
                        key={term}
                        onClick={() => setGlobalSearch(term)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors text-left"
                      >
                        <Clock size={14} className="text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground">{term}</span>
                        <ArrowUp size={14} className="text-muted-foreground/40 ml-auto -rotate-45" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
