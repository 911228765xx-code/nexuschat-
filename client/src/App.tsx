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
const PWAInstallBanner = lazy(() => import("./components/PWAInstallBanner"));

// ─── Minimal skeleton — matches dark bg, no white flash ──────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-[#00d4ff]/40 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
    </div>
  );
}

// PageTransition removed — AnimatePresence + motion caused Android black screen

/**
 * PriceAlertSocket — rendered after initial paint, loads socket.io lazily
 */
const PriceAlertSocket = lazy(() =>
  import("./hooks/usePriceAlertSocket").then((mod) => ({
    default: function PriceAlertSocketComponent() {
      mod.usePriceAlertSocket();
      return null;
    },
  }))
);

/**
 * WalletSyncEffect - uses standalone useWallet (window.ethereum only, no wagmi dependency)
 */
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

/**
 * RouteContent — single persistent Suspense boundary (no key=location).
 * Already-loaded chunks never re-trigger loading spinner on navigation.
 * Only truly unloaded chunks show the skeleton on first visit.
 */
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
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const onboarded = localStorage.getItem("nexuschat_onboarded");
    return !onboarded && window.location.pathname.startsWith("/app");
  });

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

      <RouteContent />

      {/* PWA install banner — shown to mobile users who haven't installed yet */}
      <Suspense fallback={null}>
        <PWAInstallBanner />
      </Suspense>
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
