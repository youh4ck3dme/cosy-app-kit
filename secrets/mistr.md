# Mistral setup (local) — Large + Codestral

**Never commit real API keys.** This file is a committed guide with placeholders only.

Product policy: **Mistral only** (`MISTRAL_API_KEY`). No OpenAI / Lovable AI Gateway / Gemini for product chat.

## Two models already wired in code

| Role | Model id | When |
| --- | --- | --- |
| Plan / default chat | `mistral-large-latest` | Default thread model; Plan mode |
| Build / code | `codestral-latest` | Build mode when thread still uses Large (or medium) default |
| Suggestions | `mistral-small-latest` | Follow-up chips |

Source of truth: [`src/lib/models.ts`](../src/lib/models.ts) (`DEFAULT_MODEL`, `BUILD_CODE_MODEL`, `resolveModelForMode`).

One API key covers both models on [console.mistral.ai](https://console.mistral.ai/).

```text
User message
    │
    ▼
thread.model + mode (plan|build)
    │
    ▼
resolveModelForMode()
    │
    ├── plan  → mistral-large-latest (or explicit pick)
    └── build → codestral-latest (when default Large/medium)
    │
    ▼
@ai-sdk/mistral + MISTRAL_API_KEY
```

## Step-by-step (local)

1. Create a key at [console.mistral.ai](https://console.mistral.ai/) → API keys.
2. Ensure the account can call **mistral-large-latest** and **codestral-latest** (billing/credits).
3. Copy env template:

```bash
cp .env.example .env.local
```

4. Set (server-only — never `VITE_` prefix for the key):

```bash
MISTRAL_API_KEY=sk-REPLACE_ME
```

5. Optional local notes file (gitignored) — copy this template:

```bash
cp secrets/mistr.local.md.example secrets/mistr.local.md
# edit secrets/mistr.local.md with your private checklist — do not commit
```

6. Start the app:

```bash
bun run dev
```

7. Verify the key is visible to the server (not the browser):

```bash
curl -s http://localhost:8080/api/ai-status | jq '{ok, mistralKeyPresent, defaultModel, buildCodeModel, suggestionModel}'
```

Expected when configured:

```json
{
  "ok": true,
  "mistralKeyPresent": true,
  "defaultModel": "mistral-large-latest",
  "buildCodeModel": "codestral-latest",
  "suggestionModel": "mistral-small-latest"
}
```

8. In the UI:
   - New chat defaults to **Mistral Large** (Plan).
   - Switch agent mode to **Build** → routing prefers **Codestral** for code/HTML.
   - Agent settings can pin another catalog model; explicit Small/Pixtral picks are kept.

## Lovable Cloud / production

Project → Cloud → Secrets → add `MISTRAL_API_KEY` → redeploy.  
Do **not** put the key in client env vars.

## Placeholder checklist (no secrets)

- [ ] `.env.local` exists and is gitignored
- [ ] `MISTRAL_API_KEY` set (non-empty)
- [ ] Supabase `VITE_SUPABASE_*` filled if you need auth/chat persistence
- [ ] `bun run dev` → `/api/ai-status` → `mistralKeyPresent: true`
- [ ] Plan reply uses Large; Build generation uses Codestral (check network / logs)
- [ ] Kernel playground works without Mistral: `/dev/builder-playground`

## If you do not have a key yet

You can still:

```bash
bun run test:unit src/lib/builder
bun run test:unit src/lib/builder/playground
bun run test:unit src/lib/models.test.ts
bun run dev
# open /dev/builder-playground  (no Mistral required)
```

Chat and launch pipelines will fail until `MISTRAL_API_KEY` is set — that is expected.

## Related

- [`.env.example`](../.env.example)
- [`docs/GETTING_STARTED.md`](../docs/GETTING_STARTED.md)
- [`docs/FAQ.md`](../docs/FAQ.md) (Mistral-only policy)
- [`src/routes/api/ai-status.ts`](../src/routes/api/ai-status.ts)
