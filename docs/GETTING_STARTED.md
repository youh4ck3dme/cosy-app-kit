# Getting started

Goal: run the application locally and optionally exercise the Builder Kernel and Plugin SDK unit surfaces.

## Prerequisites

- [Bun](https://bun.sh) (primary package manager; lockfile is `bun.lock`)
- Node.js 24 compatible toolchain (CI uses Node 24)
- Access to required secrets for full product chat (see [INSTALLATION.md](./INSTALLATION.md))

## Install

```bash
bun install
```

## Configure environment

Copy `.env.example` to `.env.local` (or `.env`) and fill values required for your target. Product chat requires `MISTRAL_API_KEY` and Supabase credentials. Kernel and Plugin SDK unit tests do not require network credentials.

## Develop

```bash
bun run dev
```

Vite serves the TanStack Start application.

## Verify (local engineering gate)

```bash
bun run typecheck
bun run test:unit
bun run build
```

Or:

```bash
bun run verify
```

(`verify` also runs `lint:gate` and `smoke`.)

## Builder Kernel (library)

The headless kernel lives at `src/lib/builder/`. It is covered by Vitest under `src/lib/builder/**/*.test.ts`. It is **not** yet wired into product routes or components.

```bash
bun run test:unit src/lib/builder
```

## Plugin SDK (library)

Isolated SDK at `src/lib/plugin-sdk/` (release tag `v0.4.7-plugin-sdk`):

```bash
bun run test:unit src/lib/plugin-sdk
```

## Next reading

1. [ARCHITECTURE.md](./ARCHITECTURE.md)
2. [BUILDER_KERNEL.md](./BUILDER_KERNEL.md)
3. [PLUGIN_SDK.md](./PLUGIN_SDK.md)
4. [CONTRIBUTING.md](./CONTRIBUTING.md)
