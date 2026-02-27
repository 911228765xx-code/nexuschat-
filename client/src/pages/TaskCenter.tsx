/*
 * TaskCenter — 任务中心
 * 每日签到、社交任务、成长任务、积分获取
 */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, CheckCircle2, Circle, Gift, Flame, Star,
  Calendar, MessageCircle, Heart, Share2, Users, Wallet,
  Shield, TrendingUp, Sparkles, ChevronRight, Zap, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  desc: string;
  reward: number;
  icon: React.ReactNode;
  progress: number;
  total: number;
  completed: boolean;
  claimed: boolean;
  category: "daily" | "growth";
}

const CHECKIN_REWARDS = [10, 15, 20, 30, 40, 50, 100];

export default function TaskCenter() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"daily" | "growth" | "history">("daily");
  const [checkinDay, setCheckinDay] = useState(3); // 已签到3天
  const [todayChecked, setTodayChecked] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "d1", title: t("tasks.sendMessage"), desc: t("tasks.sendMessageDesc"),
      reward: 10, icon: <MessageCircle size={16} className="text-neon-cyan" />,
      progress: 3, total: 5, completed: false, claimed: false, category: "daily"
    },
    {
      id: "d2", title: t("tasks.likePosts"), desc: t("tasks.likePostsDesc"),
      reward: 10, icon: <Heart size={16} className="text-neon-red" />,
      progress: 3, total: 3, completed: true, claimed: false, category: "daily"
    },
    {
      id: "d3", title: t("tasks.shareResearch"), desc: t("tasks.shareResearchDesc"),
      reward: 20, icon: <Share2 size={16} className="text-neon-purple" />,
      progress: 0, total: 1, completed: false, claimed: false, category: "daily"
    },
    {
      id: "d4", title: t("tasks.joinGroup"), desc: t("tasks.joinGroupDesc"),
      reward: 15, icon: <Users size={16} className="text-neon-green" />,
      progress: 1, total: 1, completed: true, claimed: true, category: "daily"
    },
    {
      id: "g1", title: t("tasks.completeProfile"), desc: t("tasks.completeProfileDesc"),
      reward: 100, icon: <Star size={16} className="text-amber-400" />,
      progress: 4, total: 5, completed: false, claimed: false, category: "growth"
    },
    {
      id: "g2", title: t("tasks.bindENS"), desc: t("tasks.bindENSDesc"),
      reward: 200, icon: <Shield size={16} className="text-neon-cyan" />,
      progress: 1, total: 1, completed: true, claimed: true, category: "growth"
    },
    {
      id: "g3", title: t("tasks.connectWallet"), desc: t("tasks.connectWalletDesc"),
      reward: 150, icon: <Wallet size={16} className="text-neon-green" />,
      progress: 1, total: 1, completed: true, claimed: false, category: "growth"
    },
    {
      id: "g4", title: t("tasks.firstTrade"), desc: t("tasks.firstTradeDesc"),
      reward: 300, icon: <TrendingUp size={16} className="text-neon-purple" />,
      progress: 0, total: 1, completed: false, claimed: false, category: "growth"
    },
    {
      id: "g5", title: t("tasks.inviteFriends"), desc: t("tasks.inviteFriendsDesc"),
      reward: 500, icon: <Gift size={16} className="text-neon-red" />,
      progress: 5, total: 10, completed: false, claimed: false, category: "growth"
    },
  ]);

  const dailyTasks = tasks.filter(t => t.category === "daily");
  const growthTasks = tasks.filter(t => t.category === "growth");
  const dailyCompleted = dailyTasks.filter(t => t.completed).length;
  const dailyTotal = dailyTasks.length;
  const totalNPToday = dailyTasks.filter(t => t.claimed).reduce((s, t) => s + t.reward, 0) + (todayChecked ? CHECKIN_REWARDS[checkinDay - 1] || 10 : 0);

  const handleCheckin = () => {
    if (todayChecked) return;
    setTodayChecked(true);
    const reward = CHECKIN_REWARDS[checkinDay] || 10;
    setCheckinDay(prev => Math.min(prev + 1, 7));
    toast.success(`${t("tasks.checkinSuccess")} +${reward} NP`);
  };

  const handleClaim = (taskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, claimed: true } : t
    ));
    const task = tasks.find(t => t.id === taskId);
    if (task) toast.success(`${t("tasks.claimed")} +${task.reward} NP`);
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
          <Zap size={20} className="text-neon-purple" />
          <h1 className="flex-1 text-base font-semibold font-display">{t("tasks.title")}</h1>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
            <Sparkles size={12} className="text-neon-purple" />
            <span className="text-xs font-bold font-mono text-neon-purple">24,680 NP</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Checkin Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-br from-neon-purple/10 via-card to-neon-cyan/10 border border-neon-purple/20"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-neon-red" />
              <span className="text-sm font-semibold">{t("tasks.dailyCheckin")}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neon-red/10 text-neon-red border border-neon-red/20 font-mono">
                {checkinDay}{t("tasks.dayStreak")}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">{t("tasks.todayEarned")}: +{totalNPToday} NP</span>
          </div>

          {/* 7-day checkin grid */}
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {CHECKIN_REWARDS.map((reward, i) => {
              const isChecked = i < checkinDay || (i === checkinDay && todayChecked);
              const isToday = i === checkinDay && !todayChecked;
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center py-2 rounded-xl transition-all ${
                    isChecked
                      ? "bg-neon-green/15 border border-neon-green/30"
                      : isToday
                        ? "bg-neon-cyan/10 border border-neon-cyan/30 ring-1 ring-neon-cyan/40"
                        : "bg-secondary/30 border border-border/20"
                  }`}
                >
                  <span className="text-[9px] text-muted-foreground">{t("tasks.day")}{i + 1}</span>
                  {isChecked ? (
                    <CheckCircle2 size={16} className="text-neon-green my-1" />
                  ) : (
                    <span className="text-xs font-bold font-mono my-1 text-muted-foreground">+{reward}</span>
                  )}
                  {i === 6 && !isChecked && (
                    <span className="text-[8px] text-neon-purple">×2</span>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleCheckin}
            disabled={todayChecked}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
              todayChecked
                ? "bg-secondary/30 text-muted-foreground cursor-not-allowed"
                : "bg-gradient-to-r from-neon-cyan to-neon-purple text-white hover:opacity-90 active:scale-[0.98] shadow-lg shadow-neon-purple/20"
            }`}
          >
            {todayChecked ? (
              <span className="flex items-center justify-center gap-1.5">
                <CheckCircle2 size={15} />
                {t("tasks.checkedIn")}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Calendar size={15} />
                {t("tasks.checkinNow")} (+{CHECKIN_REWARDS[checkinDay] || 10} NP)
              </span>
            )}
          </button>
        </motion.div>

        {/* Daily Progress */}
        <div className="mx-4 mt-3 p-3 rounded-xl bg-card/50 border border-border/20">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium">{t("tasks.dailyProgress")}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{dailyCompleted}/{dailyTotal}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary/60 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(dailyCompleted / dailyTotal) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full rounded-full bg-gradient-to-r from-neon-green to-neon-cyan"
            />
          </div>
          {dailyCompleted === dailyTotal && (
            <p className="text-[10px] text-neon-green mt-1 flex items-center gap-1">
              <Sparkles size={10} />
              {t("tasks.allDailyDone")}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 mt-4 mb-3">
          {(["daily", "growth", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-neon-purple/15 text-neon-purple border border-neon-purple/30"
                  : "bg-secondary/40 text-muted-foreground border border-border/20 hover:bg-secondary/60"
              }`}
            >
              {t(`tasks.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
            </button>
          ))}
        </div>

        {/* Task Lists */}
        <div className="px-4 pb-8 space-y-2">
          {activeTab === "daily" && dailyTasks.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i} onClaim={handleClaim} t={t} />
          ))}

          {activeTab === "growth" && growthTasks.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i} onClaim={handleClaim} t={t} />
          ))}

          {activeTab === "history" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {/* Point History */}
              <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/10">
                  <h4 className="text-xs font-medium text-muted-foreground">{t("tasks.pointHistory")}</h4>
                </div>
                {[
                  { action: t("tasks.historyCheckin"), amount: "+30", time: t("tasks.today"), color: "text-neon-green" },
                  { action: t("tasks.historyTask"), amount: "+15", time: t("tasks.today"), color: "text-neon-cyan" },
                  { action: t("tasks.historyInvite"), amount: "+500", time: t("tasks.yesterday"), color: "text-neon-purple" },
                  { action: t("tasks.historyTrade"), amount: "+50", time: t("tasks.yesterday"), color: "text-neon-green" },
                  { action: t("tasks.historyCheckin"), amount: "+20", time: t("tasks.yesterday"), color: "text-neon-green" },
                  { action: t("tasks.historyBadge"), amount: "+100", time: "3d ago", color: "text-amber-400" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border/10 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-secondary/40 flex items-center justify-center">
                      <Sparkles size={14} className={item.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{item.action}</p>
                      <p className="text-[10px] text-muted-foreground">{item.time}</p>
                    </div>
                    <span className={`text-xs font-bold font-mono ${item.color}`}>{item.amount} NP</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, index, onClaim, t }: {
  task: Task;
  index: number;
  onClaim: (id: string) => void;
  t: (key: string) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
        task.claimed
          ? "bg-secondary/20 border-border/10 opacity-60"
          : task.completed
            ? "bg-neon-green/5 border-neon-green/15"
            : "bg-card/50 border-border/20"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        task.claimed ? "bg-secondary/30" : task.completed ? "bg-neon-green/15" : "bg-secondary/40"
      }`}>
        {task.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${task.claimed ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{task.desc}</p>
        {!task.completed && task.total > 1 && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 rounded-full bg-secondary/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-neon-cyan transition-all"
                style={{ width: `${(task.progress / task.total) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">{task.progress}/{task.total}</span>
          </div>
        )}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-[10px] font-bold font-mono text-neon-purple">+{task.reward} NP</span>
        {task.claimed ? (
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
            <CheckCircle2 size={10} />
            {t("tasks.claimed")}
          </span>
        ) : task.completed ? (
          <button
            onClick={() => onClaim(task.id)}
            className="px-2.5 py-1 rounded-lg bg-neon-green/15 text-neon-green text-[10px] font-medium border border-neon-green/20 hover:bg-neon-green/25 transition-all active:scale-95"
          >
            {t("tasks.claim")}
          </button>
        ) : (
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
            <Clock size={10} />
            {t("tasks.inProgress")}
          </span>
        )}
      </div>
    </motion.div>
  );
}
