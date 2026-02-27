/*
 * Leaderboard — 排行榜
 * 积分排行/邀请排行/收益排行，周榜/月榜/总榜
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Trophy, Medal, Crown, Star, Users,
  TrendingUp, Sparkles, ChevronDown, Flame
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { useApp } from "@/contexts/AppContext";

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  value: string;
  valueNum: number;
  change: string;
  isMe?: boolean;
  badge?: string;
}

const POINTS_DATA: LeaderboardEntry[] = [
  { rank: 1, name: "whale.eth", avatar: "🐋", value: "128,450 NP", valueNum: 128450, change: "+2,340", badge: "🏆" },
  { rank: 2, name: "defi_king.eth", avatar: "👑", value: "96,200 NP", valueNum: 96200, change: "+1,890", badge: "🥈" },
  { rank: 3, name: "alpha_hunter", avatar: "🦅", value: "87,650 NP", valueNum: 87650, change: "+1,560", badge: "🥉" },
  { rank: 4, name: "nft_wizard.eth", avatar: "🧙", value: "72,300 NP", valueNum: 72300, change: "+980" },
  { rank: 5, name: "dao_master", avatar: "🏛️", value: "65,800 NP", valueNum: 65800, change: "+870" },
  { rank: 6, name: "yield_farmer", avatar: "🌾", value: "58,420 NP", valueNum: 58420, change: "+720" },
  { rank: 7, name: "chain_surfer", avatar: "🏄", value: "51,200 NP", valueNum: 51200, change: "+650" },
  { rank: 8, name: "crypto_punk", avatar: "👾", value: "45,600 NP", valueNum: 45600, change: "+540" },
  { rank: 9, name: "sol_maxi.sol", avatar: "☀️", value: "38,900 NP", valueNum: 38900, change: "+430" },
  { rank: 10, name: "eth_bull.eth", avatar: "🐂", value: "32,100 NP", valueNum: 32100, change: "+380" },
];

const INVITE_DATA: LeaderboardEntry[] = [
  { rank: 1, name: "community_lead", avatar: "🌟", value: "342", valueNum: 342, change: "+28", badge: "🏆" },
  { rank: 2, name: "kol_master.eth", avatar: "📢", value: "256", valueNum: 256, change: "+19", badge: "🥈" },
  { rank: 3, name: "growth_hacker", avatar: "🚀", value: "198", valueNum: 198, change: "+15", badge: "🥉" },
  { rank: 4, name: "web3_evangelist", avatar: "🔥", value: "167", valueNum: 167, change: "+12" },
  { rank: 5, name: "dao_builder.eth", avatar: "🏗️", value: "134", valueNum: 134, change: "+9" },
  { rank: 6, name: "alpha_caller", avatar: "📡", value: "112", valueNum: 112, change: "+8" },
  { rank: 7, name: "nft_collector", avatar: "🎨", value: "98", valueNum: 98, change: "+6" },
  { rank: 8, name: "defi_degen", avatar: "🎰", value: "85", valueNum: 85, change: "+5" },
  { rank: 9, name: "whale_alert", avatar: "🐳", value: "72", valueNum: 72, change: "+4" },
  { rank: 10, name: "moon_boy", avatar: "🌙", value: "61", valueNum: 61, change: "+3" },
];

const PROFIT_DATA: LeaderboardEntry[] = [
  { rank: 1, name: "trade_god.eth", avatar: "⚡", value: "+$48,230", valueNum: 48230, change: "+12.4%", badge: "🏆" },
  { rank: 2, name: "quant_whale", avatar: "🤖", value: "+$35,670", valueNum: 35670, change: "+9.8%", badge: "🥈" },
  { rank: 3, name: "signal_master", avatar: "📊", value: "+$28,900", valueNum: 28900, change: "+8.2%", badge: "🥉" },
  { rank: 4, name: "degen_trader", avatar: "🎯", value: "+$22,450", valueNum: 22450, change: "+7.1%" },
  { rank: 5, name: "arb_hunter.eth", avatar: "🏹", value: "+$18,300", valueNum: 18300, change: "+6.3%" },
  { rank: 6, name: "swing_king", avatar: "👑", value: "+$14,800", valueNum: 14800, change: "+5.5%" },
  { rank: 7, name: "copy_pro", avatar: "📋", value: "+$11,200", valueNum: 11200, change: "+4.8%" },
  { rank: 8, name: "bot_runner", avatar: "🤖", value: "+$8,900", valueNum: 8900, change: "+3.9%" },
  { rank: 9, name: "mev_searcher", avatar: "🔍", value: "+$6,400", valueNum: 6400, change: "+3.2%" },
  { rank: 10, name: "yield_max", avatar: "💰", value: "+$4,800", valueNum: 4800, change: "+2.7%" },
];

const TABS = [
  { key: "points", icon: Sparkles, color: "neon-purple" },
  { key: "invites", icon: Users, color: "neon-green" },
  { key: "profit", icon: TrendingUp, color: "neon-cyan" },
] as const;

const TIME_RANGES = ["week", "month", "all"] as const;

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState<"points" | "invites" | "profit">("points");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week");

  const data = useMemo(() => {
    const base = activeTab === "points" ? POINTS_DATA
      : activeTab === "invites" ? INVITE_DATA
      : PROFIT_DATA;

    // Add "me" entry
    const myEntry: LeaderboardEntry = {
      rank: activeTab === "points" ? 1247 : activeTab === "invites" ? 892 : 456,
      name: profile.displayName,
      avatar: profile.avatar,
      value: activeTab === "points" ? "24,680 NP" : activeTab === "invites" ? "47" : "+$342.80",
      valueNum: activeTab === "points" ? 24680 : activeTab === "invites" ? 47 : 342,
      change: activeTab === "points" ? "+180" : activeTab === "invites" ? "+2" : "+1.2%",
      isMe: true,
    };

    return { list: base, me: myEntry };
  }, [activeTab, profile]);

  const getTabColor = () => {
    return activeTab === "points" ? "neon-purple" : activeTab === "invites" ? "neon-green" : "neon-cyan";
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="glass sticky top-0 z-20 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-3 h-14">
          <button
            onClick={() => setLocation("/app/profile")}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <Trophy size={20} className="text-amber-400" />
          <h1 className="flex-1 text-base font-semibold font-display">{t("leaderboard.title")}</h1>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 pb-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? `bg-${tab.color}/15 text-${tab.color} border border-${tab.color}/30`
                    : "bg-secondary/40 text-muted-foreground border border-border/20 hover:bg-secondary/60"
                }`}
              >
                <Icon size={13} />
                {t(`leaderboard.${tab.key}`)}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Time Range */}
        <div className="flex items-center justify-center gap-2 py-3">
          {TIME_RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
                timeRange === range
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`leaderboard.${range}`)}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        <div className="px-4 mb-4">
          <div className="flex items-end justify-center gap-3">
            {/* 2nd place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex-1 flex flex-col items-center"
            >
              <Avatar className="w-14 h-14 ring-2 ring-gray-400/40 mb-2">
                <AvatarFallback className="bg-secondary text-xl">{data.list[1]?.avatar}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate max-w-full">{data.list[1]?.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{data.list[1]?.value}</span>
              <div className="w-full mt-2 pt-4 pb-3 rounded-t-2xl bg-gradient-to-t from-gray-400/10 to-transparent flex items-center justify-center">
                <span className="text-2xl">🥈</span>
              </div>
            </motion.div>

            {/* 1st place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex-1 flex flex-col items-center"
            >
              <div className="relative">
                <Avatar className="w-18 h-18 ring-2 ring-amber-400/60 mb-2" style={{ width: 72, height: 72 }}>
                  <AvatarFallback className="bg-secondary text-2xl">{data.list[0]?.avatar}</AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-1">
                  <Crown size={20} className="text-amber-400 drop-shadow-lg" />
                </div>
              </div>
              <span className="text-sm font-semibold truncate max-w-full">{data.list[0]?.name}</span>
              <span className="text-xs font-mono text-amber-400 mt-0.5">{data.list[0]?.value}</span>
              <div className="w-full mt-2 pt-6 pb-3 rounded-t-2xl bg-gradient-to-t from-amber-400/10 to-transparent flex items-center justify-center">
                <span className="text-3xl">🏆</span>
              </div>
            </motion.div>

            {/* 3rd place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex-1 flex flex-col items-center"
            >
              <Avatar className="w-14 h-14 ring-2 ring-amber-700/40 mb-2">
                <AvatarFallback className="bg-secondary text-xl">{data.list[2]?.avatar}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate max-w-full">{data.list[2]?.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground mt-0.5">{data.list[2]?.value}</span>
              <div className="w-full mt-2 pt-3 pb-3 rounded-t-2xl bg-gradient-to-t from-amber-700/10 to-transparent flex items-center justify-center">
                <span className="text-2xl">🥉</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* My Ranking Card */}
        <div className="mx-4 mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 border border-neon-cyan/20">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold font-mono text-muted-foreground w-8 text-center">#{data.me.rank}</span>
            <Avatar className="w-10 h-10 ring-2 ring-neon-cyan/40">
              <AvatarFallback className="bg-secondary text-base">{data.me.avatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">{data.me.name}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20">{t("leaderboard.you")}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{t("leaderboard.thisWeek")}: {data.me.change}</span>
            </div>
            <span className={`text-sm font-bold font-mono text-${getTabColor()}`}>{data.me.value}</span>
          </div>
        </div>

        {/* Full List (4-10) */}
        <div className="mx-4 rounded-2xl bg-card/50 border border-border/20 overflow-hidden mb-8">
          {data.list.slice(3).map((entry, i) => (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.04 }}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/10 last:border-0 hover:bg-secondary/20 transition-colors"
            >
              <span className="text-xs font-bold font-mono text-muted-foreground w-6 text-center">{entry.rank}</span>
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-secondary text-sm">{entry.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{entry.name}</span>
                <span className="text-[10px] text-neon-green font-mono">{entry.change}</span>
              </div>
              <span className="text-xs font-bold font-mono text-muted-foreground">{entry.value}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
