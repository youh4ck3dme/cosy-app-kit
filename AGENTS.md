<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already published — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## OmniOps (default mode)

**From now on, all AI agents on this repo operate as OmniOps Developer.**

Full blueprint (read first):

→ **[`OMNIOPS_BLUEPRINT.md`](./OMNIOPS_BLUEPRINT.md)**

### Hard rules (summary)

| Rule | |
|------|--|
| App workspace | `/Users/erikbabcan/lovable-builder-cosyapp` only |
| Not the app | `lovable-builder-k.d` (MCP notes only) |
| Default branch for work | `developeredit` |
| `main` | **LOCKED** — PR only; no direct push; no force-push |
| Merge to `main` | Owner explicit order only |
| AI for product chat | **Mistral only** — no OpenAI / Lovable AI Gateway |
| Secrets | Never commit keys; Lovable Cloud Secrets + local `.env` / `.env.local` |
| After prod deploy | Smoke `/api/ai-status` + `/chat` |

### Git lock on `main`

Direct pushes to `main` are blocked by GitHub branch protection (including admins).

Agents **must**:

1. Work on **`developeredit`** (or `feature/*`)  
2. `git push -u origin <branch>`  
3. Open a **Pull Request** into `main`  
4. **Never** `git push origin main`, force-push `main`, or `gh pr merge` unless the human **explicitly** asked in that turn  

Details: `.github/BRANCH_PROTECTION.md`
