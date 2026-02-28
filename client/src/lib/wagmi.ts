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

export { bsc, bscTestnet };
