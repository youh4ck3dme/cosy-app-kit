import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout shell for /templates and /templates/$slug.
 * Child routes render via Outlet (index list + detail).
 */
export const Route = createFileRoute("/templates")({
  component: () => <Outlet />,
});
