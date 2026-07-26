# Copy-paste → Cursor (teraz)

```
Pracuj v /Users/erikbabcan/lovable-builder-cosyapp na branch developeredit.
git pull origin developeredit

Prečítaj:
- docs/MEGA_PROMPT_CURSOR.md
- docs/LAUNCH_MULTIAGENT.md
- docs/agent-tools.md (launch_site)
- src/components/app-shell/Canvas.tsx (už má multi-file strip + console wand)

## Mission B — Multi-page canvas polish (P0)

Context (už na branchi):
- LMAP launch_site + 156 unit tests (991c02f+)
- Console real + Fix in chat wand (e42998d)
- Monaco Diff dispose fix (8f56dad)
- Grok LMAP harden: dead-link sanitize + mobile nav prompts (pull latest)

Tvoja úloha (UI only — Canvas/Header/shell):
1) Multi-file artifact (4 HTML): jasné tabs / horizontal chip list / mobile picker
2) Active file = resolvedPreviewPath (preview) zvýraznený; klik → setPreviewPath + setActiveFile
3) Single-file artifact: žiadny zbytočný chrome
4) Optional: ak filesCount>1, jemný label „4 pages“ pri artifact tabs
5) docs/smoke-checklist.md — checkboxy multi-page + Console Fix in chat
6) bunx tsc --noEmit; bun test ak siahneš na pure helpers
7) Commit + push origin developeredit
8) Report: SHA, súbory, čo human overí

MUST NOT:
- src/lib/agent/**, src/lib/launch/** pipeline
- /api/chat, Launch mode chip
- main / force-push
```
