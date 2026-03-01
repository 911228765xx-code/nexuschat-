/**
 * LazyStreamdown — 动态加载 streamdown 组件
 * 避免 shiki(9.3MB) + mermaid(1.6MB) 被打包进首屏 bundle
 * 首次渲染时显示纯文本，加载完成后切换为 Streamdown 渲染
 */
import { lazy, Suspense } from "react";

// 动态 import streamdown，不进入首屏 bundle
const StreamdownLazy = lazy(() =>
  import("streamdown").then((mod) => ({ default: mod.Streamdown }))
);

interface LazyStreamdownProps {
  children: string;
  className?: string;
}

export function LazyStreamdown({ children, className }: LazyStreamdownProps) {
  return (
    <Suspense
      fallback={
        <pre className={`whitespace-pre-wrap text-sm leading-relaxed ${className ?? ""}`}>
          {children}
        </pre>
      }
    >
      <StreamdownLazy className={className}>{children}</StreamdownLazy>
    </Suspense>
  );
}

export default LazyStreamdown;
