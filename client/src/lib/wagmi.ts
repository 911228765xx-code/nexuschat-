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
 * Suppress Reown/WalletConnect analytics requests that trigger
 * "Origin not found on Allowlist" errors in dev/preview environments.
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
      urlStr.includes("getAnalyticsConfig")
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
