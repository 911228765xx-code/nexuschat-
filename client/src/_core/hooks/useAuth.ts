/**
 * useAuth — 认证钩子（无登录模式）
 * 网站已移除登录流程，isAuthenticated 始终返回 true，所有页面公开访问。
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
      // ignore errors on logout in no-login mode
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: false,         // Never block UI waiting for auth
      error: null,            // Never show auth errors
      isAuthenticated: true,  // Always authenticated (no-login mode)
    };
  }, [meQuery.data]);

  // No redirect logic — all pages are publicly accessible

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
