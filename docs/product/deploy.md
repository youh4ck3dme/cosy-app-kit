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

### PWA / manifest on Vercel preview URLs

Production PWA assets live on **https://cosy-app-kit.lovable.app** (Lovable → Cloudflare). That host serves `/manifest.webmanifest` with HTTP 200.

**Vercel Deployment Protection** on preview hosts (`*-h4ck3d.vercel.app`, etc.) redirects `/manifest.webmanifest` to `https://vercel.com/sso-api?…`. The browser then logs a CORS error — that is **not** an app CORS bug. Native `<link rel="manifest">` and any warm `fetch` will fail the same way until SSO is disabled, a Bypass is used, or you test on the unprotected production domain.

Also expected in Chromium: `beforeinstallprompt` + “Banner not shown” — the app calls `preventDefault()` so install runs from Settings (`promptInstallApp`), not the default browser banner.

Do **not** debug Google OAuth / chat because of those console lines.

---

## Deploy fingerprint

Bump constants in [`src/lib/deploy-rev.ts`](../../src/lib/deploy-rev.ts) when you ship:

| Constant       | When to bump                           |
| -------------- | -------------------------------------- |
| `BUILD_MARKER` | Agent API, tools, prompts, models      |
| `SHELL_REV`    | UI shell, PWA, viewport lock, settings |

Verify live:

```bash
curl -s https://cosy-app-kit.lovable.app/api/ai-status | jq '{buildMarker, shellRev, gitSha, ok}'
```

Expected after this ship: `shellRev: "native-shell-1"`, `buildMarker: "mistral-agent-g2-1"`.

---

## If prod smoke fails after merge

| Symptom                                               | Fix                                                                                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shellRev` mismatch                                   | Lovable **Publish** not done yet → Publish, re-run `bun run prod-smoke`                                                                                          |
| `manifest.id` missing                                 | Same — old bundle still live                                                                                                                                     |
| CORS on `manifest.webmanifest` → `vercel.com/sso-api` | You are on an **SSO-protected Vercel preview**. Test PWA on https://cosy-app-kit.lovable.app or disable Deployment Protection / use Bypass — not an app CORS fix |
| `mistralKeyPresent: false`                            | Lovable Cloud → Secrets → `MISTRAL_API_KEY` → redeploy                                                                                                           |
| Apple meta tags missing in `/chat` HTML               | Publish + hard refresh (SW cache)                                                                                                                                |

---

## CI

- **Install · test · typecheck · build** — runs on PRs to `main` / `developeredit`
- **Prod smoke** — runs on push to `main` + manual dispatch; hits live URL

See [`.github/workflows/prod-smoke.yml`](../../.github/workflows/prod-smoke.yml).
