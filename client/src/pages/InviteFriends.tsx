/*
 * InviteFriends — 邀请好友裂变页面
 * 邀请码展示、奖励规则、邀请记录、分享海报
 * All data loaded from backend referral API
 */
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Copy, Gift, Users, Sparkles, Share2,
  CheckCircle2, Zap, TrendingUp, UserPlus, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import PosterGenerator from "@/components/PosterGenerator";
import { trpc } from "@/lib/trpc";

export default function InviteFriends() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  const { profile } = useApp();
  const [activeTab, setActiveTab] = useState<"overview" | "records" | "rewards">("overview");
  const [showPoster, setShowPoster] = useState(false);

  // ─── Backend data ──────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = trpc.referral.getStats.useQuery();
  const { data: referralList, isLoading: listLoading } = trpc.referral.listReferrals.useQuery();

  const inviteCode = stats?.inviteCode ?? "";
  const inviteLink = stats?.inviteLink ?? "";
  const totalInvited = stats?.totalInvited ?? 0;
  const activeInvited = stats?.activeInvited ?? 0;
  const totalRewards = stats?.totalRewards ?? 0;
  const tiers = stats?.tiers ?? [];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success(t("invite.codeCopied"));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success(t("invite.linkCopied"));
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t("invite.today") || "Today";
    if (diffDays === 1) return "1d ago";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
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
          <Gift size={20} className="text-neon-green" />
          <h1 className="flex-1 text-base font-semibold font-display">{t("invite.title")}</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Hero Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-5 rounded-2xl bg-gradient-to-br from-neon-green/10 via-card to-neon-cyan/10 border border-neon-green/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-neon-green" />
            <span className="text-xs font-medium text-neon-green">{t("invite.earnTogether")}</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="text-center p-3 rounded-xl bg-background/40">
              {statsLoading ? (
                <Loader2 size={20} className="animate-spin mx-auto text-neon-green" />
              ) : (
                <p className="text-2xl font-bold font-mono text-neon-green">{totalInvited}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("invite.totalInvited")}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-background/40">
              {statsLoading ? (
                <Loader2 size={20} className="animate-spin mx-auto text-neon-cyan" />
              ) : (
                <p className="text-2xl font-bold font-mono text-neon-cyan">{activeInvited}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("invite.activeUsers")}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-background/40">
              {statsLoading ? (
                <Loader2 size={20} className="animate-spin mx-auto text-neon-purple" />
              ) : (
                <p className="text-2xl font-bold font-mono text-neon-purple">{totalRewards.toLocaleString()}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("invite.npEarned")}</p>
            </div>
          </div>

          {/* Invite Code */}
          <div className="p-3.5 rounded-xl bg-background/60 border border-border/30">
            <p className="text-[10px] text-muted-foreground mb-1.5">{t("invite.yourCode")}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-lg font-bold font-mono text-neon-green tracking-wider">
                {statsLoading ? "..." : inviteCode}
              </code>
              <button
                onClick={handleCopyCode}
                disabled={statsLoading}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-neon-green/15 hover:bg-neon-green/25 transition-colors disabled:opacity-50"
              >
                <Copy size={16} className="text-neon-green" />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <button
              onClick={handleCopyLink}
              disabled={statsLoading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-neon-green/15 text-neon-green text-sm font-medium border border-neon-green/20 hover:bg-neon-green/25 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Copy size={15} />
              {t("invite.copyLink")}
            </button>
            <button
              onClick={() => setShowPoster(true)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-neon-cyan/15 text-neon-cyan text-sm font-medium border border-neon-cyan/20 hover:bg-neon-cyan/25 transition-all active:scale-[0.98]"
            >
              <Share2 size={15} />
              {t("invite.sharePoster")}
            </button>
          </div>
        </motion.div>

        {/* Reward Rules */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-4 mt-4 p-4 rounded-2xl bg-card/50 border border-border/20"
        >
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Zap size={14} className="text-neon-purple" />
            {t("invite.rewardRules")}
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neon-green/5 border border-neon-green/10">
              <div className="w-8 h-8 rounded-lg bg-neon-green/15 flex items-center justify-center shrink-0 mt-0.5">
                <UserPlus size={14} className="text-neon-green" />
              </div>
              <div>
                <p className="text-xs font-medium">{t("invite.inviterReward")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("invite.inviterRewardDesc")}</p>
              </div>
              <span className="text-sm font-bold font-mono text-neon-green shrink-0">+500 NP</span>
            </div>
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neon-cyan/5 border border-neon-cyan/10">
              <div className="w-8 h-8 rounded-lg bg-neon-cyan/15 flex items-center justify-center shrink-0 mt-0.5">
                <Gift size={14} className="text-neon-cyan" />
              </div>
              <div>
                <p className="text-xs font-medium">{t("invite.inviteeReward")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("invite.inviteeRewardDesc")}</p>
              </div>
              <span className="text-sm font-bold font-mono text-neon-cyan shrink-0">+200 NP</span>
            </div>
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neon-purple/5 border border-neon-purple/10">
              <div className="w-8 h-8 rounded-lg bg-neon-purple/15 flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={14} className="text-neon-purple" />
              </div>
              <div>
                <p className="text-xs font-medium">{t("invite.tradingBonus")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("invite.tradingBonusDesc")}</p>
              </div>
              <span className="text-sm font-bold font-mono text-neon-purple shrink-0">10%</span>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 mt-4 mb-3">
          {(["overview", "records", "rewards"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-neon-green/15 text-neon-green border border-neon-green/30"
                  : "bg-secondary/40 text-muted-foreground border border-border/20 hover:bg-secondary/60"
              }`}
            >
              {t(`invite.tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="px-4 pb-8">
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {/* Milestone Progress */}
              <div className="p-4 rounded-2xl bg-card/50 border border-border/20">
                <h4 className="text-xs font-medium text-muted-foreground mb-3">{t("invite.milestones")}</h4>
                {tiers.length === 0 && statsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  tiers.map((tier, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border/10 last:border-0">
                      <span className="text-lg">{tier.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{t("invite.invite")} {tier.count} {t("invite.friends")}</span>
                          {tier.unlocked && <CheckCircle2 size={12} className="text-neon-green" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{tier.reward}</p>
                      </div>
                      {!tier.unlocked && (
                        <div className="px-2 py-0.5 rounded-full bg-secondary/40 border border-border/20">
                          <span className="text-[9px] text-muted-foreground">{totalInvited}/{tier.count}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* How it works */}
              <div className="p-4 rounded-2xl bg-card/50 border border-border/20">
                <h4 className="text-xs font-medium text-muted-foreground mb-3">
                  {t("invite.howItWorks")}
                </h4>
                <div className="space-y-3">
                  {[
                    { step: "1", title: t("invite.step1"), desc: t("invite.step1Desc"), color: "neon-green" },
                    { step: "2", title: t("invite.step2"), desc: t("invite.step2Desc"), color: "neon-cyan" },
                    { step: "3", title: t("invite.step3"), desc: t("invite.step3Desc"), color: "neon-purple" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full bg-${item.color}/15 border border-${item.color}/30 flex items-center justify-center shrink-0`}>
                        <span className={`text-xs font-bold text-${item.color}`}>{item.step}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "records" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {listLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-muted-foreground" />
                </div>
              ) : !referralList || referralList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center">
                    <Users size={28} className="text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t("invite.noRecords")}</p>
                </div>
              ) : (
                referralList.map((friend, i) => (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/20"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-secondary text-sm font-display">
                        {typeof friend.avatar === "string" && friend.avatar.length === 1 ? friend.avatar : friend.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{friend.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                          friend.status === "active"
                            ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        }`}>
                          {friend.status === "active" ? t("invite.active") : t("invite.pending")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{formatDate(friend.joinedAt)}</span>
                      </div>
                    </div>
                    {friend.reward > 0 && (
                      <span className="text-xs font-bold font-mono text-neon-green">+{friend.reward} NP</span>
                    )}
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "rewards" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              {/* Reward Summary */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-neon-green/10 to-neon-cyan/10 border border-neon-green/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">{t("invite.totalEarned")}</span>
                  <span className="text-xl font-bold font-mono text-neon-green">{totalRewards.toLocaleString()} NP</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((totalInvited / 25) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-neon-green to-neon-cyan"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {t("invite.nextMilestone")}: {t("invite.invite")} {25 - totalInvited > 0 ? 25 - totalInvited : 0} {t("invite.moreToUnlock")}
                </p>
              </div>

              {/* Reward History */}
              <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/10">
                  <h4 className="text-xs font-medium text-muted-foreground">{t("invite.rewardHistory")}</h4>
                </div>
                {listLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                  </div>
                ) : !referralList || referralList.filter(f => f.reward > 0).length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2">
                    <Gift size={24} className="text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">{t("invite.noRewards") || "No rewards yet"}</p>
                  </div>
                ) : (
                  referralList.filter(f => f.reward > 0).map((friend) => (
                    <div key={friend.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/10 last:border-0">
                      <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center">
                        <Gift size={14} className="text-neon-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{t("invite.referralReward")}: {friend.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(friend.joinedAt)}</p>
                      </div>
                      <span className="text-xs font-bold font-mono text-neon-green">+{friend.reward} NP</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Poster Generator Modal */}
      <PosterGenerator
        isOpen={showPoster}
        onClose={() => setShowPoster(false)}
        inviteCode={inviteCode}
        inviteLink={inviteLink}
        userName={profile.displayName || "cryptowhale.eth"}
        userAvatar={profile.avatar}
        totalInvited={totalInvited}
        totalRewards={totalRewards}
      />
    </div>
  );
}
