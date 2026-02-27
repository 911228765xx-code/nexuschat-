import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import ChatRoom from "./pages/ChatRoom";
import Research from "./pages/Research";
import Trading from "./pages/Trading";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import Contacts from "./pages/Contacts";
import Notifications from "./pages/Notifications";
import AppLayout from "./components/AppLayout";
import Onboarding from "./components/Onboarding";
import CreateGroup from "./pages/CreateGroup";
import EditProfile from "./pages/EditProfile";
import GroupChatRoom from "./pages/GroupChatRoom";
import Wallet from "./pages/Wallet";
import { AppProvider } from "./contexts/AppContext";

function AppContent() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const onboarded = localStorage.getItem("nexuschat_onboarded");
    return !onboarded && window.location.pathname.startsWith("/app");
  });

  return (
    <>
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}
      <Switch>
        <Route path="/">
          <Home />
        </Route>
        <Route path="/app/group/:id">
          <AppLayout hideNav>
            <GroupChatRoom />
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
        <Route path="/app/discover">
          <AppLayout>
            <Discover />
          </AppLayout>
        </Route>
        <Route path="/app/research">
          <AppLayout>
            <Research />
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
