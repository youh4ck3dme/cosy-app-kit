# Installation

## Supported package manager

This repository is developed and CI-tested with **Bun**.

```bash
bun install --frozen-lockfile   # CI style
bun install                     # local
```

A `package-lock.json` may exist for tooling compatibility. Prefer Bun for installs that must match CI.

## Tooling versions (as used in CI)

| Tool       | CI usage                                       |
| ---------- | ---------------------------------------------- |
| Bun        | `oven-sh/setup-bun@v2` (`bun-version: latest`) |
| Node.js    | `24`                                           |
| TypeScript | `tsc --noEmit` via `bun run typecheck`         |

Exact dependency versions are pinned in `bun.lock`.

## Environment variables

See `.env.example` for the declared surface. Typical product categories:

| Category                       | Purpose                     |
| ------------------------------ | --------------------------- |
| Supabase URL / publishable key | Auth and database client    |
| Service-role / server secrets  | Server-only; never commit   |
| `MISTRAL_API_KEY`              | Product chat (Mistral only) |

Do not commit secrets. Use Lovable Cloud Secrets for hosted environments and local env files that remain gitignored.

## Optional: Playwright browsers

E2E is local-only (not part of GitHub CI):

```bash
bun run test:e2e:install
bun run test:e2e
```

## Troubleshooting

| Symptom                          | Check                                                  |
| -------------------------------- | ------------------------------------------------------ |
| Install diverges from CI         | Use `bun install --frozen-lockfile`                    |
| Typecheck fails after pull       | `bun install` then `bun run typecheck`                 |
| Chat fails at runtime            | Confirm `MISTRAL_API_KEY` and AI policy (Mistral only) |
| Unit tests fail with mock errors | Use `bun run test:unit` (Vitest), not bare `bun test`  |
