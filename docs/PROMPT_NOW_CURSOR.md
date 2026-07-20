# Copy-paste → Cursor (teraz)

```
Pracuj v /Users/erikbabcan/lovable-builder-cosyapp na branch developeredit.
git pull origin developeredit

Prečítaj a dodrž:
- docs/MEGA_PROMPT_CURSOR.md
- docs/LAUNCH_MULTIAGENT.md
- docs/agent-tools.md (launch_site)

## Mission B — Multi-page canvas polish (LMAP už je na branchi)

Grok shipped launch_site (src/lib/launch/**, tool launch_site). Nerób backend pipeline.

Tvoja úloha (UI only):
1) Canvas: keď artifact má viac HTML súborov (index/about/contact/pricing), jasnú file list / tabs / picker na mobile
2) Aktívny previewPath zvýrazniť; klik na súbor → preview swap (Phase 1 nav už existuje)
3) Single-file artifact sa nesmie regredovať
4) Voliteľne: jemný status ak tool result má timings/filesCount (len display, žiadne fake progress)
5) docs/smoke-checklist.md — sekcia multi-page smoke (3–5 checkboxov)
6) bunx tsc --noEmit; relevant unit/e2e ak siahneš na preview-nav
7) Commit + push origin developeredit
8) Krátky report: súbory, SHA, čo ešte musí otestovať human

MUST NOT:
- src/lib/agent/** execute, src/lib/launch/** pipeline, api/chat core
- Launch mode chip / /api/launch
- main / force-push
```
