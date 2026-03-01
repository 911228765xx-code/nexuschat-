/**
 * Web3ProviderImpl — 实际的 Wagmi + RainbowKit 提供者实现
 * 此文件被 LazyWeb3Provider 动态导入，不进入首屏 bundle
 */
import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmi";
import { WalletProvider } from "@/contexts/WalletContext";
import "@rainbow-me/rainbowkit/styles.css";

interface Props {
  children: ReactNode;
}

export default function Web3ProviderImpl({ children }: Props) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider theme={darkTheme()} locale="zh-CN">
        <WalletProvider>
          {children}
        </WalletProvider>
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
