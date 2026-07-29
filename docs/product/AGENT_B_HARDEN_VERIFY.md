# AGENT B — Harden + residual scrub + full ship (fast prompt)

**Role:** OmniOps Hardening Agent  
**Workspace ONLY:** `/Users/erikbabcan/lovable-builder-cosyapp`  
**Branch:** `developeredit` (pull latest after Agent A) or `feature/harden-post-cleanup` stacked on A  
**Goal:** Residual Lovable references, doc consistency, full test matrix, push green.

---

## Copy-paste prompt

```
You are OmniOps Hardening Agent for cosy-app-kit.

CANONICAL APP PATH (only):
  /Users/erikbabcan/lovable-builder-cosyapp
Never treat Pictures/cosy-app-kit as the app repo.
Never create a second GitHub repository for this product.

Read first:
  OMNIOPS_BLUEPRINT.md
  AGENTS.md
  docs/product/AGENT_A_SHIP_CLEANUP.md

PRECONDITION:
  Agent A cleanup is on developeredit tip (or merge A first). Pull before work.

TASK:
1. git checkout developeredit && git pull origin developeredit
2. Residual scrub (fix or delete references, keep intentional history notes only in CHANGELOG if needed):
   - rg for: mcp-js, cloud-auth, mcpPlugin, PROD_ORIGIN, cosy-app-kit.lovable.app as hardcoded default
   - Update WORKSPACE.md / README / docs that still document /mcp or Lovable OAuth broker as current
   - Keep ai-status flag lovableGatewayDisabled: true (good)
   - Supabase project id in docs must match public-config.ts (uotvcsjoriamsagfprbq)
3. Full local gates:
   bun install
   bun run verify
   bun run test:ship-gates
   bun run build
   # If Playwright browsers installed and time allows:
   bun run test:e2e:ship   # or document skip with reason
4. Optional product smoke (local):
   bun dev &
   curl -s http://127.0.0.1:8080/api/ai-status | jq .
   expect provider=mistral, mistralKeyPresent true when .env.local has key
5. Commit only your harden/doc fixes:
   "docs/chore: post-cleanup residual scrub + verify green"
6. Push developeredit (or feature branch + PR into developeredit / main per stack rules)
7. Ensure CI green. If owner asked merge-when-green and PR still open, keep auto-merge on.

HARD RULES:
- No secrets
- No new repo / no git init in Pictures
- No reintroducing Lovable MCP product surface
- main only via PR
- Report: what residual items fixed, test matrix results, PR/CI links
```

---

## Success criteria

| Check                                      | Required      |
| ------------------------------------------ | ------------- |
| No live MCP routes / deps                  | yes           |
| Docs match blueprint (no /mcp product)     | yes           |
| `verify` + ship-gates + build              | pass          |
| E2E ship or explicit skip reason           | yes           |
| CI green on pushed branch                  | yes           |
