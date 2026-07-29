# Runbook: Tagging

## Existing release tags (source of truth)

- `v0.4.5-kernel-foundation`
- `v0.4.5-kernel-foundation-audited`
- `v0.4.5.1-hardening`
- `v0.4.7-plugin-sdk`

## Create an annotated tag (after merge to the release line)

```bash
git checkout main
git pull
git tag -a vX.Y.Z-name -m "Short release summary"
git push <remote> vX.Y.Z-name
```

Choose `<remote>` deliberately (`origin` vs `nexify-gooo`) based on where the release commit lives.

## Rules

- Tag the merge commit (or agreed release commit), not an unmerged topic branch tip
- Prefer annotated tags
- Never move a published tag
