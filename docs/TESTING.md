# Testing

## Unit tests (Vitest)

Configuration: `vitest.config.ts`

- Environment: `node`
- Include: `src/**/*.test.ts`

Commands:

```bash
bun run test:unit
bun run test:watch
bun run test          # alias of vitest run
```

Important: use Vitest scripts, not bare `bun test` (breaks `vi` mocks; noted in CI comments).

### Notable suites

| Area | Path pattern |
| --- | --- |
| Builder Kernel | `src/lib/builder/**/*.test.ts` |
| Plugin SDK | `src/lib/plugin-sdk/plugin-sdk.test.ts` |
| Broader `src/lib` | various `*.test.ts` |

## End-to-end (Playwright)

```bash
bun run test:e2e:install
bun run test:e2e
```

Documented in `e2e/README.md`. **Not** executed in GitHub Actions CI.

## Smoke

```bash
bun run smoke
bun run prod-smoke
```

Prod smoke workflow targets the published production URL.

## Aggregate gates

```bash
bun run verify       # typecheck + unit + lint:gate + smoke
bun run verify:full  # verify + e2e
```

CI subset: unit + typecheck + build.

## Coverage

`@vitest/coverage-v8` is installed as a devDependency. There is **no** `coverage` script in `package.json` and no coverage upload in CI. Published coverage badges would be inaccurate today — treat coverage reporting as **Not yet implemented** in CI.

## Writing tests for the kernel

Prefer exercising `BuilderKernel.dispatch` / `undo` / `redo` with real command classes. Assert document integrity with `validateDocument` where relevant. See adversarial and hardening suites for patterns.
