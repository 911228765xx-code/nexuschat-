/*
 * GroupChatRoom — 群聊聊天室页面
 * 新功能：表情反应持久化、邀请链接弹窗、文件上传、已读回执、群管理后台（踢人/禁言/转让群主）
 */
import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { focusOnMount } from "@/lib/focusOnMount";
import { trpc } from "@/lib/trpc";
import { formatChatTimestamp } from "@/lib/timeFormat";
import { compressImage } from "@/lib/imageCompress";
import { useParams, useLocation } from "wouter";
import { useSocket, SocketMessage } from "@/hooks/useSocket";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowLeft, Send, Smile, MoreVertical, X, Reply, Users,
  Megaphone, ChevronRight, Shield, Crown, Hash, AtSign,
  Pin, Settings, Bell, BellOff, LogOut, UserPlus, Search,
  Image as ImageIcon, Gift, Mic, Bot, ArrowUpDown, Wallet, Plus, Video,
  ChevronDown, ChevronUp, Link2, File, Download, CheckCheck, Copy,
  UserMinus, VolumeX, Volume2, RefreshCw, Trash2, Edit3, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  messageType?: "text" | "image" | "file" | "video" | "redpacket" | "transfer";
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  isRedPacket?: boolean;
  isTransfer?: boolean;
  cryptoAmount?: string;
  cryptoToken?: string;
  redPacketAmount?: string;
  redPacketToken?: string;
  redPacketNote?: string;
  redPacketTotal?: number;     // 总份数
  redPacketClaimed?: number;   // 已领取份数
  redPacketClaimers?: string[]; // 已领取人名列表
  redPacketExpired?: boolean;  // 是否已过期
  transferAmount?: string;
  transferToken?: string;
  transferNote?: string;
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

// ─── Pure helper functions (outside component to avoid re-creation on render) ──
function getRoleBadge(role?: string) {
  if (role === "owner") return <Crown size={10} className="text-amber-400" />;
  if (role === "admin") return <Shield size={10} className="text-neon-cyan" />;
  return null;
}

function renderContent(content: string, mentions?: string[]) {
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
}

