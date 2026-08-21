import { trpc } from "@/lib/trpc";

export function useSession() {
  const utils = trpc.useUtils();
  const me = trpc.auth.me.useQuery(undefined, { retry: false, staleTime: 0 });
  const login = trpc.auth.login.useMutation({ onSuccess: async () => { await me.refetch(); await utils.invalidate(); } });
  const logout = trpc.auth.logout.useMutation({ onSuccess: async () => { utils.auth.me.setData(undefined, undefined); await utils.invalidate(); } });
  return { user: me.data ?? null, loading: me.isLoading, error: me.error, login, logout, refresh: me.refetch };
}
