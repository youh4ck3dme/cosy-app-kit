/** Bump when agent/API stack ships (tools, prompts, models). */
export const BUILD_MARKER = "mistral-agent-g2-1";

/** Bump when UI/PWA/shell ships (viewport lock, settings, manifest). */
export const SHELL_REV = "native-shell-1";

/** Production URL — used by prod-smoke and CI. */
export const PROD_ORIGIN = "https://cosy-app-kit.lovable.app";

/** Best-effort git SHA from CI / hosting env (never throws). */
export function resolveGitSha(): string | null {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.CF_PAGES_COMMIT_SHA ??
    process.env.COMMIT_SHA;
  const trimmed = sha?.trim();
  return trimmed && trimmed.length >= 7 ? trimmed.slice(0, 12) : null;
}
