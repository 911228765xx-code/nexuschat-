/*
 * Chat — 消息列表页
 * Cyberpunk Noir: 深色背景 + 霓虹强调色
 * 展示所有私聊和群聊会话列表
 */
import { useState } from "react";
import { Link } from "wouter";
import { Search, Plus, Users, Lock, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";

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
}

const mockConversations: Conversation[] = [
  {
    id: "1",
    name: "vitalik.eth",
    avatar: "V",
    lastMessage: "ETH 2.0 staking yield looks great 🚀",
    time: "now",
    unread: 3,
    isGroup: false,
    isTokenGated: false,
    isOnline: true,
  },
  {
    id: "2",
    name: "BAYC Holders 🐵",
    avatar: "🐵",
    lastMessage: "Alice: New roadmap is out!",
    time: "5m",
    unread: 12,
    isGroup: true,
    isTokenGated: true,
  },
  {
    id: "3",
    name: "0xDeFi...3a9b",
    avatar: "D",
    lastMessage: "/research SOL report generated",
    time: "15m",
    unread: 0,
    isGroup: false,
    isTokenGated: false,
    isOnline: true,
  },
  {
    id: "4",
    name: "NexusChat Official",
    avatar: "N",
    lastMessage: "Admin: v0.2.0 released!",
    time: "1h",
    unread: 5,
    isGroup: true,
    isTokenGated: false,
  },
  {
    id: "5",
    name: "satoshi.btc",
    avatar: "S",
    lastMessage: "BTC on-chain data shows whale accumulation",
    time: "2h",
    unread: 0,
    isGroup: false,
    isTokenGated: false,
    isOnline: false,
  },
  {
    id: "6",
    name: "DeFi Alpha 🔒",
    avatar: "🔑",
    lastMessage: "Bob: This new LP has 200%+ APY",
    time: "3h",
    unread: 0,
    isGroup: true,
    isTokenGated: true,
  },
  {
    id: "7",
    name: "punk6529.eth",
    avatar: "P",
    lastMessage: "NFT market is recovering, watch Blur data",
    time: "1d",
    unread: 0,
    isGroup: false,
    isTokenGated: false,
    isOnline: false,
  },
];

export default function Chat() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useI18n();

  const filtered = mockConversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
            <Plus size={18} className="text-neon-cyan" />
          </button>
        </div>

        {/* Search */}
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
        {filtered.map((conv, index) => (
          <Link key={conv.id} href={`/app/chat/${conv.id}`}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 active:bg-secondary/60 transition-colors cursor-pointer border-b border-border/10"
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
                  <span className="font-medium text-sm truncate font-display">
                    {conv.name}
                  </span>
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
                <div className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-neon-cyan flex items-center justify-center">
                  <span className="text-[10px] font-bold text-background">
                    {conv.unread > 99 ? "99+" : conv.unread}
                  </span>
                </div>
              )}
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
