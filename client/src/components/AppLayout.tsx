/*
 * AppLayout — Cyberpunk Noir mobile-first layout
 * Bottom tab navigation with glassmorphism effect + dynamic unread badges from AppContext
 * 5 tabs: Chat / Discover / Research / Trading / Profile
 * NOTE: framer-motion removed — uses CSS animations to keep initial bundle small
 *
 * GLOBAL LOGIN GUARD: All /app/* routes require authentication by default.
 * Pass requireAuth={false} to allow guest access (e.g. Discover, Trading public view).
 * Unauthenticated users on protected routes are redirected to the Manus OAuth login page.
 */
import { useLocation, Link } from "wouter";
import { MessageCircle, Compass, Brain, TrendingUp, User, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

// Prefetch helpers — trigger dynamic import on hover/touch so the chunk loads before navigation
const prefetchMap: Record<string, () => Promise<unknown>> = {
  "/app/chat":     () => import("@/pages/Chat"),
  "/app/discover": () => import("@/pages/Discover"),
  "/app/research": () => import("@/pages/Research"),
  "/app/trading":  () => import("@/pages/Trading"),
  "/app/profile":  () => import("@/pages/Profile"),
};
import ErrorBoundary from "@/components/ErrorBoundary";
import { useI18n } from "@/contexts/I18nContext";
import { useApp } from "@/contexts/AppContext";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  /** Set to false to allow guest (unauthenticated) access. Defaults to true. */
  requireAuth?: boolean;
}

export default function AppLayout({ children, hideNav, requireAuth = true }: AppLayoutProps) {
  const [location] = useLocation();
  const { t } = useI18n();
  const { conversations, notifications } = useApp();
  // Dynamic badge counts from AppContext
  const chatUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const localNotifUnread = notifications.filter((n) => !n.read).length;

  const { isAuthenticated, loading: authLoading } = useAuth();

  // ─── Global login guard ────────────────────────────────────────────────────
  // Redirect to internal /login page if user is not authenticated (only for protected routes).
  // Wait until auth check completes (authLoading=false) before redirecting.
  // Use location.replace() for more reliable redirect in WeChat/mobile browsers.
  useEffect(() => {
    if (requireAuth && !authLoading && !isAuthenticated) {
      window.location.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [requireAuth, authLoading, isAuthenticated]);

  // Real unread count from backend (protectedProcedure — only poll when logged in)
  const { data: unreadData } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 30_000 : false,
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

  // Show full-screen loading spinner while auth check is in progress (protected routes only)
  if (requireAuth && authLoading) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center">
          <MessageCircle size={24} className="text-white" />
        </div>
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">正在验证登录状态...</p>
      </div>
    );
  }

  // Not authenticated on protected route — show login CTA while redirect fires
  // This prevents black screen on slow/WeChat browsers where location.replace() may be delayed
  if (requireAuth && !isAuthenticated) {
    const returnTo = encodeURIComponent(window.location.pathname);
    return (
      <div
        className="flex flex-col h-[100dvh] items-center justify-center gap-6 px-8"
        style={{ background: '#060b18' }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#a855f7] flex items-center justify-center shadow-[0_0_32px_rgba(0,212,255,0.3)]">
            <MessageCircle size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-['Space_Grotesk'] tracking-tight">NexusChat</h1>
          <p className="text-sm text-gray-400 text-center">Web3 社交 · AI 投研 · 量化跟单</p>
        </div>
        {/* Login button */}
        <a
          href={`/login?returnTo=${returnTo}`}
          className="w-full max-w-xs flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-white text-base"
          style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)', boxShadow: '0 0 24px rgba(0,212,255,0.25)' }}
        >
          立即登录 / 注册
        </a>
        <p className="text-sm text-gray-600 text-center">登录后即可访问所有功能</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
      {/* Main content area — page-level ErrorBoundary catches per-page crashes */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <ErrorBoundary mode="page">
          {/* key=location forces re-mount on route change, re-triggering the CSS animation */}
          <div key={location} className="page-enter">
            {children}
          </div>
        </ErrorBoundary>
      </main>

      {/* Bottom Tab Navigation */}
      {!hideNav && (
        <nav className="glass border-t border-border/50 px-2 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-[62px] max-w-lg mx-auto">
            {tabs.map((tab) => {
              const isActive =
                location === tab.path ||
                (tab.path === "/app/chat" && location.startsWith("/app/chat/")) ||
                (tab.path === "/app/profile" && (location === "/app/wallet" || location === "/app/edit-profile" || location === "/app/notifications"));
              const Icon = tab.icon;

              return (
                <Link key={tab.path} href={tab.path}>
                  <button
                    className="relative flex flex-col items-center justify-center gap-1.5 w-16 h-[58px] rounded-xl transition-colors active:scale-90 transition-transform duration-100"
                    onMouseEnter={() => prefetchMap[tab.path]?.()}
                    onTouchStart={() => prefetchMap[tab.path]?.()}
                  >
                    {/* CSS-based tab indicator (replaces framer-motion layoutId) */}
                    {isActive && (
                      <div
                        className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-neon-cyan transition-all duration-300"
                        style={{
                          boxShadow: "0 0 8px oklch(0.82 0.15 195 / 0.6)",
                        }}
                      />
                    )}
                    <div className="relative">
                      <Icon
                        size={23}
                        className={
                          isActive
                            ? "text-neon-cyan drop-shadow-[0_0_6px_oklch(0.82_0.15_195/0.5)]"
                            : "text-muted-foreground"
                        }
                      />
                      {/* Unread badge — CSS scale animation */}
                      {tab.badge > 0 && (
                        <div
                          className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-2 rounded-full bg-neon-red flex items-center justify-center animate-in zoom-in-50 duration-200"
                          style={{
                            boxShadow: "0 0 6px oklch(0.65 0.25 25 / 0.5)",
                          }}
                        >
                          <span className="text-sm font-bold text-white leading-none">
                            {tab.badge > 99 ? "99+" : tab.badge}
                          </span>
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-medium leading-none ${
                        isActive ? "text-neon-cyan" : "text-muted-foreground"
                      }`}
                    >
                      {t(tab.labelKey)}
                    </span>
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
