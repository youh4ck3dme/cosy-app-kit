# OmniOps Blueprint — cosy-app-kit / AI Builder

**Status:** ACTIVE · **Owner:** youh4ck3dme · **Product:** AI Builder (cosy-app-kit)  
**Effective:** 2026-07-20 · **Default AI role from now:** OmniOps Developer (professional)

This is the **operating system** for humans and AI agents working on this repo.  
If a rule here conflicts with a casual prompt, **this file wins** unless the owner explicitly overrides it in that message.

---

## 0) Mission

Ship a **stable** Builder product:

- Chat + live canvas + artifacts  
- **Mistral-only** inference (no OpenAI / ChatGPT / Lovable AI Gateway for app chat)  
- Supabase Auth/DB (RLS)  
- Remote MCP for tools  
- Fast iteration **without** breaking production  

**Speed is a feature. Stability of `main` is a hard requirement.**

---

## 1) System map

| Layer | What | Where |
|-------|------|--------|
| Product UI | Builder chat, canvas, settings | `src/routes`, `src/components/app-shell` |
| Chat API | Stream + persist messages/artifacts | `src/routes/api/chat.ts` |
| AI | **Mistral API only** | `src/lib/ai-gateway.server.ts`, `src/lib/models.ts` |
| Auth | Supabase + Lovable OAuth broker | `src/integrations/supabase`, `src/integrations/lovable` |
| DB | threads, messages, artifacts, agent_settings | Supabase project `magqgwqyijuuaoovyjps` |
| MCP | list/get/create threads & artifacts | `src/routes/mcp.ts`, `src/lib/mcp` |
| Hosting | Lovable Cloud → Cloudflare Worker | https://cosy-app-kit.lovable.app |
| GitHub | `youh4ck3dme/cosy-app-kit` | `main` locked, work on `developeredit` |

---

## 2) Branch & release model (non-negotiable)

```
main            = production source of truth (LOCKED)
developeredit   = default working branch for humans + AI
feature/*       = optional short-lived branches
```

### Rules

| Action | Allowed? |
|--------|----------|
| `git push origin main` | **NO** (branch protection + enforce admins) |
| Force-push `main` | **NO** |
| Work / push `developeredit` | **YES** |
| Open PR → `main` | **YES** |
| Merge PR to `main` | **ONLY owner**, after green CI + explicit intent |
| `gh pr merge` by AI | **ONLY if owner says “merge PR #N” in that turn** |

### Happy path

```bash
git checkout developeredit
git pull origin developeredit
# … implement …
git add -A && git commit -m "…"
git push origin developeredit
gh pr create --base main --head developeredit --title "…" --body "…"
# Owner: review → merge when CI green
# Lovable: Publish / wait for sync → hard refresh prod
```

### After merge to `main`

1. Confirm CI on `main` green  
2. Lovable **Publish / Update** if frontend still old  
3. Smoke: `/api/ai-status`, `/chat`, one Mistral prompt  
4. Continue work back on `developeredit` (branch from updated `main` when needed)

---

## 3) Environments & secrets

### Local (`/Users/erikbabcan/lovable-builder-cosyapp`)

| File | Commit? | Contents |
|------|---------|----------|
| `.env` | **NO** (gitignored) | Supabase public URL + publishable key (+ VITE_*) |
| `.env.local` | **NO** | `MISTRAL_API_KEY` |
| `.env.example` | **YES** | placeholders only |

```bash
cd /Users/erikbabcan/lovable-builder-cosyapp
bun install
bun dev    # http://localhost:8080
```

### Lovable Cloud (production / preview)

**Secrets (Cloud UI)** — set explicitly:

- `SUPABASE_URL`  
- `SUPABASE_PUBLISHABLE_KEY`  
- `VITE_SUPABASE_URL`  
- `VITE_SUPABASE_PUBLISHABLE_KEY`  
- `VITE_SUPABASE_PROJECT_ID`  
- `MISTRAL_API_KEY`  

**Code safety net:**  
`src/integrations/supabase/public-config.ts` holds **public anon** URL/key fallbacks so the client still boots if Cloud forgets to inject env.  
This is **not** service_role. RLS remains the real security boundary.

### GitHub Actions

- Use **repo Secrets**, never hardcode JWTs in workflows  
- CI job name (branch protection): `Install · test · typecheck · build`

### Forbidden in git

- `MISTRAL_API_KEY`  
- `service_role` / secret keys  
- Real tokens in README / issues / commits  

GitGuardian failing = **stop and fix**, do not bypass with force.

---

## 4) AI policy (product)

| Rule | Detail |
|------|--------|
| Provider | **Mistral only** for app chat |
| Gateway | **No** Lovable AI Gateway / `LOVABLE_API_KEY` for chat |
| Models UI | Only entries in `src/lib/models.ts` |
| Default | `mistral-large-latest` |
| Legacy IDs | `openai/*`, `google/*` → remap via `resolveKnownModelId` |
| Errors | Human-readable (credits, 401, rate limit) — never silent generic if we control `onError` |

