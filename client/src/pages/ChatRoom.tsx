/*
 * ChatRoom — 聊天室页面（v1.3增强版）
 * 消息回复引用、表情反应、图片发送、AI指令、红包/转账、多语言
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Send, Smile, Image as ImageIcon, MoreVertical, Bot, X, Reply, Gift, ArrowUpDown, ChevronDown, Wallet, Mic, MapPin, FileText, Play, Pause, Volume2, Download, Plus, Copy, Forward, Star, Trash2 } from "lucide-react";
import EnhancedInput from "@/components/EnhancedInput";
import SwipeMessage from "@/components/SwipeMessage";
import SwipeBack from "@/components/SwipeBack";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";

type MessageType = "text" | "image" | "voice" | "location" | "file" | "redpacket" | "transfer" | "ai";

interface Message {
  id: string;
  sender: string;
  senderAvatar: string;
  content: string;
  time: string;
  isMine: boolean;
  type?: MessageType;
  isAI?: boolean;
  reactions?: Record<string, number>;
  replyTo?: { sender: string; content: string };
  imageUrl?: string;
  isRedPacket?: boolean;
  isTransfer?: boolean;
  cryptoAmount?: string;
  cryptoToken?: string;
  // Voice message
  voiceDuration?: number;
  voiceWaveform?: number[];
  // Location message
  locationName?: string;
  locationAddress?: string;
  locationLat?: number;
  locationLng?: number;
  // File message
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  // Image gallery
  imageGallery?: string[];
  // Read receipt
  readStatus?: "sent" | "delivered" | "read";
}

const EMOJI_LIST = ["👍", "❤️", "🔥", "🚀", "😂", "😮", "🎉", "💎"];

const TOKENS = [
  { symbol: "ETH", name: "Ethereum", icon: "⟠", balance: "2.45" },
  { symbol: "USDT", name: "Tether", icon: "₮", balance: "1,280.50" },
  { symbol: "BTC", name: "Bitcoin", icon: "₿", balance: "0.085" },
  { symbol: "SOL", name: "Solana", icon: "◎", balance: "34.2" },
  { symbol: "MATIC", name: "Polygon", icon: "⬡", balance: "520.0" },
];

const mockMessages: Message[] = [
  { id: "1", sender: "vitalik.eth", senderAvatar: "V", content: "你看了最新的 EIP-4844 提案吗？", time: "14:20", isMine: false, type: "text", readStatus: "read" },
  { id: "2", sender: "me", senderAvatar: "M", content: "看了，Proto-Danksharding 对 L2 的费用影响很大", time: "14:21", isMine: true, type: "text", replyTo: { sender: "vitalik.eth", content: "你看了最新的 EIP-4844 提案吗？" }, readStatus: "read" },
  { id: "3", sender: "vitalik.eth", senderAvatar: "V", content: "是的，预计 L2 交易费用能降低 10-100 倍。Arbitrum 和 Optimism 都会受益 🚀", time: "14:22", isMine: false, type: "text", reactions: { "🔥": 3, "👍": 2 } },
  { id: "v1", sender: "vitalik.eth", senderAvatar: "V", content: "", time: "14:22", isMine: false, type: "voice", voiceDuration: 12, voiceWaveform: [0.3, 0.5, 0.8, 0.6, 0.9, 0.4, 0.7, 0.5, 0.3, 0.6, 0.8, 0.4, 0.2, 0.5, 0.7, 0.9, 0.6, 0.3, 0.5, 0.4] },
  { id: "4", sender: "me", senderAvatar: "M", content: "", time: "14:23", isMine: true, type: "redpacket", isRedPacket: true, cryptoAmount: "0.05", cryptoToken: "ETH", readStatus: "read" },
  { id: "5", sender: "vitalik.eth", senderAvatar: "V", content: "收到红包！谢谢 🧧", time: "14:24", isMine: false, type: "text", reactions: { "🎉": 2 } },
  { id: "img1", sender: "vitalik.eth", senderAvatar: "V", content: "", time: "14:24", isMine: false, type: "image", imageGallery: ["https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=300&fit=crop", "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&h=300&fit=crop"] },
  { id: "6", sender: "me", senderAvatar: "M", content: "ETH 2.0 的质押收益率现在怎么样？", time: "14:25", isMine: true, type: "text", readStatus: "read" },
  { id: "loc1", sender: "me", senderAvatar: "M", content: "", time: "14:25", isMine: true, type: "location", locationName: "ETH Denver 2026", locationAddress: "National Western Complex, Denver, CO", locationLat: 39.7817, locationLng: -104.9718, readStatus: "delivered" },
  { id: "7", sender: "vitalik.eth", senderAvatar: "V", content: "", time: "14:25", isMine: false, type: "transfer", isTransfer: true, cryptoAmount: "100", cryptoToken: "USDT" },
  { id: "file1", sender: "vitalik.eth", senderAvatar: "V", content: "", time: "14:26", isMine: false, type: "file", fileName: "EIP-4844_Analysis.pdf", fileSize: "2.4 MB", fileType: "PDF" },
  { id: "8", sender: "vitalik.eth", senderAvatar: "V", content: "目前大约在 4-5% APY，质押率持续上升中", time: "14:26", isMine: false, type: "text", reactions: { "💎": 1 } },
  { id: "v2", sender: "me", senderAvatar: "M", content: "", time: "14:26", isMine: true, type: "voice", voiceDuration: 5, voiceWaveform: [0.2, 0.4, 0.7, 0.5, 0.8, 0.6, 0.3, 0.5, 0.4, 0.2], readStatus: "sent" },
  { id: "9", sender: "NexusBot", senderAvatar: "🤖", content: "📊 **ETH 投研快报**\n\n💰 价格: $3,842.50 (+2.4%)\n📈 市值: $461.8B (#2)\n🔒 TVL: $58.2B\n⛓️ 24h活跃地址: 524,891\n\n🤖 AI评级: **强烈看好** (8.5/10)\n\n> ETH 基本面强劲，质押率持续上升，L2生态蓬勃发展。建议长期持有。", time: "14:27", isMine: false, type: "ai", isAI: true },
];

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);
  const [showRedPacket, setShowRedPacket] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showForward, setShowForward] = useState(false);
  const [forwardMsgId, setForwardMsgId] = useState<string | null>(null);
  const [forwardTarget, setForwardTarget] = useState<string | null>(null);
  const fileDocRef = useRef<HTMLInputElement>(null);
  const [rpAmount, setRpAmount] = useState("");
  const [rpToken, setRpToken] = useState("ETH");
  const [rpMessage, setRpMessage] = useState("");
  const [rpCount, setRpCount] = useState("1");
  const [tfAmount, setTfAmount] = useState("");
  const [tfToken, setTfToken] = useState("USDT");
  const [tfNote, setTfNote] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  // Simulate typing indicator after user sends a message
  const simulateTyping = useCallback(() => {
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000 + Math.random() * 2000);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    document.addEventListener("scroll", handler, true);
    return () => { document.removeEventListener("click", handler); document.removeEventListener("scroll", handler, true); };
  }, [contextMenu]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiPickerMsgId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Parse groupId from URL param (DM rooms use numeric IDs)
  const groupId = id ? parseInt(id, 10) : NaN;
  const isValidRoom = !isNaN(groupId) && groupId > 0;

  // tRPC: poll messages from backend every 3s
  const { data: serverMessages } = trpc.chat.getMessages.useQuery(
    { groupId, limit: 50 },
    {
      enabled: isValidRoom,
      refetchInterval: 3000,
      staleTime: 2000,
    }
  );

  // Merge server messages with local optimistic messages
  useEffect(() => {
    if (!serverMessages || serverMessages.length === 0) return;
    setMessages((prev) => {
      const serverIds = new Set(serverMessages.map((m) => String(m.id)));
      // Keep local-only optimistic messages (timestamp-based IDs)
      const localOnly = prev.filter((m) => !serverIds.has(m.id) && Number(m.id) > 1_700_000_000_000);
      const mapped: Message[] = serverMessages.map((m) => ({
        id: String(m.id),
        sender: m.senderName ?? "Unknown",
        senderAvatar: m.senderAvatar ?? "👤",
        content: m.content,
        time: new Date(m.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        isMine: false,
        readStatus: "read" as const,
        ...(m.mediaUrl ? { imageUrl: m.mediaUrl } : {}),
      }));
      return [...mapped, ...localOnly];
    });
  }, [serverMessages]);

  // tRPC: save DM message (non-blocking)
  const saveMessage = trpc.chat.saveMessage.useMutation({
    onError: (err) => console.warn("[ChatRoom] save failed:", err.message),
  });

  const handleSend = useCallback(() => {
    if (!input.trim() && !imagePreview) return;
    const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    const msgId = Date.now().toString();
    const newMsg: Message = {
      id: msgId,
      sender: "me",
      senderAvatar: "M",
      content: input,
      time: now,
      isMine: true,
      readStatus: "sent",
      ...(replyTo ? { replyTo: { sender: replyTo.sender, content: replyTo.content.slice(0, 60) } } : {}),
      ...(imagePreview ? { imageUrl: imagePreview } : {}),
    };

    // Simulate read receipt progression: sent → delivered → read
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, readStatus: "delivered" as const } : m));
    }, 800);
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, readStatus: "read" as const } : m));
    }, 2500);
    setMessages((prev) => [...prev, newMsg]);
    // Persist to backend (best-effort)
    if (input.trim() && isValidRoom) {
      saveMessage.mutate({ groupId, content: input });
    }
    setInput("");
    setReplyTo(null);
    setImagePreview(null);
    simulateTyping();

    if (input.startsWith("/research")) {
      const token = input.replace("/research", "").trim().toUpperCase() || "BTC";
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "NexusBot",
            senderAvatar: "🤖",
            content: `📊 **${token} 投研快报**\n\n💰 价格: $67,432.10 (+1.8%)\n📈 市值: $1.32T (#1)\n🔒 TVL: $12.8B\n⛓️ 24h活跃地址: 892,341\n\n🤖 AI评级: **看好** (7.8/10)\n\n> ${token} 链上数据表现活跃，机构持仓持续增加。短期注意回调风险。`,
            time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            isMine: false,
            isAI: true,
          },
        ]);
      }, 1500);
    }
  }, [input, replyTo, imagePreview]);

  const handleSendRedPacket = () => {
    if (!rpAmount || parseFloat(rpAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "me",
        senderAvatar: "M",
        content: rpMessage || "🧧 Best wishes!",
        time: now,
        isMine: true,
        isRedPacket: true,
        cryptoAmount: rpAmount,
        cryptoToken: rpToken,
      },
    ]);
    setShowRedPacket(false);
    setRpAmount("");
    setRpMessage("");
    setRpCount("1");
    toast.success("Red packet sent!");
  };

  const handleSendTransfer = () => {
    if (!tfAmount || parseFloat(tfAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "me",
        senderAvatar: "M",
        content: tfNote || "",
        time: now,
        isMine: true,
        isTransfer: true,
        cryptoAmount: tfAmount,
        cryptoToken: tfToken,
      },
    ]);
    setShowTransfer(false);
    setTfAmount("");
    setTfNote("");
    toast.success("Transfer sent!");
  };

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const selectedRpToken = TOKENS.find((t) => t.symbol === rpToken);
  const selectedTfToken = TOKENS.find((t) => t.symbol === tfToken);

  // Render red packet message bubble
  const renderRedPacketBubble = (msg: Message) => (
    <div
      className={`rounded-2xl overflow-hidden ${msg.isMine ? "rounded-br-md" : "rounded-bl-md"}`}
      style={{ minWidth: 200 }}
    >
      <div className="bg-gradient-to-br from-red-500 to-orange-500 p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Gift size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm font-bold font-mono">
              {msg.cryptoAmount} {msg.cryptoToken}
            </p>
            <p className="text-white/70 text-[10px]">Crypto Red Packet</p>
          </div>
        </div>
        {msg.content && (
          <p className="text-white/90 text-xs mt-1 italic">"{msg.content}"</p>
        )}
      </div>
      <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/20 px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] text-red-400/80">🧧 NexusChat Red Packet</span>
        <button
          onClick={() => toast.success("Red packet opened! 🎉")}
          className="text-[10px] text-red-400 font-medium hover:text-red-300 transition-colors"
        >
          {msg.isMine ? "Sent" : "Open →"}
        </button>
      </div>
    </div>
  );

  // Render transfer message bubble
  const renderTransferBubble = (msg: Message) => (
    <div
      className={`rounded-2xl overflow-hidden ${msg.isMine ? "rounded-br-md" : "rounded-bl-md"}`}
      style={{ minWidth: 200 }}
    >
      <div className="bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 p-3.5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center">
            <ArrowUpDown size={14} className="text-neon-cyan" />
          </div>
          <div>
            <p className="text-foreground text-sm font-bold font-mono">
              {msg.cryptoAmount} {msg.cryptoToken}
            </p>
            <p className="text-muted-foreground text-[10px]">
              {msg.isMine ? "Transfer to vitalik.eth" : "Transfer from vitalik.eth"}
            </p>
          </div>
        </div>
        {msg.content && (
          <p className="text-muted-foreground text-xs mt-1">Note: {msg.content}</p>
        )}
      </div>
      <div className="bg-card/50 border-x border-b border-neon-cyan/20 px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Wallet size={10} /> On-chain Transfer
        </span>
        <span className="text-[10px] text-neon-green font-mono">Confirmed ✓</span>
      </div>
    </div>
  );

  // Render voice message bubble
  const renderVoiceBubble = (msg: Message) => {
    const isPlaying = playingVoiceId === msg.id;
    const bars = msg.voiceWaveform || [];
    return (
      <div
        className={`rounded-2xl px-3.5 py-2.5 ${msg.isMine ? "rounded-br-md" : "rounded-bl-md"} ${msg.isMine ? "bg-neon-cyan/15 border border-neon-cyan/20" : "bg-secondary/60 border border-border/20"}`}
        style={{ minWidth: 180 }}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setPlayingVoiceId(isPlaying ? null : msg.id);
              if (!isPlaying) setTimeout(() => setPlayingVoiceId(null), (msg.voiceDuration || 5) * 1000);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${msg.isMine ? "bg-neon-cyan/30 text-neon-cyan" : "bg-secondary text-foreground"}`}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <div className="flex items-end gap-[2px] h-6 flex-1">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                className={`w-[3px] rounded-full ${msg.isMine ? "bg-neon-cyan" : "bg-foreground/40"}`}
                initial={{ height: 4 }}
                animate={{
                  height: isPlaying ? h * 24 : h * 16,
                  opacity: isPlaying ? [0.5, 1, 0.5] : 0.6,
                }}
                transition={{
                  height: { duration: 0.3, delay: isPlaying ? i * 0.05 : 0 },
                  opacity: isPlaying ? { duration: 0.6, repeat: Infinity, delay: i * 0.05 } : { duration: 0.2 },
                }}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            {msg.voiceDuration ? `${Math.floor(msg.voiceDuration / 60)}:${String(msg.voiceDuration % 60).padStart(2, "0")}` : "0:00"}
          </span>
        </div>
      </div>
    );
  };

  // Render image gallery bubble
  const renderImageBubble = (msg: Message) => (
    <div className={`rounded-2xl overflow-hidden ${msg.isMine ? "rounded-br-md" : "rounded-bl-md"}`}>
      {msg.imageGallery && msg.imageGallery.length > 1 ? (
        <div className="grid grid-cols-2 gap-0.5" style={{ maxWidth: 260 }}>
          {msg.imageGallery.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`photo ${i + 1}`}
              className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => { setViewerImages(msg.imageGallery!); setViewerIndex(i); }}
            />
          ))}
        </div>
      ) : msg.imageGallery ? (
        <img
          src={msg.imageGallery[0]}
          alt="shared"
          className="max-w-[260px] max-h-[200px] object-cover rounded-2xl cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => { setViewerImages(msg.imageGallery!); setViewerIndex(0); }}
        />
      ) : msg.imageUrl ? (
        <img
          src={msg.imageUrl}
          alt="shared"
          className="max-w-[260px] max-h-[200px] object-cover rounded-2xl"
        />
      ) : null}
    </div>
  );

  // Render location message bubble
  const renderLocationBubble = (msg: Message) => (
    <div
      className={`rounded-2xl overflow-hidden ${msg.isMine ? "rounded-br-md" : "rounded-bl-md"} border ${msg.isMine ? "border-neon-cyan/20" : "border-border/20"}`}
      style={{ minWidth: 220, maxWidth: 260 }}
    >
      {/* Map preview placeholder */}
      <div className="h-28 bg-gradient-to-br from-neon-cyan/10 via-secondary/30 to-neon-purple/10 flex items-center justify-center relative">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-3 left-4 w-16 h-0.5 bg-muted-foreground/30 rounded" />
          <div className="absolute top-6 left-8 w-24 h-0.5 bg-muted-foreground/20 rounded" />
          <div className="absolute top-10 left-3 w-20 h-0.5 bg-muted-foreground/30 rounded" />
          <div className="absolute bottom-8 right-4 w-16 h-0.5 bg-muted-foreground/20 rounded" />
          <div className="absolute bottom-4 right-8 w-12 h-0.5 bg-muted-foreground/30 rounded" />
          <div className="absolute top-1/2 left-1/4 w-0.5 h-12 bg-muted-foreground/20 rounded" />
          <div className="absolute top-1/3 right-1/3 w-0.5 h-16 bg-muted-foreground/20 rounded" />
        </div>
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-neon-red/20 flex items-center justify-center animate-pulse">
            <MapPin size={20} className="text-neon-red" />
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-neon-red/40" />
        </div>
      </div>
      <div className={`px-3 py-2.5 ${msg.isMine ? "bg-neon-cyan/5" : "bg-card/50"}`}>
        <p className="text-sm font-medium truncate">{msg.locationName}</p>
        <p className="text-[10px] text-muted-foreground truncate">{msg.locationAddress}</p>
      </div>
    </div>
  );

  // Render file message bubble
  const renderFileBubble = (msg: Message) => {
    const getFileIcon = (type?: string) => {
      switch (type?.toUpperCase()) {
        case "PDF": return { bg: "bg-red-500/15", text: "text-red-400", label: "PDF" };
        case "DOC": case "DOCX": return { bg: "bg-blue-500/15", text: "text-blue-400", label: "DOC" };
        case "XLS": case "XLSX": return { bg: "bg-green-500/15", text: "text-green-400", label: "XLS" };
        default: return { bg: "bg-secondary/50", text: "text-muted-foreground", label: type || "FILE" };
      }
    };
    const fi = getFileIcon(msg.fileType);
    return (
      <div
        className={`rounded-2xl px-3.5 py-3 ${msg.isMine ? "rounded-br-md bg-neon-cyan/15 border border-neon-cyan/20" : "rounded-bl-md bg-secondary/60 border border-border/20"}`}
        style={{ minWidth: 200 }}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${fi.bg} flex items-center justify-center shrink-0`}>
            <span className={`text-[10px] font-bold font-mono ${fi.text}`}>{fi.label}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{msg.fileName}</p>
            <p className="text-[10px] text-muted-foreground">{msg.fileSize}</p>
          </div>
          <button
            onClick={() => toast.info("Download started")}
            className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center hover:bg-secondary/80 transition-colors shrink-0"
          >
            <Download size={14} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <SwipeBack backPath="/app/chat">
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 border-b border-border/30">
        <div className="flex items-center gap-3 px-3 h-14">
          <button
            onClick={() => setLocation("/app/chat")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <Avatar className="w-9 h-9">
            <AvatarFallback className="bg-secondary text-sm font-display">V</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold font-display truncate">vitalik.eth</h2>
            <p className="text-[10px] text-neon-green flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green inline-block" />
              Online
            </p>
          </div>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors">
            <MoreVertical size={18} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <SwipeMessage
              key={`swipe-${msg.id}`}
              onSwipeReply={() => setReplyTo(msg)}
              enabled={!msg.isMine}
            >
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.isMine ? "justify-end" : "justify-start"} group relative`}
              onContextMenu={(e: React.MouseEvent) => {
                e.preventDefault();
                const x = Math.min(e.clientX, window.innerWidth - 180);
                const y = Math.min(e.clientY, window.innerHeight - 200);
                setContextMenu({ msgId: msg.id, x, y });
              }}
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
                  {/* Reply reference */}
                  {msg.replyTo && (
                    <div className={`flex items-center gap-1.5 mb-1 px-3 py-1.5 rounded-lg bg-secondary/30 border-l-2 border-neon-cyan/40 text-[11px] text-muted-foreground ${msg.isMine ? "ml-auto" : ""}`}>
                      <Reply size={10} className="shrink-0 text-neon-cyan" />
                      <span className="text-neon-cyan font-medium">{msg.replyTo.sender}</span>
                      <span className="truncate">{msg.replyTo.content}</span>
                    </div>
                  )}

                  {/* Message bubble - conditional rendering */}
                  {msg.type === "voice" ? (
                    renderVoiceBubble(msg)
                  ) : (msg.type === "image" || (msg.imageGallery && msg.imageGallery.length > 0)) ? (
                    renderImageBubble(msg)
                  ) : msg.type === "location" ? (
                    renderLocationBubble(msg)
                  ) : msg.type === "file" ? (
                    renderFileBubble(msg)
                  ) : msg.isRedPacket ? (
                    renderRedPacketBubble(msg)
                  ) : msg.isTransfer ? (
                    renderTransferBubble(msg)
                  ) : (
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
                      {msg.imageUrl && (
                        <div className="mb-2 rounded-lg overflow-hidden">
                          <img src={msg.imageUrl} alt="shared" className="max-w-[240px] max-h-[200px] object-cover rounded-lg" />
                        </div>
                      )}
                      {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                    </div>
                  )}

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
                      className={`absolute z-20 ${msg.isMine ? "right-0" : "left-0"} -top-12 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-popover/95 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-150`}
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

                  {/* Reactions display */}
                  <div className={`flex items-center gap-1 mt-1 flex-wrap ${msg.isMine ? "justify-end" : ""}`}>
                    <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                    {/* Read receipt indicator */}
                    {msg.isMine && msg.readStatus && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${
                        msg.readStatus === "read" ? "text-neon-cyan" :
                        msg.readStatus === "delivered" ? "text-muted-foreground" :
                        "text-muted-foreground/50"
                      }`}>
                        {msg.readStatus === "sent" ? (
                          <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5l3 3L12 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : (
                          <svg width="18" height="10" viewBox="0 0 18 10" fill="none"><path d="M1 5l3 3L12 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 5l3 3L16 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                        {msg.readStatus === "read" && <span className="text-[9px] font-medium">Read</span>}
                      </span>
                    )}
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
            </SwipeMessage>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 px-4 py-2"
          >
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback className="bg-secondary text-xs">{id?.[0]?.toUpperCase() || "V"}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-secondary/60 border border-border/20 rounded-bl-md">
              <motion.span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0 }} />
              <motion.span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} />
              <motion.span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{t("chat.typing")}</span>
          </motion.div>
        )}
      </div>

      {/* Context Menu (long press / right click) */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="fixed z-[100] min-w-[160px] rounded-xl bg-popover/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { icon: Copy, label: t("chat.copy"), action: () => { const msg = messages.find(m => m.id === contextMenu.msgId); if (msg?.content) { navigator.clipboard.writeText(msg.content); toast.success(t("chat.copied")); } setContextMenu(null); } },
              { icon: Reply, label: t("chat.replyAction"), action: () => { const msg = messages.find(m => m.id === contextMenu.msgId); if (msg) setReplyTo(msg); setContextMenu(null); } },
              { icon: Forward, label: t("chat.forward"), action: () => { setForwardMsgId(contextMenu.msgId); setShowForward(true); setContextMenu(null); } },
              { icon: Star, label: t("chat.favorite"), action: () => { toast.success(t("chat.favorited")); setContextMenu(null); } },
              { icon: Trash2, label: t("chat.deleteMsg"), action: () => { setMessages(prev => prev.filter(m => m.id !== contextMenu.msgId)); toast.success(t("chat.msgDeleted")); setContextMenu(null); }, danger: true },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  onClick={item.action}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    (item as any).danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Red Packet Modal */}
      <AnimatePresence>
        {showRedPacket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRedPacket(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border overflow-hidden"
            >
              {/* Red Packet Header */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift size={20} className="text-white" />
                    <h3 className="text-white font-bold font-display text-lg">Send Red Packet</h3>
                  </div>
                  <button onClick={() => setShowRedPacket(false)} className="text-white/70 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-white/70 text-xs mt-1">Send crypto red packets to friends</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Token selector */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Token</label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {TOKENS.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => setRpToken(token.symbol)}
                        className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                          rpToken === token.symbol
                            ? "border-red-500/50 bg-red-500/10"
                            : "border-border/30 bg-secondary/30 hover:bg-secondary/50"
                        }`}
                      >
                        <span className="text-lg">{token.icon}</span>
                        <div className="text-left">
                          <p className="text-xs font-mono font-semibold">{token.symbol}</p>
                          <p className="text-[10px] text-muted-foreground">{token.balance}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount input */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={rpAmount}
                      onChange={(e) => setRpAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-12 px-4 pr-16 rounded-xl bg-secondary/40 border border-border/30 text-lg font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-muted-foreground">
                      {rpToken}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Balance: {selectedRpToken?.balance} {rpToken}
                  </p>
                </div>

                {/* Red packet count */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Number of packets</label>
                  <input
                    type="number"
                    value={rpCount}
                    onChange={(e) => setRpCount(e.target.value)}
                    min="1"
                    max="100"
                    className="w-full h-10 px-4 rounded-xl bg-secondary/40 border border-border/30 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50 transition-all"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Message (optional)</label>
                  <input
                    type="text"
                    value={rpMessage}
                    onChange={(e) => setRpMessage(e.target.value)}
                    placeholder="Best wishes! 🧧"
                    className="w-full h-10 px-4 rounded-xl bg-secondary/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50 transition-all"
                  />
                </div>

                {/* Send button */}
                <button
                  onClick={handleSendRedPacket}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-red-500/20"
                >
                  Send {rpAmount || "0"} {rpToken} Red Packet
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransfer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTransfer(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl bg-card border-t border-border overflow-hidden"
            >
              {/* Transfer Header */}
              <div className="bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 px-5 py-4 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown size={20} className="text-neon-cyan" />
                    <h3 className="text-foreground font-bold font-display text-lg">Transfer</h3>
                  </div>
                  <button onClick={() => setShowTransfer(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-muted-foreground text-xs mt-1">Send crypto to vitalik.eth</p>
              </div>

              <div className="p-5 space-y-4">
                {/* Recipient */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-secondary text-sm font-display">V</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold font-display">vitalik.eth</p>
                    <p className="text-[10px] text-muted-foreground font-mono">0x71C7...3a9b</p>
                  </div>
                </div>

                {/* Token selector */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Token</label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {TOKENS.map((token) => (
                      <button
                        key={token.symbol}
                        onClick={() => setTfToken(token.symbol)}
                        className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                          tfToken === token.symbol
                            ? "border-neon-cyan/50 bg-neon-cyan/10"
                            : "border-border/30 bg-secondary/30 hover:bg-secondary/50"
                        }`}
                      >
                        <span className="text-lg">{token.icon}</span>
                        <div className="text-left">
                          <p className="text-xs font-mono font-semibold">{token.symbol}</p>
                          <p className="text-[10px] text-muted-foreground">{token.balance}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={tfAmount}
                      onChange={(e) => setTfAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-12 px-4 pr-16 rounded-xl bg-secondary/40 border border-border/30 text-lg font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-muted-foreground">
                      {tfToken}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Balance: {selectedTfToken?.balance} {tfToken}
                  </p>
                </div>

                {/* Note */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Note (optional)</label>
                  <input
                    type="text"
                    value={tfNote}
                    onChange={(e) => setTfNote(e.target.value)}
                    placeholder="What's this for?"
                    className="w-full h-10 px-4 rounded-xl bg-secondary/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 transition-all"
                  />
                </div>

                {/* Gas estimate */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/10">
                  <span className="text-xs text-muted-foreground">Estimated Gas</span>
                  <span className="text-xs font-mono text-foreground">~0.002 ETH ($3.84)</span>
                </div>

                {/* Send button */}
                <button
                  onClick={handleSendTransfer}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-neon-cyan/20"
                >
                  Send {tfAmount || "0"} {tfToken}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="glass border-t border-border/30 px-3 py-2 pb-[env(safe-area-inset-bottom)]">
        {/* Reply preview bar */}
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

        {/* Image preview */}
        {imagePreview && (
          <div className="relative inline-block mb-2">
            <img src={imagePreview} alt="preview" className="max-h-32 rounded-xl border border-border/30" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-destructive text-white text-xs shadow-lg"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Command suggestions */}
        {input.startsWith("/") && (
          <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
            {["/research ETH", "/research BTC", "/research SOL"].map((cmd) => (
              <button
                key={cmd}
                onClick={() => setInput(cmd)}
                className="shrink-0 text-[11px] font-mono px-2.5 py-1 rounded-lg bg-neon-purple/10 text-neon-purple border border-neon-purple/20 hover:bg-neon-purple/20 transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>
        )}

        {/* Recording UI */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3 mb-2 px-3 py-2.5 rounded-xl bg-neon-red/10 border border-neon-red/20"
            >
              <motion.div
                className="w-3 h-3 rounded-full bg-neon-red"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-sm text-neon-red font-mono flex-1">
                Recording... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
              </span>
              <button
                onClick={() => {
                  if (recordingInterval.current) clearInterval(recordingInterval.current);
                  setIsRecording(false);
                  setRecordingTime(0);
                  toast.info("Recording cancelled");
                }}
                className="w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <X size={14} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => {
                  if (recordingInterval.current) clearInterval(recordingInterval.current);
                  const duration = recordingTime;
                  setIsRecording(false);
                  setRecordingTime(0);
                  const waveform = Array.from({ length: 20 }, () => Math.random() * 0.7 + 0.2);
                  const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
                  setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    sender: "me", senderAvatar: "M", content: "", time: now, isMine: true,
                    type: "voice", voiceDuration: duration || 1, voiceWaveform: waveform,
                  }]);
                  toast.success("Voice message sent!");
                }}
                className="w-8 h-8 rounded-full bg-neon-cyan flex items-center justify-center hover:bg-neon-cyan/80 transition-colors"
              >
                <Send size={14} className="text-background" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attach menu */}
        <AnimatePresence>
          {showAttachMenu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-2"
            >
              <div className="grid grid-cols-4 gap-2 p-2">
                {[
                  { icon: ImageIcon, label: "Photo", color: "text-neon-green", bg: "bg-neon-green/10", action: () => { fileInputRef.current?.click(); setShowAttachMenu(false); } },
                  { icon: MapPin, label: "Location", color: "text-blue-400", bg: "bg-blue-400/10", action: () => {
                    const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
                    setMessages(prev => [...prev, {
                      id: Date.now().toString(), sender: "me", senderAvatar: "M", content: "", time: now, isMine: true,
                      type: "location", locationName: "My Location", locationAddress: "Current GPS Position",
                    }]);
                    setShowAttachMenu(false);
                    toast.success("Location shared!");
                  }},
                  { icon: FileText, label: "File", color: "text-amber-400", bg: "bg-amber-400/10", action: () => { fileDocRef.current?.click(); setShowAttachMenu(false); } },
                  { icon: Gift, label: "Red Packet", color: "text-red-400", bg: "bg-red-400/10", action: () => { setShowRedPacket(true); setShowAttachMenu(false); } },
                  { icon: ArrowUpDown, label: "Transfer", color: "text-neon-cyan", bg: "bg-neon-cyan/10", action: () => { setShowTransfer(true); setShowAttachMenu(false); } },
                  { icon: Mic, label: "Voice", color: "text-neon-purple", bg: "bg-neon-purple/10", action: () => {
                    setIsRecording(true);
                    setRecordingTime(0);
                    recordingInterval.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
                    setShowAttachMenu(false);
                  }},
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                        <Icon size={18} className={item.color} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <input
          ref={fileDocRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
              const sizeKB = file.size / 1024;
              const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB.toFixed(0)} KB`;
              const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
              setMessages(prev => [...prev, {
                id: Date.now().toString(), sender: "me", senderAvatar: "M", content: "", time: now, isMine: true,
                type: "file", fileName: file.name, fileSize: sizeStr, fileType: ext, readStatus: "sent",
              }]);
              toast.success(`File "${file.name}" sent`);
            }
            e.target.value = "";
          }}
          className="hidden"
        />

        <div className="flex items-end gap-1.5">
          {/* Plus / Attach button */}
          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all shrink-0 ${showAttachMenu ? "bg-neon-cyan/20 text-neon-cyan rotate-45" : "hover:bg-secondary/60 text-muted-foreground"}`}
          >
            <Plus size={20} />
          </button>
          {/* Enhanced Input with Markdown, Token prices, Stickers */}
          <div className="flex-1">
            <EnhancedInput
              value={input}
              onChange={setInput}
              onSend={handleSend}
              placeholder={t("chat.inputPlaceholder")}
            />
          </div>
          {/* Mic button */}
          {!input.trim() && !imagePreview && (
            <button
              onClick={() => {
                setIsRecording(true);
                setRecordingTime(0);
                recordingInterval.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
              }}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 transition-all shrink-0"
            >
              <Mic size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
    {/* Image Viewer Lightbox */}
    <AnimatePresence>
      {viewerImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center"
          onClick={() => setViewerImages([])}
        >
          <button onClick={() => setViewerImages([])} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
          <div className="relative w-full h-full flex items-center justify-center px-4">
            {viewerImages.length > 1 && viewerIndex > 0 && (
              <button onClick={(e) => { e.stopPropagation(); setViewerIndex(i => i - 1); }} className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
                <ArrowLeft size={20} />
              </button>
            )}
            <motion.img
              key={viewerIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              src={viewerImages[viewerIndex]}
              alt="preview"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            {viewerImages.length > 1 && viewerIndex < viewerImages.length - 1 && (
              <button onClick={(e) => { e.stopPropagation(); setViewerIndex(i => i + 1); }} className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
                <ChevronDown size={20} className="-rotate-90" />
              </button>
            )}
          </div>
          {viewerImages.length > 1 && (
            <div className="absolute bottom-8 flex gap-2">
              {viewerImages.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setViewerIndex(i); }} className={`w-2 h-2 rounded-full transition-colors ${i === viewerIndex ? "bg-white" : "bg-white/30"}`} />
              ))}
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); const link = document.createElement("a"); link.href = viewerImages[viewerIndex]; link.download = `image-${viewerIndex + 1}.jpg`; link.click(); toast.success("Download started"); }} className="absolute bottom-8 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20">
            <Download size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Forward Message Modal */}
    <AnimatePresence>
      {showForward && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => { setShowForward(false); setForwardMsgId(null); setForwardTarget(null); }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-card rounded-t-2xl border-t border-border/30 max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border/20 flex items-center justify-between">
              <h3 className="font-bold font-display">{t("chat.forwardTo")}</h3>
              <button onClick={() => { setShowForward(false); setForwardMsgId(null); setForwardTarget(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="p-4 border-b border-border/20 bg-secondary/20">
              <p className="text-xs text-muted-foreground mb-1">{t("chat.forwardingMsg")}</p>
              <p className="text-sm truncate">{messages.find(m => m.id === forwardMsgId)?.content || `[${messages.find(m => m.id === forwardMsgId)?.type || "message"}]`}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {["vitalik.eth", "satoshi.btc", "0xDeFi...3a9b", "BAYC Holders 🐵", "DeFi Alpha 🔒"].map((name) => (
                <button
                  key={name}
                  onClick={() => setForwardTarget(name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    forwardTarget === name ? "bg-neon-cyan/10 border border-neon-cyan/30" : "hover:bg-secondary/40"
                  }`}
                >
                  <Avatar className="w-9 h-9"><AvatarFallback className="bg-secondary text-xs">{name[0]}</AvatarFallback></Avatar>
                  <span className="text-sm font-medium flex-1 text-left">{name}</span>
                  {forwardTarget === name && <div className="w-5 h-5 rounded-full bg-neon-cyan flex items-center justify-center"><ChevronDown size={12} className="text-background -rotate-90" /></div>}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-border/20">
              <button
                disabled={!forwardTarget}
                onClick={() => { toast.success(`${t("chat.forwardedTo")} ${forwardTarget}`); setShowForward(false); setForwardMsgId(null); setForwardTarget(null); }}
                className="w-full h-11 rounded-xl bg-neon-cyan text-background font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {t("chat.sendForward")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </SwipeBack>
  );
}
