# AGENT A — Ship Lovable cleanup (fast prompt)

**Role:** OmniOps Ship Agent  
**Workspace ONLY:** `/Users/erikbabcan/lovable-builder-cosyapp`  
**Branch:** `developeredit` → PR → `main`  
**Goal:** Land Lovable MCP/OAuth/prod-origin cleanup + docs with **green CI**.

---

## Copy-paste prompt

```
You are OmniOps Ship Agent for cosy-app-kit.

CANONICAL APP PATH (only):
  /Users/erikbabcan/lovable-builder-cosyapp
Never use Pictures/cosy-app-kit as the git source of truth.
Never git init a new repo. Remote origin must stay youh4ck3dme/cosy-app-kit.

Read first:
  OMNIOPS_BLUEPRINT.md
  AGENTS.md

TASK — commit and land cleanup that is already on disk:
1. git checkout developeredit && git pull origin developeredit
2. Stage ONLY cleanup + blueprint hygiene (do NOT dump unrelated 200+ WIP files unless required to build):
   - package.json, bun.lock (removed @lovable.dev/mcp-js, @lovable.dev/cloud-auth-js)
   - vite.config.ts (no mcpPlugin, no lovable.app /~oauth proxy)
   - eslint.config.js (no mcp ignores)
   - deletions: src/routes/mcp.ts, src/routes/[.mcp]/*, src/routes/[.well-known]/*, src/routes/[.]lovable.oauth.consent.tsx, src/lib/mcp/**
   - src/routeTree.gen.ts
   - src/lib/deploy-rev.ts (no PROD_ORIGIN)
   - scripts/prod-smoke.ts (requires SMOKE_BASE_URL)
   - delete .github/workflows/prod-smoke.yml if present (Lovable-hardcoded)
   - public/sw.js if /mcp stripped
   - OMNIOPS_BLUEPRINT.md, AGENTS.md, WORKSPACE.md
   - docs/product/AGENT_A_SHIP_CLEANUP.md, docs/product/AGENT_B_HARDEN_VERIFY.md
   - flaky test fix if needed: src/lib/builder/mobile/iPhone17AirPerformance.test.ts
3. bun install
4. bun run verify
5. bun run test:ship-gates && bun run build
6. If green: commit with message:
   "chore: remove Lovable MCP/OAuth/prod-origin; Mistral-only cleanup"
7. git push -u origin developeredit
8. Open PR into main if none open for this branch:
   gh pr create --base main --head developeredit --title "chore: Lovable cleanup — MCP/OAuth/prod-origin gone" --body "..."
9. Enable auto-merge when green (owner requested merge-when-green):
   gh pr merge --auto --squash
10. Monitor CI until green or fix failures on developeredit (no force-push main).

HARD RULES:
- main is LOCKED — never push main / never force-push main
- No secrets in commits
- No re-adding mcp-js or cloud-auth-js
- Report: commit SHA, PR URL, CI status
```

---

## Success criteria

| Check                         | Required |
| ----------------------------- | -------- |
| `bun run verify`              | pass     |
| `bun run build`               | pass     |
| PR open → `main`              | yes      |
| CI job green                  | yes      |
| Auto-merge queued or merged   | yes      |
| No `mcp` / `cloud-auth` deps  | yes      |
