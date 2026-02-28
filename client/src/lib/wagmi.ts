import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc, bscTestnet } from "wagmi/chains";

/**
 * Suppress Reown/WalletConnect analytics requests that trigger
 * "Origin not found on Allowlist" errors in dev/preview environments.
 *
 * The error comes from @reown/appkit-core's EventsController which
 * defaults analytics: true and calls pulse.walletconnect.org.
 * Since we don't control the WalletConnect Cloud allowlist for
 * dynamic sandbox domains, we intercept and block the analytics XHR.
 */
(() => {
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (
      urlStr.includes("pulse.walletconnect") ||
      urlStr.includes("api.web3modal") ||
      urlStr.includes("getAnalyticsConfig")
    ) {
      // Redirect to a no-op data URI so the request never fires
      return (origOpen as Function).call(this, method, "data:text/plain,", ...rest);
    }
    return (origOpen as Function).call(this, method, url, ...rest);
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
