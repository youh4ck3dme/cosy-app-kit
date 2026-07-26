# Repository inventory (documentation source of truth)

Generated for the enterprise documentation pass. Every claim below is grounded in the repository as of the documentation branch cut. Features that are absent are marked explicitly.

## Identity

| Field | Value |
| --- | --- |
| npm package name | `tanstack_start_ts` (`private: true`) |
| Package version field | Not set |
| Product / GitHub (origin) | `youh4ck3dme/cosy-app-kit` |
| NEXIFY Forge remote | `youh4ck3dme/nexify-gooo-builder-loading` (`nexify-gooo`) |
| Primary package manager | Bun (`bun.lock`, `bunfig.toml`) |
| Also present | `package-lock.json` |

## Runtime stack (verified)

| Layer | Technology |
| --- | --- |
| Framework | TanStack Start + TanStack Router + React 19 |
| Bundler | Vite 8 |
| Styling | Tailwind CSS v4 |
| Validation | Zod 4 |
| Auth / DB | Supabase (`@supabase/supabase-js`) |
| Product AI | Mistral via `@ai-sdk/mistral` + AI SDK v6 (policy: Mistral only) |
| Unit tests | Vitest (`src/**/*.test.ts`) |
| E2E | Playwright (local; not GitHub CI) |
| Deploy target | Lovable Cloud → Cloudflare Worker (see [product/deploy.md](./product/deploy.md)) |

## Scripts (verbatim from `package.json`)

| Script | Command |
| --- | --- |
| `dev` | `vite dev` |
| `build` | `vite build` |
| `build:dev` | `vite build --mode development` |
| `preview` | `vite preview` |
| `lint` | `eslint .` |
| `lint:gate` | eslint scoped gate on `src/lib` + `src/hooks` |
| `typecheck` | `tsc --noEmit` |
| `test` / `test:unit` | `vitest run` |
| `test:watch` | `vitest` |
| `test:e2e` | `playwright test` |
| `smoke` | `bun scripts/smoke.ts` |
| `prod-smoke` | `bun scripts/prod-smoke.ts` |
| `verify` | typecheck + unit + lint:gate + smoke |
| `verify:full` | verify + e2e |
| `format` | `prettier --write .` |

## Builder Kernel (`src/lib/builder/`)

Headless engine. Public barrel: `src/lib/builder/index.ts`.

Present:

- Document model + Zod parse (`document/`)
- Structural invariants (`document/documentInvariants.ts`)
- Commands: ADD / REMOVE / UPDATE / MOVE / BATCH
- History / undo-redo (`history/historyManager.ts`, default max 100)
- Event bus (`kernel/eventBus.ts`)
- `BuilderKernel`, `BuilderUiState`, `bootstrapBuilderKernel`
- Node registry + native definitions
- Kernel-side `PluginRegistry` (permission-gated node/command registration)
- IR types + `IRToCommandCompiler`
- Canvas RPC **types only** (`renderer/canvas/canvasRpc.types.ts`)

Not present / not wired:

- Design Canvas UI consuming the kernel (Planned)
- Kernel persistence to Supabase / IndexedDB (Not yet implemented)
- Product routes/components importing `@/lib/builder` (Not yet implemented)
- Vision / Figma / HTML import adapters (Not yet implemented)
- Marketplace product (Not yet implemented)

## Plugin SDK (`src/lib/plugin-sdk/`)

Isolated foundation (tag `v0.4.7-plugin-sdk`):

- Manifest validation (Zod), frozen permissions after validation
- Lifecycle FSM: registered → installed → enabled ↔ disabled → destroyed
- Sealed `PluginContext` (read accessors only)
- **Not wired** to Builder Kernel `PluginRegistry`

## Observability (`src/lib/builder/diagnostics/`)

Present on disk in some worktrees as untracked files. **Not part of the committed public API** and not exported from `src/lib/builder/index.ts`. Treat as **Future milestone (v0.4.6)** until merged.

## Release tags (git)

| Tag | Meaning |
| --- | --- |
| `v0.4.5-kernel-foundation` | Kernel foundation freeze |
| `v0.4.5-kernel-foundation-audited` | Audited baseline |
| `v0.4.5.1-hardening` | Hardening release |
| `v0.4.7-plugin-sdk` | Plugin SDK Foundation |

## CI

- `.github/workflows/ci.yml` — unit tests, typecheck, build on PR/`developeredit`
- `.github/workflows/prod-smoke.yml` — prod smoke on `main`
- Required check name: `Install · test · typecheck · build`

## License

No `LICENSE` file. Root README historically stated the project is private. See [LICENSE_GUIDE.md](./LICENSE_GUIDE.md).