---

## 5) Product surface map

| Route | Role |
|-------|------|
| `/auth` | Email + Google (local Google = full-page broker bridge, no popup required) |
| `/chat` | Thread list + open latest/create |
| `/chat/:id` | Chat + canvas + model chip |
| `POST /api/chat` | Stream + save user/assistant + extract artifacts |
| `/api/ai-status` | Deploy probe: provider, key present, buildMarker |
| `/mcp` | MCP (401 without token) |
| `/.well-known/oauth-protected-resource` | MCP OAuth metadata |

### Agent settings

- Mistral model chips only  
- Temperature + system prompt  
- Tools toggles (product flags)

### Artifact loop (user value)

```
User prompt → Mistral stream → assistant message in DB
           → fenced ```html → artifact → live canvas → download index.html
```

Target: **first usable mock in ~30s**.

---

## 6) Definition of Done (every change)

Before asking for merge:

- [ ] Works on `developeredit` locally (`bun dev`) when relevant  
- [ ] No secrets in diff  
- [ ] Typecheck/build not worse without reason  
- [ ] If chat/auth/MCP touched: smoke steps below  
- [ ] PR description says **what / why / how to test**  
- [ ] CI green on PR  

### Smoke (production after deploy)

```bash
curl -s https://cosy-app-kit.lovable.app/api/ai-status | jq .
# expect: provider=mistral, mistralKeyPresent=true, buildMarker present

# Browser:
# /auth → login → /chat → one short prompt → stream + no "Missing Supabase"
```

### Smoke (MCP)

```bash
# no token → 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://cosy-app-kit.lovable.app/mcp \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## 7) OmniOps AI agent contract (from now)

You are **OmniOps Developer** for this repo unless the owner renames the role.

### Always

1. Default branch for edits: **`developeredit`**  
2. Never push `main` directly  
3. Never commit secrets  
4. Prefer small, reviewable commits  
5. After risky deploys, remind **Lovable Publish** + hard refresh  
6. Speak clearly (Slovak OK if owner writes Slovak); no fake “done” without verify  

### Never

1. `git push --force` to `main`  
2. Put API keys in source “just to make CI green” without owner OK  
3. Reintroduce OpenAI/Gemini as default product models  
4. Merge PRs without explicit owner instruction  
5. Confuse **`lovable-builder-k.d`** (MCP notes only) with **`lovable-builder-cosyapp`** (real app)

### Workspace paths

| Path | Role |
|------|------|
| `/Users/erikbabcan/lovable-builder-cosyapp` | **ONLY** real application workspace |
| `/Users/erikbabcan/lovable-builder-k.d` | MCP helpers / notes — **not** the app |

---

## 8) Incident playbook (quick)

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Missing SUPABASE_URL in browser | Old frontend bundle / env | Confirm `public-config` on main; Lovable Publish; hard refresh |
| Chat “An error occurred.” | AI path / key / old deploy | `/api/ai-status`; check MISTRAL secret; stream `/api/chat` |
| Missing MISTRAL_API_KEY | Secret not on Cloud | Lovable Secrets → set key → redeploy |
| GitGuardian fail | Secret in commit | Rewrite branch / remove key; never force-ignore |
| Worker hung on `/mcp` | CF Worker timeout / stream | Check Cloud Logs; fix MCP handler (separate track) |
| Google on localhost 404 `/~oauth` | Broker only on published host | Full-page bridge (already in lovable integration) |
| Direct push to main rejected | Protection working | Use PR |

---

## 9) Roadmap tracks (priority)

| P | Track | Notes |
|---|--------|--------|
| P0 | Keep prod green | secrets + publish + smoke |
| P0 | Mistral-only product surface | no regression to GPT UI |
| P1 | MCP reliability | Worker hung after oauth.verify.ok |
| P1 | Artifact quality loop | system prompt: self-contained CSS, mobile, real interactivity |
| P2 | CI hygiene | secrets in GH Actions; no placeholders that hide failures |
| P2 | E2E suite | keep Lovable E2E + optional GH Playwright later |

---

## 10) Owner checklist (you)

Daily / when shipping:

1. Work on **`developeredit`**  
2. Push branch, open PR when ready  
3. Merge only when **you** choose  
4. After merge → Lovable **Publish** if UI still old  
5. One real prompt in prod (30s dashboard flex still counts as success)  

---

## 11) References

| Doc | Purpose |
|-----|---------|
| `AGENTS.md` | Lovable git rules + main lock pointer |
| `.github/BRANCH_PROTECTION.md` | How main is locked |
| `WORKSPACE.md` | Local paths & AI policy notes |
| `README.md` | Product overview |
| `src/lib/models.ts` | Allowed Mistral models |
| `src/integrations/supabase/public-config.ts` | Public client fallback |

---

**OmniOps pledge:**  
Ship fast on `developeredit`, protect `main`, never leak secrets, Mistral only, verify before claiming done.
