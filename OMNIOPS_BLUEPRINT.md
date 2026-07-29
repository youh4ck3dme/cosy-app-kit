# OmniOps Blueprint — cosy-app-kit / AI Builder

**Status:** ACTIVE · **Owner:** youh4ck3dme · **Product:** AI Builder (cosy-app-kit)  
**Effective:** 2026-07-29 · **Default AI role:** OmniOps Developer  
**Post-cleanup:** Lovable MCP + cloud-auth OAuth broker + hardcoded prod origin **REMOVED**

This is the **operating system** for humans and AI agents working on this repo.  
If a rule here conflicts with a casual prompt, **this file wins** unless the owner explicitly overrides it in that message.

---

## 0) Mission

Ship a **stable** Builder product:

- Chat + live canvas + artifacts
- **Mistral-only** inference (no OpenAI / ChatGPT / Lovable AI Gateway for app chat)
- Supabase Auth/DB (RLS)
- Fast iteration **without** breaking production
- Clean stack: **no product MCP**, no Lovable OAuth consent routes

**Speed is a feature. Stability of `main` is a hard requirement.**

---

## 1) System map (source of truth)

| Layer        | What                                      | Where                                                                 |
| ------------ | ----------------------------------------- | --------------------------------------------------------------------- |
| Product UI   | Studio chat, canvas, settings             | `src/routes`, `src/components/studio`, `src/components/app-shell`     |
| Chat API     | Stream + persist messages/artifacts       | `src/routes/api/chat.ts`                                              |
| AI           | **Mistral API only** (+ key rotator)      | `src/lib/ai-gateway.server.ts`, `src/lib/models.ts`, `MistralKeyRotator` |
| Auth         | Supabase Auth (email; Google via Supabase) | `src/integrations/supabase`, helpers in `src/integrations/lovable` (no-op broker stubs) |
| DB           | threads, messages, artifacts, settings    | Supabase project **`uotvcsjoriamsagfprbq`** (see `public-config.ts`)  |
| ~~MCP~~      | **REMOVED**                               | do **not** re-add `src/routes/mcp.ts` / `@lovable.dev/mcp-js`         |
| Hosting      | Deploy target (Cloudflare/Lovable Worker) | set via env; **no** hardcoded `PROD_ORIGIN` in app code               |
| GitHub       | `youh4ck3dme/cosy-app-kit`                | `main` locked · work on **`developeredit`**                           |

### Explicit non-goals (after cleanup)

| Do not restore                         | Why                                              |
| -------------------------------------- | ------------------------------------------------ |
| `@lovable.dev/mcp-js` + `/mcp` routes  | Lovable-specific; product does not ship MCP      |
| `@lovable.dev/cloud-auth-js`           | Unused after OAuth consent removal               |
| `vite` proxy → `*.lovable.app/~oauth`  | Local OAuth proxy removed                        |
| Hardcoded `PROD_ORIGIN`                | Prod smoke uses `SMOKE_BASE_URL` only            |
| Lovable AI Gateway / `LOVABLE_API_KEY` | Product chat is Mistral-direct only              |

---

## 2) Canonical workspace (hard)

| Path                                           | Role                                      |
| ---------------------------------------------- | ----------------------------------------- |
| `/Users/erikbabcan/lovable-builder-cosyapp`    | **ONLY** real application + git worktree  |
| `/Users/erikbabcan/Pictures/cosy-app-kit`      | Optional **copy / backup** — **not** app  |
| `/Users/erikbabcan/lovable-builder-k.d`        | MCP notes only — **not** the app          |

### Forbidden “rescue” patterns

1. **Do not** `git init` a new repo under `Pictures/cosy-app-kit` and push as a second source of truth.
2. **Do not** create a brand-new GitHub repo when `origin` already points at `youh4ck3dme/cosy-app-kit`.
3. **Do not** work product code only in Pictures and expect production to update.

**Correct path:** edit → commit → push **`developeredit`** → PR → `main` when green + owner intent.

---

## 3) Branch & release model (non-negotiable)

