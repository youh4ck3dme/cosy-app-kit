# Production deploy (Lovable Cloud)

**Prod URL:** https://cosy-app-kit.lovable.app  
**Hosting:** Lovable Cloud → Cloudflare Worker (not Vercel)  
**Source branch:** `main` (locked — PR only)

Git merge into `main` does **not** update production automatically. You must **Publish** in Lovable after GitHub sync.

---

## Post-merge checklist (every PR to `main`)

1. **Wait** for Lovable to sync from GitHub (usually a few minutes).
2. **Lovable editor** → **Publish / Update**.
3. **Run prod smoke** (local or CI):

```bash
bun run prod-smoke
```

Or re-run the GitHub Action **Prod smoke** (`workflow_dispatch`) from the Actions tab.

4. **iPhone / PWA:** hard refresh or re-open from home screen. Settings → Speed & PWA booster toggles should be present.

---

## Deploy fingerprint

Bump constants in [`src/lib/deploy-rev.ts`](../../src/lib/deploy-rev.ts) when you ship:

| Constant | When to bump |
|----------|----------------|
| `BUILD_MARKER` | Agent API, tools, prompts, models |
| `SHELL_REV` | UI shell, PWA, viewport lock, settings |

Verify live:

```bash
curl -s https://cosy-app-kit.lovable.app/api/ai-status | jq '{buildMarker, shellRev, gitSha, ok}'
```

Expected after this ship: `shellRev: "native-shell-1"`, `buildMarker: "mistral-agent-g2-1"`.

---

## If prod smoke fails after merge

| Symptom | Fix |
|---------|-----|
| `shellRev` mismatch | Lovable **Publish** not done yet → Publish, re-run `bun run prod-smoke` |
| `manifest.id` missing | Same — old bundle still live |
| `mistralKeyPresent: false` | Lovable Cloud → Secrets → `MISTRAL_API_KEY` → redeploy |
| Apple meta tags missing in `/chat` HTML | Publish + hard refresh (SW cache) |

---

## CI

- **Install · test · typecheck · build** — runs on PRs to `main` / `developeredit`
- **Prod smoke** — runs on push to `main` + manual dispatch; hits live URL

See [`.github/workflows/prod-smoke.yml`](../../.github/workflows/prod-smoke.yml).
