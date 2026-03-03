/*
 * GroupChatRoom — 群聊聊天室页面
 * 新功能：表情反应持久化、邀请链接弹窗、文件上传、已读回执、群管理后台（踢人/禁言/转让群主）
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatChatTimestamp } from "@/lib/timeFormat";
import { useParams, useLocation } from "wouter";
import { useSocket, SocketMessage } from "@/hooks/useSocket";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft, Send, Smile, MoreVertical, X, Reply, Users,
  Megaphone, ChevronRight, Shield, Crown, Hash, AtSign,
  Pin, Settings, Bell, BellOff, LogOut, UserPlus, Search,
  Image as ImageIcon, Gift, Mic, Bot,
  ChevronDown, Link2, File, Download, CheckCheck, Copy,
  UserMinus, VolumeX, Volume2, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";
import VoiceRecorder from "@/components/VoiceRecorder";

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
  reactions?: Record<string, { count: number; mine: boolean }>;
  replyTo?: { sender: string; content: string };
  mentions?: string[];
  isPinned?: boolean;
  pending?: boolean;
  messageType?: "text" | "image" | "file";
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
}

const EMOJI_LIST = ["👍", "❤️", "🔥", "🚀", "😂", "😮", "🎉", "💎"];

const defaultAnnouncement = {
  content: "Welcome! Please follow the group rules and be respectful.",
  author: "Admin",
  time: "",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  // ─── Invite link modal ────────────────────────────────────────────────────
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  // ─── File upload ──────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  // ─── Real group info from DB ──────────────────────────────────────────
  const { data: groupInfo } = trpc.chat.getGroupInfo.useQuery(
    { groupId: groupId },
    { enabled: isValidGroup, staleTime: 60_000 }
  );
  // ─── Real group members from DB ────────────────────────────────────────
  const { data: membersData, refetch: refetchMembers } = trpc.chat.getGroupMembers.useQuery(
    { groupId: groupId },
    { enabled: isValidGroup, staleTime: 60_000 }
  );
  const members: GroupMember[] = (membersData ?? []).map(m => ({
    id: String(m.id),
    name: m.name || m.username || `User ${m.id}`,
    // Preserve full avatar URL if it's a URL, otherwise use first letter
    avatar: m.avatar ?? (m.name || m.username || "U")[0].toUpperCase(),
    role: m.role as "owner" | "admin" | "member",
    status: "online" as const,
    address: m.username ?? "",
  }));
  const [announcement, setAnnouncement] = useState(defaultAnnouncement);
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [editAnnouncementText, setEditAnnouncementText] = useState(defaultAnnouncement.content);
  const [memberActionTarget, setMemberActionTarget] = useState<GroupMember | null>(null);
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
    (m) => m.name.toLowerCase().includes(mentionFilter)
  );

  const { user } = useAuth();

  // ─── Current user's role in this group ────────────────────────────────────
  const myMember = members.find(m => m.id === String(user?.id));
  const isAdminOrOwner = myMember?.role === "owner" || myMember?.role === "admin";

  const { connected, joinGroup, leaveGroup, sendMessage: socketSend, onMessage } = useSocket({
    userId: user?.id,
    userName: user?.name ?? user?.username ?? "User",
  });

  useEffect(() => {
    if (!connected || !isValidGroup) return;
    joinGroup(groupId);
    return () => { leaveGroup(groupId); };
  }, [connected, isValidGroup, groupId, joinGroup, leaveGroup]);

  useEffect(() => {
    const cleanup = onMessage((msg: SocketMessage) => {
      const isMine = user ? msg.senderId === user.id : false;
      setMessages((prev) => {
        if (prev.some((m) => m.id === String(msg.id))) return prev;
        if (isMine) {
          const pendingIdx = [...prev].reverse().findIndex(
            (m) => m.pending === true && m.content === msg.content
          );
          if (pendingIdx !== -1) {
            const realIdx = prev.length - 1 - pendingIdx;
            const updated = [...prev];
            updated[realIdx] = { ...updated[realIdx], id: String(msg.id), pending: undefined };
            return updated;
          }
        }
        return [...prev, {
          id: String(msg.id),
          sender: msg.senderName,
          senderAvatar: msg.senderAvatar ?? "👤",
          senderRole: "member" as const,
          content: msg.content,
          time: new Date(msg.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          isMine,
          messageType: (msg.messageType as "text" | "image" | "file") ?? "text",
          mediaUrl: msg.mediaUrl ?? undefined,
        }];
      });
    });
    return cleanup;
  }, [onMessage, user]);

  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 30;

  const { data: serverMessages } = trpc.chat.getMessages.useQuery(
    { groupId, limit: PAGE_SIZE },
    { enabled: isValidGroup, staleTime: 30_000, refetchOnWindowFocus: false }
  );

  const utils = trpc.useUtils();

  const loadMoreMessages = useCallback(async () => {
    if (!isValidGroup || isLoadingMore || !hasMore) return;
    const numericIds = messages.map(m => Number(m.id)).filter(n => !isNaN(n) && n < 1_700_000_000_000);
    if (numericIds.length === 0) return;
    const oldestId = Math.min(...numericIds);
    setIsLoadingMore(true);
    const container = scrollRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    try {
      const older = await utils.chat.getMessages.fetch({ groupId, limit: PAGE_SIZE, before: oldestId });
      if (!older || older.length === 0) { setHasMore(false); return; }
      if (older.length < PAGE_SIZE) setHasMore(false);
      const mapped: GroupMessage[] = older.map((m) => ({
        id: String(m.id),
        sender: m.senderName ?? "Unknown",
        senderAvatar: m.senderAvatar ?? "👤",
        senderRole: "member" as const,
        content: m.content,
        time: formatChatTimestamp(new Date(m.createdAt)),
        isMine: user ? m.senderId === user.id : false,
        messageType: (m.messageType as "text" | "image" | "file") ?? "text",
        mediaUrl: m.mediaUrl ?? undefined,
      }));
      setMessages(prev => {
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
  }, [isValidGroup, isLoadingMore, hasMore, messages, groupId, user, utils]);

  useEffect(() => {
    if (!serverMessages || serverMessages.length === 0) return;
    if (serverMessages.length < PAGE_SIZE) setHasMore(false);
    setMessages((prev) => {
      const serverIds = new Set(serverMessages.map((m) => String(m.id)));
      const localOnly = prev.filter((m) => !serverIds.has(m.id) && !isNaN(Number(m.id)) && Number(m.id) > 1_700_000_000_000);
      const mapped: GroupMessage[] = serverMessages.map((m) => ({
        id: String(m.id),
        sender: m.senderName ?? "Unknown",
        senderAvatar: m.senderAvatar ?? "👤",
        senderRole: "member" as const,
        content: m.content,
        time: formatChatTimestamp(new Date(m.createdAt)),
        isMine: user ? m.senderId === user.id : false,
        messageType: (m.messageType as "text" | "image" | "file") ?? "text",
        mediaUrl: m.mediaUrl ?? undefined,
      }));
      return [...mapped, ...localOnly];
    });
  }, [serverMessages, user]);

  // ─── Mark group as read ────────────────────────────────────────────────────
  const markGroupReadMutation = trpc.chat.markGroupRead.useMutation();
  useEffect(() => {
    if (!isValidGroup || !serverMessages || serverMessages.length === 0) return;
    const lastMsg = serverMessages[serverMessages.length - 1];
    if (lastMsg) markGroupReadMutation.mutate({ groupId, lastMessageId: Number(lastMsg.id) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidGroup, groupId, serverMessages?.length]);

  // ─── Mark messages read (read receipts) ───────────────────────────────────
  const markMessagesReadMutation = trpc.chat.markMessagesRead.useMutation();
  useEffect(() => {
    if (!serverMessages || serverMessages.length === 0) return;
    const ids = serverMessages.map(m => Number(m.id)).filter(Boolean);
    if (ids.length > 0) markMessagesReadMutation.mutate({ groupId, messageIds: ids });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverMessages?.length, groupId]);

  // ─── Fetch reactions for visible messages ─────────────────────────────────
  const visibleMsgIds = useMemo(() => {
    return messages.map(m => Number(m.id)).filter(n => !isNaN(n) && n < 1_700_000_000_000);
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: reactionsData } = trpc.chat.getReactions.useQuery(
    { messageIds: visibleMsgIds },
    { enabled: visibleMsgIds.length > 0, staleTime: 10_000 }
  );

  // ─── Fetch read counts for visible messages ────────────────────────────────
  const { data: readCountsData } = trpc.chat.getReadCounts.useQuery(
    { messageIds: visibleMsgIds },
    { enabled: visibleMsgIds.length > 0, staleTime: 15_000 }
  );

  // ─── Toggle reaction (persisted) ──────────────────────────────────────────
  const toggleReactionMutation = trpc.chat.toggleReaction.useMutation({
    onSuccess: () => { utils.chat.getReactions.invalidate(); }
  });

  const handleReaction = (msgId: string, emoji: string) => {
    const numericId = Number(msgId);
    if (isNaN(numericId) || numericId > 1_700_000_000_000) {
      toast.error("Cannot react to pending messages");
      return;
    }
    toggleReactionMutation.mutate({ messageId: numericId, emoji });
    setEmojiPickerMsgId(null);
  };

  // ─── Save message ──────────────────────────────────────────────────────────
  const saveMessage = trpc.chat.saveMessage.useMutation({
    onError: (err) => console.warn("[Chat] Failed to save message:", err.message),
  });

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    const mentionMatches = input.match(/@([\w.]+)/g);
    const mentions = mentionMatches ? mentionMatches.map((m) => m.slice(1)) : undefined;
    const senderName = user?.name ?? user?.username ?? "User";
    const senderAvatar = user?.avatar ?? "🦊";
    const newMsg: GroupMessage = {
      id: Date.now().toString(),
      sender: senderName,
      senderAvatar,
      senderRole: "member",
      content: input,
      time: now,
      isMine: true,
      pending: true,
      mentions,
      ...(replyTo ? { replyTo: { sender: replyTo.sender, content: replyTo.content.slice(0, 60) } } : {}),
    };
    setMessages((prev) => [...prev, newMsg]);
    const msgContent = input;
    setInput("");
    setReplyTo(null);
    setShowMentionMenu(false);
    if (isValidGroup && connected) {
      socketSend({ groupId, content: msgContent });
    } else if (isValidGroup) {
      saveMessage.mutate({ groupId, content: msgContent });
    }
  }, [input, replyTo, groupId, isValidGroup, connected, socketSend, user]);

  // ─── File upload ──────────────────────────────────────────────────────────
  const uploadImageMutation = trpc.chat.uploadChatImage.useMutation();
  const saveGroupFileMutation = trpc.chat.saveGroupFile.useMutation();

  const handleFileUpload = async (file: File) => {
    if (file.size > 16 * 1024 * 1024) { toast.error("File too large (max 16MB)"); return; }
    setIsUploading(true);
    try {
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        if (isImage) {
          const result = await uploadImageMutation.mutateAsync({ base64, mimeType: file.type });
          const newMsg: GroupMessage = {
            id: Date.now().toString(),
            sender: user?.name ?? "User",
            senderAvatar: user?.avatar ?? "🦊",
            senderRole: "member",
            content: `[Image: ${file.name}]`,
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            isMine: true,
            messageType: "image",
            mediaUrl: result.url,
          };
          setMessages(prev => [...prev, newMsg]);
          if (isValidGroup && connected) socketSend({ groupId, content: `[Image: ${file.name}]`, mediaUrl: result.url, messageType: "image" });
        } else {
          // Non-image file: upload via image endpoint with generic content type
          const result = await uploadImageMutation.mutateAsync({ base64, mimeType: file.type });
          await saveGroupFileMutation.mutateAsync({ groupId, fileName: file.name, fileSize: file.size, mimeType: file.type, fileKey: result.url, url: result.url });
          const newMsg: GroupMessage = {
            id: Date.now().toString(),
            sender: user?.name ?? "User",
            senderAvatar: user?.avatar ?? "🦊",
            senderRole: "member",
            content: `[File: ${file.name}]`,
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            isMine: true,
            messageType: "file",
            mediaUrl: result.url,
            fileName: file.name,
            fileSize: file.size,
          };
          setMessages(prev => [...prev, newMsg]);
          if (isValidGroup && connected) socketSend({ groupId, content: `[File: ${file.name}]`, mediaUrl: result.url, messageType: "file" });
        }
        toast.success(isImage ? "Image sent!" : "File sent!");
      };
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Invite link ──────────────────────────────────────────────────────────
  const createInviteLinkMutation = trpc.chat.createInviteLink.useMutation({
    onSuccess: (data) => {
      const url = `${window.location.origin}/invite/${data.token}`;
      setInviteUrl(url);
      setShowInviteModal(true);
    },
    onError: () => toast.error("Failed to create invite link"),
  });

  // ─── Group management mutations ────────────────────────────────────────────
  const kickMemberMutation = trpc.chat.kickMember.useMutation({
    onSuccess: () => { toast.success("Member removed"); setMemberActionTarget(null); refetchMembers(); },
    onError: (e) => toast.error(e.message),
  });
  const muteMemberMutation = trpc.chat.muteMember.useMutation({
    onSuccess: () => { toast.success("Member muted for 24h"); setMemberActionTarget(null); },
    onError: (e) => toast.error(e.message),
  });
  const unmuteMemberMutation = trpc.chat.unmuteMember.useMutation({
    onSuccess: () => { toast.success("Member unmuted"); setMemberActionTarget(null); },
    onError: (e) => toast.error(e.message),
  });
  const transferOwnershipMutation = trpc.chat.transferOwnership.useMutation({
    onSuccess: () => { toast.success("Ownership transferred"); setMemberActionTarget(null); refetchMembers(); },
    onError: (e) => toast.error(e.message),
  });

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

  const renderContent = (content: string, mentions?: string[]) => {
    if (!mentions || mentions.length === 0) return <span>{content}</span>;
    const parts: (string | React.ReactElement)[] = [];
    let remaining = content;
    let key = 0;
    mentions.forEach((mention) => {
      const idx = remaining.indexOf(`@${mention}`);
      if (idx >= 0) {
        if (idx > 0) parts.push(remaining.slice(0, idx));
        parts.push(<span key={key++} className="text-neon-cyan font-medium cursor-pointer hover:underline">@{mention}</span>);
        remaining = remaining.slice(idx + mention.length + 1);
      }
    });
    if (remaining) parts.push(remaining);
    return <>{parts}</>;
  };

  // ─── Render message bubble content based on type ──────────────────────────
  const renderMessageContent = (msg: GroupMessage) => {
    if (msg.messageType === "image" && msg.mediaUrl) {
      return (
        <div className="mt-1">
          <img src={msg.mediaUrl} alt="Image" className="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer" onClick={() => window.open(msg.mediaUrl, "_blank")} />
        </div>
      );
    }
    if (msg.messageType === "file" && msg.mediaUrl) {
      return (
        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors max-w-[220px]">
          <File size={18} className="text-neon-cyan shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{msg.fileName ?? "File"}</p>
            {msg.fileSize && <p className="text-[10px] text-muted-foreground">{formatFileSize(msg.fileSize)}</p>}
          </div>
          <Download size={14} className="text-muted-foreground shrink-0" />
        </a>
      );
    }
    return <div className="whitespace-pre-wrap">{renderContent(msg.content, msg.mentions)}</div>;
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b border-border/30">
        <div className="flex items-center gap-3 px-3 h-14">
          <button onClick={() => setLocation("/app/chat")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20 flex items-center justify-center text-lg overflow-hidden">
            {groupInfo?.avatar?.startsWith("http") ? (
              <img src={groupInfo.avatar} alt={groupInfo.name ?? "Group"} className="w-full h-full object-cover" />
            ) : (
              <span>{groupInfo?.avatar ?? "🚀"}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold font-display truncate">{groupInfo?.name ?? "Group Chat"}</h2>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users size={10} />
              {members.length} {t("group.members")} · {onlineCount} {t("group.online")}
            </p>
          </div>
          <button onClick={() => setShowSidebar(true)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors relative">
            <Users size={18} className="text-muted-foreground" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neon-green text-[8px] text-background font-bold flex items-center justify-center">{onlineCount}</span>
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors">
            <MoreVertical size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Pinned message bar */}
      <AnimatePresence>
        {showAnnouncement && pinnedMessage && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-neon-cyan/5 border-b border-neon-cyan/10 cursor-pointer hover:bg-neon-cyan/10 transition-colors" onClick={() => setShowPinnedExpand(!showPinnedExpand)}>
              <Pin size={14} className="text-neon-cyan shrink-0 rotate-45" />
              <p className={`text-xs text-foreground flex-1 ${showPinnedExpand ? "" : "truncate"}`}>{pinnedMessage?.content}</p>
              <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${showPinnedExpand ? "rotate-180" : ""}`} />
            </div>
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
          <button onClick={() => setShowAnnouncement(false)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-secondary/60 transition-colors shrink-0">
            <X size={12} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {hasMore && (
          <div className="flex justify-center py-2">
            <button onClick={loadMoreMessages} disabled={isLoadingMore} className="text-xs text-muted-foreground hover:text-foreground px-4 py-1.5 rounded-full border border-border/40 hover:border-border/80 transition-colors disabled:opacity-50 flex items-center gap-1.5">
              {isLoadingMore ? (<><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>加载中...</>) : "加载更多消息"}
            </button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const numericId = Number(msg.id);
            const msgReactions = (!isNaN(numericId) && numericId < 1_700_000_000_000 && reactionsData)
              ? reactionsData[numericId] ?? {}
              : {};
            const readCount = (!isNaN(numericId) && numericId < 1_700_000_000_000 && readCountsData)
              ? (readCountsData as Record<number, number>)[numericId] ?? 0
              : 0;

            return (
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
                      {msg.senderAvatar?.startsWith("http") && <AvatarImage src={msg.senderAvatar} alt={msg.sender} className="object-cover" />}
                      <AvatarFallback className="bg-secondary text-xs">{msg.senderAvatar?.startsWith("http") ? (msg.sender?.[0]?.toUpperCase() ?? "?") : (msg.senderAvatar ?? "?")}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="relative">
                    {!msg.isMine && (
                      <div className="flex items-center gap-1 mb-0.5 px-1">
                        {getRoleBadge(msg.senderRole)}
                        <span className={`text-[11px] font-medium ${msg.senderRole === "owner" ? "text-amber-400" : msg.senderRole === "admin" ? "text-neon-cyan" : "text-muted-foreground"}`}>
                          {msg.sender}
                        </span>
                      </div>
                    )}

                    {msg.replyTo && (
                      <div className={`flex items-center gap-1.5 mb-1 px-3 py-1.5 rounded-lg bg-secondary/30 border-l-2 border-neon-cyan/40 text-[11px] text-muted-foreground ${msg.isMine ? "ml-auto" : ""}`}>
                        <Reply size={10} className="shrink-0 text-neon-cyan" />
                        <span className="text-neon-cyan font-medium">{msg.replyTo.sender}</span>
                        <span className="truncate">{msg.replyTo.content}</span>
                      </div>
                    )}

                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.isMine ? "bg-neon-cyan/15 text-foreground rounded-br-md border border-neon-cyan/20"
                      : msg.isAI ? "bg-neon-purple/10 text-foreground rounded-bl-md border border-neon-purple/20"
                      : "bg-secondary/60 text-foreground rounded-bl-md border border-border/20"
                    }`}>
                      {msg.isAI && (
                        <div className="flex items-center gap-1 mb-1.5 text-[10px] text-neon-purple font-mono">
                          <Bot size={12} />NexusBot AI
                        </div>
                      )}
                      {renderMessageContent(msg)}
                    </div>

                    {/* Action buttons (hover) */}
                    <div className={`absolute top-0 ${msg.isMine ? "-left-16" : "-right-16"} hidden group-hover:flex items-center gap-0.5 z-10`}>
                      <button onClick={() => setReplyTo(msg)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Reply size={13} />
                      </button>
                      <button onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Smile size={13} />
                      </button>
                    </div>

                    {/* Emoji picker popup */}
                    {emojiPickerMsgId === msg.id && (
                      <div ref={emojiRef} className={`absolute z-20 ${msg.isMine ? "right-0" : "left-0"} -top-12 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-popover [backdrop-filter:none] border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-150`}>
                        {EMOJI_LIST.map((emoji) => (
                          <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-lg hover:scale-125 transform">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reactions + time + read receipt */}
                    <div className={`flex items-center gap-1 mt-1 flex-wrap ${msg.isMine ? "justify-end" : ""}`}>
                      <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                      {/* Read receipt for own messages */}
                      {msg.isMine && !msg.pending && readCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-neon-cyan">
                          <CheckCheck size={10} />
                          {readCount}
                        </span>
                      )}
                      {msg.pending && <span className="text-[10px] text-muted-foreground/50">sending...</span>}
                      {/* Persisted reactions */}
                      {Object.entries(msgReactions).map(([emoji, data]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full transition-colors text-xs ${data.mine ? "bg-neon-cyan/20 border border-neon-cyan/30" : "bg-secondary/50 hover:bg-secondary/80"}`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] text-muted-foreground">{data.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="glass border-t border-border/30 px-3 py-2 pb-[env(safe-area-inset-bottom)]">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-secondary/30 border-l-2 border-neon-cyan/40">
            <Reply size={14} className="text-neon-cyan shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-neon-cyan font-medium">{replyTo.sender}</p>
              <p className="text-[11px] text-muted-foreground truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-secondary/60 transition-colors">
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
        )}

        <AnimatePresence>
          {showMentionMenu && filteredMentionMembers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-2 rounded-xl bg-popover [backdrop-filter:none] border border-border shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
              <div className="px-3 py-1.5 border-b border-border/30">
                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1"><AtSign size={10} />{t("group.mentionMember")}</p>
              </div>
              {filteredMentionMembers.map((member) => (
                <button key={member.id} onClick={() => insertMention(member.name)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/50 transition-colors">
                  <Avatar className="w-7 h-7">{member.avatar?.startsWith("http") && <AvatarImage src={member.avatar} alt={member.name} className="object-cover" />}<AvatarFallback className="bg-secondary text-xs">{member.avatar?.startsWith("http") ? (member.name?.[0]?.toUpperCase() ?? "?") : (member.avatar ?? "?")}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1">{getRoleBadge(member.role)}<span className="text-xs font-medium truncate">{member.name}</span></div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-1.5">
          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors shrink-0 text-muted-foreground disabled:opacity-50"
          >
            {isUploading ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : <ImageIcon size={18} />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.zip" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />

          <button onClick={() => { setInput((prev) => prev + "@"); setShowMentionMenu(true); setMentionFilter(""); inputRef.current?.focus(); }} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors shrink-0 text-muted-foreground">
            <AtSign size={18} />
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !showMentionMenu) handleSend(); }}
              placeholder={t("group.inputPlaceholder")}
              className="w-full h-10 px-4 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
            />
          </div>
          {input.trim() ? (
            <button onClick={handleSend} className="w-10 h-10 flex items-center justify-center rounded-xl bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-all shrink-0">
              <Send size={18} />
            </button>
          ) : (
            <VoiceRecorder
              disabled={!isValidGroup || !connected}
              onVoiceMessage={(audioUrl, transcription, durationSeconds) => {
                // Create a voice message in chat
                const voiceMsg: GroupMessage = {
                  id: Date.now().toString(),
                  sender: user?.name ?? "User",
                  senderAvatar: user?.avatar ?? "🎤",
                  content: transcription || "[语音消息]",
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  isMine: true,
                  messageType: "file",
                  mediaUrl: audioUrl,
                  fileName: `语音消息 ${Math.floor(durationSeconds / 60)}:${String(durationSeconds % 60).padStart(2, "0")}`,
                  pending: true,
                };
                setMessages(prev => [...prev, voiceMsg]);
                if (isValidGroup && connected) {
                  socketSend({ groupId, content: transcription || "[语音消息]", messageType: "file", mediaUrl: audioUrl });
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Invite Link Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm flex items-center gap-2"><Link2 size={16} className="text-neon-cyan" />Invite Link</h3>
                <button onClick={() => setShowInviteModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60"><X size={16} /></button>
              </div>
              <p className="text-xs text-muted-foreground">Share this link to invite people to the group. The link is valid indefinitely.</p>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/30">
                <span className="flex-1 text-xs font-mono text-foreground truncate">{inviteUrl}</span>
                <button onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Link copied!"); }} className="shrink-0 text-neon-cyan hover:text-neon-cyan/80 transition-colors">
                  <Copy size={14} />
                </button>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Link copied!"); setShowInviteModal(false); }} className="w-full py-2.5 rounded-xl bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors text-sm font-medium">
                Copy & Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members Sidebar Overlay */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/50 [backdrop-filter:none]" onClick={() => setShowSidebar(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="fixed top-0 right-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-card border-l border-border overflow-y-auto">
              {/* Sidebar Header */}
              <div className="sticky top-0 z-10 glass border-b border-border/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-sm">{t("group.groupInfo")}</h3>
                  <button onClick={() => setShowSidebar(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"><X size={18} /></button>
                </div>
              </div>

              {/* Group Info Card */}
              <div className="p-4 border-b border-border/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20 flex items-center justify-center text-2xl overflow-hidden">
                    {groupInfo?.avatar?.startsWith("http") ? (
                      <img src={groupInfo.avatar} alt={groupInfo.name ?? "Group"} className="w-full h-full object-cover" />
                    ) : (
                      <span>{groupInfo?.avatar ?? "🚀"}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-base">{groupInfo?.name ?? "Group"}</h4>
                    <p className="text-xs text-muted-foreground">{members.length} {t("group.members")}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{groupInfo?.description ?? "No description"}</p>
                {groupInfo?.isTokenGated && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">🔒 Token Gated</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="p-3 border-b border-border/20 grid grid-cols-4 gap-1">
                {[
                  { icon: Search, label: t("group.search"), action: () => { const q = prompt("Search messages..."); if (q) { const found = messages.filter(m => m.content.toLowerCase().includes(q.toLowerCase())); toast.info(`${found.length} messages found`); } } },
                  { icon: isMuted ? BellOff : Bell, label: isMuted ? t("group.unmute") : t("group.mute"), action: () => { setIsMuted(!isMuted); toast.success(isMuted ? "Notifications enabled" : "Group muted"); } },
                  { icon: Link2, label: t("group.invite") ?? "Invite", action: () => createInviteLinkMutation.mutate({ groupId }) },
                  { icon: Settings, label: t("group.settings"), action: () => toast.info("Group settings coming soon") },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} onClick={item.action} className="flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-secondary/40 transition-colors">
                      <Icon size={16} className="text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Announcement Edit Section */}
              <div className="p-3 border-b border-border/20">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Megaphone size={12} />Group Announcement</h5>
                  {isAdminOrOwner && (
                    <button onClick={() => { setIsEditingAnnouncement(true); setEditAnnouncementText(announcement.content); setTimeout(() => announcementInputRef.current?.focus(), 100); }} className="text-[10px] text-neon-cyan hover:underline flex items-center gap-0.5">
                      <Settings size={10} />Edit
                    </button>
                  )}
                </div>
                {isEditingAnnouncement ? (
                  <div className="space-y-2">
                    <textarea ref={announcementInputRef} value={editAnnouncementText} onChange={(e) => setEditAnnouncementText(e.target.value)} className="w-full h-24 px-3 py-2 rounded-xl bg-secondary/40 border border-border/30 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 resize-none" placeholder="Write group announcement..." maxLength={300} />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{editAnnouncementText.length}/300</span>
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditingAnnouncement(false)} className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">Cancel</button>
                        <button onClick={() => { if (editAnnouncementText.trim()) { setAnnouncement({ content: editAnnouncementText, author: user?.name ?? "Admin", time: "Just now" }); setIsEditingAnnouncement(false); setShowAnnouncement(true); toast.success("Announcement updated!"); } }} className="px-3 py-1 rounded-lg text-xs bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors">Save</button>
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
                {members.map((member) => (
                  <button key={member.id} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-secondary/40 transition-colors" onClick={() => setMemberActionTarget(member)}>
                    <div className="relative">
                      <Avatar className="w-8 h-8">{member.avatar?.startsWith("http") && <AvatarImage src={member.avatar} alt={member.name} className="object-cover" />}<AvatarFallback className="bg-secondary text-xs">{member.avatar?.startsWith("http") ? (member.name?.[0]?.toUpperCase() ?? "?") : (member.avatar ?? "?")}</AvatarFallback></Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${getStatusColor(member.status)}`} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1">
                        {getRoleBadge(member.role)}
                        <span className="text-xs font-medium truncate">{member.name}</span>
                        {member.role === "owner" && <span className="text-[8px] px-1 py-0 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">Owner</span>}
                        {member.role === "admin" && <span className="text-[8px] px-1 py-0 rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">Admin</span>}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground/50 shrink-0" />
                  </button>
                ))}
              </div>

              {/* Leave Group */}
              <div className="p-3 border-t border-border/20">
                <button onClick={() => { if (confirm(t("group.leaveConfirm") || "Leave this group?")) { toast.success(t("group.leftGroup") || "Left group"); setLocation("/app/chat"); } }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-neon-red hover:bg-neon-red/10 transition-colors text-sm">
                  <LogOut size={16} />{t("group.leaveGroup")}
                </button>
              </div>

              {/* Member Action Menu */}
              <AnimatePresence>
                {memberActionTarget && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/60 [backdrop-filter:none] flex items-end" onClick={() => setMemberActionTarget(null)}>
                    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }} onClick={(e) => e.stopPropagation()} className="w-full bg-card border-t border-border/30 rounded-t-3xl p-4 space-y-2">
                      {/* Member Info */}
                      <div className="flex items-center gap-3 pb-3 border-b border-border/20">
                        <Avatar className="w-12 h-12">{memberActionTarget.avatar?.startsWith("http") && <AvatarImage src={memberActionTarget.avatar} alt={memberActionTarget.name} className="object-cover" />}<AvatarFallback className="bg-secondary text-lg">{memberActionTarget.avatar?.startsWith("http") ? (memberActionTarget.name?.[0]?.toUpperCase() ?? "?") : (memberActionTarget.avatar ?? "?")}</AvatarFallback></Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">{getRoleBadge(memberActionTarget.role)}<span className="font-semibold font-display text-sm">{memberActionTarget.name}</span></div>
                          <p className="text-[10px] text-muted-foreground capitalize">{memberActionTarget.role}</p>
                        </div>
                      </div>

                      {/* Mention */}
                      <button onClick={() => { setInput(`@${memberActionTarget.name} `); setMemberActionTarget(null); setShowSidebar(false); inputRef.current?.focus(); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors">
                        <AtSign size={18} className="text-neon-purple" />
                        <div className="text-left"><p className="text-sm font-medium">Mention in Chat</p><p className="text-xs text-muted-foreground">Send a message mentioning this member</p></div>
                      </button>

                      {/* Admin actions (only for admin/owner, not targeting owner) */}
                      {isAdminOrOwner && memberActionTarget.role !== "owner" && memberActionTarget.id !== String(user?.id) && (
                        <>
                          <button onClick={() => muteMemberMutation.mutate({ groupId, targetUserId: Number(memberActionTarget.id) })} className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors">
                            <VolumeX size={18} className="text-amber-400" />
                            <div className="text-left"><p className="text-sm font-medium">Mute for 24h</p><p className="text-xs text-muted-foreground">Prevent from sending messages</p></div>
                          </button>
                          <button onClick={() => unmuteMemberMutation.mutate({ groupId, targetUserId: Number(memberActionTarget.id) })} className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors">
                            <Volume2 size={18} className="text-neon-green" />
                            <div className="text-left"><p className="text-sm font-medium">Unmute</p><p className="text-xs text-muted-foreground">Restore messaging ability</p></div>
                          </button>
                          <button onClick={() => { if (confirm(`Remove ${memberActionTarget.name} from group?`)) kickMemberMutation.mutate({ groupId, targetUserId: Number(memberActionTarget.id) }); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-neon-red/5 hover:bg-neon-red/10 transition-colors">
                            <UserMinus size={18} className="text-neon-red" />
                            <div className="text-left"><p className="text-sm font-medium text-neon-red">Remove from Group</p><p className="text-xs text-muted-foreground">Kick this member out</p></div>
                          </button>
                        </>
                      )}

                      {/* Transfer ownership (only owner can do this) */}
                      {myMember?.role === "owner" && memberActionTarget.role !== "owner" && memberActionTarget.id !== String(user?.id) && (
                        <button onClick={() => { if (confirm(`Transfer ownership to ${memberActionTarget.name}?`)) transferOwnershipMutation.mutate({ groupId, newOwnerId: Number(memberActionTarget.id) }); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-400/5 hover:bg-amber-400/10 transition-colors">
                          <RefreshCw size={18} className="text-amber-400" />
                          <div className="text-left"><p className="text-sm font-medium text-amber-400">Transfer Ownership</p><p className="text-xs text-muted-foreground">Make this member the new owner</p></div>
                        </button>
                      )}

                      <button onClick={() => setMemberActionTarget(null)} className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
