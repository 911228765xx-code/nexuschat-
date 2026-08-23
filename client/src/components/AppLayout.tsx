/*
 * AppLayout — 与原生 App 同一套信息架构和视觉
 * 底栏 4 Tab：消息 / 广场 / 发现 / 我的（岛屿、投研、跟单从发现页进入，不占底栏）
 *
 * GLOBAL LOGIN GUARD: All /app/* routes require authentication by default.
 * Pass requireAuth={false} to allow guest access (e.g. Discover, Trading public view).
 */
import { useLocation, Link } from "wouter";
import { MessageCircle, Newspaper, Compass, User } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

const prefetchMap: Record<string, () => Promise<unknown>> = {
  "/app/chat":     () => import("@/pages/Chat"),
  "/app/feed":     () => import("@/pages/Discover"),
  "/app/discover": () => import("@/pages/Discover"),
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
  const { conversations } = useApp();
  // Chat unread state is local to its conversation UI. Notification counts are
  // always read from the server below, never from legacy demo state.
  const chatUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

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
  const notifUnread = unreadData?.count ?? 0;

  const tabs = [
    { path: "/app/chat", labelKey: "tab.chat", icon: MessageCircle, badge: chatUnread },
    { path: "/app/feed", labelKey: "tab.feed", icon: Newspaper, badge: 0 },
    { path: "/app/discover", labelKey: "tab.discover", icon: Compass, badge: 0 },
    { path: "/app/profile", labelKey: "tab.profile", icon: User, badge: notifUnread },
  ];

  // Show skeleton screen while auth check is in progress (protected routes only)
  // Matches the app layout structure to prevent layout shift and feel native
  if (requireAuth && authLoading) {
    return (
      <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
        {/* Content skeleton — mimics Chat page structure */}
        <div className="flex-1 overflow-hidden" style={{ padding: '16px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
            <div className="h-6 w-28 rounded-lg bg-secondary/60 animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-secondary/60 animate-pulse" />
          </div>
          <div className="h-10 w-full rounded-xl bg-secondary/40 animate-pulse" style={{ marginBottom: '12px' }} />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border/10" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
              <div className="w-12 h-12 rounded-full bg-secondary/60 animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between" style={{ marginBottom: '8px' }}>
                  <div className="h-3.5 rounded bg-secondary/60 animate-pulse" style={{ width: `${60 + i * 10}px` }} />
                  <div className="h-3 w-10 rounded bg-secondary/40 animate-pulse" />
                </div>
                <div className="h-3 rounded bg-secondary/40 animate-pulse" style={{ width: `${80 + i * 15}px` }} />
              </div>
            </div>
          ))}
        </div>
        {/* Bottom nav skeleton */}
        <div className="flex-shrink-0 border-t border-border/20" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', background: 'var(--background)' }}>
          <div className="flex items-center justify-around" style={{ height: '62px' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-6 h-6 rounded bg-secondary/60 animate-pulse" />
                <div className="w-8 h-2 rounded bg-secondary/40 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
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
        style={{ background: '#F5F4F2' }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2942AB, #4F6BE8)" }}>
            <MessageCircle size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#16171A" }}>比特AI</h1>
          <p className="text-sm text-center" style={{ color: "#76787E" }}>让AI社交成为生活习惯 · 澳洲 AFT 集团</p>
        </div>
        {/* Login button */}
        <a
          href={`/login?returnTo=${returnTo}`}
          className="w-full max-w-xs flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-white text-base"
          style={{ background: "linear-gradient(135deg, #2942AB, #4F6BE8)" }}
        >
          立即登录 / 注册
        </a>
        <p className="text-sm text-center" style={{ color: "#A8AAB0" }}>登录后即可访问所有功能</p>
      </div>
    );
  }

  return (
    // `keyboard-aware`: when the native keyboard opens (Capacitor resize:'none'), the global
    // --keyboard-height var shrinks this 100dvh shell so bottom-anchored inputs (chat composer,
    // etc.) lift above the keyboard instead of being hidden behind it. No-op on web.
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden keyboard-aware">
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
        <nav className="border-t px-1 pb-[env(safe-area-inset-bottom)]" style={{ background: "var(--card)", borderColor: "#EFEDE8", boxShadow: "0 -2px 8px rgba(15,23,42,0.04)" }}>
          <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
            {tabs.map((tab) => {
              const isActive =
                location === tab.path ||
                (tab.path === "/app/chat" && (location.startsWith("/app/chat/") || location.startsWith("/app/dm/") || location.startsWith("/app/group/"))) ||
                (tab.path === "/app/feed" && (location.startsWith("/app/feed") || location.startsWith("/app/post/"))) ||
                (tab.path === "/app/discover" && (
                  location.startsWith("/app/discover") ||
                  location.startsWith("/app/island") ||
                  location.startsWith("/app/research") ||
                  location.startsWith("/app/trading") ||
                  location.startsWith("/app/tasks")
                )) ||
                (tab.path === "/app/profile" && (location === "/app/wallet" || location === "/app/edit-profile" || location === "/app/notifications" || location === "/app/settings" || location === "/app/invite"));
              const Icon = tab.icon;

              return (
                <Link key={tab.path} href={tab.path}>
                  <button
                    className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-14 active:scale-95 transition-transform duration-100"
                    onMouseEnter={() => prefetchMap[tab.path]?.()}
                    onTouchStart={() => prefetchMap[tab.path]?.()}
                  >
                    <div className="relative">
                      <div
                        className="flex items-center justify-center rounded-[13px]"
                        style={{
                          width: 36,
                          height: 26,
                          background: isActive ? "linear-gradient(135deg, #2942AB, #4F6BE8)" : "transparent",
                        }}
                      >
                        <Icon size={18} color={isActive ? "#FFFFFF" : "#A8AAB0"} strokeWidth={isActive ? 2.2 : 1.8} />
                      </div>
                      {tab.badge > 0 && (
                        <div
                          className="absolute -top-1 -right-2 min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center"
                          style={{ background: "#FF3B30", border: "1.5px solid var(--card)" }}
                        >
                          <span className="text-[10px] font-extrabold text-white leading-none">
                            {tab.badge > 99 ? "99+" : tab.badge}
                          </span>
                        </div>
                      )}
                    </div>
                    <span
                      className="text-[10px] leading-none tracking-wide"
                      style={{ color: isActive ? "#3554D1" : "#A8AAB0", fontWeight: isActive ? 700 : 500 }}
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
