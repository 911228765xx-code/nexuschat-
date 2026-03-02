/**
 * useAuth — 认证钩子
 * isAuthenticated 基于服务端 session 真实状态：
 *   - meQuery.data 有值 → 已登录
 *   - meQuery.data 为 null/undefined → 未登录
 * loading 期间 isAuthenticated = false，避免触发 protectedProcedure 报 10001。
 *
 * 自动刷新：监听 isAuthenticated 从 false → true（即登录成功），
 * 立即 invalidate 所有 tRPC 查询，确保数据实时更新，无需手动刷新页面。
 */
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useRef } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(_options?: UseAuthOptions) {
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore errors on logout
    } finally {
      // Clear local cache
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      // Redirect to app home page (login/landing page), NOT to Manus external page
      window.location.href = "/";
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    const user = meQuery.data ?? null;
    return {
      user,
      // loading = true while the initial session check is in flight
      loading: meQuery.isLoading,
      error: null,
      // Only true once the server confirms a valid session
      isAuthenticated: !!user,
    };
  }, [meQuery.data, meQuery.isLoading]);

  // ─── Auto-refresh: invalidate all queries when user logs in ───────────────
  // Track previous auth state to detect the false → true transition
  const prevAuthRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Skip while still loading the initial session
    if (meQuery.isLoading) return;

    const wasAuthenticated = prevAuthRef.current;
    const isNowAuthenticated = state.isAuthenticated;

    // Detect login event: was not authenticated (or unknown), now is
    if (wasAuthenticated === false && isNowAuthenticated === true) {
      // Invalidate all tRPC queries so pages reload with fresh data
      utils.invalidate().catch(() => {
        // Non-fatal: queries will refetch on next focus
      });
    }

    prevAuthRef.current = isNowAuthenticated;
  }, [state.isAuthenticated, meQuery.isLoading, utils]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
