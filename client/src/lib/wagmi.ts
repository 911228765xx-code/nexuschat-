import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc, bscTestnet } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "NexusChat",
  projectId: "nexuschat-bsc-wallet", // WalletConnect project ID (public apps can use any string for dev)
  chains: [bsc, bscTestnet],
  ssr: false,
});

export { bsc, bscTestnet };
