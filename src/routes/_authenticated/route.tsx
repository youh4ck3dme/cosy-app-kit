import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { authSearch } from "@/integrations/lovable";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const next =
        location.pathname.startsWith("/") && !location.pathname.startsWith("//")
          ? `${location.pathname}${location.searchStr || ""}`
          : "/chat";
      throw redirect({ to: "/auth", search: authSearch(next) });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
