/**
 * GroupChatRoom — 群聊聊天室页面
 * 群成员侧边栏、@提及成员、群公告置顶、群信息面板
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useSocket, SocketMessage } from "@/hooks/useSocket";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft, Send, Smile, MoreVertical, X, Reply, Users,
  Megaphone, ChevronRight, Shield, Crown, Hash, AtSign,
  Pin, Settings, Bell, BellOff, LogOut, UserPlus, Search,
  Image as ImageIcon, Gift, ArrowUpDown, Mic, Plus, Bot,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";

interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  role: "owner" | "admin" | "member";
  status: "online" | "offline" | "away";
  address: string;
}

interface GroupMessage {
  id: string;
  sender: string;
  senderAvatar: string;
  senderRole?: "owner" | "admin" | "member";
  content: string;
  time: string;
  isMine: boolean;
  isAI?: boolean;
  reactions?: Record<string, number>;
  replyTo?: { sender: string; content: string };
  mentions?: string[];
  isPinned?: boolean;
}

const EMOJI_LIST = ["👍", "❤️", "🔥", "🚀", "😂", "😮", "🎉", "💎"];

// Mock members removed — now using real data from chat.getGroupMembers

// Mock messages and announcement removed — now using real data from backend

const defaultAnnouncement = {
  content: "Welcome! Please follow the group rules and be respectful.",
  author: "Admin",
  time: "",
};

export default function GroupChatRoom() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const groupId = id ? parseInt(id, 10) : NaN;
  const isValidGroup = !isNaN(groupId);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [showPinnedExpand, setShowPinnedExpand] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  // ─── Real group members from DB ────────────────────────────────────────
  const { data: membersData } = trpc.chat.getGroupMembers.useQuery(
    { groupId: groupId },
    { enabled: isValidGroup, staleTime: 60_000 }
  );
  // Map DB members to GroupMember shape
  const members: GroupMember[] = (membersData ?? []).map(m => ({
    id: String(m.id),
    name: m.name || m.username || `User ${m.id}`,
    avatar: (m.name || m.username || "U")[0].toUpperCase(),
    role: m.role as "owner" | "admin" | "member",
    status: "online" as const,
    address: m.username ?? "",
  }));
  const [announcement, setAnnouncement] = useState(defaultAnnouncement);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [editAnnouncementText, setEditAnnouncementText] = useState(defaultAnnouncement.content);
  const [memberActionTarget, setMemberActionTarget] = useState<GroupMember | null>(null);
  // Pinned message (could be loaded from backend in future)
  const [pinnedMessage] = useState<GroupMessage | null>(null);
  const announcementInputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const onlineCount = members.filter((m) => m.status === "online").length;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiPickerMsgId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    // Detect @ mention
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentionMenu(true);
      setMentionFilter(atMatch[1].toLowerCase());
      setMentionCursorPos(cursorPos);
    } else {
      setShowMentionMenu(false);
    }
  };

  const insertMention = (memberName: string) => {
    const textBeforeCursor = input.slice(0, mentionCursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const newInput = input.slice(0, atIndex) + `@${memberName} ` + input.slice(mentionCursorPos);
    setInput(newInput);
    setShowMentionMenu(false);
    inputRef.current?.focus();
  };

  const filteredMentionMembers = members.filter(
    (m) => m.name.toLowerCase().includes(mentionFilter) && m.name !== "cryptowhale.eth"
  );

  // Auth: get current user for socket
  const { user } = useAuth();

  // Socket.IO: real-time messages (replaces 3s polling)
  const { connected, joinGroup, leaveGroup, sendMessage: socketSend, onMessage } = useSocket({
    userId: user?.id,
    userName: user?.name ?? user?.username ?? "User",
  });

  // Join/leave group room on mount/unmount
  useEffect(() => {
    if (!connected || !isValidGroup) return;
    joinGroup(groupId);
    return () => { leaveGroup(groupId); };
  }, [connected, isValidGroup, groupId, joinGroup, leaveGroup]);

  // Listen for real-time messages from Socket.IO
  useEffect(() => {
    const cleanup = onMessage((msg: SocketMessage) => {
      const isMine = user ? msg.senderId === user.id : false;
      setMessages((prev) => {
        // Avoid duplicate (optimistic already added)
        if (prev.some((m) => m.id === String(msg.id))) return prev;
        return [...prev, {
          id: String(msg.id),
          sender: msg.senderName,
          senderAvatar: "👤",
          senderRole: "member" as const,
          content: msg.content,
          time: new Date(msg.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          isMine,
        }];
      });
    });
    return cleanup;
  }, [onMessage, user]);

  // tRPC: load initial messages (no polling — socket handles real-time updates)
  const { data: serverMessages } = trpc.chat.getMessages.useQuery(
    { groupId, limit: 50 },
    {
      enabled: isValidGroup,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  );

  // Merge server messages with local optimistic messages
  useEffect(() => {
    if (!serverMessages || serverMessages.length === 0) return;
    setMessages((prev) => {
      // Build a set of server message IDs (numeric)
      const serverIds = new Set(serverMessages.map((m) => String(m.id)));
      // Keep local-only optimistic messages (those with timestamp-based IDs not in server)
      const localOnly = prev.filter((m) => !serverIds.has(m.id) && isNaN(Number(m.id)) === false && Number(m.id) > 1_700_000_000_000);
      // Map server messages to GroupMessage format
      const mapped: GroupMessage[] = serverMessages.map((m) => ({
        id: String(m.id),
        sender: m.senderName ?? "Unknown",
        senderAvatar: m.senderAvatar ?? "👤",
        senderRole: "member" as const,
        content: m.content,
        time: new Date(m.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        isMine: user ? m.senderId === user.id : false,
      }));
      return [...mapped, ...localOnly];
    });
  }, [serverMessages, user]);

  // tRPC: save message to backend (non-blocking, optimistic UI)
  const saveMessage = trpc.chat.saveMessage.useMutation({
    onError: (err) => {
      // Only log, don't block UI
      console.warn("[Chat] Failed to save message:", err.message);
    },
  });

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    // Extract mentions
    const mentionMatches = input.match(/@([\w.]+)/g);
    const mentions = mentionMatches ? mentionMatches.map((m) => m.slice(1)) : undefined;

    const senderName = user?.name ?? user?.username ?? "cryptowhale.eth";
    const senderAvatar = user?.avatar ?? "🦊";

    const newMsg: GroupMessage = {
      id: Date.now().toString(),
      sender: senderName,
      senderAvatar,
      senderRole: "member",
      content: input,
      time: now,
      isMine: true,
      mentions,
      ...(replyTo ? { replyTo: { sender: replyTo.sender, content: replyTo.content.slice(0, 60) } } : {}),
    };
    // Optimistic update
    setMessages((prev) => [...prev, newMsg]);
    const msgContent = input;
    setInput("");
    setReplyTo(null);
    setShowMentionMenu(false);
    // Send via Socket.IO (real-time broadcast to all group members)
    if (isValidGroup && connected) {
      socketSend({ groupId, content: msgContent });
    } else if (isValidGroup) {
      // Fallback: persist via tRPC if socket not connected
      saveMessage.mutate({ groupId, content: msgContent });
    }
  }, [input, replyTo, groupId, isValidGroup, connected, socketSend, user]);

  const handleReaction = (msgId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      })
    );
    setEmojiPickerMsgId(null);
  };

  const getRoleBadge = (role?: string) => {
    if (role === "owner") return <Crown size={10} className="text-amber-400" />;
    if (role === "admin") return <Shield size={10} className="text-neon-cyan" />;
    return null;
  };

  const getStatusColor = (status: string) => {
    if (status === "online") return "bg-neon-green";
    if (status === "away") return "bg-amber-400";
    return "bg-muted-foreground/30";
  };

  // Highlight @mentions in message content
  const renderContent = (content: string, mentions?: string[]) => {
    if (!mentions || mentions.length === 0) return <span>{content}</span>;
    const parts: (string | React.ReactElement)[] = [];
    let remaining = content;
    let key = 0;
    mentions.forEach((mention) => {
      const idx = remaining.indexOf(`@${mention}`);
      if (idx >= 0) {
        if (idx > 0) parts.push(remaining.slice(0, idx));
        parts.push(
          <span key={key++} className="text-neon-cyan font-medium cursor-pointer hover:underline">
            @{mention}
          </span>
        );
        remaining = remaining.slice(idx + mention.length + 1);
      }
    });
    if (remaining) parts.push(remaining);
    return <>{parts}</>;
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b border-border/30">
        <div className="flex items-center gap-3 px-3 h-14">
          <button
            onClick={() => setLocation("/app/chat")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20 flex items-center justify-center text-lg">
            🚀
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold font-display truncate">DeFi Alpha Hunters</h2>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users size={10} />
              {members.length} {t("group.members")} · {onlineCount} {t("group.online")}
            </p>
          </div>
          <button
            onClick={() => setShowSidebar(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors relative"
          >
            <Users size={18} className="text-muted-foreground" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neon-green text-[8px] text-background font-bold flex items-center justify-center">
              {onlineCount}
            </span>
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors">
            <MoreVertical size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Pinned message bar */}
      <AnimatePresence>
        {showAnnouncement && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className="flex items-center gap-2 px-3 py-2 bg-neon-cyan/5 border-b border-neon-cyan/10 cursor-pointer hover:bg-neon-cyan/10 transition-colors"
              onClick={() => setShowPinnedExpand(!showPinnedExpand)}
            >
              <Pin size={14} className="text-neon-cyan shrink-0 rotate-45" />
              <p className={`text-xs text-foreground flex-1 ${showPinnedExpand ? "" : "truncate"}`}>
                {pinnedMessage?.content}
              </p>
              <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${showPinnedExpand ? "rotate-180" : ""}`} />
            </div>
            {showPinnedExpand && (
              <div className="px-3 py-2 bg-neon-cyan/5 border-b border-neon-cyan/10">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Crown size={10} className="text-amber-400" />
                  <span>{pinnedMessage?.sender}</span>
                  <span>·</span>
                  <span>{pinnedMessage?.time}</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcement banner */}
      <div className="px-3 py-2 bg-gradient-to-r from-neon-purple/5 to-neon-cyan/5 border-b border-border/20">
        <div className="flex items-start gap-2">
          <Megaphone size={14} className="text-neon-purple shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
                <p className="text-[11px] text-foreground leading-relaxed line-clamp-2">{announcement.content}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{announcement.author} · {announcement.time}</p>
          </div>
          <button
            onClick={() => setShowAnnouncement(false)}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-secondary/60 transition-colors shrink-0"
          >
            <X size={12} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.isMine ? "justify-end" : "justify-start"} group relative`}
            >
              <div className={`flex gap-2 max-w-[85%] ${msg.isMine ? "flex-row-reverse" : ""}`}>
                {!msg.isMine && (
                  <Avatar className={`w-7 h-7 shrink-0 mt-1 ${msg.isAI ? "ring-1 ring-neon-purple/50" : ""}`}>
                    <AvatarFallback className="bg-secondary text-xs">
                      {msg.senderAvatar}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="relative">
                  {/* Sender name with role badge */}
                  {!msg.isMine && (
                    <div className="flex items-center gap-1 mb-0.5 px-1">
                      {getRoleBadge(msg.senderRole)}
                      <span className={`text-[11px] font-medium ${
                        msg.senderRole === "owner" ? "text-amber-400" :
                        msg.senderRole === "admin" ? "text-neon-cyan" :
                        "text-muted-foreground"
                      }`}>
                        {msg.sender}
                      </span>
                    </div>
                  )}

                  {/* Reply reference */}
                  {msg.replyTo && (
                    <div className={`flex items-center gap-1.5 mb-1 px-3 py-1.5 rounded-lg bg-secondary/30 border-l-2 border-neon-cyan/40 text-[11px] text-muted-foreground ${msg.isMine ? "ml-auto" : ""}`}>
                      <Reply size={10} className="shrink-0 text-neon-cyan" />
                      <span className="text-neon-cyan font-medium">{msg.replyTo.sender}</span>
                      <span className="truncate">{msg.replyTo.content}</span>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.isMine
                        ? "bg-neon-cyan/15 text-foreground rounded-br-md border border-neon-cyan/20"
                        : msg.isAI
                        ? "bg-neon-purple/10 text-foreground rounded-bl-md border border-neon-purple/20"
                        : "bg-secondary/60 text-foreground rounded-bl-md border border-border/20"
                    }`}
                  >
                    {msg.isAI && (
                      <div className="flex items-center gap-1 mb-1.5 text-[10px] text-neon-purple font-mono">
                        <Bot size={12} />
                        NexusBot AI
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">
                      {renderContent(msg.content, msg.mentions)}
                    </div>
                  </div>

                  {/* Action buttons (visible on hover) */}
                  <div className={`absolute top-0 ${msg.isMine ? "-left-16" : "-right-16"} hidden group-hover:flex items-center gap-0.5 z-10`}>
                    <button
                      onClick={() => setReplyTo(msg)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Reply size={13} />
                    </button>
                    <button
                      onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Smile size={13} />
                    </button>
                  </div>

                  {/* Emoji picker popup */}
                  {emojiPickerMsgId === msg.id && (
                    <div
                      ref={emojiRef}
                      className={`absolute z-20 ${msg.isMine ? "right-0" : "left-0"} -top-12 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-popover [backdrop-filter:none] border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-150`}
                    >
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-lg hover:scale-125 transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Reactions + time */}
                  <div className={`flex items-center gap-1 mt-1 flex-wrap ${msg.isMine ? "justify-end" : ""}`}>
                    <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                    {msg.reactions && Object.entries(msg.reactions).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-secondary/50 hover:bg-secondary/80 transition-colors text-xs"
                      >
                        <span>{emoji}</span>
                        <span className="text-[10px] text-muted-foreground">{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="glass border-t border-border/30 px-3 py-2 pb-[env(safe-area-inset-bottom)]">
        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-secondary/30 border-l-2 border-neon-cyan/40">
            <Reply size={14} className="text-neon-cyan shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-neon-cyan font-medium">{replyTo.sender}</p>
              <p className="text-[11px] text-muted-foreground truncate">{replyTo.content}</p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-secondary/60 transition-colors"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
        )}

        {/* @Mention dropdown */}
        <AnimatePresence>
          {showMentionMenu && filteredMentionMembers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 rounded-xl bg-popover [backdrop-filter:none] border border-border shadow-2xl overflow-hidden max-h-48 overflow-y-auto"
            >
              <div className="px-3 py-1.5 border-b border-border/30">
                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <AtSign size={10} />
                  {t("group.mentionMember")}
                </p>
              </div>
              {filteredMentionMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => insertMention(member.name)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-secondary text-xs">{member.avatar}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-popover ${getStatusColor(member.status)}`} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1">
                      {getRoleBadge(member.role)}
                      <span className="text-xs font-medium truncate">{member.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{member.address}</span>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-1.5">
          <button
            onClick={() => {
              setInput((prev) => prev + "@");
              setShowMentionMenu(true);
              setMentionFilter("");
              inputRef.current?.focus();
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors shrink-0 text-muted-foreground"
          >
            <AtSign size={18} />
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !showMentionMenu) handleSend();
              }}
              placeholder={t("group.inputPlaceholder")}
              className="w-full h-10 px-4 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
            />
          </div>
          {input.trim() ? (
            <button
              onClick={handleSend}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-all shrink-0"
            >
              <Send size={18} />
            </button>
          ) : (
            <button
              onClick={() => {
                const voiceMsg: GroupMessage = { id: `vm-${Date.now()}`, sender: "You", senderAvatar: "Y", content: "🎤 Voice message (0:03)", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), isMine: true };
                setMessages(prev => [...prev, voiceMsg]);
                toast.success(t("group.voiceSent") || "Voice message sent");
              }}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 transition-all shrink-0"
            >
              <Mic size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Members Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 [backdrop-filter:none]"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-card border-l border-border overflow-y-auto"
            >
              {/* Sidebar Header */}
              <div className="sticky top-0 z-10 glass border-b border-border/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-sm">{t("group.groupInfo")}</h3>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Group Info Card */}
              <div className="p-4 border-b border-border/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20 flex items-center justify-center text-2xl">
                    🚀
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-base">DeFi Alpha Hunters</h4>
                    <p className="text-xs text-muted-foreground">{members.length} {t("group.members")}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A private group for DeFi alpha hunters. Share research, discuss strategies, and find the next big opportunity.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
                    🔒 Token Gated
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/20">
                    ≥0.1 ETH
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-3 border-b border-border/20 grid grid-cols-4 gap-1">
                {[
                  { icon: Search, label: t("group.search"), action: () => { const q = prompt(t("group.searchPlaceholder") || "Search messages..."); if (q) { const found = messages.filter(m => m.content.toLowerCase().includes(q.toLowerCase())); toast.info(`${found.length} ${t("group.messagesFound") || "messages found"}`); } } },
                  { icon: isMuted ? BellOff : Bell, label: isMuted ? t("group.unmute") : t("group.mute"), action: () => { setIsMuted(!isMuted); toast.success(isMuted ? "Notifications enabled" : "Group muted"); } },
                  { icon: UserPlus, label: t("group.invite"), action: () => { navigator.clipboard.writeText(`https://nexuschat.app/group/invite/${id || "g1"}`); toast.success(t("group.inviteCopied") || "Invite link copied!"); } },
                  { icon: Settings, label: t("group.settings"), action: () => toast.info(t("group.settingsInfo") || "Group settings: Token-gated · Min 0.1 ETH · 128 members max") },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-secondary/40 transition-colors"
                    >
                      <Icon size={16} className="text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Announcement Edit Section (Owner only) */}
              <div className="p-3 border-b border-border/20">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Megaphone size={12} />
                    Group Announcement
                  </h5>
                  <button
                    onClick={() => {
                      setIsEditingAnnouncement(true);
                      setEditAnnouncementText(announcement.content);
                      setTimeout(() => announcementInputRef.current?.focus(), 100);
                    }}
                    className="text-[10px] text-neon-cyan hover:underline flex items-center gap-0.5"
                  >
                    <Settings size={10} />
                    Edit
                  </button>
                </div>
                {isEditingAnnouncement ? (
                  <div className="space-y-2">
                    <textarea
                      ref={announcementInputRef}
                      value={editAnnouncementText}
                      onChange={(e) => setEditAnnouncementText(e.target.value)}
                      className="w-full h-24 px-3 py-2 rounded-xl bg-secondary/40 border border-border/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 resize-none"
                      placeholder="Write group announcement..."
                      maxLength={300}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{editAnnouncementText.length}/300</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditingAnnouncement(false)}
                          className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (editAnnouncementText.trim()) {
                              setAnnouncement({ content: editAnnouncementText, author: "cryptowhale.eth", time: "Just now" });
                              setIsEditingAnnouncement(false);
                              setShowAnnouncement(true);
                              toast.success("Announcement updated!");
                            }
                          }}
                          className="px-3 py-1 rounded-lg text-xs bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{announcement.content}</p>
                )}
              </div>

              {/* Members List */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-medium text-muted-foreground">{t("group.members")} ({members.length})</h5>
                  <span className="text-[10px] text-neon-green">{onlineCount} {t("group.online")}</span>
                </div>

                {/* Online members first, then offline */}
                {["online", "away", "offline"].map((status) => {
                  const statusMembers = members.filter((m) => m.status === status);
                  if (statusMembers.length === 0) return null;
                  return (
                    <div key={status} className="mb-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                        {status === "online" ? `${t("group.online")} — ${statusMembers.length}` :
                         status === "away" ? `${t("group.away")} — ${statusMembers.length}` :
                         `${t("group.offline")} — ${statusMembers.length}`}
                      </p>
                      {statusMembers.map((member) => (
                        <button
                          key={member.id}
                          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-secondary/40 transition-colors"
                          onClick={() => setMemberActionTarget(member)}
                        >
                          <div className="relative">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-secondary text-xs">{member.avatar}</AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${getStatusColor(member.status)}`} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-1">
                              {getRoleBadge(member.role)}
                              <span className="text-xs font-medium truncate">{member.name}</span>
                              {member.role === "owner" && (
                                <span className="text-[8px] px-1 py-0 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">Owner</span>
                              )}
                              {member.role === "admin" && (
                                <span className="text-[8px] px-1 py-0 rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">Admin</span>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">{member.address}</span>
                          </div>
                          <ChevronRight size={14} className="text-muted-foreground/50 shrink-0" />
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Leave Group */}

              {/* Member Action Menu */}
              <AnimatePresence>
                {memberActionTarget && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-black/60 [backdrop-filter:none] flex items-end"
                    onClick={() => setMemberActionTarget(null)}
                  >
                    <motion.div
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 28, stiffness: 300 }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-card border-t border-border/30 rounded-t-3xl p-4 space-y-2"
                    >
                      {/* Member Info */}
                      <div className="flex items-center gap-3 pb-3 border-b border-border/20">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-secondary text-lg">{memberActionTarget.avatar}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            {getRoleBadge(memberActionTarget.role)}
                            <span className="font-semibold font-display text-sm">{memberActionTarget.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{memberActionTarget.address}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{memberActionTarget.role} · {memberActionTarget.status}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      {memberActionTarget.role !== "owner" && (
                        <>
                          <button
                            onClick={() => {
                              toast.success(memberActionTarget.role === "admin"
                                ? `${memberActionTarget.name} removed from admin`
                                : `${memberActionTarget.name} promoted to admin`);
                              setMemberActionTarget(null);
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
                          >
                            <Shield size={18} className="text-neon-cyan" />
                            <div className="text-left">
                              <p className="text-sm font-medium">
                                {memberActionTarget.role === "admin" ? "Remove Admin" : "Set as Admin"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {memberActionTarget.role === "admin" ? "Revoke admin privileges" : "Grant admin privileges"}
                              </p>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              toast.success(`${memberActionTarget.name} removed from group`);
                              setMemberActionTarget(null);
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-neon-red/5 hover:bg-neon-red/10 transition-colors"
                          >
                            <LogOut size={18} className="text-neon-red" />
                            <div className="text-left">
                              <p className="text-sm font-medium text-neon-red">Remove from Group</p>
                              <p className="text-xs text-muted-foreground">Kick this member out</p>
                            </div>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setInput(`@${memberActionTarget.name} `);
                          setMemberActionTarget(null);
                          setShowSidebar(false);
                          inputRef.current?.focus();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors"
                      >
                        <AtSign size={18} className="text-neon-purple" />
                        <div className="text-left">
                          <p className="text-sm font-medium">Mention in Chat</p>
                          <p className="text-xs text-muted-foreground">Send a message mentioning this member</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setMemberActionTarget(null)}
                        className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Leave Group */}
              <div className="p-3 border-t border-border/20">
                <button
                  onClick={() => { if (confirm(t("group.leaveConfirm") || "Are you sure you want to leave this group?")) { toast.success(t("group.leftGroup") || "Left group"); setLocation("/app/chat"); } }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-neon-red hover:bg-neon-red/10 transition-colors text-sm"
                >
                  <LogOut size={16} />
                  {t("group.leaveGroup")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
