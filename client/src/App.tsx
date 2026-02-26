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
import AppLayout from "./components/AppLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/app/chat/:id" component={() => (
        <AppLayout>
          <ChatRoom />
        </AppLayout>
      )} />
      <Route path="/app/chat" component={() => (
        <AppLayout>
          <Chat />
        </AppLayout>
      )} />
      <Route path="/app/discover" component={() => (
        <AppLayout>
          <Discover />
        </AppLayout>
      )} />
      <Route path="/app/research" component={() => (
        <AppLayout>
          <Research />
        </AppLayout>
      )} />
      <Route path="/app/trading" component={() => (
        <AppLayout>
          <Trading />
        </AppLayout>
      )} />
      <Route path="/app/profile" component={() => (
        <AppLayout>
          <Profile />
        </AppLayout>
      )} />
      <Route path="/app" component={() => (
        <AppLayout>
          <Chat />
        </AppLayout>
      )} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <I18nProvider>
          <TooltipProvider>
            <Toaster
              toastOptions={{
                style: {
                  background: 'oklch(0.15 0.02 260)',
                  border: '1px solid oklch(0.25 0.02 260)',
                  color: 'oklch(0.93 0.005 260)',
                },
              }}
            />
            <Router />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
