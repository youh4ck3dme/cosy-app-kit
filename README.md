# AI Builder / NEXIFY Forge platform libraries

TanStack Start application (chat + artifact preview) with a headless **Builder Kernel** and isolated **Plugin SDK**. This README describes what is in the repository today. Planned work is labeled as such.

[![CI](https://github.com/youh4ck3dme/cosy-app-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/youh4ck3dme/cosy-app-kit/actions/workflows/ci.yml)

> Coverage badge: **not published** — `@vitest/coverage-v8` is installed but CI does not upload coverage.  
> License: **proprietary / private** — see [LICENSE](./LICENSE) and [docs/LICENSE_GUIDE.md](./docs/LICENSE_GUIDE.md).

## Vision

Evolve a working AI Builder product into a disciplined builder platform: sealed document engine, command history, invariants, and plugin foundations — before Canvas, marketplace, or AI mutation hosts.

## What exists today

| Area | Status | Location |
| --- | --- | --- |
| Product chat (Mistral only) | Implemented | `src/routes`, AI SDK + `@ai-sdk/mistral` |
| Artifact preview canvas | Implemented | `src/components/app-shell` (not kernel Canvas) |
| Supabase auth / DB | Implemented | `src/integrations/supabase`, `supabase/` |
| Builder Kernel | Implemented (library) | `src/lib/builder/` — tags `v0.4.5*` / `v0.4.5.1-hardening` |
| Plugin SDK | Implemented (library) | `src/lib/plugin-sdk/` — tag `v0.4.7-plugin-sdk` |
| Kernel ↔ product UI wiring | Not yet implemented | No route/component imports of `@/lib/builder` |
| Design Canvas (kernel consumer) | Not yet implemented | RPC types only |
| Kernel Observatory (v0.4.6) | Future milestone | Not a released public API |
| Plugin marketplace | Not yet implemented | — |

## Feature matrix

| Feature | Product app | Builder Kernel | Plugin SDK |
| --- | --- | --- | --- |
| Threaded chat + artifacts | Yes | — | — |
| Document model + Zod | — | Yes | — |
| Commands + undo/redo | — | Yes | — |
| Structural invariants | — | Yes | — |
| Kernel plugin registry | — | Yes | — |
| Manifest + lifecycle FSM | — | — | Yes |
| Sealed permission grants | — | Partial (facade) | Yes (frozen) |
| Live Canvas editor for documents | Product artifact UI only | Not yet | Not yet |

## Architecture preview

```mermaid
flowchart TB
  subgraph product [Product application]
    UI[TanStack Start UI]
    Chat[Mistral chat]
    Artifacts[Artifact preview]
    DB[(Supabase)]
  end
  subgraph platform [Platform libraries]
    Kernel[BuilderKernel]
    PSDK[PluginSdkRegistry]
  end
  UI --> Chat --> DB
  UI --> Artifacts --> DB
  UI -.->|Not wired| Kernel
  PSDK -.->|Not wired| Kernel
```

More: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) · [docs/diagrams/](./docs/diagrams/)

## Screenshots

Product UI captures are **not** checked into this repository yet. Placeholders:

- [docs/images/](./docs/images/)

Do not treat placeholders as product screenshots.

## Installation

```bash
bun install
cp .env.example .env.local   # then fill secrets locally — never commit them
bun run dev
```

Details: [docs/INSTALLATION.md](./docs/INSTALLATION.md) · [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)

## Quick start — libraries

```bash
bun run test:unit src/lib/builder
bun run test:unit src/lib/plugin-sdk
bun run test:unit examples
```

Examples: [examples/](./examples/)

## Documentation

| Doc | Link |
| --- | --- |
| Docs index | [docs/README.md](./docs/README.md) |
| Architecture | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Builder Kernel | [docs/BUILDER_KERNEL.md](./docs/BUILDER_KERNEL.md) |
| Plugin SDK | [docs/PLUGIN_SDK.md](./docs/PLUGIN_SDK.md) |
| Security | [docs/SECURITY.md](./docs/SECURITY.md) / [SECURITY.md](./SECURITY.md) |
| Roadmap | [docs/ROADMAP.md](./docs/ROADMAP.md) / [ROADMAP.md](./ROADMAP.md) |
| Changelog | [docs/CHANGELOG.md](./docs/CHANGELOG.md) / [CHANGELOG.md](./CHANGELOG.md) |
| Contributing | [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) / [CONTRIBUTING.md](./CONTRIBUTING.md) |
| ADRs | [docs/adr/](./docs/adr/) |
| RFCs (draft) | [docs/rfc/](./docs/rfc/) |
| Runbooks | [docs/runbooks/](./docs/runbooks/) |
| DevOps | [docs/DEVOPS.md](./docs/DEVOPS.md) |

## Roadmap (summary)

| Version | Status |
| --- | --- |
| v0.4.5 / v0.4.5.1 Kernel + hardening | Released (git tags) |
| v0.4.6 Observatory | Future milestone |
| v0.4.7 Plugin SDK | Released (git tag) |
| v0.5.0 Builder Runtime | Planned |

Full: [docs/ROADMAP.md](./docs/ROADMAP.md)

## Technical highlights (verified)

- Package manager: **Bun** (`bun.lock`); CI also sets Node 24
- Framework: **TanStack Start**, React 19, Vite 8, Tailwind 4, Zod 4
- Product AI policy: **Mistral only** (`MISTRAL_API_KEY`)
- Hosting: Lovable Cloud → Cloudflare Worker ([docs/product/deploy.md](./docs/product/deploy.md))
- CI gate: unit tests + typecheck + build (`.github/workflows/ci.yml`)
- `main` is protected (PR only) — see `.github/BRANCH_PROTECTION.md`

## Repository statistics (approximate, branch-dependent)

| Signal | Value |
| --- | --- |
| npm name | `tanstack_start_ts` (`private: true`) |
| npm version field | unset (releases via git tags) |
| Unit test pattern | `src/**/*.test.ts` + `examples/**/*.test.ts` |
| E2E | Playwright local; not in GitHub CI |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Work on feature branches; do not push directly to `main`.

## License

Proprietary. All rights reserved unless a future OSI license is explicitly adopted. See [LICENSE](./LICENSE).
