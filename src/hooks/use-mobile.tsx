import * as React from "react";

/** SSR-safe media-query hook: false on the server, live-updating on the client. */
export function useBreakpoint(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  return useBreakpoint("(max-width: 767px)");
}

/** Below the lg breakpoint — sidebar and canvas compete for space. */
export function useIsCompact() {
  return useBreakpoint("(max-width: 1023px)");
}
