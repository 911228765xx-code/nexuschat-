/**
 * DMChat — 私信聊天页面
 * 接入 chat.getDMHistory + chat.sendDM tRPC 接口
 * Socket.IO 实时推送（通过 emitToUser）
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Send, Lock, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { io, Socket } from "socket.io-client";
import { LinkifiedText } from "@/lib/linkify";

interface DMMessage {
  id: string;
  content: string;
  senderId: number;
  senderName: string | null;
  senderAvatar: string | null;
  createdAt: Date;
  isMine: boolean;
}

export default function DMChat() {
  const { userId: userIdStr } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useI18n();
  const otherUserId = parseInt(userIdStr ?? "0", 10);

  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<DMMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Pagination state
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 30;

  // tRPC: fetch DM history (poll every 15s as fallback)
  const { data: history, refetch } = trpc.chat.getDMHistory.useQuery(
    { otherUserId, limit: PAGE_SIZE },
    {
      enabled: otherUserId > 0,
      refetchInterval: 15_000,
      staleTime: 5_000,
    }
  );

  // tRPC: get partner user info directly by userId
  const { data: partnerInfo } = trpc.chat.getUserInfo.useQuery(
    { userId: otherUserId },
    { enabled: otherUserId > 0, staleTime: 60_000 }
  );
  const partnerName = partnerInfo?.name ?? partnerInfo?.username ?? `User #${otherUserId}`;
  const partnerAvatar = partnerInfo?.avatar;

  // tRPC: send DM mutation
  const utils = trpc.useUtils();
  const sendDM = trpc.chat.sendDM.useMutation({
    onSuccess: () => {
      utils.chat.getDMHistory.invalidate({ otherUserId });
      utils.chat.listDMConversations.invalidate();
    },
    onError: (err) => {
      toast.error(`发送失败: ${err.message}`);
    },
  });

  // Load older DM messages on demand
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || isLoadingMore || otherUserId <= 0) return;
    const numericIds = localMessages
      .map(m => Number(m.id))
      .filter(n => !isNaN(n) && n < 1_700_000_000_000);
    if (numericIds.length === 0) return;
    const oldestId = Math.min(...numericIds);
    setIsLoadingMore(true);
    const container = scrollRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    try {
      const older = await utils.chat.getDMHistory.fetch({ otherUserId, limit: PAGE_SIZE, before: oldestId });
      if (!older || older.length === 0) { setHasMore(false); return; }
      if (older.length < PAGE_SIZE) setHasMore(false);
      const myId = user?.id ?? 0;
      const mapped: DMMessage[] = older.map(m => ({
        id: String(m.id),
        content: m.content,
        senderId: m.senderId,
        senderName: m.senderName ?? null,
        senderAvatar: m.senderAvatar ?? null,
        createdAt: new Date(m.createdAt),
        isMine: m.senderId === myId,
      }));
      setLocalMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newOnes = mapped.filter(m => !existingIds.has(m.id));
        return [...newOnes, ...prev];
      });
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - prevScrollHeight;
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, otherUserId, localMessages, user?.id, utils, PAGE_SIZE]);

  // Merge server history + local optimistic messages
  useEffect(() => {
    if (!history) return;
    if (history.length < PAGE_SIZE) setHasMore(false);
    const myId = user?.id ?? 0;
    const mapped: DMMessage[] = history.map(m => ({
      id: String(m.id),
      content: m.content,
      senderId: m.senderId,
      senderName: m.senderName ?? null,
      senderAvatar: m.senderAvatar ?? null,
      createdAt: new Date(m.createdAt),
      isMine: m.senderId === myId,
    }));
    setLocalMessages(mapped);
  }, [history, user?.id]);

  // Socket.IO: listen for incoming DMs
  useEffect(() => {
    if (!user?.id) return;
    const myUserId = user.id;
    const socket = io(window.location.origin, {
      path: "/api/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    // Register user ID so server can route dm_message events via emitToUser
    socket.on("connect", () => {
      socket.emit("register_user", myUserId);
    });
    socket.on("dm_message", (data: { senderId: number; content: string; messageId: number; senderName: string }) => {
      if (data.senderId !== otherUserId) return;
      const newMsg: DMMessage = {
        id: String(data.messageId),
        content: data.content,
        senderId: data.senderId,
        senderName: data.senderName,
        senderAvatar: null,
        createdAt: new Date(),
        isMine: false,
      };
      setLocalMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    return () => { socket.disconnect(); };
  }, [user?.id, otherUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [localMessages]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const myId = user?.id ?? 0;
    const tempId = `temp-${Date.now()}`;
    const optimistic: DMMessage = {
      id: tempId,
      content: input.trim(),
      senderId: myId,
      senderName: user?.name ?? null,
      senderAvatar: null,
      createdAt: new Date(),
      isMine: true,
    };
    setLocalMessages(prev => [...prev, optimistic]);
    const content = input.trim();
    setInput("");
    sendDM.mutate({ receiverId: otherUserId, content });
  }, [input, user, otherUserId, sendDM]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-3 h-14">
          <button
            onClick={() => setLocation("/app/chat")}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <Avatar className="w-9 h-9">
            {partnerAvatar ? (
              <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover rounded-full" />
            ) : (
              <AvatarFallback className="bg-neon-cyan/20 text-neon-cyan font-display text-sm">
                {partnerName.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{partnerName}</p>
            <p className="text-sm text-neon-cyan font-mono flex items-center gap-2">
              <Lock size={8} /> E2E 加密
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Load more older messages */}
        {hasMore && localMessages.length > 0 && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="text-sm text-muted-foreground hover:text-foreground px-4 py-1.5 rounded-full border border-border/40 hover:border-border/80 transition-colors disabled:opacity-50 flex items-center gap-2.5"
            >
              {isLoadingMore ? (
                <>
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  加载中...
                </>
              ) : "加载更多消息"}
            </button>
          </div>
        )}
        {localMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 flex items-center justify-center">
              <Lock size={24} className="text-neon-cyan" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">开始加密对话</p>
            <p className="text-sm text-muted-foreground/60">消息端对端加密，仅双方可见</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {localMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-end gap-2 ${msg.isMine ? "flex-row-reverse" : "flex-row"}`}
            >
              {!msg.isMine && (
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarFallback className="bg-secondary text-foreground text-xs font-display">
                    {(msg.senderName ?? partnerName).slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[72%] ${msg.isMine ? "items-end" : "items-start"} flex flex-col gap-2`}>
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                    msg.isMine
                      ? "bg-neon-cyan/20 text-foreground rounded-br-sm border border-neon-cyan/20"
                      : "bg-secondary/60 text-foreground rounded-bl-sm border border-border/20"
                  } ${msg.id.startsWith("temp-") ? "opacity-70" : ""}`}
                >
                  <LinkifiedText text={msg.content} />
                </div>
                <span className="text-sm text-muted-foreground/50 px-2">
                  {new Date(msg.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  {msg.id.startsWith("temp-") && " · 发送中..."}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="glass border-t border-border/30 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="发送加密消息..."
              rows={1}
              className="w-full px-4 py-2.5 rounded-2xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all resize-none"
              style={{ maxHeight: "120px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendDM.isPending}
            className="w-10 h-10 rounded-xl bg-neon-cyan/20 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan hover:bg-neon-cyan/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sendDM.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
