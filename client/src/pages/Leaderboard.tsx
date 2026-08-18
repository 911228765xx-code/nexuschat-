/*
 * Leaderboard — 排行榜
 * 积分排行/邀请排行/收益排行，周榜/月榜/总榜
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Trophy, Medal, Crown, Star, Users,
  TrendingUp, Sparkles, ChevronDown, Flame, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { useApp } from "@/contexts/AppContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

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

  // ─── Real leaderboard data ───
  const { data: lbData, isLoading: lbLoading } = trpc.user.leaderboard.useQuery(
    { limit: 50 },
    { staleTime: 60_000 }
  );
  const { isAuthenticated } = useAuth();
  const { data: myRankData } = trpc.user.myRank.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const { data: inviteLbData, isLoading: inviteLbLoading } = trpc.user.inviteLeaderboard.useQuery(
    { limit: 50 },
    { staleTime: 60_000, enabled: activeTab === "invites" }
  );
  const { data: profitLbData, isLoading: profitLbLoading } = trpc.user.profitLeaderboard.useQuery(
    { limit: 50 },
    { staleTime: 60_000, enabled: activeTab === "profit" }
  );

  const isLoading = activeTab === "points" ? lbLoading : activeTab === "invites" ? inviteLbLoading : profitLbLoading;

  const data = useMemo(() => {
    const myEntry: LeaderboardEntry = {
      rank: myRankData?.rank ?? 9999,
      name: profile.displayName,
      avatar: profile.avatar,
      value: `${(myRankData?.npPoints ?? 0).toLocaleString()} IT`,
      valueNum: myRankData?.npPoints ?? 0,
      change: "+0",
      isMe: true,
    };

    if (activeTab === "points") {
      const list: LeaderboardEntry[] = (lbData ?? []).map((u) => ({
        rank: u.rank,
        name: u.displayName,
        avatar: u.avatar ?? "\ud83d\udc64",
        value: `${(u.npPoints ?? 0).toLocaleString()} IT`,
        valueNum: u.npPoints ?? 0,
        change: "+0",
        badge: u.rank === 1 ? "\ud83c\udfc6" : u.rank === 2 ? "\ud83e\udd48" : u.rank === 3 ? "\ud83e\udd49" : undefined,
      }));
      return { list, me: myEntry };
    }

    if (activeTab === "invites") {
      const list: LeaderboardEntry[] = (inviteLbData ?? []).map((u) => ({
        rank: u.rank,
        name: u.displayName,
        avatar: u.avatar ?? "\ud83d\udc64",
        value: String(u.inviteCount),
        valueNum: u.inviteCount,
        change: "+0",
        badge: u.rank === 1 ? "\ud83c\udfc6" : u.rank === 2 ? "\ud83e\udd48" : u.rank === 3 ? "\ud83e\udd49" : undefined,
      }));
      return { list, me: { ...myEntry, value: "0", valueNum: 0 } };
    }

    // profit tab
    const list: LeaderboardEntry[] = (profitLbData ?? []).map((u) => ({
      rank: u.rank,
      name: u.displayName,
      avatar: u.avatar ?? "\ud83d\udc64",
      value: `${u.tradeCount} trades`,
      valueNum: u.tradeCount,
      change: "+0",
      badge: u.rank === 1 ? "\ud83c\udfc6" : u.rank === 2 ? "\ud83e\udd48" : u.rank === 3 ? "\ud83e\udd49" : undefined,
    }));
    return { list, me: { ...myEntry, value: "0 trades", valueNum: 0 } };
  }, [activeTab, profile, lbData, myRankData, inviteLbData, profitLbData]);

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
                className={`flex-1 flex items-center justify-center gap-2.5 py-2 rounded-xl text-sm font-medium transition-all ${
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
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                timeRange === range
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`leaderboard.${range}`)}
            </button>
          ))}
        </div>

        {/* Loading / Empty state */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : data.list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Trophy size={32} className="text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t("leaderboard.empty") || "No data yet"}</p>
          </div>
        ) : (
        <>
        {/* Top 3 Podium — correct order: 2nd (left), 1st (center, tallest), 3rd (right) */}
        <div className="px-4 mb-4">
          <div className="flex items-end justify-center gap-3">
            {/* 2nd place — left */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex-1 flex flex-col items-center"
            >
              <Avatar className="w-14 h-14 ring-2 ring-slate-400/50 mb-2">
                {data.list[1]?.avatar?.startsWith("http") && <AvatarImage src={data.list[1].avatar} alt={data.list[1].name} className="object-cover" />}
                <AvatarFallback className="bg-secondary text-xl">{data.list[1]?.avatar?.startsWith("http") ? data.list[1]?.name?.slice(0,2).toUpperCase() : data.list[1]?.avatar}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate max-w-full text-center">{data.list[1]?.name}</span>
              <span className="text-sm font-mono text-slate-400 mt-0.5">{data.list[1]?.value}</span>
              <div className="w-full mt-2 pt-5 pb-3 rounded-t-2xl bg-gradient-to-t from-slate-400/15 to-transparent border-t-2 border-x-2 border-slate-400/25 flex items-center justify-center">
                <span className="text-2xl">🥈</span>
              </div>
            </motion.div>

            {/* 1st place — center, tallest */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex-1 flex flex-col items-center"
            >
              <div className="relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Crown size={22} className="text-amber-400 drop-shadow-lg" />
                </div>
                <Avatar className="w-[72px] h-[72px] ring-2 ring-amber-400/70 mb-2 mt-2">
                  {data.list[0]?.avatar?.startsWith("http") && <AvatarImage src={data.list[0].avatar} alt={data.list[0].name} className="object-cover" />}
                  <AvatarFallback className="bg-secondary text-2xl">{data.list[0]?.avatar?.startsWith("http") ? data.list[0]?.name?.slice(0,2).toUpperCase() : data.list[0]?.avatar}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-sm font-bold font-display truncate max-w-full text-center">{data.list[0]?.name}</span>
              <span className="text-sm font-mono text-amber-400 mt-0.5">{data.list[0]?.value}</span>
              <div className="w-full mt-2 pt-8 pb-3 rounded-t-2xl bg-gradient-to-t from-amber-400/15 to-transparent border-t-2 border-x-2 border-amber-400/30 flex items-center justify-center">
                <span className="text-3xl">🏆</span>
              </div>
            </motion.div>

            {/* 3rd place — right */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex-1 flex flex-col items-center"
            >
              <Avatar className="w-14 h-14 ring-2 ring-amber-700/50 mb-2">
                {data.list[2]?.avatar?.startsWith("http") && <AvatarImage src={data.list[2].avatar} alt={data.list[2].name} className="object-cover" />}
                <AvatarFallback className="bg-secondary text-xl">{data.list[2]?.avatar?.startsWith("http") ? data.list[2]?.name?.slice(0,2).toUpperCase() : data.list[2]?.avatar}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate max-w-full text-center">{data.list[2]?.name}</span>
              <span className="text-sm font-mono text-amber-700/80 mt-0.5">{data.list[2]?.value}</span>
              <div className="w-full mt-2 pt-3 pb-3 rounded-t-2xl bg-gradient-to-t from-amber-700/15 to-transparent border-t-2 border-x-2 border-amber-700/25 flex items-center justify-center">
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
              {data.me.avatar?.startsWith("http") && <AvatarImage src={data.me.avatar} alt={data.me.name} className="object-cover" />}
              <AvatarFallback className="bg-secondary text-base">{data.me.avatar?.startsWith("http") ? data.me.name?.slice(0,2).toUpperCase() : data.me.avatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold">{data.me.name}</span>
                <span className="text-sm px-2.5 py-1 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20">{t("leaderboard.you")}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t("leaderboard.thisWeek")}: {data.me.change}</span>
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
              <span className="text-sm font-bold font-mono text-muted-foreground w-6 text-center">{entry.rank}</span>
              <Avatar className="w-9 h-9">
                {entry.avatar?.startsWith("http") && <AvatarImage src={entry.avatar} alt={entry.name} className="object-cover" />}
                <AvatarFallback className="bg-secondary text-sm">{entry.avatar?.startsWith("http") ? entry.name?.slice(0,2).toUpperCase() : entry.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{entry.name}</span>
                <span className="text-sm text-neon-green font-mono">{entry.change}</span>
              </div>
              <span className="text-sm font-bold font-mono text-muted-foreground">{entry.value}</span>
            </motion.div>
          ))}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
