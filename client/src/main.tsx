// build:2026-03-04T08:56:55.024Z
import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TRPCClientError, httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { toast } from "sonner";
import App from "./App";
import "./index.css";
// Web3 providers are loaded on-demand inside Wallet page only
// Sentry error monitoring — initialize before anything else
import { initSentry } from "@/lib/sentry";
initSentry();

// ─── 503 / Server-Restart Detection ─────────────────────────────────────────
// Track whether we've already shown the "server restarting" toast so we don't
// spam the user with repeated notifications during a brief restart window.
let serverRestartToastId: string | number | undefined;

function is503Error(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  // Our vite.ts catch-all now returns { error: "Service temporarily unavailable" }
  // with HTTP 503 status. tRPC wraps this as a TRPCClientError with the JSON body.
  const msg = error.message ?? "";
  return (
    msg.includes("Service temporarily unavailable") ||
    msg.includes("503") ||
    // Fallback: the old HTML response before our fix was applied
    msg.includes("Unexpected token '<'")
  );
}

function showServerRestartToast() {
  if (serverRestartToastId) return; // already showing
  serverRestartToastId = toast.loading("服务器重启中，请稍候...", {
    duration: Infinity, // keep until dismissed
    id: "server-restart",
  });
}

function dismissServerRestartToast() {
  if (!serverRestartToastId) return;
  toast.dismiss(serverRestartToastId);
  serverRestartToastId = undefined;
}

// ─── QueryClient ─────────────────────────────────────────────────────────────
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
      // Smart retry: retry 503 errors up to 3 times with 2s delay; other errors once
      retry: (failureCount, error) => {
        if (is503Error(error)) return failureCount < 3;
        return failureCount < 1;
      },
      retryDelay: (attemptIndex, error) => {
        if (is503Error(error)) return 2_000; // 2s fixed delay for server restart
        return Math.min(1_000 * 2 ** attemptIndex, 10_000); // exponential for other errors
      },
    },
    mutations: {
      // Retry mutations once on 503 (server restart during submit)
      retry: (failureCount, error) => {
        if (is503Error(error)) return failureCount < 1;
        return false;
      },
      retryDelay: 2_000,
    },
  },
});

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    if (is503Error(error)) {
      showServerRestartToast();
    } else {
      console.error("[API Query Error]", error);
    }
  }
  // When a query succeeds after retrying, dismiss the restart toast
  if (event.type === "updated" && event.action.type === "success") {
    dismissServerRestartToast();
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    if (is503Error(error)) {
      showServerRestartToast();
    } else {
      console.error("[API Mutation Error]", error);
    }
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

// Register Service Worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failure is non-fatal
    });
  });
}

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
} catch(e) {
  window.__APP_RENDER_ERROR__ = String(e);
  console.error('RENDER FAILED:', e);
}
