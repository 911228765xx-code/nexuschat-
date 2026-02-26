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
    lastMessage: "ETH 2.0 的质押收益率看起来很不错 🚀",
    time: "刚刚",
    unread: 3,
    isGroup: false,
    isTokenGated: false,
    isOnline: true,
  },
  {
    id: "2",
    name: "BAYC Holders 🐵",
    avatar: "🐵",
    lastMessage: "Alice: 新的路线图发布了，大家看了吗？",
    time: "5分钟前",
    unread: 12,
    isGroup: true,
    isTokenGated: true,
  },
  {
    id: "3",
    name: "0xDeFi...3a9b",
    avatar: "D",
    lastMessage: "/research SOL 的报告已生成",
    time: "15分钟前",
    unread: 0,
    isGroup: false,
    isTokenGated: false,
    isOnline: true,
  },
  {
    id: "4",
    name: "NexusChat 官方群",
    avatar: "N",
    lastMessage: "管理员: 新版本 v0.2.0 已发布！",
    time: "1小时前",
    unread: 5,
    isGroup: true,
    isTokenGated: false,
  },
  {
    id: "5",
    name: "satoshi.btc",
    avatar: "S",
    lastMessage: "BTC 的链上数据显示巨鲸在增持",
    time: "2小时前",
    unread: 0,
    isGroup: false,
    isTokenGated: false,
    isOnline: false,
  },
  {
    id: "6",
    name: "DeFi Alpha 🔒",
    avatar: "🔑",
    lastMessage: "Bob: 这个新的流动性池APY有200%+",
    time: "3小时前",
    unread: 0,
    isGroup: true,
    isTokenGated: true,
  },
  {
    id: "7",
    name: "punk6529.eth",
    avatar: "P",
    lastMessage: "NFT 市场正在回暖，注意 Blur 的数据",
    time: "昨天",
    unread: 0,
    isGroup: false,
    isTokenGated: false,
    isOnline: false,
  },
];

export default function Chat() {
  const [searchQuery, setSearchQuery] = useState("");

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
            <h1 className="text-lg font-semibold font-display">消息</h1>
            <span className="text-[10px] font-mono text-neon-cyan bg-neon-cyan/10 px-1.5 py-0.5 rounded-full">
              E2E加密
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
            placeholder="搜索钱包地址 / ENS / 群名..."
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
