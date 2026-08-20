// build:2026-08-20T17:21:31.585Z
import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
// Web3 providers are loaded on-demand inside Wallet page only
// Sentry error monitoring — initialize before anything else
import { initSentry } from "@/lib/sentry";
initSentry();

// No-login mode: API errors are logged but never redirect to login page
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 2 minutes — prevents redundant refetches on page switch
      staleTime: 2 * 60_000,
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60_000,
      // Don't refetch when user switches browser tabs
      refetchOnWindowFocus: false,
      // Don't refetch when network reconnects (we handle this manually)
      refetchOnReconnect: false,
      // Retry failed requests only once
      retry: 1,
    },
  },
});
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[API Query Error]", event.query.state.error);
  }
});
queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    console.error("[API Mutation Error]", event.mutation.state.error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Suppress WalletConnect/Reown unhandled promise rejections that cause white screen on mobile
// These errors occur when the WalletConnect relay WebSocket is rejected due to domain not being
// in the allowlist. They are non-fatal and should not crash the app.
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason?.message || String(reason || '');
  const isWalletConnectError = (
    msg.includes('Subscribing to') ||
    msg.includes('Connection interrupted') ||
    msg.includes('WebSocket connection') ||
    msg.includes('origin not allowed') ||
    msg.includes('Unauthorized') ||
    msg.includes('walletconnect') ||
    msg.includes('relay.walletconnect') ||
    msg.includes('wc@2') ||
    msg.includes('No matching key')
  );
  if (isWalletConnectError) {
    event.preventDefault(); // prevent unhandled rejection from crashing the app
    return;
  }
});

// JS is now loaded — immediately switch from splash to skeleton screen
// This ensures users see a skeleton instead of black screen while React initializes
try {
  const showSkeleton = (window as any).__nexusShowSkeleton;
  if (typeof showSkeleton === 'function') showSkeleton();
} catch(_) {}

window.__APP_RENDER_START__ = Date.now();
try {
  createRoot(document.getElementById("root")!).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
  window.__APP_RENDER_DONE__ = Date.now();
  // Do not wait for route data or a component effect: once React has had a
  // frame to commit its first fallback/content, release the static overlay.
  requestAnimationFrame(() => {
    try { (window as any).__nexusHideSkeleton?.(); } catch (_) {}
  });
} catch(e) {
  window.__APP_RENDER_ERROR__ = String(e);
  console.error('RENDER FAILED:', e);
}
