# Build

## Production build

```bash
bun run build
```

Uses Vite (`vite build`) through the Lovable / TanStack Start configuration. Nitro participates in the server build path; the documented hosting target is **Cloudflare Worker** via Lovable Cloud (not Vercel hosting). See [product/deploy.md](./product/deploy.md).

## Development build

```bash
bun run build:dev
```

## Preview

```bash
bun run preview
```

## Typecheck

```bash
bun run typecheck
```

Hard gate in CI. Failures block merge.

## Full local verification

```bash
bun run verify
```

Runs:

1. `typecheck`
2. `test:unit`
3. `lint:gate`
4. `smoke`

Full including Playwright:

```bash
bun run verify:full
```

## CI build environment

GitHub Actions supplies placeholder Supabase and Mistral env values solely so `bun run build` can complete. Those placeholders are not production credentials.

## Deploy note

Merging to `main` does **not** by itself publish production. Production updates require the Lovable Publish flow documented in [product/deploy.md](./product/deploy.md).
