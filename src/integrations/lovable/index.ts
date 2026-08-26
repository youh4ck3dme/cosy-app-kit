/** Default /auth search bag — keep in sync with auth.tsx validateSearch. */
export const AUTH_SEARCH_DEFAULTS = {
  next: "",
  oauth_stage: "",
  lr: "",
  provider: "",
} as const;

export function authSearch(next = ""): {
  next: string;
  oauth_stage: string;
  lr: string;
  provider: string;
} {
  return {
    next,
    oauth_stage: "",
    lr: "",
    provider: "",
  };
}
