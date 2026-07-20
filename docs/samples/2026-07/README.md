# Samples 2026-07 — BPI suite

Drop HTML exports here after live gen. Fill `*.meta.md` for each.

## Fixed prompts

| id | Prompt (short) | Expect |
|----|----------------|--------|
| `dash-ops` | dark ops dashboard Chart.js Week/Month/Year, not purple | interactivity + craft |
| `landing-northline` | SaaS landing Northline, distinctive palette | visual craft |
| `todo-local` | todo app localStorage All/Active/Done | a11y + persist |
| `edit-cycle` | follow-up on dash-ops: collapsible sidebar via edit | speed |

## Files per sample

```
dash-ops.html
dash-ops.meta.md
```

### meta.md template

```markdown
# dash-ops
- date:
- model: (e.g. codestral-latest)
- mode: build
- first_preview_s:
- tool_calls: create_artifact / fence / both
- edit_followup_s: (if edit-cycle)
- score_overall: /10
- notes:
```

## After suite

Update [`docs/progress.md`](../progress.md) BPI table with **real** numbers (not estimates).
