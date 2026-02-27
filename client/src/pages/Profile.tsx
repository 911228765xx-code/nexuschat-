/*
 * Profile — 我的个人中心
 * 身份卡片、核心数据、功能入口、主题切换、设置
 * v1.9: AppContext全局状态接入
 */
import { Copy, ChevronRight, Wallet, TrendingUp, FileText, Users, Gift, Trophy, CheckSquare, Settings, Bell, Moon, Sun, LogOut, Shield, Edit3 } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useApp } from "@/contexts/AppContext";

export default function Profile() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();

  // ✅ AppContext全局状态
  const { profile, totalUnreadMessages, unreadNotificationCount } = useApp();

  const menuSections = [
    {
      title: t("profile.activity"),
      items: [
        { icon: Wallet, label: t("profile.wallet"), value: "$12,480.50", color: "text-neon-cyan" },
        { icon: TrendingUp, label: t("profile.strategies"), value: "3", color: "text-neon-green" },
        { icon: FileText, label: t("profile.researchHistory"), value: "23", color: "text-neon-purple" },
        { icon: Users, label: t("profile.groups"), value: "12", color: "text-foreground" },
      ],
    },
    {
      title: t("profile.growth"),
      items: [
        { icon: Gift, label: t("profile.invite"), value: "+1000 NP", color: "text-neon-green" },
        { icon: Trophy, label: t("profile.leaderboard"), value: "#1,247", color: "text-neon-cyan" },
        { icon: CheckSquare, label: t("profile.tasks"), value: "3/5", color: "text-neon-purple" },
      ],
    },
  ];

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(profile.walletAddress);
    toast.success(t("profile.copied"));
  };

  // Truncate wallet address
  const shortAddress = profile.walletAddress.length > 10
    ? profile.walletAddress.slice(0, 6) + "..." + profile.walletAddress.slice(-4)
    : profile.walletAddress;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-2 h-14">
          <h1 className="text-lg font-semibold font-display">{t("profile.title")}</h1>
          <div className="flex-1" />
          <Link href="/app/edit-profile">
            <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors">
              <Edit3 size={18} className="text-muted-foreground" />
            </button>
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Identity Card — now using AppContext profile */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-br from-neon-cyan/10 via-card to-neon-purple/10 border border-border/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Avatar className="w-16 h-16 ring-2 ring-neon-cyan/40">
                <AvatarFallback className="bg-secondary text-xl font-display">{profile.avatar}</AvatarFallback>
              </Avatar>
              {profile.ensVerified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center">
                  <Shield size={12} className="text-neon-purple" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold font-display">{profile.displayName}</h2>
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-1 text-xs text-muted-foreground font-mono hover:text-neon-cyan transition-colors"
              >
                {shortAddress}
                <Copy size={10} />
              </button>
              <div className="flex gap-1.5 mt-1.5">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neon-purple/15 text-neon-purple border border-neon-purple/20 font-medium">
                  {t("profile.genesis")}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20 font-medium">
                  SBT Holder
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">{profile.bio}</p>
          )}

          {/* Core Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t("profile.points"), value: "24,680", sub: "NP", color: "text-neon-cyan" },
              { label: t("profile.tradingProfit"), value: "+$342.80", sub: "", color: "text-neon-green" },
              { label: t("profile.invites"), value: "47", sub: "", color: "text-neon-purple" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-2.5 rounded-xl bg-background/40">
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                <p className={`text-base font-bold font-mono mt-0.5 ${stat.color}`}>
                  {stat.value}
                </p>
                {stat.sub && <p className="text-[9px] text-muted-foreground">{stat.sub}</p>}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Level Progress */}
        <div className="mx-4 mt-3 p-3 rounded-xl bg-card/50 border border-border/20">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium">{t("profile.level")}</span>
            <span className="text-[10px] text-muted-foreground font-mono">24,680 / 30,000 NP</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary/60 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "82%" }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{t("profile.nextLevel")}</p>
        </div>

        {/* Menu Sections */}
        <div className="px-4 py-4 space-y-4">
          {menuSections.map((section, sIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + sIndex * 0.05 }}
            >
              <h3 className="text-xs text-muted-foreground font-medium mb-2 px-1">{section.title}</h3>
              <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden divide-y divide-border/10">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => toast("Coming soon")}
                      className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 active:bg-secondary/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                        <Icon size={16} className={item.color} />
                      </div>
                      <span className="flex-1 text-sm text-left">{item.label}</span>
                      {item.value && (
                        <span className="text-xs text-muted-foreground font-mono">{item.value}</span>
                      )}
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* Settings Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-xs text-muted-foreground font-medium mb-2 px-1">{t("profile.settings")}</h3>
            <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden divide-y divide-border/10">
              {/* Theme Toggle */}
              <button
                onClick={() => toggleTheme?.()}
                className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 active:bg-secondary/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                  {theme === "dark" ? (
                    <Moon size={16} className="text-neon-purple" />
                  ) : (
                    <Sun size={16} className="text-amber-500" />
                  )}
                </div>
                <span className="flex-1 text-sm text-left">{t("profile.darkMode")}</span>
                <div
                  className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                    theme === "dark"
                      ? "bg-neon-cyan/30 border border-neon-cyan/40"
                      : "bg-secondary border border-border"
                  }`}
                >
                  <motion.div
                    layout
                    className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-colors ${
                      theme === "dark"
                        ? "bg-neon-cyan"
                        : "bg-muted-foreground"
                    }`}
                    animate={{ left: theme === "dark" ? "calc(100% - 22px)" : "2px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </button>

              {/* Security */}
              <button
                onClick={() => toast("Coming soon")}
                className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 active:bg-secondary/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <Settings size={16} className="text-foreground" />
                </div>
                <span className="flex-1 text-sm text-left">{t("profile.security")}</span>
                <span className="text-xs text-muted-foreground font-mono">API Key</span>
                <ChevronRight size={14} className="text-muted-foreground" />
              </button>

              {/* Notifications — link to notification center */}
              <Link href="/app/notifications">
                <button className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 active:bg-secondary/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                    <Bell size={16} className="text-foreground" />
                  </div>
                  <span className="flex-1 text-sm text-left">{t("profile.notifications")}</span>
                  {unreadNotificationCount > 0 && (
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-neon-red flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{unreadNotificationCount}</span>
                    </span>
                  )}
                  <ChevronRight size={14} className="text-muted-foreground" />
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Logout */}
          <button
            onClick={() => toast("Coming soon")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/5 border border-destructive/15 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={16} />
            {t("profile.logout")}
          </button>

          <div className="pb-4" />
        </div>
      </div>
    </div>
  );
}
