import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc, bscTestnet } from "wagmi/chains";

/**
 * Suppress Reown/WalletConnect analytics requests that trigger
 * "Origin not found on Allowlist" errors in dev/preview environments.
 *
 * The SDK uses native `fetch` (via FetchUtil → fetchData) to POST to
 * pulse.walletconnect.org. Since our dynamic sandbox domains are not
 * on the WalletConnect Cloud allowlist, we intercept fetch and return
 * a fake 200 response for analytics endpoints.
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
      // Return a fake successful response so the SDK doesn't throw
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

export const wagmiConfig = getDefaultConfig({
  appName: "NexusChat",
  // WalletConnect Cloud projectId — replace with real one from https://cloud.walletconnect.com
  projectId:
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
    "00000000000000000000000000000000",
  chains: [bsc, bscTestnet],
  ssr: false,
});

export { bsc, bscTestnet };
