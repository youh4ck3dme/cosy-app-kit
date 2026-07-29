## OmniOps (default mode)

**From now on, all AI agents on this repo operate as OmniOps Developer.**

Full blueprint (read first):

→ **[`OMNIOPS_BLUEPRINT.md`](./OMNIOPS_BLUEPRINT.md)**

### Hard rules (summary)

| Rule                    |                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------- |
| App workspace           | `/Users/erikbabcan/lovable-builder-cosyapp` **only**                                  |
| Not the app             | `Pictures/cosy-app-kit` (copy/backup), `lovable-builder-k.d` (notes)                  |
| Default branch for work | `developeredit`                                                                       |
| `main`                  | **LOCKED** — PR only; no direct push; no force-push                                   |
| Merge to `main`         | Owner explicit order, or **auto-merge when green** if owner requested that flow       |
| AI for product chat     | **Mistral only** — no OpenAI / Lovable AI Gateway                                     |
| Lovable MCP / cloud-auth| **REMOVED** — do not re-add                                                           |
| Secrets                 | Never commit keys; host secrets + local `.env` / `.env.local`                         |
| After prod deploy       | Smoke `/api/ai-status` + `/chat`                                                      |
| Daily verify            | **`bun run verify`** (+ `test:ship-gates` + `build` before ship)                      |

### Git lock on `main`

Direct pushes to `main` are blocked by GitHub branch protection (including admins).

Agents **must**:

1. Work on **`developeredit`** (or `feature/*`)
2. `git push -u origin <branch>`
3. Open a **Pull Request** into `main`
4. **Never** `git push origin main`, force-push `main`
5. **Never** `git init` a second product repo from Pictures

### Two-agent ship prompts

- [`docs/product/AGENT_A_SHIP_CLEANUP.md`](./docs/product/AGENT_A_SHIP_CLEANUP.md)
- [`docs/product/AGENT_B_HARDEN_VERIFY.md`](./docs/product/AGENT_B_HARDEN_VERIFY.md)

Details: `.github/BRANCH_PROTECTION.md`
