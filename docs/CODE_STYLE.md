# Code style

## Formatters and linters

| Tool                           | Command                          |
| ------------------------------ | -------------------------------- |
| Prettier                       | `bun run format` (`.prettierrc`) |
| ESLint                         | `bun run lint`                   |
| Lint gate (CI-relevant scoped) | `bun run lint:gate`              |

`lint:gate` targets `src/lib/**/*.{ts,tsx}` and `src/hooks/**/*.{ts,tsx}` with `--max-warnings 0` and Prettier rule disabled for that gate.

## TypeScript

- `bun run typecheck` (`tsc --noEmit`) is a hard CI gate.
- Prefer explicit types on exported APIs.
- Avoid `any` in builder and plugin-sdk code.
- Prefer `readonly` / frozen structures at trust boundaries (documents, manifests, contexts).

## Imports

- Application code commonly uses the `@/` alias (see Vite / tsconfig paths).
- Keep plugin-sdk free of imports from builder kernel modules (current isolation rule).

## React / UI

- Follow existing app-shell and shadcn patterns when touching product UI.
- Do not introduce a second component library without an evidenced need.

## Naming

| Area     | Convention                                                                  |
| -------- | --------------------------------------------------------------------------- |
| Commands | `SCREAMING_SNAKE` type strings; `PascalCase` classes                        |
| Files    | Existing directory conventions (`*.command.ts`, `*.test.ts`)                |
| Docs     | Uppercase engineering docs under `docs/`; product ops under `docs/product/` |

## What not to do

- Do not bypass invariants for convenience.
- Do not expose live kernel references through Plugin SDK contexts.
- Do not add Next.js assumptions to this TanStack Start codebase.
