/*
 * Profile — 我的个人中心
 * 身份卡片、核心数据、功能入口、主题切换、设置
 * v1.9: AppContext全局状态接入
 */
import { Copy, ChevronRight, Wallet, TrendingUp, FileText, Users, Gift, Trophy, CheckSquare, Settings, Bell, Moon, Sun, LogOut, Shield, Edit3, Loader2, Globe, Home, Languages, ArrowLeft } from "lucide-react";
import { LOCALES } from "@/contexts/I18nContext";
import { useState, useMemo } from "react";
import { Link, useLocation, useRouter } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useApp } from "@/contexts/AppContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";

export default function Profile() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const currentLocale = LOCALES.find(l => l.code === locale) || LOCALES[0];

  // ✅ AppContext全局状态
  const { profile, totalUnreadMessages, unreadNotificationCount } = useApp();

  const { isAuthenticated, logout } = useAuth();
  // ─── Real stats from backend (protectedProcedure) ───
  const { data: stats, isLoading: statsLoading } = trpc.user.getUserStats.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    staleTime: 30_000,
  });

  // ─── Real follow counts ───
  const { data: me } = trpc.auth.me.useQuery();
  const { data: followCounts } = trpc.follow.getCounts.useQuery(
    { userId: me?.id ?? 0 },
    { enabled: !!me?.id, retry: false, staleTime: 30_000 }
  );

  // ─── Real wallet data from connected Web3 wallet ───
  const { address: walletAddress, isConnected: walletConnected } = useWallet();
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(walletAddress ?? "");

  // BNB native balance + USD value
  const { data: bnbData, isLoading: bnbLoading } = trpc.wallet.getBalance.useQuery(
    { address: walletAddress ?? "" },
    { enabled: isValidAddress, staleTime: 60_000, refetchOnWindowFocus: false }
  );

  // BEP-20 token balances + USD values
  const { data: tokenData, isLoading: tokenLoading } = trpc.wallet.getTokenBalances.useQuery(
    { address: walletAddress ?? "" },
    { enabled: isValidAddress, staleTime: 60_000, refetchOnWindowFocus: false }
  );

  // Compute total wallet value in USD
  const walletTotalUsd = useMemo(() => {
    if (!walletConnected || !isValidAddress) return null;
    const bnbUsd = bnbData?.usdValue ? parseFloat(bnbData.usdValue) : 0;
    const tokenUsd = tokenData ? tokenData.reduce((sum, t) => sum + (t.usdValue ?? 0), 0) : 0;
    return bnbUsd + tokenUsd;
  }, [walletConnected, isValidAddress, bnbData, tokenData]);

  const walletValueDisplay = useMemo(() => {
    if (!walletConnected) return t("profile.walletNotConnected") || "未连接";
    if (bnbLoading || tokenLoading) return "...";
    if (walletTotalUsd === null) return "--";
    return `$${walletTotalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [walletConnected, bnbLoading, tokenLoading, walletTotalUsd, t]);

  const menuSections = [
    {
      title: t("profile.activity"),
      items: [
        { icon: Wallet, label: t("profile.wallet"), value: walletValueDisplay, color: "text-neon-cyan" },
        { icon: TrendingUp, label: t("profile.strategies"), value: "3", color: "text-neon-green" },
        { icon: FileText, label: t("profile.researchHistory"), value: "23", color: "text-neon-purple" },
        { icon: Users, label: t("profile.groups"), value: "12", color: "text-foreground" },
      ],
    },
    {
      title: t("profile.growth"),
      items: [
        { icon: Gift, label: t("profile.invite"), value: "+1000 IT", color: "text-neon-green" },
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
          <a
            href="/"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors"
            title={t("profile.backToHome") || "返回主页"}
          >
            <Home size={18} className="text-muted-foreground" />
          </a>
          <h1 className="text-lg font-semibold font-display flex-1 text-center">{t("profile.title")}</h1>
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
                {profile.avatar?.startsWith("http") && <AvatarImage src={profile.avatar} alt={profile.displayName} className="object-cover" />}
                <AvatarFallback className="bg-secondary text-xl font-display">{profile.avatar?.startsWith("http") ? profile.displayName?.slice(0,2).toUpperCase() : profile.avatar}</AvatarFallback>
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
                className="flex items-center gap-2 text-sm text-muted-foreground font-mono hover:text-neon-cyan transition-colors"
              >
                {shortAddress}
                <Copy size={10} />
              </button>
              <div className="flex gap-3 mt-3">
                <span className="text-sm px-3 py-1 rounded-full bg-neon-purple/15 text-neon-purple border border-neon-purple/20 font-medium">
                  {t("profile.genesis")}
                </span>
                <span className="text-sm px-3 py-1 rounded-full bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/20 font-medium">
                  SBT Holder
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-2">{profile.bio}</p>
          )}

          {/* Core Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t("profile.points"), value: statsLoading ? "..." : (stats?.npPoints ?? 0).toLocaleString(), sub: "IT", color: "text-neon-cyan" },
              { label: "Followers", value: followCounts ? followCounts.followers.toLocaleString() : (statsLoading ? "..." : "0"), sub: "followers", color: "text-neon-green" },
              { label: "Following", value: followCounts ? followCounts.following.toLocaleString() : (statsLoading ? "..." : "0"), sub: "following", color: "text-neon-purple" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-xl bg-background/40">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`text-base font-bold font-mono mt-0.5 ${stat.color}`}>
                  {stat.value}
                </p>
                {stat.sub && <p className="text-sm text-muted-foreground">{stat.sub}</p>}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Level Progress */}
        <div className="mx-4 mt-3 p-3 rounded-xl bg-card/50 border border-border/20">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-medium">{t("profile.level")}</span>
            <span className="text-sm text-muted-foreground font-mono">{(stats?.npPoints ?? 0).toLocaleString()} / {Math.ceil(((stats?.npPoints ?? 0) + 1) / 10000) * 10000} IT</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary/60 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: stats ? `${Math.min(((stats.npPoints % 10000) / 10000) * 100, 100)}%` : "0%" }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-purple"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">{t("profile.nextLevel")}</p>
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
              <h3 className="text-sm text-muted-foreground font-medium mb-3 px-2">{section.title}</h3>
              <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden divide-y divide-border/10">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                       key={item.label}
                       onClick={() => {
                         if (item.label === t("profile.wallet")) setLocation("/app/wallet");
                         else if (item.label === t("profile.strategies")) setLocation("/app/trading");
                         else if (item.label === t("profile.researchHistory")) setLocation("/app/research");
                         else if (item.label === t("profile.groups")) setLocation("/app/contacts");
                         else if (item.label === t("profile.invite")) setLocation("/app/invite");
                         else if (item.label === t("profile.leaderboard")) setLocation("/app/leaderboard");
                         else if (item.label === t("profile.tasks")) setLocation("/app/tasks");
                         else setLocation("/app/settings");
                       }}
                      className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 active:bg-secondary/50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                        <Icon size={16} className={item.color} />
                      </div>
                      <span className="flex-1 text-sm text-left">{item.label}</span>
                      {item.value && (
                        <span className="text-sm text-muted-foreground font-mono">{item.value}</span>
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
            <h3 className="text-sm text-muted-foreground font-medium mb-3 px-2">{t("profile.settings")}</h3>
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

              {/* Settings — link to full settings page */}
              <button
                onClick={() => setLocation("/app/settings")}
                className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 active:bg-secondary/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <Settings size={16} className="text-foreground" />
                </div>
                <span className="flex-1 text-sm text-left">{t("profile.security")}</span>
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
                    <span className="min-w-5 h-5 px-2.5 rounded-full bg-neon-red flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{unreadNotificationCount}</span>
                    </span>
                  )}
                  <ChevronRight size={14} className="text-muted-foreground" />
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Language Switcher */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="text-sm text-muted-foreground font-medium mb-3 px-2">{t("profile.language") || "Language"}</h3>
            <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden">
              <button
                onClick={() => setShowLangPicker(!showLangPicker)}
                className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 active:bg-secondary/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <Languages size={16} className="text-neon-cyan" />
                </div>
                <span className="flex-1 text-sm text-left">{currentLocale.flag} {currentLocale.name}</span>
                <ChevronRight size={14} className={`text-muted-foreground transition-transform ${showLangPicker ? 'rotate-90' : ''}`} />
              </button>
              {showLangPicker && (
                <div className="border-t border-border/10 divide-y divide-border/10">
                  {LOCALES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => { setLocale(l.code); setShowLangPicker(false); }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-secondary/30 transition-colors ${
                        locale === l.code ? 'bg-neon-cyan/5' : ''
                      }`}
                    >
                      <span className="text-lg leading-none">{l.flag}</span>
                      <span className={`flex-1 text-sm text-left ${locale === l.code ? 'text-neon-cyan font-medium' : ''}`}>{l.name}</span>
                      {locale === l.code && <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Logout — clear session and redirect to /login */}
          <button
            onClick={() => {
              logout();
              setTimeout(() => { window.location.href = "/login"; }, 500);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-destructive/5 border border-destructive/15 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={16} />
            {t("profile.logout")}
          </button>

          {/* Version info */}
          <div className="text-center pb-4">
            <p className="text-sm text-muted-foreground/40 font-mono">比特AI · Bitchat</p>
            <p className="text-sm text-muted-foreground/30 mt-1">Built for Web3 • Powered by NexusAI</p>
          </div>
        </div>
      </div>
    </div>
  );
}
