import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * TanStack Router's <Transitioner> assigns `router.startTransition` during render
 * and that wrapper calls setState. Under React 19 concurrent rendering, navigations
 * / updateMatch can invoke it before the Transitioner fiber has mounted → DEV warning:
 * "Can't perform a React state update on a component that hasn't mounted yet".
 *
 * Keep a stable startTransition that runs the work (router-core default) and ignore
 * Transitioner's per-render overwrite. Pending UI still tracks isLoading / hasPending
 * from the router store.
 */
function pinSafeStartTransition(router: {
  startTransition: (fn: () => void) => void;
}): void {
  const run = (fn: () => void) => {
    fn();
  };
  Object.defineProperty(router, "startTransition", {
    configurable: true,
    enumerable: true,
    get: () => run,
    set: () => {
      /* swallow Transitioner assignment */
    },
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Prefetch route code + loaders on hover/touchstart for instant navigation.
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
  });

  pinSafeStartTransition(router);

  return router;
};
