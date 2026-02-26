/*
 * ChatRoom — 聊天室页面
 * 消息气泡、输入框、AI指令支持
 */
import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Send, Smile, Image as ImageIcon, MoreVertical, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: string;
  sender: string;
  senderAvatar: string;
  content: string;
  time: string;
  isMine: boolean;
  isAI?: boolean;
  reactions?: string[];
}

const mockMessages: Message[] = [
  { id: "1", sender: "vitalik.eth", senderAvatar: "V", content: "你看了最新的 EIP-4844 提案吗？", time: "14:20", isMine: false },
  { id: "2", sender: "me", senderAvatar: "M", content: "看了，Proto-Danksharding 对 L2 的费用影响很大", time: "14:21", isMine: true },
  { id: "3", sender: "vitalik.eth", senderAvatar: "V", content: "是的，预计 L2 交易费用能降低 10-100 倍。Arbitrum 和 Optimism 都会受益 🚀", time: "14:22", isMine: false, reactions: ["🔥", "👍"] },
  { id: "4", sender: "me", senderAvatar: "M", content: "ETH 2.0 的质押收益率现在怎么样？", time: "14:25", isMine: true },
  { id: "5", sender: "vitalik.eth", senderAvatar: "V", content: "ETH 2.0 的质押收益率看起来很不错 🚀 目前大约在 4-5% APY", time: "14:26", isMine: false },
  { id: "6", sender: "NexusBot", senderAvatar: "🤖", content: "📊 **ETH 投研快报**\n\n💰 价格: $3,842.50 (+2.4%)\n📈 市值: $461.8B (#2)\n🔒 TVL: $58.2B\n⛓️ 24h活跃地址: 524,891\n\n🤖 AI评级: **强烈看好** (8.5/10)\n\n> ETH 基本面强劲，质押率持续上升，L2生态蓬勃发展。建议长期持有。", time: "14:27", isMine: false, isAI: true },
];

export default function ChatRoom() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "me",
      senderAvatar: "M",
      content: input,
      time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
      isMine: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");

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
              在线
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
              className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-2 max-w-[85%] ${msg.isMine ? "flex-row-reverse" : ""}`}>
                {!msg.isMine && (
                  <Avatar className={`w-7 h-7 shrink-0 mt-1 ${msg.isAI ? "ring-1 ring-neon-purple/50" : ""}`}>
                    <AvatarFallback className="bg-secondary text-xs">
                      {msg.senderAvatar}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
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
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  <div className={`flex items-center gap-2 mt-1 ${msg.isMine ? "justify-end" : ""}`}>
                    <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                    {msg.reactions && (
                      <div className="flex gap-0.5">
                        {msg.reactions.map((r, i) => (
                          <span key={i} className="text-xs bg-secondary/60 rounded-full px-1.5 py-0.5">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="glass border-t border-border/30 px-3 py-2 pb-[env(safe-area-inset-bottom)]">
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
          <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors shrink-0">
            <Smile size={20} className="text-muted-foreground" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors shrink-0">
            <ImageIcon size={20} className="text-muted-foreground" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="输入消息或 /research 代币名..."
              className="w-full h-10 px-4 rounded-xl bg-secondary/60 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 disabled:opacity-30 disabled:hover:bg-neon-cyan/20 transition-all shrink-0"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
