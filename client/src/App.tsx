import { useState, lazy, Suspense, useEffect } from "react";
import { useWallet as useStandaloneWallet } from "./hooks/useWallet";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
// framer-motion AnimatePresence removed — caused black screen flash on Android during route transitions
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import AppLayout from "./components/AppLayout";
import { AppProvider, useApp } from "./contexts/AppContext";
import { useCapacitor } from "./hooks/useCapacitor";
import { useDeepLink } from "./hooks/useDeepLink";

// NOTE: Onboarding and usePriceAlertSocket are lazy-loaded to keep initial bundle small
const Onboarding = lazy(() => import("./components/Onboarding"));

// ─── Lazy-loaded page components (code splitting) ────────────────────────────
const Home = lazy(() => import("./pages/Home"));
const Chat = lazy(() => import("./pages/Chat"));
const ChatRoom = lazy(() => import("./pages/ChatRoom"));
const Research = lazy(() => import("./pages/Research"));
const Trading = lazy(() => import("./pages/Trading"));
const Profile = lazy(() => import("./pages/Profile"));
const Discover = lazy(() => import("./pages/Discover"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Notifications = lazy(() => import("./pages/Notifications"));
const CreateGroup = lazy(() => import("./pages/CreateGroup"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const GroupChatRoom = lazy(() => import("./pages/GroupChatRoom"));
const Wallet = lazy(() => import("./pages/Wallet"));
const InviteFriends = lazy(() => import("./pages/InviteFriends"));
const TaskCenter = lazy(() => import("./pages/TaskCenter"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Settings = lazy(() => import("./pages/Settings"));
const TokenDetail = lazy(() => import("./pages/TokenDetail"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const DMChat = lazy(() => import("./pages/DMChat"));
const DownloadPage = lazy(() => import("./pages/Download"));
const LoginPage = lazy(() => import("./pages/Login"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const PWAInstallBanner = lazy(() => import("./components/PWAInstallBanner"));
const AppUpdateDialog = lazy(() => import("./components/AppUpdateDialog").then(m => ({ default: m.AppUpdateDialog })));
const UpdateBanner = lazy(() => import("./components/UpdateBanner").then(m => ({ default: m.UpdateBanner })));
// ─── AI Consulting Center pages ───────────────────────────────────────────────
const Consulting = lazy(() => import("./pages/Consulting"));
const ConsultingPayment = lazy(() => import("./pages/ConsultingPayment"));
const ConsultingReport = lazy(() => import("./pages/ConsultingReport"));

// ─── Route prefetch helpers (called on nav hover/touch to preload JS chunks) ──
// Each function triggers the dynamic import so the chunk is fetched before navigation.
const prefetchChat = () => import("./pages/Chat");
const prefetchDiscover = () => import("./pages/Discover");
const prefetchResearch = () => import("./pages/Research");
const prefetchTrading = () => import("./pages/Trading");
const prefetchProfile = () => import("./pages/Profile");
const prefetchGroupChatRoom = () => import("./pages/GroupChatRoom");

// Prefetch the 5 main tabs after the initial render is complete (idle-time preloading)
if (typeof window !== 'undefined') {
  const prefetchAll = () => {
    prefetchChat();
    prefetchDiscover();
    prefetchResearch();
    prefetchTrading();
    prefetchProfile();
    prefetchGroupChatRoom();
  };
  if ('requestIdleCallback' in window) {
    (window as Window & typeof globalThis & { requestIdleCallback: (cb: () => void, opts?: object) => void })
      .requestIdleCallback(prefetchAll, { timeout: 3000 });
  } else {
    setTimeout(prefetchAll, 1500);
  }
}

// ─── Page skeleton loader — matches dark bg, no white flash ──────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-background px-4 pt-6 pb-20">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/5 rounded-full w-32 animate-pulse" />
          <div className="h-3 bg-white/5 rounded-full w-20 animate-pulse" />
        </div>
      </div>
      {/* Content skeleton rows */}
      {[1, 0.9, 0.8, 0.7, 0.6].map((opacity, i) => (
        <div key={i} className="flex items-center gap-3 mb-4" style={{ opacity }}>
          <div className="w-12 h-12 rounded-xl bg-white/5 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-white/5 rounded-full animate-pulse" style={{ width: `${60 + i * 8}%` }} />
            <div className="h-3 bg-white/5 rounded-full animate-pulse" style={{ width: `${40 + i * 5}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
// PageTransition removed — AnimatePresence + motion caused Android black screen

// PriceAlertSocket — rendered after initial paint, loads socket.io lazily
const PriceAlertSocket = lazy(() =>
  import("./hooks/usePriceAlertSocket").then((mod) => ({
    default: function PriceAlertSocketComponent() {
      mod.usePriceAlertSocket();
      return null;
    },
  }))
);

// WalletSyncEffect - uses standalone useWallet (window.ethereum only, no wagmi dependency)
function WalletSyncEffect() {
  const { address, isConnected } = useStandaloneWallet();
  const { updateProfile } = useApp();
  useEffect(() => {
    if (isConnected && address) {
      updateProfile({ walletAddress: address });
    }
  }, [address, isConnected, updateProfile]);
  return null;
}

// RouteContent — single persistent Suspense boundary (no key=location).
// Already-loaded chunks never re-trigger loading spinner on navigation.
// Only truly unloaded chunks show the skeleton on first visit.
function RouteContent() {
  const [location] = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch location={location}>
            <Route path="/">
              <Home />
            </Route>
            <Route path="/login">
              <LoginPage />
            </Route>
            <Route path="/forgot-password">
              <ForgotPasswordPage />
            </Route>
            <Route path="/reset-password">
              <ResetPasswordPage />
            </Route>
            <Route path="/download">
              <DownloadPage />
            </Route>
            <Route path="/app/group/:id">
              <AppLayout hideNav>
                <GroupChatRoom />
              </AppLayout>
            </Route>
            <Route path="/app/dm/:userId">
              <AppLayout hideNav>
                <DMChat />
              </AppLayout>
            </Route>
            <Route path="/app/chat/:id">
              <AppLayout>
                <ChatRoom />
              </AppLayout>
            </Route>
            <Route path="/app/chat">
              <AppLayout>
                <Chat />
              </AppLayout>
            </Route>
            <Route path="/app/create-group">
              <AppLayout hideNav>
                <CreateGroup />
              </AppLayout>
            </Route>
            <Route path="/app/edit-profile">
              <AppLayout hideNav>
                <EditProfile />
              </AppLayout>
            </Route>
            <Route path="/app/wallet">
              <AppLayout hideNav>
                <Wallet />
              </AppLayout>
            </Route>
            <Route path="/app/contacts">
              <AppLayout hideNav>
                <Contacts />
              </AppLayout>
            </Route>
            <Route path="/app/notifications">
              <AppLayout hideNav>
                <Notifications />
              </AppLayout>
            </Route>
            <Route path="/app/invite">
              <AppLayout hideNav>
                <InviteFriends />
              </AppLayout>
            </Route>
            <Route path="/app/tasks">
              <AppLayout hideNav>
                <TaskCenter />
              </AppLayout>
            </Route>
            <Route path="/app/leaderboard">
              <AppLayout hideNav>
                <Leaderboard />
              </AppLayout>
            </Route>
            <Route path="/app/settings">
              <AppLayout hideNav>
                <Settings />
              </AppLayout>
            </Route>
            <Route path="/app/discover">
              <AppLayout requireAuth={false}>
                <Discover />
              </AppLayout>
            </Route>
            <Route path="/app/post/:id">
              <AppLayout hideNav>
                <PostDetail />
              </AppLayout>
            </Route>
            {/* ─── AI Consulting Center Routes ─────────────────────────── */}
            <Route path="/app/consulting/report/:id">
              <AppLayout hideNav>
                <ConsultingReport />
              </AppLayout>
            </Route>
            <Route path="/app/consulting/pay/:id">
              <AppLayout hideNav>
                <ConsultingPayment />
              </AppLayout>
            </Route>
            <Route path="/app/consulting">
              <AppLayout hideNav>
                <Consulting />
              </AppLayout>
            </Route>
            {/* ─────────────────────────────────────────────────────────── */}
            <Route path="/app/research/:token">
              <AppLayout hideNav requireAuth={false}>
                <TokenDetail />
              </AppLayout>
            </Route>
            <Route path="/app/research">
              <AppLayout requireAuth={false}>
                <Research />
              </AppLayout>
            </Route>
            <Route path="/app/watchlist">
              <AppLayout hideNav>
                <Watchlist />
              </AppLayout>
            </Route>
            <Route path="/app/trading">
              <AppLayout requireAuth={false}>
                <Trading />
              </AppLayout>
            </Route>
            <Route path="/app/profile">
              <AppLayout>
                <Profile />
              </AppLayout>
            </Route>
            <Route path="/app">
              <AppLayout>
                <Chat />
              </AppLayout>
            </Route>
            <Route path="/404">
              <NotFound />
            </Route>
            <Route>
              <NotFound />
            </Route>
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  // Initialize Capacitor native plugins (keyboard, status bar, back button)
  // No-op in browser environments
  useCapacitor();
  // Handle deep links and universal links in native app
  useDeepLink();
  // Track current route to suppress update banners on non-app pages
  const [currentPath] = useLocation();
  // Suppress update dialogs/banners on landing page and download page to avoid loops
  const isUpdateSuppressed = currentPath === "/download" || currentPath === "/" || currentPath === "/login";

  const [showOnboarding, setShowOnboarding] = useState(() => {
    const onboarded = localStorage.getItem("nexuschat_onboarded");
    return !onboarded && window.location.pathname.startsWith("/app");
  });

  // Tell the HTML skeleton screen that React has fully mounted and rendered.
  // This is more reliable than MutationObserver on slow/WeChat mobile browsers.
  useEffect(() => {
    const w = window as Window & typeof globalThis & { __nexusHideSkeleton?: () => void };
    if (typeof w.__nexusHideSkeleton === 'function') {
      w.__nexusHideSkeleton();
    }
  }, []);

  return (
    <>
      {/* Sync connected wallet address into AppContext profile */}
      <WalletSyncEffect />

      {/* Lazy-load socket.io connection after initial render */}
      <Suspense fallback={null}>
        <PriceAlertSocket />
      </Suspense>

      {showOnboarding && (
        <Suspense fallback={null}>
          <Onboarding onComplete={() => setShowOnboarding(false)} />
        </Suspense>
      )}

      {/* Version update banner — shown at top of app when new version is available */}
      {/* Suppressed on /download, /, /login to avoid update loops */}
      {!isUpdateSuppressed && (
        <Suspense fallback={null}>
          <UpdateBanner />
        </Suspense>
      )}

      <RouteContent />

      {/* PWA install banner — shown to mobile users who haven't installed yet */}
      <Suspense fallback={null}>
        <PWAInstallBanner />
      </Suspense>

      {/* App version update check — auto-checks on startup, shows dialog if update available */}
      {/* Suppressed on /download, /, /login to avoid update loops */}
      {!isUpdateSuppressed && (
        <Suspense fallback={null}>
          <AppUpdateDialog autoCheck />
        </Suspense>
      )}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary mode="app">
      <ThemeProvider defaultTheme="dark" switchable>
        <I18nProvider>
          <AppProvider>
            <TooltipProvider>
              <Toaster
                toastOptions={{
                  style: {
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)',
                  },
                }}
              />
              <AppContent />
            </TooltipProvider>
          </AppProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
