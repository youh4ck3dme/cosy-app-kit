# Playwright (local quality gate)

**Not** part of GitHub CI (auth + AI streams are flaky without secrets).

## Setup once

```bash
bun install
bun run test:e2e:install
```

## Run

```bash
# Auto-starts dev on :8080 (default Lovable port)
bun run test:e2e

# Or reuse already-running dev:
PLAYWRIGHT_WEB_SERVER=0 bun run test:e2e
```

Custom base URL:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 PLAYWRIGHT_WEB_SERVER=0 bun run test:e2e
```

## Specs (`*.pw.ts`)

| File                    | Coverage                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **`full-journey.pw.ts`**| **End-to-end public path:** landing → Open Builder auth gate → templates filter/detail → Use template → auth form → `/chat` guard → `/api/ai-status` → PWA assets → public 404 → preview traversal → mobile 390px → header deep links |
| `public-routes.pw.ts`   | `/`, `/templates`, `/auth`, fake public artifact                                                                                               |
| `landing.pw.ts`         | Redesigned home: hero / how-it-works / feature grid + 390px overflow                                                                           |
| `share-public.pw.ts`    | templates + 404 public artifact                                                                                                                |
| `palette.pw.ts`         | Cmd+K when logged in (soft-pass on `/auth`)                                                                                                    |
| `mobile-shell.pw.ts`    | 390px viewport overflow + chat entry                                                                                                           |
| `project-preview.pw.ts` | Preview path traversal + unknown artifact 404                                                                                                  |
| `authenticated.pw.ts`   | Real sign-in → chat workspace, palette, theme, Build/Plan, Chat\|Preview, settings. Skipped unless `E2E_EMAIL`/`E2E_PASSWORD` (throwaway).     |

### Authenticated + full workspace

```bash
E2E_EMAIL=you@example.com E2E_PASSWORD='…' bun run test:e2e -- e2e/authenticated.pw.ts
```

Does **not** send AI messages (no credit burn / stream flake).

Vitest does **not** pick up `*.pw.ts` (only `src/**/*.test.ts`).

## Full pre-push gate

```bash
bun run verify        # typecheck + unit + lint:gate + smoke
bun run verify:full   # verify + playwright
```

`lint:gate` lints `src/lib` + `src/hooks` with Prettier rule off (repo-wide prettier debt is not a push blocker; full `bun run lint` is optional cleanup).
