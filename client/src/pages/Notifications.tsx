/*
 * Notifications — 通知中心
 * 整合好友请求、群消息@、跟单信号、系统通知
 * 支持按类型筛选 + 推送设置面板
 * Cyberpunk Noir风格
 */
import { useState } from "react";
import { Link } from "wouter";
import {
  Bell, BellOff, Settings, UserPlus, AtSign, TrendingUp,
  Shield, Sparkles, ChevronRight, Check, CheckCheck,
  Trash2, X, ArrowLeft, ToggleLeft, ToggleRight,
  MessageCircle, Users, Zap, Volume2, VolumeX
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "sonner";

/* ─── Types ─── */
interface Notification {
  id: string;
  type: "friend_request" | "mention" | "signal" | "system" | "like" | "comment";
  title: string;
  message: string;
  avatar: string;
  time: string;
  isRead: boolean;
  actionUrl?: string;
  metadata?: {
    token?: string;
    change?: string;
    score?: number;
  };
}

interface PushSetting {
  id: string;
  labelKey: string;
  descKey: string;
  icon: typeof Bell;
  color: string;
  enabled: boolean;
}

/* ─── Mock Data ─── */
const mockNotifications: Notification[] = [
  {
    id: "n1", type: "friend_request",
    title: "whale_hunter.eth",
    message: "notifications.friendRequestMsg",
    avatar: "🐋", time: "2m", isRead: false,
  },
  {
    id: "n2", type: "mention",
    title: "BAYC Holders 🐵",
    message: "notifications.mentionMsg",
    avatar: "🐵", time: "15m", isRead: false,
  },
  {
    id: "n3", type: "signal",
    title: "notifications.signalTitle",
    message: "notifications.signalMsg",
    avatar: "📊", time: "32m", isRead: false,
    metadata: { token: "ETH", change: "+5.2%", score: 8.5 },
  },
  {
    id: "n4", type: "like",
    title: "vitalik.eth",
    message: "notifications.likeMsg",
    avatar: "V", time: "1h", isRead: false,
  },
  {
    id: "n5", type: "comment",
    title: "punk6529.eth",
    message: "notifications.commentMsg",
    avatar: "P", time: "2h", isRead: true,
  },
  {
    id: "n6", type: "signal",
    title: "notifications.signalTitle",
    message: "notifications.signalMsgSol",
    avatar: "📊", time: "3h", isRead: true,
    metadata: { token: "SOL", change: "+12.8%", score: 9.1 },
  },
  {
    id: "n7", type: "system",
    title: "NexusChat",
    message: "notifications.systemMsg",
    avatar: "N", time: "5h", isRead: true,
  },
  {
    id: "n8", type: "friend_request",
    title: "defi_alpha.eth",
    message: "notifications.friendRequestMsg",
    avatar: "🔑", time: "8h", isRead: true,
  },
  {
    id: "n9", type: "mention",
    title: "DeFi Alpha Club 🔒",
    message: "notifications.mentionMsg2",
    avatar: "🔑", time: "12h", isRead: true,
  },
  {
    id: "n10", type: "system",
    title: "NexusChat",
    message: "notifications.securityMsg",
    avatar: "🔒", time: "1d", isRead: true,
  },
];

const filterTabs = [
  { key: "all", labelKey: "notifications.all", icon: Bell },
  { key: "friend_request", labelKey: "notifications.friends", icon: UserPlus },
  { key: "mention", labelKey: "notifications.mentions", icon: AtSign },
  { key: "signal", labelKey: "notifications.signals", icon: TrendingUp },
  { key: "system", labelKey: "notifications.system", icon: Shield },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useI18n();

  const [pushSettings, setPushSettings] = useState<PushSetting[]>([
    { id: "ps1", labelKey: "notifications.pushFriendReq", descKey: "notifications.pushFriendReqDesc", icon: UserPlus, color: "text-neon-cyan", enabled: true },
    { id: "ps2", labelKey: "notifications.pushMentions", descKey: "notifications.pushMentionsDesc", icon: AtSign, color: "text-neon-purple", enabled: true },
    { id: "ps3", labelKey: "notifications.pushSignals", descKey: "notifications.pushSignalsDesc", icon: TrendingUp, color: "text-neon-green", enabled: true },
    { id: "ps4", labelKey: "notifications.pushLikes", descKey: "notifications.pushLikesDesc", icon: MessageCircle, color: "text-neon-red", enabled: false },
    { id: "ps5", labelKey: "notifications.pushSystem", descKey: "notifications.pushSystemDesc", icon: Shield, color: "text-muted-foreground", enabled: true },
    { id: "ps6", labelKey: "notifications.pushGroup", descKey: "notifications.pushGroupDesc", icon: Users, color: "text-neon-cyan", enabled: true },
  ]);

  const [globalMute, setGlobalMute] = useState(false);
  const [quietHours, setQuietHours] = useState(false);

  const filtered = activeFilter === "all"
    ? notifications
    : notifications.filter(n => n.type === activeFilter);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success(t("notifications.allMarkedRead"));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success(t("notifications.deleted"));
  };

  const clearAll = () => {
    setNotifications([]);
    toast.success(t("notifications.allCleared"));
  };

  const togglePushSetting = (id: string) => {
    setPushSettings(prev => prev.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "friend_request": return <UserPlus size={14} className="text-neon-cyan" />;
      case "mention": return <AtSign size={14} className="text-neon-purple" />;
      case "signal": return <TrendingUp size={14} className="text-neon-green" />;
      case "system": return <Shield size={14} className="text-muted-foreground" />;
      case "like": return <MessageCircle size={14} className="text-neon-red" />;
      case "comment": return <MessageCircle size={14} className="text-neon-cyan" />;
      default: return <Bell size={14} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "friend_request": return "bg-neon-cyan/10 border-neon-cyan/20";
      case "mention": return "bg-neon-purple/10 border-neon-purple/20";
      case "signal": return "bg-neon-green/10 border-neon-green/20";
      case "like": return "bg-neon-red/10 border-neon-red/20";
      case "comment": return "bg-neon-cyan/10 border-neon-cyan/20";
      default: return "bg-secondary/30 border-border/20";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="glass sticky top-0 z-10 px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Link href="/app/chat">
              <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors">
                <ArrowLeft size={20} className="text-muted-foreground" />
              </button>
            </Link>
            <Bell size={20} className="text-neon-cyan" />
            <h1 className="text-lg font-semibold font-display">{t("notifications.title")}</h1>
            {unreadCount > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-neon-red flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{unreadCount}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={markAllRead}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors"
              title={t("notifications.markAllRead")}
            >
              <CheckCheck size={18} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors"
            >
              <Settings size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 pb-3 overflow-x-auto">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const count = tab.key === "all"
              ? notifications.filter(n => !n.isRead).length
              : notifications.filter(n => n.type === tab.key && !n.isRead).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === tab.key
                    ? "bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30"
                    : "bg-secondary/40 text-muted-foreground border border-border/20 hover:bg-secondary/60"
                }`}
              >
                <Icon size={12} />
                {t(tab.labelKey)}
                {count > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-neon-red/80 text-[9px] text-white font-bold flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-secondary/40 flex items-center justify-center">
              <Bell size={28} className="text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">{t("notifications.empty")}</p>
          </div>
        ) : (
          <div>
            {filtered.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-start gap-3 px-4 py-3.5 border-b border-border/10 transition-colors cursor-pointer ${
                  !notification.isRead ? "bg-neon-cyan/[0.03]" : ""
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                {/* Avatar with type badge */}
                <div className="relative shrink-0">
                  <Avatar className="w-11 h-11">
                    <AvatarFallback className="bg-secondary text-base font-display">
                      {notification.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border ${getTypeColor(notification.type)} flex items-center justify-center`}>
                    {getTypeIcon(notification.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-medium font-display truncate ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title.startsWith("notifications.") ? t(notification.title) : notification.title}
                        </span>
                        {!notification.isRead && (
                          <div className="w-2 h-2 rounded-full bg-neon-cyan shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {t(notification.message)}
                      </p>

                      {/* Signal metadata */}
                      {notification.type === "signal" && notification.metadata && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-secondary/40">
                            {notification.metadata.token}
                          </span>
                          <span className="text-[10px] font-mono text-neon-green">
                            {notification.metadata.change}
                          </span>
                          <span className="text-[10px] flex items-center gap-0.5 text-neon-purple">
                            <Sparkles size={8} />
                            {notification.metadata.score}/10
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{notification.time}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                        className="p-1 rounded-lg text-muted-foreground/40 hover:text-neon-red hover:bg-neon-red/5 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Action buttons for friend requests */}
                  {notification.type === "friend_request" && !notification.isRead && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                          toast.success(t("notifications.accepted"));
                        }}
                        className="px-3 py-1 rounded-lg bg-neon-cyan/15 text-neon-cyan text-[11px] font-medium border border-neon-cyan/20 hover:bg-neon-cyan/25 transition-all"
                      >
                        {t("notifications.accept")}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                          toast(t("notifications.declined"));
                        }}
                        className="px-3 py-1 rounded-lg bg-secondary/40 text-muted-foreground text-[11px] font-medium border border-border/20 hover:bg-secondary/60 transition-all"
                      >
                        {t("notifications.decline")}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Clear all */}
            {filtered.length > 0 && (
              <div className="flex justify-center py-6">
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs text-muted-foreground hover:text-neon-red hover:bg-neon-red/5 border border-border/20 transition-all"
                >
                  <Trash2 size={13} />
                  {t("notifications.clearAll")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Push Settings Panel ─── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            <header className="glass px-4 pt-[env(safe-area-inset-top)] border-b border-border/30">
              <div className="flex items-center gap-3 h-14">
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary/60 transition-colors"
                >
                  <ArrowLeft size={20} className="text-muted-foreground" />
                </button>
                <Settings size={18} className="text-neon-cyan" />
                <h2 className="text-base font-semibold font-display">{t("notifications.pushSettings")}</h2>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {/* Global controls */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("notifications.globalSettings")}</h3>

                {/* Global mute */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-card/50 border border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neon-red/10 flex items-center justify-center">
                      {globalMute ? <VolumeX size={18} className="text-neon-red" /> : <Volume2 size={18} className="text-neon-green" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t("notifications.muteAll")}</p>
                      <p className="text-[11px] text-muted-foreground">{t("notifications.muteAllDesc")}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setGlobalMute(!globalMute); toast(globalMute ? t("notifications.unmuted") : t("notifications.muted")); }}
                    className="shrink-0"
                  >
                    {globalMute ? (
                      <ToggleRight size={32} className="text-neon-red" />
                    ) : (
                      <ToggleLeft size={32} className="text-muted-foreground" />
                    )}
                  </button>
                </div>

                {/* Quiet hours */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-card/50 border border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neon-purple/10 flex items-center justify-center">
                      <BellOff size={18} className="text-neon-purple" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t("notifications.quietHours")}</p>
                      <p className="text-[11px] text-muted-foreground">{t("notifications.quietHoursDesc")}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setQuietHours(!quietHours); toast(quietHours ? t("notifications.quietOff") : t("notifications.quietOn")); }}
                    className="shrink-0"
                  >
                    {quietHours ? (
                      <ToggleRight size={32} className="text-neon-purple" />
                    ) : (
                      <ToggleLeft size={32} className="text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Category settings */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("notifications.categorySettings")}</h3>

                {pushSettings.map((setting) => {
                  const Icon = setting.icon;
                  return (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-card/50 border border-border/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          setting.enabled ? "bg-neon-cyan/10" : "bg-secondary/30"
                        }`}>
                          <Icon size={18} className={setting.enabled ? setting.color : "text-muted-foreground/50"} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${setting.enabled ? "" : "text-muted-foreground"}`}>
                            {t(setting.labelKey)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{t(setting.descKey)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePushSetting(setting.id)}
                        className="shrink-0"
                      >
                        {setting.enabled ? (
                          <ToggleRight size={32} className="text-neon-cyan" />
                        ) : (
                          <ToggleLeft size={32} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Sound & vibration */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("notifications.soundVibration")}</h3>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-card/50 border border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-secondary/30 flex items-center justify-center">
                      <Volume2 size={18} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t("notifications.sound")}</p>
                      <p className="text-[11px] text-muted-foreground">{t("notifications.soundDesc")}</p>
                    </div>
                  </div>
                  <span className="text-xs text-neon-cyan font-medium">{t("notifications.default")}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-card/50 border border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-secondary/30 flex items-center justify-center">
                      <Zap size={18} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t("notifications.vibration")}</p>
                      <p className="text-[11px] text-muted-foreground">{t("notifications.vibrationDesc")}</p>
                    </div>
                  </div>
                  <span className="text-xs text-neon-cyan font-medium">{t("notifications.default")}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
