/*
 * Chat — 消息列表页
 * Cyberpunk Noir: 深色背景 + 霓虹强调色
 * v1.9: AppContext全局状态接入 + 全局消息搜索 + 对话置顶 + 长按上下文菜单
 */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatMessageTime } from "@/lib/timeFormat";
import {
  Search, Plus, Users, Lock, Shield, X, Clock, ArrowUp,
  Pin, BellOff, Bell, Trash2, Archive, MoreHorizontal, Filter,
  MessageSquare, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/_core/hooks/useAuth";
import PullToRefresh from "@/components/PullToRefresh";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  chatName: string;
  chatAvatar: string;
  message: string;
  sender: string;
  time: string;
  highlight: string;
}

// Mock search results removed — now using real user search via trpc.user.searchUsers

const searchFilters = ["All", "Messages", "Files", "Links", "Media"];
const timeFilters = ["Any Time", "Today", "This Week", "This Month"];

export default function Chat() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeTimeFilter, setActiveTimeFilter] = useState("Any Time");
  // isSearching and searchResults now derived from trpc query below
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();

  // tRPC: real DM conversations (protectedProcedure — skip when not logged in)
  const { data: dmConversations, isLoading: dmLoading } = trpc.chat.listDMConversations.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchInterval: isAuthenticated ? 30_000 : false, staleTime: 15_000 }
  );

  // tRPC: public groups list
  const { data: publicGroupsData } = trpc.chat.listGroups.useQuery(
    { limit: 5 },
    { staleTime: 60_000 }
  );
  const joinGroupMutation = trpc.chat.joinGroup.useMutation();

  // tRPC: my joined groups (protectedProcedure)
  const { data: myGroupsData, refetch: refetchMyGroups } = trpc.chat.myGroups.useQuery(
    undefined,
    { enabled: isAuthenticated, staleTime: 30_000, refetchInterval: isAuthenticated ? 60_000 : false }
  );

  // tRPC: unread counts per group
  const { data: unreadCountsData } = trpc.chat.getUnreadCounts.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchInterval: isAuthenticated ? 30_000 : false, staleTime: 15_000 }
  );

  // tRPC: auto-join sample groups for new users (runs once on login)
  const autoJoinMutation = trpc.chat.autoJoinSampleGroups.useMutation();
  useEffect(() => {
    if (isAuthenticated) {
      autoJoinMutation.mutate(undefined, {
        onSuccess: (res) => {
          if (res.joined > 0) refetchMyGroups();
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // tRPC: real unread notification count (protectedProcedure — skip when not logged in)
  const { data: notifCountData } = trpc.notifications.unreadCount.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchInterval: isAuthenticated ? 30_000 : false }
  );

  // ✅ AppContext全局状态
  const {
    conversations,
    pinConversation,
    muteConversation,
    deleteConversation,
    markConversationRead,
    unreadNotificationCount: localUnreadCount,
  } = useApp();

  // Use real count if available, fallback to local
  const unreadNotificationCount = notifCountData?.count ?? localUnreadCount;

  // Merge real DM conversations + my groups into the list (memoized)
  const mergedConversations = useMemo(() => [
    // My joined groups from DB
    ...(myGroupsData ?? []).map(g => ({
      id: String(g.id),
      name: g.name,
      avatar: g.avatar ? g.avatar : g.name.slice(0, 2),
      lastMessage: g.lastSender ? `${g.lastSender}: ${g.lastMessage}` : (g.lastMessage || g.description || ''),
      time: g.lastMessageAt ? formatMessageTime(new Date(g.lastMessageAt)) : '',
      unread: unreadCountsData?.[g.id] ?? 0,
      isGroup: true,
      isOnline: false,
      isPinned: false,
      isMuted: false,
      isTokenGated: g.isTokenGated,
    } as import("@/contexts/AppContext").Conversation)),
    // Local pinned/muted state from AppContext (non-group entries only)
    ...conversations.filter(c => !c.isGroup),
    ...(dmConversations ?? []).map(dm => ({
      id: `dm-${dm.userId}`,
      name: dm.name,
      avatar: dm.avatar ? dm.avatar.slice(0, 2).toUpperCase() : dm.name?.slice(0, 1) ?? "U",
      lastMessage: dm.lastMessage,
      time: formatMessageTime(new Date(dm.lastMessageAt)),
      unread: 0,
      isGroup: false,
      isOnline: false,
      isPinned: false,
      isMuted: false,
      isTokenGated: false,
      dmUserId: String(dm.userId),
    } as import("@/contexts/AppContext").Conversation)),

  ].filter((conv, idx, arr) => arr.findIndex(c => c.id === conv.id) === idx),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [myGroupsData, conversations, dmConversations, unreadCountsData]);

  // Sort: pinned first, then by time (memoized)
  const sortedConversations = useMemo(() => [...mergedConversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  }), [mergedConversations]);

  const filtered = useMemo(() => sortedConversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  ), [sortedConversations, searchQuery]);

  // ─── Real user search via backend ────────────────────────────────────
  const [debouncedGlobalSearch, setDebouncedGlobalSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGlobalSearch(globalSearch), 400);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  const { data: userSearchData, isFetching: isUserSearching } = trpc.user.searchUsers.useQuery(
    { query: debouncedGlobalSearch },
    { enabled: debouncedGlobalSearch.trim().length >= 2, staleTime: 15_000 }
  );

  // Convert user search results to SearchResult format
  const searchResults: SearchResult[] = (userSearchData ?? []).map(u => ({
    id: `user-${u.id}`,
    chatName: u.name,
    chatAvatar: u.avatar ?? u.name.charAt(0).toUpperCase(),
    message: u.bio ?? "Start a conversation",
    sender: u.name,
    time: "",
    highlight: debouncedGlobalSearch,
  }));
  const isSearching = isUserSearching;

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

  // Context menu actions — now using AppContext
  const togglePin = (id: string) => {
    const conv = conversations.find(c => c.id === id);
    pinConversation(id);
    toast.success(conv?.isPinned ? t("chat.unpinned") : t("chat.pinned"));
    setContextMenu(null);
  };

  const toggleMute = (id: string) => {
    const conv = conversations.find(c => c.id === id);
    muteConversation(id);
    toast.success(conv?.isMuted ? t("chat.unmuted") : t("chat.muted"));
    setContextMenu(null);
  };

  const markAsRead = (id: string) => {
    markConversationRead(id);
    toast.success(t("chat.markedRead"));
    setContextMenu(null);
  };

  const deleteChat = (id: string) => {
    deleteConversation(id);
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
            <span className="text-xs font-mono text-neon-cyan bg-neon-cyan/10 px-2.5 py-1 rounded-full">
              {t("chat.e2e")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearchPanel(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/80 transition-colors"
            >
              <Search size={18} className="text-muted-foreground" />
            </button>
            <Link href="/app/notifications">
              <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/80 transition-colors">
                <Bell size={18} className="text-muted-foreground" />
                {unreadNotificationCount > 0 && (
                  <div className="absolute top-1 right-1 min-w-[10px] h-[10px] rounded-full bg-neon-red flex items-center justify-center" style={{ boxShadow: "0 0 6px oklch(0.65 0.25 25 / 0.5)" }}>
                    {unreadNotificationCount > 9 && (
                      <span className="text-[7px] font-bold text-white leading-none">{unreadNotificationCount}</span>
                    )}
                  </div>
                )}
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
            className="absolute left-3 top-[18px] -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder={t("chat.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pr-4 rounded-xl bg-secondary/60 border border-border/30 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
      </header>

      {/* Conversation List */}
      <PullToRefresh
        onRefresh={async () => { await new Promise(r => setTimeout(r, 1000)); toast.success(t("chat.refreshed") || "Refreshed!"); }}
        className="flex-1"
      >
        {/* Skeleton while DM list loads */}
        {dmLoading && conversations.length === 0 && (
          <div className="px-4 pt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-border/10">
                <div className="w-12 h-12 rounded-full bg-secondary/60 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3.5 w-28 bg-secondary/60 animate-pulse rounded" />
                    <div className="h-3 w-12 bg-secondary/40 animate-pulse rounded" />
                  </div>
                  <div className="h-3 w-3/4 bg-secondary/40 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!dmLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-8 gap-4 px-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center">
              <MessageSquare size={28} className="text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">{t("chat.noConversations") || "No conversations yet"}</p>
              <p className="text-xs text-muted-foreground/60 mt-2">{t("chat.startChat") || "Join a community below to get started"}</p>
            </div>
            {publicGroupsData && publicGroupsData.length > 0 && (
              <div className="w-full mt-2">
                <p className="text-xs text-muted-foreground/50 font-mono uppercase tracking-widest px-2 mb-2">Active Communities</p>
                <div className="space-y-2">
                  {publicGroupsData.map((group) => (
                    <motion.div
                      key={group.id}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/10 hover:border-neon-purple/20 transition-all cursor-pointer"
                      onClick={() => {
                        joinGroupMutation.mutate(
                          { groupId: group.id },
                          { onSuccess: () => { window.location.href = `/app/group/${group.id}`; } }
                        );
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-neon-purple/15 flex items-center justify-center">
                        {group.avatar ? (
                          <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users size={18} className="text-neon-purple" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.memberCount} members</p>
                      </div>
                      <ChevronRight size={14} className="text-neon-purple/50 shrink-0" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="h-px flex-1 bg-border/15" />
            <span className="text-xs text-muted-foreground/40 font-mono">{filtered.length} {t("chat.conversations") || "conversations"}</span>
            <div className="h-px flex-1 bg-border/15" />
          </div>
        )}
        {filtered.map((conv, index) => {
          const isPinned = conv.isPinned;
          const isLast = index === filtered.length - 1;
          return (
            <Link key={conv.id} href={conv.isGroup ? `/app/group/${conv.id}` : conv.dmUserId ? `/app/dm/${conv.dmUserId}` : `/app/chat/${conv.id}`}>
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
                    {conv.avatar?.startsWith("http") && (
                      <AvatarImage src={conv.avatar} alt={conv.name} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-secondary text-foreground text-lg font-display">
                      {conv.avatar?.startsWith("http") ? (conv.name?.slice(0, 2).toUpperCase() ?? "?") : (conv.avatar ?? "?")}
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
                    <div className="flex items-center gap-2.5 min-w-0">
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
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {conv.time}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.lastMessage}
                  </p>
                </div>

                {/* Unread badge */}
                {conv.unread > 0 && (
                  <div className={`shrink-0 min-w-5 h-5 px-2.5 rounded-full flex items-center justify-center ${conv.isMuted ? "bg-muted-foreground/30" : "bg-neon-cyan"}`}>
                    <span className={`text-xs font-bold leading-none ${conv.isMuted ? "text-muted-foreground" : "text-background"}`}>
                      {conv.unread > 99 ? "99+" : conv.unread}
                    </span>
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
        {filtered.length > 0 && (
          <div className="py-4 px-4 space-y-3">
            {/* Create Group CTA */}
            <Link href="/app/create-group">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-neon-cyan/5 to-neon-purple/5 border border-neon-cyan/15 hover:border-neon-cyan/30 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-neon-cyan/15 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-neon-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-display text-foreground">Create a Group</p>
                  <p className="text-xs text-muted-foreground">Start a token-gated community</p>
                </div>
                <ChevronRight size={16} className="text-neon-cyan/60 shrink-0" />
              </motion.div>
            </Link>
            {/* Discover Public Groups */}
            {publicGroupsData && publicGroupsData.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground/50 font-mono uppercase tracking-widest px-2 mb-2">Discover Groups</p>
                <div className="space-y-2">
                  {publicGroupsData.map((group) => (
                    <motion.div
                      key={group.id}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/10 hover:border-neon-purple/20 transition-all cursor-pointer"
                      onClick={() => {
                        joinGroupMutation.mutate(
                          { groupId: group.id },
                          {
                            onSuccess: (res) => {
                              if (res.alreadyMember) {
                                window.location.href = `/app/group/${group.id}`;
                              } else {
                                window.location.href = `/app/group/${group.id}`;
                              }
                            },
                          }
                        );
                      }}
                    >
                      <div className="w-9 h-9 rounded-lg bg-neon-purple/15 flex items-center justify-center shrink-0">
                        <Users size={16} className="text-neon-purple" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.memberCount} members</p>
                      </div>
                      <ChevronRight size={14} className="text-neon-purple/50 shrink-0" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {/* End marker */}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border/10" />
              <span className="text-xs text-muted-foreground/30 font-mono uppercase tracking-widest">End</span>
              <div className="h-px flex-1 bg-border/10" />
            </div>
          </div>
        )}
      </PullToRefresh>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 [backdrop-filter:none]"
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
                  { icon: Archive, label: t("chat.archive"), action: () => { deleteConversation(contextMenu.id); toast.success(t("chat.archived") || "Archived"); setContextMenu(null); }, color: "text-muted-foreground" },
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
            className="fixed inset-0 z-50 bg-background"
          >
            {/* Search Header */}
            <div className="px-4 pt-[env(safe-area-inset-top)]">
              <div className="flex items-center gap-3 h-14">
                <button
                  onClick={() => { setShowSearchPanel(false); setGlobalSearch(""); }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/80 transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex-1 relative">
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

              {/* Filters */}
              <div className="flex gap-2 pb-3 overflow-x-auto scrollbar-hide">
                {searchFilters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      activeFilter === f
                        ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                        : "bg-secondary/40 text-muted-foreground border border-transparent hover:bg-secondary/60"
                    }`}
                  >
                    {f}
                  </button>
                ))}
                <div className="w-px bg-border/30 mx-1 self-stretch" />
                {timeFilters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveTimeFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                      activeTimeFilter === f
                        ? "bg-neon-purple/20 text-neon-purple border border-neon-purple/30"
                        : "bg-secondary/40 text-muted-foreground border border-transparent hover:bg-secondary/60"
                    }`}
                  >
                    <Clock size={10} />
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto px-4">
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan animate-spin" />
                  <p className="text-sm text-muted-foreground">{t("chat.searching")}</p>
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-3 font-medium">
                    {searchResults.length} {t("chat.resultsFound")}
                  </p>
                  <div className="space-y-2">
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
                          // Navigate to DM with this user
                          const userId = result.id.replace("user-", "");
                          setLocation(`/app/dm/${userId}`);
                        }}
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          {result.chatAvatar?.startsWith("http") && (
                            <AvatarImage src={result.chatAvatar} alt={result.chatName} className="object-cover" />
                          )}
                          <AvatarFallback className="bg-secondary text-foreground text-sm font-display">
                            {result.chatAvatar?.startsWith("http") ? (result.chatName?.charAt(0).toUpperCase() ?? "?") : (result.chatAvatar ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium font-display">{result.chatName}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-2">
                              <Clock size={10} />
                              {result.time}
                            </span>
                          </div>
                          <p className="text-[13px] text-muted-foreground mb-0.5">{result.sender}:</p>
                          <p className="text-xs leading-relaxed">
                            {highlightText(result.message, globalSearch)}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-2" />
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
                  <div className="space-y-2">
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
