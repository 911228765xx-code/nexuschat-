/*
 * Settings — 完整设置页面
 * 账户安全/语言切换/隐私管理/关于信息/退出登录
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, Shield, Globe, Lock, Eye, EyeOff, Key, Smartphone,
  ChevronRight, Moon, Sun, Bell, Info, ExternalLink, LogOut,
  Copy, Check, AlertTriangle, Fingerprint, QrCode, Monitor,
  Clock, Trash2, HelpCircle, MessageSquare, FileText, Heart, Plus, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type SettingsSection = "main" | "security" | "privacy" | "about";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh-CN", name: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", name: "繁體中文", flag: "🇹🇼" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
];

// Login devices — only show current session (backend session management not yet implemented)

export default function Settings() {
  const [, setLocation] = useLocation();
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { profile } = useApp();
  const [section, setSection] = useState<SettingsSection>("main");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // ─── Backend-backed settings ─────────────────────────────────────────────
  const settingsQuery = trpc.settings.getSettings.useQuery(undefined, {
    staleTime: 60_000,
  });
  const updateSettingsMut = trpc.settings.updateSettings.useMutation({
    onSuccess: () => {
      settingsQuery.refetch();
      toast.success(t("settings.settingsSaved"));
    },
    onError: () => toast.error(t("settings.settingsError")),
  });

  // Local state synced from backend
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [showNFTs, setShowNFTs] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);

  // Sync from backend when data loads
  useEffect(() => {
    if (settingsQuery.data) {
      const s = settingsQuery.data;
      setTwoFAEnabled(s.twoFAEnabled);
      setBiometricEnabled(s.biometricEnabled);
      setShowWallet(s.showWallet);
      setShowActivity(s.showActivity);
      setShowNFTs(s.showNFTs);
      setReadReceipts(s.readReceipts);
      setProfileVisible(s.profileVisible);
    }
  }, [settingsQuery.data]);

  // Helper to toggle and persist a setting
  const toggleSetting = (key: string, current: boolean, setter: (v: boolean) => void) => {
    const newVal = !current;
    setter(newVal);
    updateSettingsMut.mutate({ [key]: newVal });
  };

  // ─── API Key management ─────────────────────────────────────────────────
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const apiKeysQuery = trpc.settings.listApiKeys.useQuery(undefined, {
    staleTime: 60_000,
  });
  const generateKeyMut = trpc.settings.generateApiKey.useMutation({
    onSuccess: (data) => {
      setNewlyGeneratedKey(data.apiKey);
      apiKeysQuery.refetch();
      toast.success("API Key generated! Copy it now — it won't be shown again.");
    },
    onError: (err) => toast.error(err.message),
  });
  const revokeKeyMut = trpc.settings.revokeApiKey.useMutation({
    onSuccess: () => {
      apiKeysQuery.refetch();
      toast.success("API Key revoked");
    },
  });
  const currentApiKey = newlyGeneratedKey ?? (apiKeysQuery.data?.[0]?.maskedKey || "nx_sk_••••••••••••••••••••••••••••");

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success(t("settings.loggedOut"));
      // Hard redirect to /login to clear React Query cache and force re-auth
      setTimeout(() => { window.location.href = "/login"; }, 500);
    },
    onError: () => {
      // Even if server call fails, redirect to login page
      toast.success(t("settings.loggedOut"));
      setTimeout(() => { window.location.href = "/login"; }, 500);
    },
  });
  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logoutMutation.mutate();
  };

  // NOTE: use div[role=switch] (not button) to avoid nested-button DOM errors
  // when renderToggle is placed inside a <button> or role="button" parent.
  const renderToggle = (on: boolean, onChange: () => void) => (
    <div
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onChange(); } }}
      className="shrink-0 cursor-pointer"
    >
      <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
        on ? "bg-neon-cyan/30 border border-neon-cyan/40" : "bg-secondary border border-border"
      }`}>
        <motion.div
          layout
          className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-colors ${
            on ? "bg-neon-cyan" : "bg-muted-foreground"
          }`}
          animate={{ left: on ? "calc(100% - 22px)" : "2px" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </div>
  );

  // ─── Security Section ───
  const renderSecurity = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full">
      <header className="glass sticky top-0 z-20 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => setSection("main")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <Shield size={18} className="text-neon-cyan" />
          <h1 className="text-base font-semibold font-display">{t("settings.security")}</h1>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 2FA */}
        <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
                  <Key size={18} className="text-neon-cyan" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("settings.twoFA")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.twoFADesc")}</p>
                </div>
              </div>
              {renderToggle(twoFAEnabled, () => toggleSetting("twoFAEnabled", twoFAEnabled, setTwoFAEnabled))}
            </div>
          </div>
        </div>

        {/* Biometric */}
        <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                  <Fingerprint size={18} className="text-neon-purple" />
                </div>
                <div>
                  <p className="text-sm font-medium">{t("settings.biometric")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.biometricDesc")}</p>
                </div>
              </div>
              {renderToggle(biometricEnabled, () => toggleSetting("biometricEnabled", biometricEnabled, setBiometricEnabled))}
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
                <QrCode size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("settings.apiKey")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.apiKeyDesc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/30 border border-border/20">
              <code className="flex-1 text-xs font-mono text-muted-foreground truncate">
                {apiKeyVisible ? currentApiKey : "nx_sk_••••••••••••••••••••••••••••"}
              </code>
              <button
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
              >
                {apiKeyVisible ? <EyeOff size={14} className="text-muted-foreground" /> : <Eye size={14} className="text-muted-foreground" />}
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(currentApiKey); toast.success(t("settings.apiKeyCopied")); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/60 transition-colors"
              >
                <Copy size={14} className="text-muted-foreground" />
              </button>
            </div>
            <button
              onClick={() => generateKeyMut.mutate()}
              className="mt-2 text-[10px] text-neon-red hover:underline"
            >
              {t("settings.regenerateKey")}
            </button>
          </div>
        </div>

        {/* Login Devices */}
        <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/10">
            <div className="flex items-center gap-2">
              <Monitor size={14} className="text-muted-foreground" />
              <h4 className="text-xs font-medium text-muted-foreground">{t("settings.loginDevices")}</h4>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-secondary/40 flex items-center justify-center">
                <Smartphone size={16} className="text-neon-green" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">{t("settings.currentDevice") || "Current Device"}</p>
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-neon-green/10 text-neon-green border border-neon-green/20">{t("settings.current")}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">{t("settings.activeSession") || "Active session"}</p>
              </div>
            </div>
        </div>
      </div>
    </motion.div>
  );

  // ─── Privacy Section ───
  const renderPrivacy = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full">
      <header className="glass sticky top-0 z-20 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => setSection("main")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <Lock size={18} className="text-neon-purple" />
          <h1 className="text-base font-semibold font-display">{t("settings.privacy")}</h1>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {[
          { label: t("settings.showWallet"), desc: t("settings.showWalletDesc"), on: showWallet, toggle: () => toggleSetting("showWallet", showWallet, setShowWallet), icon: <Eye size={16} className="text-neon-cyan" /> },
          { label: t("settings.showActivity"), desc: t("settings.showActivityDesc"), on: showActivity, toggle: () => toggleSetting("showActivity", showActivity, setShowActivity), icon: <Clock size={16} className="text-neon-green" /> },
          { label: t("settings.showNFTs"), desc: t("settings.showNFTsDesc"), on: showNFTs, toggle: () => toggleSetting("showNFTs", showNFTs, setShowNFTs), icon: <Heart size={16} className="text-neon-purple" /> },
          { label: t("settings.readReceipts"), desc: t("settings.readReceiptsDesc"), on: readReceipts, toggle: () => toggleSetting("readReceipts", readReceipts, setReadReceipts), icon: <Check size={16} className="text-neon-cyan" /> },
          { label: t("settings.profileVisible"), desc: t("settings.profileVisibleDesc"), on: profileVisible, toggle: () => toggleSetting("profileVisible", profileVisible, setProfileVisible), icon: <Eye size={16} className="text-amber-400" /> },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-card/50 border border-border/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary/40 flex items-center justify-center">{item.icon}</div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
            {renderToggle(item.on, item.toggle)}
          </div>
        ))}

        {/* Blocked Users */}
        <div className="p-3.5 rounded-2xl bg-card/50 border border-border/20">
          <button
            onClick={() => toast.info(t("settings.noBlockedUsers"))}
            className="w-full flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-neon-red/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-neon-red" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{t("settings.blockedUsers")}</p>
              <p className="text-[10px] text-muted-foreground">{t("settings.blockedUsersDesc")}</p>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </button>
        </div>

        {/* Clear Data */}
        <button
          onClick={() => toast.info(t("settings.dataClearConfirm"))}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-destructive/5 border border-destructive/15"
        >
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Trash2 size={16} className="text-destructive" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-destructive">{t("settings.clearCache")}</p>
            <p className="text-[10px] text-muted-foreground">{t("settings.clearCacheDesc")}</p>
          </div>
        </button>
      </div>
    </motion.div>
  );

  // ─── About Section ───
  const renderAbout = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full">
      <header className="glass sticky top-0 z-20 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => setSection("main")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <Info size={18} className="text-muted-foreground" />
          <h1 className="text-base font-semibold font-display">{t("settings.about")}</h1>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* App Info */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 flex items-center justify-center mb-3">
            <span className="text-4xl">🔗</span>
          </div>
          <h2 className="text-xl font-bold font-display">NexusChat</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("settings.version")} 2.1.0</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{t("settings.buildDate")}: 2026-02-27</p>
        </div>

        <div className="space-y-2">
          {[
            { icon: <Globe size={16} className="text-neon-cyan" />, label: t("settings.website"), value: "nexuschat.app", action: () => toast.info("Opening nexuschat.app") },
            { icon: <MessageSquare size={16} className="text-neon-green" />, label: t("settings.community"), value: "Discord", action: () => toast.info("Opening Discord") },
            { icon: <FileText size={16} className="text-neon-purple" />, label: t("settings.docs"), value: "docs.nexuschat.app", action: () => toast.info("Opening docs") },
            { icon: <Shield size={16} className="text-amber-400" />, label: t("settings.termsOfService"), value: "", action: () => toast.info("Opening Terms") },
            { icon: <Lock size={16} className="text-neon-red" />, label: t("settings.privacyPolicy"), value: "", action: () => toast.info("Opening Privacy Policy") },
            { icon: <HelpCircle size={16} className="text-muted-foreground" />, label: t("settings.helpCenter"), value: "", action: () => toast.info("Opening Help Center") },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card/50 border border-border/20 hover:bg-secondary/20 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/40 flex items-center justify-center">{item.icon}</div>
              <span className="flex-1 text-sm text-left">{item.label}</span>
              {item.value && <span className="text-[10px] text-muted-foreground font-mono">{item.value}</span>}
              <ExternalLink size={12} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pb-4">
          <p className="text-[10px] text-muted-foreground">© 2026 NexusChat. All rights reserved.</p>
          <p className="text-[10px] text-muted-foreground mt-1">{t("settings.builtWith")}</p>
        </div>
      </div>
    </motion.div>
  );

  // ─── Main Settings ───
  const renderMain = () => (
    <div className="flex flex-col h-full">
      <header className="glass sticky top-0 z-20 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center gap-3 h-14">
          <button onClick={() => setLocation("/app/profile")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-semibold font-display">{t("settings.title")}</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Account Section */}
        <div>
          <h3 className="text-xs text-muted-foreground font-medium mb-2 px-1">{t("settings.account")}</h3>
          <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden divide-y divide-border/10">
            <button
              onClick={() => setSection("security")}
              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 flex items-center justify-center">
                <Shield size={16} className="text-neon-cyan" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm">{t("settings.security")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.securityDesc")}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>

            <button
              onClick={() => setSection("privacy")}
              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                <Lock size={16} className="text-neon-purple" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm">{t("settings.privacy")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.privacyDesc")}</p>
              </div>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Preferences Section */}
        <div>
          <h3 className="text-xs text-muted-foreground font-medium mb-2 px-1">{t("settings.preferences")}</h3>
          <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden divide-y divide-border/10">
            {/* Theme */}
            <button
              onClick={() => toggleTheme?.()}
              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/40 flex items-center justify-center">
                {theme === "dark" ? <Moon size={16} className="text-neon-purple" /> : <Sun size={16} className="text-amber-500" />}
              </div>
              <span className="flex-1 text-sm text-left">{t("settings.darkMode")}</span>
              {renderToggle(theme === "dark", () => toggleTheme?.())}
            </button>

            {/* Language */}
            <button
              onClick={() => setShowLanguagePicker(!showLanguagePicker)}
              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/40 flex items-center justify-center">
                <Globe size={16} className="text-neon-green" />
              </div>
              <span className="flex-1 text-sm text-left">{t("settings.language")}</span>
              <span className="text-xs text-muted-foreground">
                {LANGUAGES.find(l => l.code === locale)?.flag} {LANGUAGES.find(l => l.code === locale)?.name}
              </span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>

            {/* Notifications */}
            <button
              onClick={() => setLocation("/app/notifications")}
              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/40 flex items-center justify-center">
                <Bell size={16} className="text-foreground" />
              </div>
              <span className="flex-1 text-sm text-left">{t("settings.notifications")}</span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
            {/* Push Notifications */}
            <PushNotificationToggle />
          </div>
        </div>

        {/* Language Picker */}
        <AnimatePresence>
          {showLanguagePicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl bg-card/80 border border-neon-green/20 overflow-hidden">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLocale(lang.code as any);
                      setShowLanguagePicker(false);
                      toast.success(`${t("settings.languageChanged")}: ${lang.name}`);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border/10 last:border-0 transition-colors ${
                      locale === lang.code ? "bg-neon-green/10" : "hover:bg-secondary/30"
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className="flex-1 text-sm text-left">{lang.name}</span>
                    {locale === lang.code && <Check size={16} className="text-neon-green" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* About & Support */}
        <div>
          <h3 className="text-xs text-muted-foreground font-medium mb-2 px-1">{t("settings.support")}</h3>
          <div className="rounded-2xl bg-card/50 border border-border/20 overflow-hidden divide-y divide-border/10">
            <button
              onClick={() => toast.info("Opening Help Center")}
              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/40 flex items-center justify-center">
                <HelpCircle size={16} className="text-neon-cyan" />
              </div>
              <span className="flex-1 text-sm text-left">{t("settings.helpCenter")}</span>
              <ExternalLink size={12} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => toast.info("Opening Feedback")}
              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/40 flex items-center justify-center">
                <MessageSquare size={16} className="text-neon-green" />
              </div>
              <span className="flex-1 text-sm text-left">{t("settings.feedback") || "Send Feedback"}</span>
              <ExternalLink size={12} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => setSection("about")}
              className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/30 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-secondary/40 flex items-center justify-center">
                <Info size={16} className="text-muted-foreground" />
              </div>
              <span className="flex-1 text-sm text-left">{t("settings.about")}</span>
              <span className="text-[10px] text-muted-foreground font-mono">v2.1.0</span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-destructive/5 border border-destructive/15 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
        >
          <LogOut size={16} />
          {t("settings.logout")}
        </button>

        {/* Version info */}
        <div className="text-center py-2">
          <p className="text-[10px] text-muted-foreground/40 font-mono">NexusChat v2.1.0 (Build 2026.02)</p>
          <p className="text-[9px] text-muted-foreground/30 mt-0.5">{t("settings.builtWith")}</p>
        </div>

        <div className="h-4" />
      </div>

      {/* Logout Confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-4"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-card border border-border/30 overflow-hidden shadow-2xl"
            >
              <div className="p-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-3">
                  <LogOut size={24} className="text-destructive" />
                </div>
                <h3 className="text-lg font-semibold font-display">{t("settings.logoutConfirm")}</h3>
                <p className="text-xs text-muted-foreground mt-2">{t("settings.logoutConfirmDesc")}</p>
              </div>
              <div className="flex border-t border-border/20">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-4 text-sm font-medium hover:bg-secondary/30 transition-colors"
                >
                  {t("settings.cancel")}
                </button>
                <div className="w-px bg-border/20" />
                <button
                  onClick={handleLogout}
                  className="flex-1 py-4 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
                >
                  {t("settings.confirmLogout")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="h-full">
      {section === "main" && renderMain()}
      {section === "security" && renderSecurity()}
      {section === "privacy" && renderPrivacy()}
      {section === "about" && renderAbout()}
    </div>
  );
}

// ── Push Notification Toggle ─────────────────────────────────────────────────
function PushNotificationToggle() {
  const { t } = useI18n();
  const { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) return null;

  const handleToggle = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  const label =
    permission === "denied"
      ? t("settings.pushDenied") || "推送通知（已被浏览器拒绝）"
      : t("settings.pushNotifications") || "推送通知";

  const desc =
    permission === "denied"
      ? t("settings.pushDeniedDesc") || "请在浏览器设置中允许通知权限"
      : isSubscribed
      ? t("settings.pushEnabled") || "已开启，新消息将推送到此设备"
      : t("settings.pushDisabled") || "开启后可在后台收到新消息提醒";

  return (
    <div className="w-full flex items-center gap-3 px-3.5 py-3">
      <div className="w-9 h-9 rounded-xl bg-secondary/40 flex items-center justify-center">
        <Bell size={16} className={isSubscribed ? "text-neon-cyan" : "text-foreground"} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
      </div>
      {permission !== "denied" && (
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className="shrink-0"
        >
          <div
            className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
              isSubscribed
                ? "bg-neon-cyan/30 border border-neon-cyan/40"
                : "bg-secondary border border-border"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-all duration-300 ${
                isSubscribed ? "bg-neon-cyan left-[calc(100%-22px)]" : "bg-muted-foreground left-[2px]"
              }`}
            />
          </div>
        </button>
      )}
    </div>
  );
}
