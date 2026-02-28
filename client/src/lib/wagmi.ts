import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc, bscTestnet } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "NexusChat",
  // WalletConnect Cloud projectId — replace with real one from https://cloud.walletconnect.com
  // Using a valid-format placeholder to suppress 403 warnings in dev
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000",
  chains: [bsc, bscTestnet],
  ssr: false,
});

// Disable Reown/WalletConnect analytics at runtime to prevent "Origin not found on Allowlist" errors.
// We use a dynamic require-style approach to avoid TypeScript module resolution issues.
// OptionsController is available via the pre-bundled Vite chunk that contains appkit-controllers.
try {
  // Access OptionsController through the global module registry if available
  // This is a best-effort approach; the analytics error is non-blocking
  const win = window as unknown as Record<string, unknown>;
  if (win.__REOWN_APPKIT_CONTROLLERS__) {
    const controllers = win.__REOWN_APPKIT_CONTROLLERS__ as { OptionsController?: { setFeatures: (f: Record<string, unknown>) => void } };
    controllers.OptionsController?.setFeatures({ analytics: false });
  }
} catch {
  // Silently ignore any errors
}

export { bsc, bscTestnet };
