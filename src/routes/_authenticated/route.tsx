import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { authSearch } from "@/integrations/lovable";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // getUser can hang on flaky network — fail closed to /auth (never blank /chat).
    const timedOut = Symbol("auth-timeout");
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<typeof timedOut>((resolve) => setTimeout(() => resolve(timedOut), 5_000)),
    ]);
    const unauthenticated =
      result === timedOut ||
      ("error" in result && result.error) ||
      !("data" in result && result.data.user);
    if (unauthenticated) {
      const next =
        location.pathname.startsWith("/") && !location.pathname.startsWith("//")
          ? `${location.pathname}${location.searchStr || ""}`
          : "/chat";
      throw redirect({ to: "/auth", search: authSearch(next) });
    }
    return { user: (result as Awaited<ReturnType<typeof supabase.auth.getUser>>).data.user! };
  },
  component: () => <Outlet />,
});