```
main            = production source of truth (LOCKED)
developeredit   = default working branch for humans + AI
feature/*       = optional short-lived branches
```

| Action                      | Allowed?                                          |
| --------------------------- | ------------------------------------------------- |
| `git push origin main`      | **NO**                                            |
| Force-push `main`           | **NO**                                            |
| Work / push `developeredit` | **YES**                                           |
| Open PR → `main`            | **YES**                                           |
| Merge PR to `main`          | Owner explicit order **or** auto-merge after **green CI** when owner requested “merge when green” |
| `gh pr merge` by AI         | Only with owner intent in that turn               |

### Happy path

```bash
cd /Users/erikbabcan/lovable-builder-cosyapp
git checkout developeredit
git pull origin developeredit
# … implement …
bun install
bun run verify          # typecheck + unit + lint:gate + smoke
# optional CI parity:
bun run test:ship-gates && bun run build
git add -A && git commit -m "…"
git push -u origin developeredit
gh pr create --base main --head developeredit --title "…" --body "…"
# when owner wants auto green merge:
gh pr merge --auto --squash
```

### After merge to `main`

1. Confirm CI on `main` green  
2. Publish/deploy host if frontend still stale  
3. Smoke: `/api/ai-status`, `/chat`, one Mistral prompt  
4. Continue on `developeredit` (rebase/merge from updated `main` when needed)

---

## 4) Environments & secrets

### Local (`/Users/erikbabcan/lovable-builder-cosyapp`)

| File           | Commit?             | Contents                                           |
| -------------- | ------------------- | -------------------------------------------------- |
| `.env`         | **NO**              | Supabase public URL + publishable key (+ VITE\_\*) |
| `.env.local`   | **NO**              | `MISTRAL_API_KEY`                                  |
| `.env.example` | **YES**             | placeholders only                                  |

```bash
cd /Users/erikbabcan/lovable-builder-cosyapp
bun install
bun dev    # http://127.0.0.1:8080
```

### Deploy secrets (host UI / CI)

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `MISTRAL_API_KEY`
- Optional: `MISTRAL_API_KEYS` (comma list for rotator), `SEARCH_API_KEY` / `TAVILY_API_KEY`

**Code safety net:** `src/integrations/supabase/public-config.ts` public anon fallbacks.  
**Not** service_role. RLS is the security boundary.

### Forbidden in git

- `MISTRAL_API_KEY`, `service_role`, real tokens  
- GitGuardian fail = stop and fix

---

## 5) AI policy (product)

| Rule       | Detail                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------- |
| Provider   | **Mistral only** for app chat                                                            |
| Gateway    | **No** Lovable AI Gateway / `LOVABLE_API_KEY`                                            |
| Models UI  | Only `src/lib/models.ts`                                                                 |
| Default    | `mistral-large-latest`                                                                   |
| Build mode | Prefers `codestral-latest` via `resolveModelForMode`                                     |
| Legacy IDs | `openai/*`, `google/*` → remap via `resolveKnownModelId`                                 |
| Errors     | Human-readable (credits, 401, rate limit)                                                |

---

## 6) Product surface map

| Route                | Role                                                        |
| -------------------- | ----------------------------------------------------------- |
| `/auth`              | Email (+ Google via Supabase when configured)               |
| `/chat`              | Thread list                                                 |
| `/chat/:id`          | Studio chat + canvas                                        |
| `POST /api/chat`     | Stream + save + tools + artifacts                           |
| `/api/ai-status`     | Deploy probe (provider, key present, markers) — no secrets  |
| `/builder`           | Vision / semantic-intent surface (not full Kernel editor)   |
| `/a/:artifactId`     | Public artifact share                                       |
| ~~`/mcp`~~           | **gone**                                                    |
| ~~`/.well-known/…`~~ | **gone** (MCP OAuth metadata)                               |

### Artifact loop

```
User prompt → Mistral stream → DB message
           → create_artifact / fenced html → canvas → download / share
```

Target: first usable mock in ~30s.

### Builder Kernel note

`src/lib/builder` is a **platform library** (document/commands/history/tests).  
Product chat runtime is **HTML multi-file artifacts + canvas**, not live `BuilderKernel` document editing. Do not claim “kernel is the live editor” without wiring.

