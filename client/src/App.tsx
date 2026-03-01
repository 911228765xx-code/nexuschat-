import { useState, lazy, Suspense, useTransition, useEffect, useRef, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import AppLayout from "./components/AppLayout";
import Onboarding from "./components/Onboarding";
import { AppProvider } from "./contexts/AppContext";
import { usePriceAlertSocket } from "./hooks/usePriceAlertSocket";

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

// ─── Minimal inline loading spinner (no full-page flash) ────────────────────
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" />
    </div>
  );
}

// ─── Per-route Suspense wrapper ─────────────────────────────────────────────
function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ─── Prefetch common routes on idle ─────────────────────────────────────────
function usePrefetchRoutes() {
  const prefetched = useRef(false);
  useEffect(() => {
    if (prefetched.current) return;
    prefetched.current = true;

    const prefetch = () => {
      // Prefetch the 5 main tab pages after initial load
      import("./pages/Chat");
      import("./pages/Discover");
      import("./pages/Research");
      import("./pages/Trading");
      import("./pages/Profile");
    };

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(prefetch, { timeout: 3000 });
    } else {
      setTimeout(prefetch, 2000);
    }
  }, []);
}

function AppContent() {
  // Connect Socket.IO for real-time price alert push notifications
  usePriceAlertSocket();
  // Prefetch main tab pages in background
  usePrefetchRoutes();

  const [showOnboarding, setShowOnboarding] = useState(() => {
    const onboarded = localStorage.getItem("nexuschat_onboarded");
    return !onboarded && window.location.pathname.startsWith("/app");
  });

  // make sure to consider if you need authentication for certain routes
  return (
    <>
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}
      <Switch>
        <Route path="/">
          <LazyPage><Home /></LazyPage>
        </Route>
        <Route path="/app/group/:id">
          <AppLayout hideNav>
            <LazyPage><GroupChatRoom /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/dm/:userId">
          <AppLayout hideNav>
            <LazyPage><DMChat /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/chat/:id">
          <AppLayout>
            <LazyPage><ChatRoom /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/chat">
          <AppLayout>
            <LazyPage><Chat /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/create-group">
          <AppLayout hideNav>
            <LazyPage><CreateGroup /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/edit-profile">
          <AppLayout hideNav>
            <LazyPage><EditProfile /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/wallet">
          <AppLayout hideNav>
            <LazyPage><Wallet /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/contacts">
          <AppLayout hideNav>
            <LazyPage><Contacts /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/notifications">
          <AppLayout hideNav>
            <LazyPage><Notifications /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/invite">
          <AppLayout hideNav>
            <LazyPage><InviteFriends /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/tasks">
          <AppLayout hideNav>
            <LazyPage><TaskCenter /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/leaderboard">
          <AppLayout hideNav>
            <LazyPage><Leaderboard /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/settings">
          <AppLayout hideNav>
            <LazyPage><Settings /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/discover">
          <AppLayout>
            <LazyPage><Discover /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/post/:id">
          <AppLayout hideNav>
            <LazyPage><PostDetail /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/research/:token">
          <AppLayout hideNav>
            <LazyPage><TokenDetail /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/research">
          <AppLayout>
            <LazyPage><Research /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/watchlist">
          <AppLayout hideNav>
            <LazyPage><Watchlist /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/trading">
          <AppLayout>
            <LazyPage><Trading /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app/profile">
          <AppLayout>
            <LazyPage><Profile /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/app">
          <AppLayout>
            <LazyPage><Chat /></LazyPage>
          </AppLayout>
        </Route>
        <Route path="/404">
          <NotFound />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
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
