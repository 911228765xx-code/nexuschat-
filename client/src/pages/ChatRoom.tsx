/*
 * ChatRoom — 聊天室页面（v1.3增强版）
 * 消息回复引用、表情反应、图片发送、AI指令、红包/转账、多语言
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Send, Smile, Image as ImageIcon, MoreVertical, Bot, X, Reply, Gift, ArrowUpDown, ChevronDown, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: string;
  senderAvatar: string;
  content: string;
  time: string;
  isMine: boolean;
  isAI?: boolean;
  reactions?: Record<string, number>;
  replyTo?: { sender: string; content: string };
  imageUrl?: string;
  isRedPacket?: boolean;
  isTransfer?: boolean;
  cryptoAmount?: string;
  cryptoToken?: string;
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
  { id: "1", sender: "vitalik.eth", senderAvatar: "V", content: "你看了最新的 EIP-4844 提案吗？", time: "14:20", isMine: false },
  { id: "2", sender: "me", senderAvatar: "M", content: "看了，Proto-Danksharding 对 L2 的费用影响很大", time: "14:21", isMine: true, replyTo: { sender: "vitalik.eth", content: "你看了最新的 EIP-4844 提案吗？" } },
  { id: "3", sender: "vitalik.eth", senderAvatar: "V", content: "是的，预计 L2 交易费用能降低 10-100 倍。Arbitrum 和 Optimism 都会受益 🚀", time: "14:22", isMine: false, reactions: { "🔥": 3, "👍": 2 } },
  { id: "4", sender: "me", senderAvatar: "M", content: "", time: "14:23", isMine: true, isRedPacket: true, cryptoAmount: "0.05", cryptoToken: "ETH" },
  { id: "5", sender: "vitalik.eth", senderAvatar: "V", content: "收到红包！谢谢 🧧", time: "14:24", isMine: false, reactions: { "🎉": 2 } },
  { id: "6", sender: "me", senderAvatar: "M", content: "ETH 2.0 的质押收益率现在怎么样？", time: "14:25", isMine: true },
  { id: "7", sender: "vitalik.eth", senderAvatar: "V", content: "", time: "14:25", isMine: false, isTransfer: true, cryptoAmount: "100", cryptoToken: "USDT" },
  { id: "8", sender: "vitalik.eth", senderAvatar: "V", content: "目前大约在 4-5% APY，质押率持续上升中", time: "14:26", isMine: false, reactions: { "💎": 1 } },
  { id: "9", sender: "NexusBot", senderAvatar: "🤖", content: "📊 **ETH 投研快报**\n\n💰 价格: $3,842.50 (+2.4%)\n📈 市值: $461.8B (#2)\n🔒 TVL: $58.2B\n⛓️ 24h活跃地址: 524,891\n\n🤖 AI评级: **强烈看好** (8.5/10)\n\n> ETH 基本面强劲，质押率持续上升，L2生态蓬勃发展。建议长期持有。", time: "14:27", isMine: false, isAI: true },
];

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showRedPacket, setShowRedPacket] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
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

  const handleSend = useCallback(() => {
    if (!input.trim() && !imagePreview) return;
    const now = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "me",
      senderAvatar: "M",
      content: input,
      time: now,
      isMine: true,
      ...(replyTo ? { replyTo: { sender: replyTo.sender, content: replyTo.content.slice(0, 60) } } : {}),
      ...(imagePreview ? { imageUrl: imagePreview } : {}),
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setReplyTo(null);
    setImagePreview(null);

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

  return (
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
                  {/* Reply reference */}
                  {msg.replyTo && (
                    <div className={`flex items-center gap-1.5 mb-1 px-3 py-1.5 rounded-lg bg-secondary/30 border-l-2 border-neon-cyan/40 text-[11px] text-muted-foreground ${msg.isMine ? "ml-auto" : ""}`}>
                      <Reply size={10} className="shrink-0 text-neon-cyan" />
                      <span className="text-neon-cyan font-medium">{msg.replyTo.sender}</span>
                      <span className="truncate">{msg.replyTo.content}</span>
                    </div>
                  )}

                  {/* Message bubble - conditional rendering */}
                  {msg.isRedPacket ? (
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

        <div className="flex items-end gap-1.5">
          <button
            onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === "__input__" ? null : "__input__")}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors shrink-0 relative"
          >
            <Smile size={20} className="text-muted-foreground" />
            {emojiPickerMsgId === "__input__" && (
              <div className="absolute bottom-12 left-0 flex flex-wrap gap-1 p-2 w-[200px] rounded-xl bg-popover/95 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-20">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInput((prev) => prev + emoji);
                      setEmojiPickerMsgId(null);
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-xl hover:scale-110 transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors shrink-0"
          >
            <ImageIcon size={20} className="text-muted-foreground" />
          </button>
          {/* Red Packet Button */}
          <button
            onClick={() => setShowRedPacket(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-500/10 transition-colors shrink-0"
            title="Send Red Packet"
          >
            <Gift size={19} className="text-red-400" />
          </button>
          {/* Transfer Button */}
          <button
            onClick={() => setShowTransfer(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neon-cyan/10 transition-colors shrink-0"
            title="Transfer"
          >
            <ArrowUpDown size={19} className="text-neon-cyan" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={t("chat.inputPlaceholder")}
              className="w-full h-10 px-4 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() && !imagePreview}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 disabled:opacity-30 disabled:hover:bg-neon-cyan/20 transition-all shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
