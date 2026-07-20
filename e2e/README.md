# Playwright (local only)

Cursor phase **L** — not part of GitHub CI.

```bash
bun add -d @playwright/test
bunx playwright install chromium
# terminal A: bun run dev
# terminal B:
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 bunx playwright test
```

Specs use `*.pw.ts` so `bun test` / Vitest do not pick them up.
