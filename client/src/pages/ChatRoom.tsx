/*
 * ChatRoom — 聊天室页面（增强版）
 * 消息回复引用、表情反应弹窗、图片发送预览、AI指令、多语言
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Send, Smile, Image as ImageIcon, MoreVertical, Bot, X, Reply, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";

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
}

const EMOJI_LIST = ["👍", "❤️", "🔥", "🚀", "😂", "😮", "🎉", "💎"];

const mockMessages: Message[] = [
  { id: "1", sender: "vitalik.eth", senderAvatar: "V", content: "你看了最新的 EIP-4844 提案吗？", time: "14:20", isMine: false },
  { id: "2", sender: "me", senderAvatar: "M", content: "看了，Proto-Danksharding 对 L2 的费用影响很大", time: "14:21", isMine: true, replyTo: { sender: "vitalik.eth", content: "你看了最新的 EIP-4844 提案吗？" } },
  { id: "3", sender: "vitalik.eth", senderAvatar: "V", content: "是的，预计 L2 交易费用能降低 10-100 倍。Arbitrum 和 Optimism 都会受益 🚀", time: "14:22", isMine: false, reactions: { "🔥": 3, "👍": 2 } },
  { id: "4", sender: "me", senderAvatar: "M", content: "ETH 2.0 的质押收益率现在怎么样？", time: "14:25", isMine: true },
  { id: "5", sender: "vitalik.eth", senderAvatar: "V", content: "目前大约在 4-5% APY，质押率持续上升中", time: "14:26", isMine: false, reactions: { "💎": 1 } },
  { id: "6", sender: "NexusBot", senderAvatar: "🤖", content: "📊 **ETH 投研快报**\n\n💰 价格: $3,842.50 (+2.4%)\n📈 市值: $461.8B (#2)\n🔒 TVL: $58.2B\n⛓️ 24h活跃地址: 524,891\n\n🤖 AI评级: **强烈看好** (8.5/10)\n\n> ETH 基本面强劲，质押率持续上升，L2生态蓬勃发展。建议长期持有。", time: "14:27", isMine: false, isAI: true },
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Close emoji picker on outside click
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

    // Simulate AI response for /research command
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
                    <div className={`flex items-center gap-1.5 mb-1 px-3 py-1.5 rounded-lg bg-white/5 border-l-2 border-neon-cyan/40 text-[11px] text-muted-foreground ${msg.isMine ? "ml-auto" : ""}`}>
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
                    {msg.imageUrl && (
                      <div className="mb-2 rounded-lg overflow-hidden">
                        <img src={msg.imageUrl} alt="shared" className="max-w-[240px] max-h-[200px] object-cover rounded-lg" />
                      </div>
                    )}
                    {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                  </div>

                  {/* Action buttons (visible on hover) */}
                  <div className={`absolute top-0 ${msg.isMine ? "-left-16" : "-right-16"} hidden group-hover:flex items-center gap-0.5 z-10`}>
                    <button
                      onClick={() => setReplyTo(msg)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Reply"
                    >
                      <Reply size={13} />
                    </button>
                    <button
                      onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === msg.id ? null : msg.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="React"
                    >
                      <Smile size={13} />
                    </button>
                  </div>

                  {/* Emoji picker popup */}
                  {emojiPickerMsgId === msg.id && (
                    <div
                      ref={emojiRef}
                      className={`absolute z-20 ${msg.isMine ? "right-0" : "left-0"} -top-12 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#111827]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-150`}
                    >
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-lg hover:scale-125 transform"
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
                        className="flex items-center gap-0.5 text-xs bg-secondary/60 hover:bg-secondary/80 rounded-full px-1.5 py-0.5 transition-colors border border-border/20"
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
        {/* Reply preview bar */}
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-white/5 border-l-2 border-neon-cyan/40">
            <Reply size={14} className="text-neon-cyan shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-neon-cyan font-medium">{replyTo.sender}</p>
              <p className="text-[11px] text-muted-foreground truncate">{replyTo.content}</p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
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

        <div className="flex items-end gap-2">
          <button
            onClick={() => setEmojiPickerMsgId(emojiPickerMsgId === "__input__" ? null : "__input__")}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors shrink-0 relative"
          >
            <Smile size={20} className="text-muted-foreground" />
            {/* Input emoji picker */}
            {emojiPickerMsgId === "__input__" && (
              <div className="absolute bottom-12 left-0 flex flex-wrap gap-1 p-2 w-[200px] rounded-xl bg-[#111827]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-150 z-20">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInput((prev) => prev + emoji);
                      setEmojiPickerMsgId(null);
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-xl hover:scale-110 transform"
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
