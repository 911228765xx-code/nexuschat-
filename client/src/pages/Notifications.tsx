/*
 * Notifications — 通知中心
 * 整合好友请求、群消息@、跟单信号、系统通知
 * 支持按类型筛选 + 推送设置面板
 * v1.9: AppContext全局状态接入
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Bell, BellOff, Settings, UserPlus, AtSign, TrendingUp,
  Shield, Sparkles, ChevronRight, Check, CheckCheck,
  Trash2, X, ArrowLeft, ToggleLeft, ToggleRight,
  MessageCircle, Users, Zap, Volume2, VolumeX, Heart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useI18n } from "@/contexts/I18nContext";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";

const filterTabs = [
  { key: "all", labelKey: "notifications.all", icon: Bell },
  { key: "friend_request", labelKey: "notifications.friends", icon: UserPlus },
  { key: "mention", labelKey: "notifications.mentions", icon: AtSign },
  { key: "signal", labelKey: "notifications.signals", icon: TrendingUp },
  { key: "system", labelKey: "notifications.system", icon: Shield },
];

export default function Notifications() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useI18n();

  // AppContext for local mock notifications (fallback)
  const {
    notifications: localNotifications,
    markNotificationRead: localMarkRead,
    markAllNotificationsRead: localMarkAllRead,
    handleNotificationAction,
    clearAllNotifications,
    notificationSettings,
    updateNotificationSettings,
    addContact,
  } = useApp();

  // tRPC: load real notifications from backend
  const utils = trpc.useUtils();
  const { data: serverData } = trpc.notifications.list.useQuery(
    { limit: 50, unreadOnly: false },
    { refetchInterval: 15000 }
  );
  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAllReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  // Map server notifications to local format for rendering
  const serverNotifications = useMemo(() => {
    if (!serverData?.notifications?.length) return [];
    return serverData.notifications.map((n) => ({
      id: String(n.id),
      type: n.type === "like" || n.type === "comment" ? "social" : n.type === "follow" ? "friend_request" : n.type,
      title: n.fromUserName ?? "System",
      message: n.content,
      avatar: n.fromUserAvatar ?? "🔔",
      time: new Date(n.createdAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      read: n.isRead,
      actionable: false,
      actionTaken: false,
      _serverId: n.id,
    }));
  }, [serverData]);

  // Merge: server notifications first, then local mock (for demo)
  const notifications = serverNotifications.length > 0 ? serverNotifications : localNotifications;

  const filtered = useMemo(() =>
    activeFilter === "all"
      ? notifications
      : notifications.filter(n => n.type === activeFilter),
    [activeFilter, notifications]
  );

  const unreadCount = serverData?.unreadCount ?? notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    if (serverNotifications.length > 0) {
      markAllReadMutation.mutate({});
    } else {
      localMarkAllRead();
    }
    toast.success(t("notifications.allMarkedRead"));
  };

  const clearAll = () => {
    clearAllNotifications();
    toast.success(t("notifications.allCleared"));
  };

  const handleMarkRead = (notif: typeof notifications[0]) => {
    if ((notif as any)._serverId) {
      markReadMutation.mutate({ notificationId: (notif as any)._serverId });
    } else {
      localMarkRead(notif.id);
    }
  };

  const acceptFriendRequest = (notification: typeof notifications[0]) => {
    handleNotificationAction(notification.id, "accepted");
    // Also add to contacts
    addContact({
      id: `contact_${notification.id}`,
      name: notification.title,
      avatar: notification.avatar,
      address: "0x" + Math.random().toString(16).slice(2, 10) + "...",
      isOnline: true,
      isFavorite: false,
      group: "DeFi",
      addedAt: new Date().toISOString(),
    });
    toast.success(t("notifications.accepted"));
  };

  const declineFriendRequest = (id: string) => {
    handleNotificationAction(id, "declined");
    toast(t("notifications.declined"));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "friend_request": return <UserPlus size={14} className="text-neon-cyan" />;
      case "mention": return <AtSign size={14} className="text-neon-purple" />;
      case "signal": return <TrendingUp size={14} className="text-neon-green" />;
      case "system": return <Shield size={14} className="text-muted-foreground" />;
      case "social": return <Heart size={14} className="text-neon-red" />;
      default: return <Bell size={14} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "friend_request": return "bg-neon-cyan/10 border-neon-cyan/20";
      case "mention": return "bg-neon-purple/10 border-neon-purple/20";
      case "signal": return "bg-neon-green/10 border-neon-green/20";
      case "social": return "bg-neon-red/10 border-neon-red/20";
      default: return "bg-secondary/30 border-border/20";
    }
  };

  // Push settings UI data
  const pushSettingsUI = [
    { key: "friendRequests" as const, labelKey: "notifications.pushFriendReq", descKey: "notifications.pushFriendReqDesc", icon: UserPlus, color: "text-neon-cyan" },
    { key: "groupMentions" as const, labelKey: "notifications.pushMentions", descKey: "notifications.pushMentionsDesc", icon: AtSign, color: "text-neon-purple" },
    { key: "tradingSignals" as const, labelKey: "notifications.pushSignals", descKey: "notifications.pushSignalsDesc", icon: TrendingUp, color: "text-neon-green" },
    { key: "socialActivity" as const, labelKey: "notifications.pushLikes", descKey: "notifications.pushLikesDesc", icon: MessageCircle, color: "text-neon-red" },
    { key: "systemUpdates" as const, labelKey: "notifications.pushSystem", descKey: "notifications.pushSystemDesc", icon: Shield, color: "text-muted-foreground" },
  ];

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
              ? notifications.filter(n => !n.read).length
              : notifications.filter(n => n.type === tab.key && !n.read).length;
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
                className={`group relative flex items-start gap-3 px-4 py-3.5 border-b border-border/10 transition-colors cursor-pointer ${
                  !notification.read ? "bg-neon-cyan/[0.06] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-neon-cyan before:rounded-r hover:bg-neon-cyan/[0.09]" : "hover:bg-secondary/20"
                }`}
                onClick={() => handleMarkRead(notification)}
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
                        <span className={`text-sm font-medium font-display truncate ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </span>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-neon-cyan shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {notification.message}
                      </p>

                      {/* Signal metadata */}
                      {notification.type === "signal" && (notification as any).data && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-secondary/40">
                            {((notification as any).data.token) as string}
                          </span>
                          <span className="text-[10px] font-mono text-neon-green">
                            {((notification as any).data.change) as string}
                          </span>
                          <span className="text-[10px] flex items-center gap-0.5 text-neon-purple">
                            <Sparkles size={8} />
                            {((notification as any).data.score) as string}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{notification.time}</span>
                    </div>
                  </div>

                  {/* Action buttons for friend requests */}
                  {notification.type === "friend_request" && notification.actionable && !notification.actionTaken && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptFriendRequest(notification);
                        }}
                        className="px-3 py-1 rounded-lg bg-neon-cyan/15 text-neon-cyan text-[11px] font-medium border border-neon-cyan/20 hover:bg-neon-cyan/25 transition-all"
                      >
                        {t("notifications.accept")}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          declineFriendRequest(notification.id);
                        }}
                        className="px-3 py-1 rounded-lg bg-secondary/40 text-muted-foreground text-[11px] font-medium border border-border/20 hover:bg-secondary/60 transition-all"
                      >
                        {t("notifications.decline")}
                      </button>
                    </div>
                  )}

                  {/* Show action result */}
                  {notification.type === "friend_request" && notification.actionTaken && (
                    <div className="mt-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        notification.actionTaken === "accepted"
                          ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                          : "bg-secondary/40 text-muted-foreground border border-border/20"
                      }`}>
                        {notification.actionTaken === "accepted" ? t("notifications.accepted") : t("notifications.declined")}
                      </span>
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
                    onClick={() => {
                      updateNotificationSettings({ quietHoursEnabled: !notificationSettings.quietHoursEnabled });
                      toast(notificationSettings.quietHoursEnabled ? t("notifications.quietOff") : t("notifications.quietOn"));
                    }}
                    className="shrink-0"
                  >
                    {notificationSettings.quietHoursEnabled ? (
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

                {pushSettingsUI.map((setting) => {
                  const Icon = setting.icon;
                  const enabled = notificationSettings[setting.key];
                  return (
                    <div
                      key={setting.key}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-card/50 border border-border/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          enabled ? "bg-neon-cyan/10" : "bg-secondary/30"
                        }`}>
                          <Icon size={18} className={enabled ? setting.color : "text-muted-foreground/50"} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${enabled ? "" : "text-muted-foreground"}`}>
                            {t(setting.labelKey)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{t(setting.descKey)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateNotificationSettings({ [setting.key]: !enabled })}
                        className="shrink-0"
                      >
                        {enabled ? (
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
                  <button
                    onClick={() => updateNotificationSettings({ sound: !notificationSettings.sound })}
                    className="shrink-0"
                  >
                    {notificationSettings.sound ? (
                      <ToggleRight size={32} className="text-neon-cyan" />
                    ) : (
                      <ToggleLeft size={32} className="text-muted-foreground" />
                    )}
                  </button>
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
                  <button
                    onClick={() => updateNotificationSettings({ vibration: !notificationSettings.vibration })}
                    className="shrink-0"
                  >
                    {notificationSettings.vibration ? (
                      <ToggleRight size={32} className="text-neon-cyan" />
                    ) : (
                      <ToggleLeft size={32} className="text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
