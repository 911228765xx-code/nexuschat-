/**
 * LazyWeb3Provider — 懒加载 Wagmi + RainbowKit 提供者
 * 将 3.5MB 的 web3 bundle 从初始加载中剥离
 * 只有当用户访问需要钱包的页面时才加载
 */
import { lazy, Suspense, ReactNode } from "react";

// 动态加载 Web3 Provider 组件
const Web3ProviderImpl = lazy(() => import("./Web3ProviderImpl"));

interface Props {
  children: ReactNode;
}

export function LazyWeb3Provider({ children }: Props) {
  return (
    <Suspense fallback={<>{children}</>}>
      <Web3ProviderImpl>{children}</Web3ProviderImpl>
    </Suspense>
  );
}
