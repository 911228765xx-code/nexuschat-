/**
 * useAuth — 认证钩子
 * isAuthenticated 基于服务端 session 真实状态：
 *   - meQuery.data 有值 → 已登录
 *   - meQuery.data 为 null/undefined → 未登录
 * loading 期间 isAuthenticated = false，避免触发 protectedProcedure 报 10001。
 */
import { trpc } from "@/lib/trpc";
import { useCallback, useMemo } from "react";

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
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
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

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
