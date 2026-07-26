# Daily dev — One-Command Ship Loop

OmniOps default path: **fix → `bun run ship` → PR**. Do not start the day by reading ten todo boards.

## Prerequisites

```bash
bun install
bun run test:e2e:install   # once per machine
```

Optional authenticated e2e inside ship:

```bash
export E2E_EMAIL=… E2E_PASSWORD=…
```

## Loop

1. Branch off current work base:

   ```bash
   git checkout developeredit   # or: git checkout -b feature/short-name origin/main
   ```

2. Fix / implement (one concern per PR).

3. Verify:

   ```bash
   bun run ship
   ```

   Runs typecheck, unit, lint:gate, **ship-gates** (CDN policy + wow `data-testid`s), then e2e landing + `/chat`→`/auth` + `/api/ai-status`.

4. Commit and push the **branch** (never `main`):

   ```bash
   git push -u origin HEAD
   ```

5. Open PR into `main`:

   ```bash
   gh pr create --base main --title "…" --body "…"
   ```

6. Wait for CI job **Install · test · typecheck · build** (includes ship-gates).

7. After production deploy / Lovable publish:

   - `GET /api/ai-status` → `ok: true`, provider mistral
   - Open `/chat`

## Lanes

| Lane | Agent | Job |
| --- | --- | --- |
| Ship | Cursor | Wire, fix, `bun run ship`, PR |
| Shape | Claude | ADR, copy, design direction |

One agent = one branch. Do not share a branch across Cursor and Claude.

## STOP list (unless owner asks)

- Push / force-push `main`
- Marketplace / CRDT / Design Canvas host in a ship PR
- OpenAI / Lovable AI Gateway for product chat

## Related

- [BRANCH_PROTECTION.md](../../.github/BRANCH_PROTECTION.md)
- [TESTING.md](../TESTING.md)
- [prod smoke](../product/smoke-checklist.md)
