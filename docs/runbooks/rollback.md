# Runbook: Rollback

## Preferred path

1. Identify the bad merge commit on `main`
2. Create a revert branch
3. `git revert -m 1 <merge_commit>` (or revert the offending commits)
4. Open PR → CI → merge
5. If production was published, Lovable Publish the reverted build
6. Confirm `bun run prod-smoke` / prod-smoke workflow

## Forbidden

- `git push --force` to `main`
- Rewriting published Lovable history

## Library-only rollback

If only tags/docs are wrong and code on `main` is fine, fix forward with a docs PR. Do not delete published tags.
