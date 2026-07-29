# DevOps

## Branch strategy

| Branch                            | Role                                                               |
| --------------------------------- | ------------------------------------------------------------------ |
| `main`                            | Protected production line. PR only. No direct push. No force-push. |
| `developeredit`                   | Integration / working branch for product work                      |
| `feature/*` / `docs/*` / `feat/*` | Topic branches                                                     |

Source: `.github/BRANCH_PROTECTION.md`, `AGENTS.md`, `OMNIOPS_BLUEPRINT.md`.

## Git workflow

1. Branch from an up-to-date base (`developeredit` or `main` per task).
2. Implement with tests.
3. Push topic branch.
4. Open PR into `main` (or agreed base).
5. Wait for required check: `Install · test · typecheck · build`.
6. Merge with **merge commit** when preserving history matters (kernel / SDK releases used merge commits).
7. Do not squash if release history must remain reconstructable — unless repository policy for that PR explicitly requires squash.

## Semantic versioning

- npm `version` field is **unset**.
- Platform releases use **git tags**:
  - `v0.4.5-kernel-foundation`
  - `v0.4.5.1-hardening`
  - `v0.4.7-plugin-sdk`
- Prefer annotated tags for releases.

## Release checklist

1. Tests green on the release branch (`typecheck`, `test:unit`, `build`).
2. PR reviewed / CI green.
3. Merge to `main` (merge commit recommended for platform milestones).
4. `git checkout main && git pull origin main` (and sync `nexify-gooo` when that remote is the Forge line of record).
5. Create annotated tag only **after** merge.
6. Push tag to the correct remote.
7. Update [CHANGELOG.md](./CHANGELOG.md).
8. Lovable Publish if production app changes require it ([product/deploy.md](./product/deploy.md)).
9. Confirm prod smoke (`prod-smoke` workflow or manual).

## Pull request checklist

- [ ] Scope limited; no unrelated refactors
- [ ] Unit tests for kernel/SDK changes
- [ ] `bun run typecheck` passes locally
- [ ] No secrets committed
- [ ] Docs updated when APIs change
- [ ] Roadmap/status language remains honest (no invented features)

## Issue templates

See `.github/ISSUE_TEMPLATE/`.

## CI/CD overview

| Workflow         | Trigger                                            | Action                                      |
| ---------------- | -------------------------------------------------- | ------------------------------------------- |
| `ci.yml`         | PR to `main`/`developeredit`; push `developeredit` | install, unit tests, typecheck, build       |
| `prod-smoke.yml` | push `main`; manual                                | `bun run prod-smoke` against production URL |

Playwright e2e is **not** in GitHub CI.

## Deployment strategy

- Hosting: Lovable Cloud → Cloudflare Worker
- Production URL documented in product deploy docs
- Merge ≠ Publish

## Rollback strategy

1. Revert merge commit on a new PR into `main` (preferred over force-push).
2. Re-publish via Lovable if production bundle must roll back.
3. Never force-push `main`.

## Incident response (minimal current practice)

1. Confirm blast radius (auth, chat, publish, kernel library-only).
2. Capture failing smoke / logs without printing secrets.
3. Fix on a topic branch; emergency PR into `main`.
4. Re-run prod smoke after publish.

Formal on-call rotations and status pages: **Not yet implemented**.

## Monitoring strategy

| Signal                             | Exists?                              |
| ---------------------------------- | ------------------------------------ |
| Prod smoke script / workflow       | Yes                                  |
| `/api/ai-status` smoke expectation | Documented in agent/ops rules        |
| APM / error tracking SaaS          | Not documented as configured in-repo |
| Kernel Observatory metrics         | Future milestone                     |

## Repository maintenance

- Keep `bun.lock` authoritative for CI.
- Avoid rewriting published Lovable history.
- Keep Forge worktrees separate when dual remotes are in play (`AGENTS.md` NEXIFY Forge notes).
