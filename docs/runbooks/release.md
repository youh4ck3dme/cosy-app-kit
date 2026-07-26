# Runbook: Release (platform libraries)

Applies to Builder Kernel / Plugin SDK milestones. Product Publish is separate (`docs/product/deploy.md`).

## Preconditions

- Topic branch green: typecheck, unit tests, build
- PR into `main` (protected)
- No secrets in the diff

## Steps

1. Open PR; wait for required check `Install · test · typecheck · build`
2. Merge with a **merge commit** when history must be preserved (used for kernel/SDK releases)
3. Update local main:

```bash
git checkout main
git pull origin main
```

4. If the Forge line of record is `nexify-gooo`, sync that remote as well (do not confuse with Lovable `origin` when tags belong on Forge)
5. Create annotated tag — see [tagging.md](./tagging.md)
6. Update `docs/CHANGELOG.md` if not already in the PR
7. If product behavior changed, Lovable **Publish** + prod smoke

## Do not

- Force-push `main`
- Tag before merge
- Claim Marketplace / Canvas / Observatory as released without tags and code
