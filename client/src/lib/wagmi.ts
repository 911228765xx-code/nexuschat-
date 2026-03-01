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

/**
 * WalletConnect Cloud Configuration
 * 
 * For production: Set VITE_WALLETCONNECT_PROJECT_ID in environment secrets.
 * Get a free projectId at https://cloud.walletconnect.com
 * Then add your production domain to the allowlist in the WalletConnect dashboard.
 * 
 * Without a valid projectId, wallet connections via WalletConnect QR code
 * will not work, but injected wallets (MetaMask browser extension) still function.
 */
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

if (projectId === "00000000000000000000000000000000" && typeof window !== "undefined") {
  console.warn(
    "[NexusChat] WalletConnect projectId not configured. " +
    "QR code wallet connections are disabled. " +
    "Set VITE_WALLETCONNECT_PROJECT_ID for full wallet support."
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "NexusChat",
  projectId,
  chains: [bsc, bscTestnet],
  ssr: false,
});

export { bsc, bscTestnet };