// ─── Read Receipt Avatar Stack ───────────────────────────────────────────────
function ReadReceiptAvatars({ messageId, readCount }: { messageId: number; readCount: number }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { data: receipts } = trpc.chat.getReadReceipts.useQuery(
    { messageId },
    { enabled: showTooltip, staleTime: 30_000 }
  );

  return (
    <div
      className="relative flex items-center gap-0.5 cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Avatar stack: show up to 3 */}
      <div className="flex items-center">
        {(receipts ?? []).slice(0, 3).map((r, i) => (
          <div
            key={r.userId}
            className="w-4 h-4 rounded-full border border-card overflow-hidden bg-secondary"
            style={{ marginLeft: i > 0 ? -4 : 0, zIndex: 3 - i }}
          >
            {r.avatar?.startsWith("http") ? (
              <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[7px] text-foreground">
                {r.avatar ?? r.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
        ))}
        {/* Fallback when receipts not yet loaded: show checkmark + count */}
        {!receipts && (
          <span className="flex items-center gap-0.5 text-sm text-neon-cyan">
            <CheckCheck size={10} />
            {readCount}
          </span>
        )}
      </div>
      {/* Tooltip */}
      {showTooltip && receipts && receipts.length > 0 && (
        <div className="absolute bottom-5 right-0 z-50 bg-card border border-border/40 rounded-lg px-2 py-1.5 shadow-lg min-w-[100px] text-sm text-foreground whitespace-nowrap">
          <p className="text-muted-foreground mb-2">已读 {readCount} 人</p>
          {receipts.slice(0, 5).map(r => (
            <p key={r.userId} className="truncate">{r.name}</p>
          ))}
          {readCount > 5 && <p className="text-muted-foreground">+{readCount - 5} 人</p>}
        </div>
      )}
    </div>
  );
}

// 视频气泡组件：支持移动端点击弹出操作菜单
function VideoMessageBubble({ msg }: { msg: GroupMessage }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(true);
  };

  return (
    <div className="mt-2 max-w-[260px] relative">
      {/* 视频缩略图 + 播放按鈕遮罩层 */}
      <div className="relative cursor-pointer" onClick={handleTap} onTouchEnd={handleTap}>
        <video
          src={msg.mediaUrl}
          className="w-full rounded-xl max-h-[200px] object-cover pointer-events-none"
          preload="metadata"
        />
        {/* 播放图标遮罩 */}
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      </div>
      {msg.fileName && <p className="text-xs text-muted-foreground mt-1 truncate">{msg.fileName}</p>}

      {/* 操作菜单弹窗 */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowMenu(false)}>
          <div className="w-full max-w-md bg-card border-t border-border/40 rounded-t-2xl pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-4" />
            <p className="text-sm text-muted-foreground px-5 mb-3 truncate">{msg.fileName ?? "视频"}</p>
            <button
              onClick={() => { setShowMenu(false); setShowPlayer(true); }}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/50 transition-colors text-sm"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-neon-cyan"><path d="M8 5v14l11-7z"/></svg>
              <span>播放视频</span>
            </button>
            <button
              onClick={() => { window.open(msg.mediaUrl, "_blank"); setShowMenu(false); }}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/50 transition-colors text-sm border-t border-border/20"
            >
              <Download size={18} className="text-neon-purple" />
              <span>下载视频</span>
            </button>
            <button
              onClick={() => setShowMenu(false)}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/50 transition-colors text-sm border-t border-border/20 text-muted-foreground"
            >
              <X size={18} />
              <span>取消</span>
            </button>
          </div>
        </div>
      )}

      {/* 全屏播放弹窗 */}
      {showPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setShowPlayer(false)}>
          <div className="w-full max-w-lg px-4" onClick={e => e.stopPropagation()}>
            <video
              src={msg.mediaUrl}
              controls
              autoPlay
              className="w-full rounded-xl max-h-[80vh]"
            />
            <button onClick={() => setShowPlayer(false)} className="mt-4 w-full py-2.5 rounded-xl bg-white/10 text-white text-sm">关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderMessageContent(msg: GroupMessage, onClaim?: (id: string) => void, claimedSet?: Set<string>) {
  // Red packet bubble (new style with multi-claim support)
  if (msg.isRedPacket || msg.messageType === "redpacket") {
    const total = msg.redPacketTotal ?? 1;
    const claimed = msg.redPacketClaimed ?? 0;
    const isClaimed = claimedSet?.has(msg.id) ?? false;
    const isExpired = claimed >= total;
    const claimers = msg.redPacketClaimers ?? [];
    const amount = msg.redPacketAmount ?? msg.cryptoAmount ?? "?";
    const token = msg.redPacketToken ?? msg.cryptoToken ?? "";
    const note = msg.redPacketNote ?? msg.content ?? "";
    return (
      <div className={`rounded-2xl overflow-hidden ${msg.isMine ? "rounded-br-md" : "rounded-bl-md"}`} style={{ minWidth: 220 }}>
        {/* Header */}
        <div className="bg-gradient-to-br from-red-500 via-orange-500 to-[#ff6b35] p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xl">🧧</span>
            </div>
            <div>
              <p className="text-white font-bold font-mono text-base">{amount} {token}</p>
              <p className="text-white/70 text-xs">加密红包 · {total} 份</p>
            </div>
          </div>
          {note && note !== `[红包: ${amount} ${token}]` && (
            <p className="text-white/90 text-sm italic">"{note}"</p>
          )}
        </div>
        {/* Progress bar */}
        <div className="bg-gradient-to-br from-red-900/40 to-orange-900/30 border-x border-red-500/20 px-3 pt-2 pb-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-red-300/80">已抢 {claimed}/{total} 份</span>
            {claimers.length > 0 && (
              <span className="text-xs text-red-300/60 truncate max-w-[100px]">{claimers.slice(-2).join("、")}抢到</span>
            )}
          </div>
          <div className="h-1 bg-red-900/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: total > 0 ? `${Math.min(100, (claimed / total) * 100)}%` : "0%" }}
            />
          </div>
        </div>
        {/* Action button */}
        <div className="bg-gradient-to-br from-red-900/30 to-orange-900/20 border border-red-500/20 border-t-0 px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-red-400/60">🧧 NexusChat 红包</span>
          {msg.isMine ? (
            <span className="text-xs text-orange-400 font-medium">已发出 ✓</span>
          ) : isExpired ? (
            <span className="text-xs text-muted-foreground">已抢完</span>
          ) : isClaimed ? (
            <span className="text-xs text-yellow-400 font-medium">已领取 ✓</span>
          ) : (
            <button
              onClick={() => onClaim?.(msg.id)}
              className="text-xs bg-gradient-to-r from-yellow-400 to-orange-400 text-black font-bold px-3 py-1 rounded-full active:scale-95 transition-transform"
            >
              手气抢🧧
            </button>
          )}
        </div>
      </div>
    );
  }
  // Transfer bubble
  if (msg.isTransfer) {
    return (
      <div className={`rounded-2xl overflow-hidden ${msg.isMine ? "rounded-br-md" : "rounded-bl-md"}`} style={{ minWidth: 200 }}>
        <div className="bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center">
              <ArrowUpDown size={14} className="text-neon-cyan" />
            </div>
            <div>
              <p className="text-foreground text-sm font-bold font-mono">{msg.cryptoAmount} {msg.cryptoToken}</p>
              <p className="text-muted-foreground text-sm">{msg.isMine ? "Transfer sent" : "Transfer received"}</p>
            </div>
          </div>
          {msg.content && <p className="text-muted-foreground text-sm mt-2">Note: {msg.content}</p>}
        </div>
        <div className="bg-card/50 border-x border-b border-neon-cyan/20 px-3 py-1.5 flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2"><Wallet size={10} /> On-chain Transfer</span>
          <span className="text-sm text-neon-green font-mono">Confirmed ✓</span>
        </div>
      </div>
    );
  }
  if (msg.messageType === "image" && msg.mediaUrl) {
    return (
      <div className="mt-2">
        <img src={msg.mediaUrl} alt="Image" className="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer" loading="lazy" onClick={() => window.open(msg.mediaUrl, "_blank")} />
      </div>
    );
  }
  // Video message — 带操作菜单的视频气泡（移动端/桌面端兼容）
  if (msg.messageType === "video" && msg.mediaUrl) {
    return (
      <VideoMessageBubble msg={msg} />
    );
  }
  if (msg.messageType === "file" && msg.mediaUrl) {
    // Voice message: fileName starts with "语音消息" or mediaUrl is audio
    const isVoice = (msg.fileName ?? "").startsWith("语音消息") ||
      /\.(webm|mp3|ogg|m4a|wav)$/i.test(msg.mediaUrl);
    if (isVoice) {
      return (
        <div className="mt-2 max-w-[220px]">
          <div className="flex items-center gap-2.5 mb-2">
            <Mic size={12} className="text-neon-cyan" />
            <span className="text-sm text-muted-foreground">{msg.fileName ?? "语音消息"}</span>
          </div>
          <audio
            controls
            src={msg.mediaUrl}
            className="w-full h-8"
            style={{ minWidth: 180 }}
          />
        </div>
      );
    }
    return (
      <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors max-w-[220px]">
        <File size={18} className="text-neon-cyan shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{msg.fileName ?? "File"}</p>
          {msg.fileSize && <p className="text-sm text-muted-foreground">{formatFileSize(msg.fileSize)}</p>}
        </div>
        <Download size={14} className="text-muted-foreground shrink-0" />
      </a>
    );
  }
  return <div className="whitespace-pre-wrap">{renderContent(msg.content, msg.mentions)}</div>;
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
  // ─── Message context menu (long press / right click) ─────────────────────
  const [contextMenu, setContextMenu] = useState<{ msg: GroupMessage; x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ─── Leave Group confirmation ───────────────────────────────────────────────
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [announcementExpanded, setAnnouncementExpanded] = useState(false);
  // ─── Group Settings modal ─────────────────────────────────────────────────
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [editGroupAvatar, setEditGroupAvatar] = useState("");
  // ─── Attachment menu ────────────────────────────────────────────────────────
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  // ─── Red packet modal ─────────────────────────────────────────────────────
  const [showRedPacket, setShowRedPacket] = useState(false);
  const [rpAmount, setRpAmount] = useState("");
  const [rpToken, setRpToken] = useState("USDT");
  const [rpNote, setRpNote] = useState("");
  const [rpCount, setRpCount] = useState("5"); // 份数，默认5  // ─── Red packet claim state (persisted via API) ─────────────────────────────────
  const [claimedPackets, setClaimedPackets] = useState<Set<string>>(new Set());
  const claimRedPacketMutation = trpc.chat.claimRedPacket.useMutation();
  // ─── Red packet claim result modal ──────────────────────────────────────────
  const [claimResult, setClaimResult] = useState<{ amount: string; token: string; rank: number; total: number } | null>(null);
  // ─── Transfer modal ───────────────────────────────────────────────────────
  const [showTransfer, setShowTransfer] = useState(false);
  const [tfAmount, setTfAmount] = useState("");
  const [tfToken, setTfToken] = useState("USDT");
  const [tfNote, setTfNote] = useState("");
  // ─── Video upload ref ─────────────────────────────────────────────────────
  const videoInputRef = useRef<HTMLInputElement>(null);
  // ─── Message search ───────────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = searchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  // ─── Real group info from DB ──────────────────────────────────────────
  const { data: groupInfo, refetch: refetchGroupInfo } = trpc.chat.getGroupInfo.useQuery(
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
  // Load announcement from DB
  const { data: dbAnnouncement } = trpc.chat.getAnnouncement.useQuery(
    { groupId },
    { enabled: isValidGroup, staleTime: 60_000 }
  );
  useEffect(() => {
    if (dbAnnouncement) {
      setAnnouncement({ content: dbAnnouncement.content, author: "Admin", time: "" });
      setEditAnnouncementText(dbAnnouncement.content);
    }
  }, [dbAnnouncement]);
  const setAnnouncementMutation = trpc.chat.setAnnouncement.useMutation();
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

  const { connected, joinGroup, leaveGroup, sendMessage: socketSend, onMessage, onCustomEvent } = useSocket({
    userId: user?.id,
    userName: user?.name ?? user?.username ?? "User",
  });

  useEffect(() => {
    if (!connected || !isValidGroup) return;
    joinGroup(groupId);
    return () => { leaveGroup(groupId); };
  }, [connected, isValidGroup, groupId, joinGroup, leaveGroup]);

  // ─── Listen for group announcement updates ────────────────────────────────
  useEffect(() => {
    if (!connected) return;
    const cleanup = onCustomEvent("group_announcement", (data: unknown) => {
      const ann = data as { groupId: number; groupName: string; content: string; updatedBy: string };
      if (ann.groupId !== groupId) return;
      toast.success(`📢 群公告已更新`, {
        description: ann.content,
        duration: 5000,
      });
      // Refresh announcement display
      setAnnouncement(prev => ({ ...prev, content: ann.content, author: ann.updatedBy }));
    });
    return cleanup;
  }, [connected, groupId, onCustomEvent]);

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
          senderRole: (msg.senderRole as "owner" | "admin" | "member") ?? "member",
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
        senderRole: (m.senderRole as "owner" | "admin" | "member") ?? "member",
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
        senderRole: (m.senderRole as "owner" | "admin" | "member") ?? "member",
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

  // ─── Pre-process reactions and read counts into Maps for O(1) lookup ────────
  const reactionsMap = useMemo(() => {
    if (!reactionsData) return {} as Record<number, Record<string, { count: number; mine: boolean }>>;
    return reactionsData as Record<number, Record<string, { count: number; mine: boolean }>>;
  }, [reactionsData]);

  const readCountsMap = useMemo(() => {
    if (!readCountsData) return {} as Record<number, number>;
    return readCountsData as Record<number, number>;
  }, [readCountsData]);

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
      senderRole: (myMember?.role as "owner" | "admin" | "member") ?? "member",
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
      if (isImage) {
        // Compress image before upload (auto-compress if > 5MB)
        const { base64, mimeType } = await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.8, maxSizeBytes: 5 * 1024 * 1024 });
        const result = await uploadImageMutation.mutateAsync({ base64, mimeType });
        const newMsg: GroupMessage = {
          id: Date.now().toString(),
          sender: user?.name ?? "User",
          senderAvatar: user?.avatar ?? "🦊",
          senderRole: (myMember?.role as "owner" | "admin" | "member") ?? "member",
          content: `[Image: ${file.name}]`,
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          isMine: true,
          messageType: "image",
          mediaUrl: result.url,
        };
        setMessages(prev => [...prev, newMsg]);
        if (isValidGroup && connected) socketSend({ groupId, content: `[Image: ${file.name}]`, mediaUrl: result.url, messageType: "image" });
        toast.success("Image sent!");
      } else {
        // Non-image file: read as base64 and upload
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64 = (reader.result as string).split(",")[1];
          const result = await uploadImageMutation.mutateAsync({ base64, mimeType: file.type });
          await saveGroupFileMutation.mutateAsync({ groupId, fileName: file.name, fileSize: file.size, mimeType: file.type, fileKey: result.url, url: result.url });
          const newMsg: GroupMessage = {
            id: Date.now().toString(),
            sender: user?.name ?? "User",
            senderAvatar: user?.avatar ?? "🦊",
            senderRole: (myMember?.role as "owner" | "admin" | "member") ?? "member",
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
          toast.success("File sent!");
        };
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

   // ─── Video upload ────────────────────────────────────────────────────────
  const MAX_VIDEO_MB = 50;
  const handleVideoUpload = async (file: File) => {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`视频文件过大（${sizeMB}MB），超出 ${MAX_VIDEO_MB}MB 限制`, {
        duration: 6000,
        description: "建议：① 手机相册「编辑」→ 降低分辨率/帧率  ② 使用 HandBrake 免费压缩  ③ 剪短视频时长",
        action: {
          label: "下载 HandBrake",
          onClick: () => window.open("https://handbrake.fr", "_blank"),
        },
      });
      return;
    }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadImageMutation.mutateAsync({ base64, mimeType: file.type });
        const newMsg: GroupMessage = {
          id: Date.now().toString(),
          sender: user?.name ?? "User",
          senderAvatar: user?.avatar ?? "🦊",
          senderRole: (myMember?.role as "owner" | "admin" | "member") ?? "member",
          content: `[Video: ${file.name}]`,
          time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
          isMine: true,
          messageType: "video",
          mediaUrl: result.url,
          fileName: file.name,
          fileSize: file.size,
        };
        setMessages(prev => [...prev, newMsg]);
        if (isValidGroup && connected) socketSend({ groupId, content: `[Video: ${file.name}]`, mediaUrl: result.url, messageType: "video" });
        toast.success("视频发送成功！");
      };
    } catch {
      toast.error("视频上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Red packet send ────────────────────────────────────────────────────────
  const handleSendRedPacket = () => {
    if (!rpAmount || isNaN(parseFloat(rpAmount)) || parseFloat(rpAmount) <= 0) {
      toast.error("请输入有效金额");
      return;
    }
    const totalCount = Math.max(1, Math.min(100, parseInt(rpCount) || 5));
    const newMsg: GroupMessage = {
      id: Date.now().toString(),
      sender: user?.name ?? "User",
      senderAvatar: user?.avatar ?? "🦊",
      senderRole: (myMember?.role as "owner" | "admin" | "member") ?? "member",
      content: `[红包: ${rpAmount} ${rpToken}]`,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      isMine: true,
      messageType: "redpacket",
      redPacketAmount: rpAmount,
      redPacketToken: rpToken,
      redPacketNote: rpNote || "恭喜发财，大吉大利！",
      redPacketTotal: totalCount,
      redPacketClaimed: 0,
      redPacketClaimers: [],
    };
    setMessages(prev => [...prev, newMsg]);
    if (isValidGroup && connected) socketSend({ groupId, content: `[红包: ${rpAmount} ${rpToken}]`, messageType: "redpacket", redPacketAmount: rpAmount, redPacketToken: rpToken, redPacketNote: rpNote || "恭喜发财，大吉大利！" });
    setShowRedPacket(false);
    setRpAmount(""); setRpNote(""); setRpToken("USDT"); setRpCount("5");
    toast.success(`红包已发出！共 ${totalCount} 份，等待群友抢包🧧`);
  };

  // ─── Red packet claim handler ─────────────────────────────────────────────────────
  const handleClaimRedPacket = async (msgId: string) => {
    if (claimedPackets.has(msgId)) {
      toast.info("你已经抢过这个红包了！");
      return;
    }
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const total = msg.redPacketTotal ?? parseInt(rpCount) ?? 5;
    const claimed = msg.redPacketClaimed ?? 0;
    if (claimed >= total) {
      toast.error("红包已被抢完！下次手快一点😄");
      return;
    }
    try {
      const result = await claimRedPacketMutation.mutateAsync({
        messageId: Number(msgId),
        groupId: groupId,
      });
      if (!result.ok) {
        if (result.reason === "already_claimed") toast.info("你已经抢过这个红包了！");
        else if (result.reason === "exhausted") toast.error("红包已被抢完！下次手快一点😄");
        return;
      }
    } catch { /* network error, fallback to local */ }
    const perAmount = (parseFloat(msg.redPacketAmount ?? "0") / total).toFixed(4);
    const newClaimed = claimed + 1;
    const claimers = [...(msg.redPacketClaimers ?? []), user?.name ?? "小幸运"];
    setClaimedPackets(prev => new Set(Array.from(prev).concat(msgId)));
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, redPacketClaimed: newClaimed, redPacketClaimers: claimers } : m
    ));
    // 弹出抢包结果弹窗
    setClaimResult({ amount: perAmount, token: msg.redPacketToken ?? "USDT", rank: newClaimed, total });
  };  // ─── Transfer send ────────────────────────────────────────────────────────
  const handleSendTransfer = () => {
    if (!tfAmount || isNaN(parseFloat(tfAmount)) || parseFloat(tfAmount) <= 0) {
      toast.error("请输入有效金额");
      return;
    }
    const newMsg: GroupMessage = {
      id: Date.now().toString(),
      sender: user?.name ?? "User",
      senderAvatar: user?.avatar ?? "🦊",
      senderRole: (myMember?.role as "owner" | "admin" | "member") ?? "member",
      content: `[转账: ${tfAmount} ${tfToken}]`,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      isMine: true,
      messageType: "transfer",
      transferAmount: tfAmount,
      transferToken: tfToken,
      transferNote: tfNote,
    };
    setMessages(prev => [...prev, newMsg]);
    if (isValidGroup && connected) socketSend({ groupId, content: `[转账: ${tfAmount} ${tfToken}]`, messageType: "transfer", transferAmount: tfAmount, transferToken: tfToken, transferNote: tfNote });
    setShowTransfer(false);
    setTfAmount(""); setTfNote(""); setTfToken("USDT");
    toast.success("转账已发出！");
  };

  // ─── Invite link ────────────────────────────────────────────────────────
  const createInviteLinkMutation = trpc.chat.createInviteLink.useMutation({
    onSuccess: (data) => {
      // Use configured app URL (production domain) if available
      // Fallback to nexuschat.best (production domain) to avoid dev server URLs in invite links
      const configuredUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, "");
      const appBaseUrl = configuredUrl || "https://nexuschat.best";
      // 与原生端二维码、服务端 /i/:code 落地规则保持一致：
      // 已安装 App 会由 App Links 接管，未安装则进入带群信息的下载页。
      const url = `${appBaseUrl}/i/g${groupId}t${data.token}`;
      setInviteUrl(url);
      // Modal is already open (opened immediately on click), just update the URL
    },
    onError: () => {
      toast.error("Failed to create invite link");
      setShowInviteModal(false);
    },
  });

  // Open invite modal immediately and trigger API in parallel for faster perceived response
  const handleOpenInviteModal = () => {
    setInviteUrl(""); // reset previous URL
    setShowInviteModal(true);
    createInviteLinkMutation.mutate({ groupId });
  };

  // ─── Delete / Leave / Update Group mutations ──────────────────────────────
  const deleteMessageMutation = trpc.chat.deleteMessage.useMutation({
    onSuccess: () => toast.success("消息已删除"),
    onError: (e) => toast.error(e.message),
  });
  const leaveGroupMutation = trpc.chat.leaveGroup.useMutation({
    onSuccess: () => { toast.success("已退出群组"); setLocation("/app/chat"); },
    onError: (e) => toast.error(e.message),
  });
  const updateGroupInfoMutation = trpc.chat.updateGroupInfo.useMutation({
    onSuccess: () => { toast.success("群组信息已更新"); setShowGroupSettings(false); refetchGroupInfo(); },
    onError: (e) => toast.error(e.message),
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

  const getStatusColor = (status: string) => {
    if (status === "online") return "bg-neon-green";
    if (status === "away") return "bg-amber-400";
    return "bg-muted-foreground/30";
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <header className="glass sticky top-0 z-10 pt-[env(safe-area-inset-top)] border-b border-border/30">
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
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Users size={10} />
              {members.length} {t("group.members")} · {onlineCount} {t("group.online")}
            </p>
          </div>
          <button onClick={() => setShowSidebar(true)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors relative">
            <Users size={18} className="text-muted-foreground" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-neon-green text-[13px] text-background font-bold flex items-center justify-center">{onlineCount}</span>
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
              <p className={`text-sm text-foreground flex-1 ${showPinnedExpand ? "" : "truncate"}`}>{pinnedMessage?.content}</p>
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
            <p className="text-[13px] text-foreground leading-relaxed line-clamp-2">{announcement.content}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{announcement.author} · {announcement.time}</p>
          </div>
          <button onClick={() => setShowAnnouncement(false)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-secondary/60 transition-colors shrink-0">
            <X size={12} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {hasMore && (
          <div className="flex justify-center py-2">
            <button onClick={loadMoreMessages} disabled={isLoadingMore} className="text-sm text-muted-foreground hover:text-foreground px-4 py-1.5 rounded-full border border-border/40 hover:border-border/80 transition-colors disabled:opacity-50 flex items-center gap-2.5">
              {isLoadingMore ? (<><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>加载中...</>) : "加载更多消息"}
            </button>
          </div>
        )}
          {messages.map((msg) => {
            const numericId = Number(msg.id);
            const isRealMsg = !isNaN(numericId) && numericId < 1_700_000_000_000;
            const msgReactions = isRealMsg ? (reactionsMap[numericId] ?? {}) : {};
            const readCount = isRealMsg ? (readCountsMap[numericId] ?? 0) : 0;

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`flex ${msg.isMine ? "justify-end" : "justify-start"} group relative animate-in fade-in slide-in-from-bottom-2 duration-200`}
              >
                <div className={`flex gap-2 max-w-[85%] ${msg.isMine ? "flex-row-reverse" : ""}`}>
                  {!msg.isMine && (
                    <Avatar className={`w-7 h-7 shrink-0 mt-2 ${msg.isAI ? "ring-1 ring-neon-purple/50" : ""}`}>
                      {msg.senderAvatar?.startsWith("http") && <AvatarImage src={msg.senderAvatar} alt={msg.sender} className="object-cover" loading="lazy" />}
                      <AvatarFallback className="bg-secondary text-xs">{msg.senderAvatar?.startsWith("http") ? (msg.sender?.[0]?.toUpperCase() ?? "?") : (msg.senderAvatar ?? "?")}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="relative"
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ msg, x: e.clientX, y: e.clientY }); }}
                    onTouchStart={(e) => { longPressTimer.current = setTimeout(() => { const t = e.touches[0]; setContextMenu({ msg, x: t.clientX, y: t.clientY }); }, 500); }}
                    onTouchEnd={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
                    onTouchMove={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
                  >
                    {!msg.isMine && (
                      <div className="flex items-center gap-2 mb-0.5 px-2">
                        {getRoleBadge(msg.senderRole)}
                        <span className={`text-[13px] font-medium ${msg.senderRole === "owner" ? "text-amber-400" : msg.senderRole === "admin" ? "text-neon-cyan" : "text-muted-foreground"}`}>
                          {msg.sender}
                        </span>
                      </div>
                    )}

                    {msg.replyTo && (
                      <div className={`flex items-center gap-2.5 mb-2 px-3 py-1.5 rounded-lg bg-secondary/30 border-l-2 border-neon-cyan/40 text-[13px] text-muted-foreground ${msg.isMine ? "ml-auto" : ""}`}>
                        <Reply size={10} className="shrink-0 text-neon-cyan" />
                        <span className="text-neon-cyan font-medium">{msg.replyTo.sender}</span>
                        <span className="truncate">{msg.replyTo.content}</span>
                      </div>
                    )}

                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed transition-opacity duration-300 ${
                      msg.isMine ? "bg-neon-cyan/15 text-foreground rounded-br-md border border-neon-cyan/20"
                      : msg.isAI ? "bg-neon-purple/10 text-foreground rounded-bl-md border border-neon-purple/20"
                      : "bg-secondary/60 text-foreground rounded-bl-md border border-border/20"
                    } ${msg.pending ? "opacity-60" : "opacity-100"}`}>
                      {msg.isAI && (
                        <div className="flex items-center gap-2 mb-2.5 text-sm text-neon-purple font-mono">
                          <Bot size={12} />NexusBot AI
                        </div>
                      )}
                      {renderMessageContent(msg, handleClaimRedPacket, claimedPackets)}
                    </div>

                    {/* Action buttons (hover on desktop) */}
                    <div className={`absolute top-0 ${msg.isMine ? "-left-24" : "-right-24"} hidden group-hover:flex items-center gap-0.5 z-10`}>
                      <button onClick={() => setReplyTo(msg)} title="Reply" className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Reply size={13} />
                      </button>
                      <button onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)} title="React" className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Smile size={13} />
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(msg.content); toast.success("已复制"); }} title="Copy" className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                        <Copy size={13} />
                      </button>
                      {(msg.isMine || myMember?.role === "owner" || myMember?.role === "admin") && (
                        <button onClick={() => {
                          const numId = parseInt(msg.id, 10);
                          if (!isNaN(numId)) {
                            setMessages(prev => prev.filter(m => m.id !== msg.id));
                            deleteMessageMutation.mutate({ messageId: numId, groupId });
                          } else {
                            setMessages(prev => prev.filter(m => m.id !== msg.id));
                          }
                        }} title="Delete" className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/80 hover:bg-neon-red/20 text-muted-foreground hover:text-neon-red transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Emoji picker popup */}
                    {emojiPickerMsgId === msg.id && (
                      <div ref={emojiRef} className={`absolute z-20 ${msg.isMine ? "right-0" : "left-0"} -top-12 flex items-center gap-2 px-2 py-1.5 rounded-xl bg-popover [backdrop-filter:none] border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-150`}>
                        {EMOJI_LIST.map((emoji) => (
                          <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-lg hover:scale-125 transform">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Reactions + time + read receipt */}
                    <div className={`flex items-center gap-2 mt-2 flex-wrap ${msg.isMine ? "justify-end" : ""}`}>
                      <span className="text-sm text-muted-foreground">{msg.time}</span>
                      {/* Read receipt for own messages — avatar stack */}
                      {msg.isMine && !msg.pending && readCount > 0 && (
                        <ReadReceiptAvatars messageId={numericId} readCount={readCount} />
                      )}
                      {msg.pending && (
                        <span className="flex items-center gap-0.5">
                          {[0,1,2].map(i => (
                            <span
                              key={i}
                              className="w-1 h-1 rounded-full bg-neon-cyan/40 animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
                            />
                          ))}
                        </span>
                      )}
                      {/* Persisted reactions */}
                      {Object.entries(msgReactions).map(([emoji, data]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className={`flex items-center gap-0.5 px-2.5 py-1 rounded-full transition-colors text-sm ${data.mine ? "bg-neon-cyan/20 border border-neon-cyan/30" : "bg-secondary/50 hover:bg-secondary/80"}`}
                        >
                          <span>{emoji}</span>
                          <span className="text-sm text-muted-foreground">{data.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Input Area */}
      <div className="glass border-t border-border/30 px-3 py-2 pb-[env(safe-area-inset-bottom)]">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-secondary/30 border-l-2 border-neon-cyan/40">
            <Reply size={14} className="text-neon-cyan shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-neon-cyan font-medium">{replyTo.sender}</p>
              <p className="text-[13px] text-muted-foreground truncate">{replyTo.content}</p>
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
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2"><AtSign size={10} />{t("group.mentionMember")}</p>
              </div>
              {filteredMentionMembers.map((member) => (
                <button key={member.id} onClick={() => insertMention(member.name)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/50 transition-colors">
                  <Avatar className="w-7 h-7">{member.avatar?.startsWith("http") && <AvatarImage src={member.avatar} alt={member.name} className="object-cover" loading="lazy" />}<AvatarFallback className="bg-secondary text-xs">{member.avatar?.startsWith("http") ? (member.name?.[0]?.toUpperCase() ?? "?") : (member.avatar ?? "?")}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">{getRoleBadge(member.role)}<span className="text-sm font-medium truncate">{member.name}</span></div>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2.5">
          {/* Attachment menu button */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowAttachMenu(prev => !prev)}
              disabled={isUploading}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors text-muted-foreground disabled:opacity-50"
            >
              {isUploading
                ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <Plus size={18} />}
            </button>
            <AnimatePresence>
              {showAttachMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute bottom-12 left-0 z-50 bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden w-44"
                >
                  <button onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-sm">
                    <ImageIcon size={16} className="text-neon-cyan" />
                    <span>图片 / 文件</span>
                  </button>
                  <button onClick={() => { videoInputRef.current?.click(); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-sm border-t border-border/30">
                    <Video size={16} className="text-neon-purple" />
                    <span>视频</span>
                  </button>
                  <button onClick={() => { setShowRedPacket(true); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-sm border-t border-border/30">
                    <Gift size={16} className="text-red-400" />
                    <span>发红包</span>
                  </button>
                  <button onClick={() => { setShowTransfer(true); setShowAttachMenu(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-sm border-t border-border/30">
                    <ArrowUpDown size={16} className="text-neon-green" />
                    <span>转账</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.zip" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ""; }} />

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
              className="w-full h-10 px-4 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20 transition-all duration-150"
            />
          </div>
          {input.trim() ? (
            <button onClick={handleSend} className="w-10 h-10 flex items-center justify-center rounded-xl bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 active:scale-90 active:bg-neon-cyan/40 transition-all duration-100 shrink-0">
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed z-50 bg-black/60 flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }} onClick={() => setShowInviteModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 space-y-4 overflow-y-auto" style={{ maxHeight: '90vh', position: 'relative', margin: 'auto' }}>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm flex items-center gap-2"><Link2 size={16} className="text-neon-cyan" />Invite Link</h3>
                <button onClick={() => setShowInviteModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60"><X size={16} /></button>
              </div>
              <p className="text-sm text-muted-foreground">Share this link or scan the QR code to join the group.</p>
              {/* QR Code - show skeleton while loading, QR when ready */}
              <div className="flex justify-center">
                {inviteUrl ? (
                  <div className="p-3 rounded-2xl bg-white">
                    <QRCodeSVG
                      value={inviteUrl}
                      size={160}
                      bgColor="#ffffff"
                      fgColor="#0a0a0f"
                      level="M"
                    />
                  </div>
                ) : (
                  <div className="w-[184px] h-[184px] rounded-2xl bg-secondary/40 border border-border/20 flex flex-col items-center justify-center gap-2 animate-pulse">
                    <div className="w-6 h-6 rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan animate-spin" style={{ animationDuration: '0.8s' }} />
                    <span className="text-xs text-muted-foreground">Generating...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/30">
                <span className="flex-1 text-sm font-mono text-foreground truncate">{inviteUrl}</span>
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

              {/* Group Info Card - Compact */}
              <div className="px-4 py-3 border-b border-border/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/20 flex items-center justify-center text-lg overflow-hidden shrink-0">
                    {groupInfo?.avatar?.startsWith("http") ? (
                      <img src={groupInfo.avatar} alt={groupInfo.name ?? "Group"} className="w-full h-full object-cover" />
                    ) : (
                      <span>{groupInfo?.avatar ?? "🚀"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h4 className="font-display font-bold text-sm truncate">{groupInfo?.name ?? "Group"}</h4>
                      {groupInfo?.isTokenGated && <span className="text-sm px-2.5 py-0 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 shrink-0">🔒</span>}
                    </div>
                    <p className="text-[13px] text-muted-foreground">{members.length} {t("group.members")} · {onlineCount} online</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-3 border-b border-border/20 grid grid-cols-4 gap-2">
                {[
                  { icon: Search, label: t("group.search"), action: () => { setShowSidebar(false); setShowSearch(true); } },
                  { icon: isMuted ? BellOff : Bell, label: isMuted ? t("group.unmute") : t("group.mute"), action: () => { setIsMuted(!isMuted); toast.success(isMuted ? "Notifications enabled" : "Group muted"); } },
                  { icon: Link2, label: t("group.invite") ?? "Invite", action: () => { setShowSidebar(false); handleOpenInviteModal(); } },
                  { icon: Settings, label: t("group.settings"), action: () => { if (isAdminOrOwner) { setEditGroupName(groupInfo?.name ?? ""); setEditGroupDesc(groupInfo?.description ?? ""); setEditGroupAvatar(groupInfo?.avatar ?? ""); setShowGroupSettings(true); } else { toast.error("只有群主/管理员可以修改设置"); } } },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} onClick={item.action} className="flex flex-col items-center gap-2 py-2 rounded-xl hover:bg-secondary/40 transition-colors">
                      <Icon size={16} className="text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Announcement Edit Section */}
              <div className="border-b border-border/20">
                <button
                  onClick={() => setAnnouncementExpanded(!announcementExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/20 transition-colors"
                >
                  <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Megaphone size={12} />Group Announcement</h5>
                  <div className="flex items-center gap-2">
                    {isAdminOrOwner && (
                      <span onClick={(e) => { e.stopPropagation(); setIsEditingAnnouncement(true); setEditAnnouncementText(announcement.content); setAnnouncementExpanded(true); setTimeout(() => announcementInputRef.current?.focus(), 100); }} className="text-sm text-neon-cyan hover:underline flex items-center gap-0.5 px-2">
                        <Settings size={10} />Edit
                      </span>
                    )}
                    {announcementExpanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                  </div>
                </button>
                {announcementExpanded && (
                  <div className="px-3 pb-2.5">
                    {isEditingAnnouncement ? (
                      <div className="space-y-2">
                        <textarea ref={announcementInputRef} value={editAnnouncementText} onChange={(e) => setEditAnnouncementText(e.target.value)} className="w-full h-20 px-3 py-2 rounded-xl bg-secondary/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 resize-none" placeholder="Write group announcement..." maxLength={300} />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{editAnnouncementText.length}/300</span>
                          <div className="flex gap-2">
                            <button onClick={() => setIsEditingAnnouncement(false)} className="px-3 py-1 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">Cancel</button>
                            <button onClick={async () => { if (editAnnouncementText.trim()) { try { await setAnnouncementMutation.mutateAsync({ groupId, content: editAnnouncementText }); } catch { /* fallback */ } setAnnouncement({ content: editAnnouncementText, author: user?.name ?? "Admin", time: "刚刚" }); setIsEditingAnnouncement(false); setShowAnnouncement(true); toast.success("公告已更新！"); } }} className="px-3 py-1 rounded-lg text-sm bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors">保存</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{announcement.content}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Members List */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-muted-foreground">{t("group.members")} ({members.length})</h5>
                  <span className="text-sm text-neon-green">{onlineCount} {t("group.online")}</span>
                </div>
                {(showAllMembers ? members : members.slice(0, 8)).map((member) => (
                  <button key={member.id} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-secondary/40 transition-colors" onClick={() => setMemberActionTarget(member)}>
                    <div className="relative">
                      <Avatar className="w-8 h-8">{member.avatar?.startsWith("http") && <AvatarImage src={member.avatar} alt={member.name} className="object-cover" loading="lazy" />}<AvatarFallback className="bg-secondary text-xs">{member.avatar?.startsWith("http") ? (member.name?.[0]?.toUpperCase() ?? "?") : (member.avatar ?? "?")}</AvatarFallback></Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${getStatusColor(member.status)}`} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        {getRoleBadge(member.role)}
                        <span className="text-sm font-medium truncate">{member.name}</span>
                        {member.role === "owner" && <span className="text-[13px] px-2 py-0 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">Owner</span>}
                        {member.role === "admin" && <span className="text-[13px] px-2 py-0 rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">Admin</span>}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground/50 shrink-0" />
                  </button>
                ))}
                {members.length > 8 && (
                  <button
                    onClick={() => setShowAllMembers(!showAllMembers)}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors mt-2"
                  >
                    {showAllMembers ? (
                      <><ChevronUp size={12} />Show less</>
                    ) : (
                      <><ChevronDown size={12} />Show all {members.length} members</>
                    )}
                  </button>
                )}
              </div>

              {/* Leave Group */}
              <div className="p-3 border-t border-border/20">
                <button onClick={() => setShowLeaveConfirm(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-neon-red hover:bg-neon-red/10 transition-colors text-sm">
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
                        <Avatar className="w-12 h-12">{memberActionTarget.avatar?.startsWith("http") && <AvatarImage src={memberActionTarget.avatar} alt={memberActionTarget.name} className="object-cover" loading="lazy" />}<AvatarFallback className="bg-secondary text-lg">{memberActionTarget.avatar?.startsWith("http") ? (memberActionTarget.name?.[0]?.toUpperCase() ?? "?") : (memberActionTarget.avatar ?? "?")}</AvatarFallback></Avatar>
                        <div>
                          <div className="flex items-center gap-2.5">{getRoleBadge(memberActionTarget.role)}<span className="font-semibold font-display text-sm">{memberActionTarget.name}</span></div>
                          <p className="text-sm text-muted-foreground capitalize">{memberActionTarget.role}</p>
                        </div>
                      </div>

                      {/* Mention */}
                      <button onClick={() => { setInput(`@${memberActionTarget.name} `); setMemberActionTarget(null); setShowSidebar(false); inputRef.current?.focus(); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors">
                        <AtSign size={18} className="text-neon-purple" />
                        <div className="text-left"><p className="text-sm font-medium">Mention in Chat</p><p className="text-sm text-muted-foreground">Send a message mentioning this member</p></div>
                      </button>

                      {/* Admin actions (only for admin/owner, not targeting owner) */}
                      {isAdminOrOwner && memberActionTarget.role !== "owner" && memberActionTarget.id !== String(user?.id) && (
                        <>
                          <button onClick={() => muteMemberMutation.mutate({ groupId, targetUserId: Number(memberActionTarget.id) })} className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors">
                            <VolumeX size={18} className="text-amber-400" />
                            <div className="text-left"><p className="text-sm font-medium">Mute for 24h</p><p className="text-sm text-muted-foreground">Prevent from sending messages</p></div>
                          </button>
                          <button onClick={() => unmuteMemberMutation.mutate({ groupId, targetUserId: Number(memberActionTarget.id) })} className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 transition-colors">
                            <Volume2 size={18} className="text-neon-green" />
                            <div className="text-left"><p className="text-sm font-medium">Unmute</p><p className="text-sm text-muted-foreground">Restore messaging ability</p></div>
                          </button>
                          <button onClick={() => { kickMemberMutation.mutate({ groupId, targetUserId: Number(memberActionTarget.id) }); setMemberActionTarget(null); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-neon-red/5 hover:bg-neon-red/10 transition-colors">
                            <UserMinus size={18} className="text-neon-red" />
                            <div className="text-left"><p className="text-sm font-medium text-neon-red">Remove from Group</p><p className="text-sm text-muted-foreground">Kick this member out</p></div>
                          </button>
                        </>
                      )}

                      {/* Transfer ownership (only owner can do this) */}
                      {myMember?.role === "owner" && memberActionTarget.role !== "owner" && memberActionTarget.id !== String(user?.id) && (
                        <button onClick={() => { transferOwnershipMutation.mutate({ groupId, newOwnerId: Number(memberActionTarget.id) }); setMemberActionTarget(null); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-400/5 hover:bg-amber-400/10 transition-colors">
                          <RefreshCw size={18} className="text-amber-400" />
                          <div className="text-left"><p className="text-sm font-medium text-amber-400">Transfer Ownership</p><p className="text-sm text-muted-foreground">Make this member the new owner</p></div>
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

      {/* ─── Context Menu (right-click / long-press) ─────────────────────────── */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 min-w-[160px] rounded-2xl bg-popover border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 180), top: Math.min(contextMenu.y, window.innerHeight - 200) }}
          >
            <button onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary/60 transition-colors">
              <Reply size={15} className="text-neon-cyan" />回复
            </button>
            <button onClick={() => { navigator.clipboard.writeText(contextMenu.msg.content); toast.success("已复制"); setContextMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary/60 transition-colors">
              <Copy size={15} className="text-muted-foreground" />复制
            </button>
            <button onClick={() => { setEmojiPickerMsgId(contextMenu.msg.id); setContextMenu(null); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary/60 transition-colors">
              <Smile size={15} className="text-amber-400" />表情反应
            </button>
            {(contextMenu.msg.isMine || myMember?.role === "owner" || myMember?.role === "admin") && (
              <>
                <div className="h-px bg-border/30 mx-3" />
                <button onClick={() => {
                  const numId = parseInt(contextMenu.msg.id, 10);
                  setMessages(prev => prev.filter(m => m.id !== contextMenu.msg.id));
                  if (!isNaN(numId)) deleteMessageMutation.mutate({ messageId: numId, groupId });
                  setContextMenu(null);
                }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neon-red hover:bg-neon-red/10 transition-colors">
                  <Trash2 size={15} />删除消息
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ─── Group Settings Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showGroupSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/20">
                <h3 className="font-display font-bold text-base">群组设置</h3>
                <button onClick={() => setShowGroupSettings(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2.5 block">群组名称</label>
                  <input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} maxLength={50} placeholder="输入群组名称" className="w-full px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2.5 block">群组描述</label>
                  <textarea value={editGroupDesc} onChange={e => setEditGroupDesc(e.target.value)} maxLength={200} rows={3} placeholder="群组简介..." className="w-full px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 resize-none" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2.5 block">群组头像 URL（可选）</label>
                  <input value={editGroupAvatar} onChange={e => setEditGroupAvatar(e.target.value)} placeholder="https://... 或输入 emoji" className="w-full px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50" />
                </div>
                <button onClick={() => updateGroupInfoMutation.mutate({ groupId, name: editGroupName.trim() || undefined, description: editGroupDesc.trim() || undefined, avatar: editGroupAvatar.trim() || undefined })} disabled={updateGroupInfoMutation.isPending} className="w-full py-3 rounded-xl bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/25 transition-colors text-sm font-medium disabled:opacity-50">
                  {updateGroupInfoMutation.isPending ? "保存中..." : "保存修改"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Message Search Panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-14 left-0 right-0 z-40 glass border-b border-border/30 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input ref={focusOnMount} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索消息..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
              {searchQuery && <span className="text-sm text-muted-foreground">{searchResults.length} 条</span>}
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors">
                <X size={14} />
              </button>
            </div>
            {searchQuery && searchResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                {searchResults.map(m => (
                  <button key={m.id} onClick={() => { const el = document.getElementById(`msg-${m.id}`); el?.scrollIntoView({ behavior: "smooth", block: "center" }); el?.classList.add("ring-2", "ring-neon-cyan/50"); setTimeout(() => el?.classList.remove("ring-2", "ring-neon-cyan/50"), 2000); setShowSearch(false); setSearchQuery(""); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-secondary/40 transition-colors">
                    <p className="text-sm text-muted-foreground">{m.sender} · {m.time}</p>
                    <p className="text-sm text-foreground truncate">{m.content}</p>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground text-center py-2">未找到相关消息</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Leave Group AlertDialog ──────────────────────────────────────────── */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent className="bg-card border border-border/40 max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <LogOut size={18} className="text-neon-red" />
              退出群聊
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              确定要退出 <span className="text-foreground font-medium">{groupInfo?.name ?? "该群组"}</span> 吗？退出后将无法查看群消息，需要重新申请加入。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="flex-1 h-10 rounded-xl border-border/40 hover:bg-secondary/60">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => leaveGroupMutation.mutate({ groupId })}
              disabled={leaveGroupMutation.isPending}
              className="flex-1 h-10 rounded-xl bg-neon-red/15 text-neon-red border border-neon-red/30 hover:bg-neon-red/25 transition-colors"
            >
              {leaveGroupMutation.isPending ? "退出中..." : "确认退出"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── 红包弹窗 ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showRedPacket && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowRedPacket(false)}>
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-md bg-card border-t border-border/40 rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-base flex items-center gap-2"><Gift size={18} className="text-[#ff6b35]" />发红包</h3>
                <button onClick={() => setShowRedPacket(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="总金额"
                    value={rpAmount}
                    onChange={e => setRpAmount(e.target.value)}
                    className="flex-1 bg-secondary/40 border border-border/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff6b35]/50"
                  />
                  <select value={rpToken} onChange={e => setRpToken(e.target.value)} className="bg-secondary/40 border border-border/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="ETH">ETH</option>
                    <option value="BNB">BNB</option>
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">份数（多人抢包）</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="份数"
                      value={rpCount}
                      onChange={e => setRpCount(e.target.value)}
                      className="w-full bg-secondary/40 border border-border/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff6b35]/50"
                    />
                  </div>
                  {rpAmount && rpCount && parseFloat(rpAmount) > 0 && parseInt(rpCount) > 0 && (
                    <div className="text-right pt-4">
                      <p className="text-xs text-muted-foreground">平均每份</p>
                      <p className="text-sm font-mono text-[#ff6b35]">{(parseFloat(rpAmount) / parseInt(rpCount)).toFixed(4)} {rpToken}</p>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="祝福语（可选）"
                  value={rpNote}
                  onChange={e => setRpNote(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff6b35]/50"
                />
                <button
                  onClick={handleSendRedPacket}
                  disabled={!rpAmount || parseFloat(rpAmount) <= 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ff3366] text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🧧 发出 {rpCount || 5} 份红包
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 转账弹窗 ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showTransfer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowTransfer(false)}>
            <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="w-full max-w-md bg-card border-t border-border/40 rounded-t-2xl p-5 pb-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-base flex items-center gap-2"><ArrowUpDown size={18} className="text-neon-cyan" />转账</h3>
                <button onClick={() => setShowTransfer(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="金额"
                    value={tfAmount}
                    onChange={e => setTfAmount(e.target.value)}
                    className="flex-1 bg-secondary/40 border border-border/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-neon-cyan/50"
                  />
                  <select value={tfToken} onChange={e => setTfToken(e.target.value)} className="bg-secondary/40 border border-border/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none">
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="ETH">ETH</option>
                    <option value="BNB">BNB</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="备注（可选）"
                  value={tfNote}
                  onChange={e => setTfNote(e.target.value)}
                  className="w-full bg-secondary/40 border border-border/30 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-neon-cyan/50"
                />
                <button
                  onClick={handleSendTransfer}
                  disabled={!tfAmount || parseFloat(tfAmount) <= 0}
                  className="w-full py-3 rounded-xl bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  确认转账
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Red Packet Claim Result Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {claimResult && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setClaimResult(null)}
          >
            <motion.div
              className="relative flex flex-col items-center"
              initial={{ scale: 0.5, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onClick={e => e.stopPropagation()}
            >
              {/* 火焰粒子动画背景 */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: ["#ff6b35","#ffd700","#ff3366","#00d4ff","#a855f7"][i % 5],
                      left: `${10 + (i * 7) % 80}%`,
                      top: `${5 + (i * 11) % 60}%`,
                    }}
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0], y: [-20, -60 - i * 5] }}
                    transition={{ duration: 1.2, delay: i * 0.08, ease: "easeOut" }}
                  />
                ))}
              </div>

              {/* 卡片主体 */}
              <div className="bg-gradient-to-b from-[#c0392b] to-[#922b21] rounded-3xl shadow-2xl overflow-hidden" style={{ width: 280 }}>
                {/* 顶部标题 */}
                <div className="bg-gradient-to-br from-[#e74c3c] to-[#c0392b] px-6 pt-8 pb-4 text-center">
                  <motion.div
                    initial={{ rotate: -10, scale: 0.8 }}
                    animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-6xl mb-3"
                  >
                    🧧
                  </motion.div>
                  <p className="text-red-100 text-sm font-medium">恭喜你抢到了红包！</p>
                </div>

                {/* 金额展示 */}
                <div className="bg-[#f9e4b7] px-6 py-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5, delay: 0.3, type: "spring" }}
                  >
                    <p className="text-[#8b4513] text-sm mb-1">收到金额</p>
                    <p className="text-[#c0392b] font-bold" style={{ fontSize: 40, lineHeight: 1.2 }}>
                      {claimResult.amount}
                    </p>
                    <p className="text-[#8b4513] text-lg font-semibold mt-1">{claimResult.token}</p>
                  </motion.div>

                  <div className="mt-4 pt-4 border-t border-[#d4a85a]/40 flex items-center justify-center gap-2 text-sm text-[#8b4513]">
                    <span>第 {claimResult.rank} 个抢到</span>
                    <span className="text-[#d4a85a]">·</span>
                    <span>共 {claimResult.total} 份</span>
                  </div>

                  {claimResult.rank === 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-600 text-xs font-semibold"
                    >
                      🏆 手气最佳！手最快的人
                    </motion.div>
                  )}
                </div>

                {/* 关闭按钮 */}
                <button
                  onClick={() => setClaimResult(null)}
                  className="w-full py-3.5 bg-[#c0392b] text-red-100 text-sm font-semibold hover:bg-[#a93226] transition-colors"
                >
                  收下了，谢谢！
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
