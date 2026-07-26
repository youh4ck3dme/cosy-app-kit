# Runbook: Build

## Local

```bash
bun install
bun run typecheck
bun run test:unit
bun run build
```

Optional aggregate:

```bash
bun run verify
```

## CI

Workflow: `.github/workflows/ci.yml`

1. `bun install --frozen-lockfile`
2. `bun run test:unit`
3. `bun run typecheck`
4. `bun run build` (placeholder Supabase/Mistral env for compile only)

## Notes

- Use Vitest scripts (`bun run test:unit`), not bare `bun test`
- Hosting target is Lovable → Cloudflare Worker; see `docs/product/deploy.md`
