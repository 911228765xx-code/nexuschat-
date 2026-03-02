/**
 * Sentry 错误监控初始化
 * DSN 通过环境变量 VITE_SENTRY_DSN 注入（可选）。
 * 若未配置 DSN，Sentry 不会初始化，不影响应用正常运行。
 */
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry() {
  if (!dsn) {
    // DSN 未配置时静默跳过，不影响开发体验
    return;
  }

  Sentry.init({
    dsn,
    // 采样率：生产环境 10%，其他环境 100%
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // 错误采样率：生产环境 100%
    replaysOnErrorSampleRate: 1.0,
    // 正常会话采样率：生产环境 1%
    replaysSessionSampleRate: 0.01,
    environment: import.meta.env.MODE,
    // 过滤掉 WalletConnect 的非致命错误，避免噪音
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value ?? "";
      const isWalletConnectNoise = [
        "Subscribing to",
        "Connection interrupted",
        "WebSocket connection",
        "origin not allowed",
        "No matching key",
        "walletconnect",
      ].some(pattern => msg.includes(pattern));
      if (isWalletConnectNoise) return null;
      return event;
    },
  });
}

/**
 * 手动上报错误（供 ErrorBoundary 调用）
 */
export function reportError(error: Error, context?: Record<string, unknown>) {
  if (!dsn) {
    // 未配置 Sentry 时只打印到控制台
    console.error("[ErrorBoundary]", error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}
