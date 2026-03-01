/*
 * AppLayout — Cyberpunk Noir mobile-first layout
 * Bottom tab navigation with glassmorphism effect + dynamic unread badges from AppContext
 * 5 tabs: Chat / Discover / Research / Trading / Profile
 */
import { useLocation, Link } from "wouter";
import { MessageCircle, Compass, Brain, TrendingUp, User } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { useApp } from "@/contexts/AppContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

export default function AppLayout({ children, hideNav }: AppLayoutProps) {
  const [location] = useLocation();
  const { t } = useI18n();
  const { conversations, notifications } = useApp();
  const { isAuthenticated } = useAuth();

  // Dynamic badge counts from AppContext
  const chatUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const localNotifUnread = notifications.filter((n) => !n.read).length;

  // Real unread count from backend (polls every 30s when authenticated)
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
  const notifUnread = unreadData?.count ?? localNotifUnread;

  const tabs = [
    { path: "/app/chat", labelKey: "tab.chat", icon: MessageCircle, badge: chatUnread },
    { path: "/app/discover", labelKey: "tab.discover", icon: Compass, badge: 0 },
    { path: "/app/research", labelKey: "tab.research", icon: Brain, badge: 0 },
    { path: "/app/trading", labelKey: "tab.trading", icon: TrendingUp, badge: 0 },
    { path: "/app/profile", labelKey: "tab.profile", icon: User, badge: notifUnread },
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>

      {/* Bottom Tab Navigation */}
      {!hideNav && (
        <nav className="glass border-t border-border/50 px-2 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
            {tabs.map((tab) => {
              const isActive =
                location === tab.path ||
                (tab.path === "/app/chat" && location.startsWith("/app/chat/")) ||
                (tab.path === "/app/profile" && (location === "/app/wallet" || location === "/app/edit-profile" || location === "/app/notifications"));
              const Icon = tab.icon;

              return (
                <Link key={tab.path} href={tab.path}>
                  <div className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-colors cursor-pointer">
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-neon-cyan"
                        style={{
                          boxShadow: "0 0 8px oklch(0.82 0.15 195 / 0.6)",
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <div className="relative">
                      <Icon
                        size={22}
                        className={
                          isActive
                            ? "text-neon-cyan drop-shadow-[0_0_6px_oklch(0.82_0.15_195/0.5)]"
                            : "text-muted-foreground"
                        }
                      />
                      {/* Unread badge */}
                      {tab.badge > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-neon-red flex items-center justify-center"
                          style={{
                            boxShadow: "0 0 6px oklch(0.65 0.25 25 / 0.5)",
                          }}
                        >
                          <span className="text-[9px] font-bold text-white leading-none">
                            {tab.badge > 99 ? "99+" : tab.badge}
                          </span>
                        </motion.div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        isActive ? "text-neon-cyan" : "text-muted-foreground"
                      }`}
                    >
                      {t(tab.labelKey)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
