import { useState, lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import AppLayout from "./components/AppLayout";
import { AppProvider } from "./contexts/AppContext";
// NOTE: Onboarding and usePriceAlertSocket are lazy-loaded to keep initial bundle small
// Onboarding uses framer-motion (79KB), socket.io (42KB) — both deferred
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

// ─── Minimal loading fallback ────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#00d4ff]/30 border-t-[#00d4ff] rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}

/**
 * PriceAlertSocketLoader — dynamically imports usePriceAlertSocket after initial render
 * This keeps socket.io out of the initial bundle
 */
function PriceAlertSocketLoader() {
  useEffect(() => {
    // Dynamically import the hook module after mount to avoid socket.io in initial bundle
    import("./hooks/usePriceAlertSocket").then(({ usePriceAlertSocket: _hook }) => {
      // The hook is imported but we can't call it here (hooks rules)
      // Instead we use a separate component below
    });
  }, []);
  return null;
}

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

function AppContent() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const onboarded = localStorage.getItem("nexuschat_onboarded");
    return !onboarded && window.location.pathname.startsWith("/app");
  });
  // make sure to consider if you need authentication for certain routes
  return (
    <>
      {/* Lazy-load socket.io connection after initial render */}
      <Suspense fallback={null}>
        <PriceAlertSocket />
      </Suspense>

      {showOnboarding && (
        <Suspense fallback={null}>
          <Onboarding onComplete={() => setShowOnboarding(false)} />
        </Suspense>
      )}
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/">
            <Home />
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
            <AppLayout>
              <Discover />
            </AppLayout>
          </Route>
          <Route path="/app/post/:id">
            <AppLayout hideNav>
              <PostDetail />
            </AppLayout>
          </Route>
          <Route path="/app/research/:token">
            <AppLayout hideNav>
              <TokenDetail />
            </AppLayout>
          </Route>
          <Route path="/app/research">
            <AppLayout>
              <Research />
            </AppLayout>
          </Route>
          <Route path="/app/watchlist">
            <AppLayout hideNav>
              <Watchlist />
            </AppLayout>
          </Route>
          <Route path="/app/trading">
            <AppLayout>
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
