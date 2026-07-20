# Branch protection — `main` is locked

**Goal:** AI agents (Grok, Claude, Cursor, …) must **not** land code on `main` without a human step.

## What GitHub enforces (live)

Repo: `youh4ck3dme/cosy-app-kit` · branch **`main`**

| Rule | Setting |
|------|---------|
| Direct push to `main` | **Blocked** (PR required) |
| Applies to admins too | **Yes** (`enforce_admins`) |
| Force-push | **Blocked** |
| Delete branch `main` | **Blocked** |
| Required CI | **Yes** — check name: `Install · test · typecheck · build` |
| Approvals required | **0** (solo-friendly; PR still required) |

## Allowed workflow

```bash
# 1) work on a branch
git checkout -b fix/something

# 2) commit + push BRANCH only
git push -u origin fix/something

# 3) open PR
gh pr create --base main --title "…" --body "…"

# 4) wait for CI green

# 5) YOU merge in GitHub UI or:
gh pr merge --merge   # only when YOU explicitly choose
```

## What AI must not do

- `git push origin main`
- `git push --force` to `main`
- `gh pr merge` unless the human explicitly asked in that message
- Amending / rewriting published `main` history

## Limits (honest)

If an AI uses **your** `gh` login (`youh4ck3dme`), it can still:

1. push a **feature branch**, and  
2. open a PR, and  
3. if you left it unrestricted — run `gh pr merge`.

Protection **stops silent `push` to `main`**.  
**Merge** still needs discipline: do not auto-approve “merge the PR” for agents.

Stronger options later:

- 2nd GitHub account for reviews (`required_approving_review_count: 1`)
- Rulesets + required reviewers
- Turn off `gh` for agents; only you merge in browser

## Change / remove protection

```bash
# View
gh api repos/youh4ck3dme/cosy-app-kit/branches/main/protection

# Remove (if needed)
gh api -X DELETE repos/youh4ck3dme/cosy-app-kit/branches/main/protection
```

Or: GitHub → Settings → Branches → Branch protection rules.