---

## 7) Definition of Done (every change)

- [ ] Worked on `developeredit` in **lovable-builder-cosyapp**
- [ ] No secrets in diff
- [ ] `bun run verify` green (or CI equivalent)
- [ ] If chat/auth touched: smoke `/api/ai-status` + one chat path
- [ ] PR: what / why / how to test
- [ ] CI green before merge

### Local verify (daily)

```bash
bun run ship     # preferred full local gate if defined
# or:
bun run verify && bun run test:ship-gates && bun run build
```

### Prod smoke (after deploy)

```bash
SMOKE_BASE_URL=https://<your-prod-domain> bun run prod-smoke
# or:
curl -s https://<your-prod-domain>/api/ai-status | jq .
# expect: provider=mistral, mistralKeyPresent=true, lovableGatewayDisabled=true
```

---

## 8) OmniOps agent contract

### Always

1. Default branch: **`developeredit`**
2. Never push `main` directly
3. Never commit secrets
4. Prefer small, reviewable commits (cleanup PRs separate from feature dumps when possible)
5. Speak clearly (Slovak OK); no fake “done” without verify
6. After cleanup, do not reintroduce Lovable MCP / cloud-auth / PROD_ORIGIN

### Never

1. Force-push `main`
2. `git init` + new GitHub repo from Pictures copy
3. Put API keys in source “to make CI green”
4. Reintroduce OpenAI/Gemini as default product models
5. Confuse Pictures copy or `lovable-builder-k.d` with the real app

---

## 9) Incident playbook (quick)

| Symptom                         | Likely cause              | Action                                      |
| ------------------------------- | ------------------------- | ------------------------------------------- |
| Missing SUPABASE in browser     | Old bundle / env          | Check `public-config`; redeploy; hard refresh |
| Chat generic error              | Key / deploy              | `/api/ai-status`; MISTRAL secret            |
| Missing MISTRAL_API_KEY         | Secret not on host        | Set server env → redeploy                   |
| GitGuardian fail                | Secret in commit          | Remove key; rewrite if needed               |
| Direct push to main rejected    | Protection working        | Use PR                                      |
| “New repo from Pictures” idea   | Wrong workspace           | Stay on existing `cosy-app-kit` remote      |

---

## 10) Roadmap tracks (priority)

| P  | Track                         | Notes                                              |
| -- | ----------------------------- | -------------------------------------------------- |
| P0 | Keep prod green               | secrets + deploy + smoke                           |
| P0 | Mistral-only product surface  | no GPT/Lovable gateway regression                  |
| P0 | Git hygiene                   | one remote truth; no second repo from Pictures     |
| P1 | Commit/push cleanup + green CI| land post-Lovable cleanup on `main`                |
| P1 | Artifact quality loop         | mobile-first, self-contained, tools                |
| P2 | Kernel ↔ product wiring       | optional; do not fake integration                  |
| P2 | E2E ship suite                | Playwright when local auth fixtures exist          |

---

## 11) Two-agent ship protocol (post-cleanup)

See:

- `docs/product/AGENT_A_SHIP_CLEANUP.md`
- `docs/product/AGENT_B_HARDEN_VERIFY.md`

**Rule:** Agent A lands cleanup + green CI first. Agent B only after A’s PR is merged or stacked on A’s branch tip.

---

## 12) References

| Doc                                          | Purpose                        |
| -------------------------------------------- | ------------------------------ |
| `AGENTS.md`                                  | Hard rules summary             |
| `.github/BRANCH_PROTECTION.md`               | Main lock                      |
| `WORKSPACE.md`                               | Local paths                    |
| `src/lib/models.ts`                          | Allowed Mistral models         |
| `src/integrations/supabase/public-config.ts` | Public client fallback         |
| `docs/runbooks/daily-dev.md`                 | Daily ship                     |

---

**OmniOps pledge:**  
Ship fast on `developeredit`, protect `main`, never leak secrets, Mistral only, one git truth, verify before claiming done.
