import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  mainnet,
  bsc,
  bscTestnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  fantom,
} from "wagmi/chains";

/**
 * Suppress Reown/WalletConnect analytics fetch requests that trigger
 * "Origin not found on Allowlist" console errors in dev/preview environments.
 * 
 * NOTE: WalletConnect WebSocket relay errors (code 3000 Unauthorized) occur when
 * the domain is not in the WalletConnect Cloud allowlist. These are suppressed
 * globally via the unhandledrejection handler in main.tsx and are non-fatal.
 * To fully resolve: add your domain to https://cloud.walletconnect.com allowlist.
 */
(() => {
  if (typeof window === "undefined") return;

  const origFetch = window.fetch;
  window.fetch = function (...args: Parameters<typeof fetch>) {
    const input = args[0];
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input instanceof Request
            ? input.url
            : "";

    if (
      urlStr.includes("pulse.walletconnect") ||
      urlStr.includes("api.web3modal") ||
      urlStr.includes("getAnalyticsConfig") ||
      urlStr.includes("notify.walletconnect")
    ) {
      return Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    return origFetch.apply(this, args);
  };
})();

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "beaaf227055fc3619bc2af9615e94000";

export const wagmiConfig = getDefaultConfig({
  appName: "NexusChat",
  projectId,
  chains: [mainnet, bsc, polygon, arbitrum, optimism, base, avalanche, fantom, bscTestnet],
  ssr: false,
});

export { mainnet, bsc, bscTestnet, polygon, arbitrum, optimism, base, avalanche, fantom };
