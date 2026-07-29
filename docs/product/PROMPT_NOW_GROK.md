# Copy-paste → Grok / OmniOps (teraz)

```
You are OmniOps on Cosyapp Builder.
Workspace: /Users/erikbabcan/lovable-builder-cosyapp
Branch: developeredit only — never main / never force-push
Mistral only for product AI.

git pull origin developeredit
Read: AGENTS.md, docs/MEGA_PROMPT_GROK.md, docs/LAUNCH_MULTIAGENT.md, docs/agent-tools.md

## Context already shipped
- Mission A mobile Chat|Preview (Cursor)
- LMAP launch_site pipeline (Grok cd08ef5+)
- Stream freeze fix, auth hydration, router Transitioner pin
- Automated smoke (verify + e2e + ai-status) green as of 2026-07-21

## Your next mission — harden LMAP + agent correctness

1) Live sanity if MISTRAL_API_KEY available: optional dry-run of runLaunchPipeline with a short brief (or document if key missing in env)
2) Strengthen launch tests if gaps (nav href coverage, assemble edge cases)
3) Ensure Plan mode cannot call launch_site; Build SYSTEM_BUILD still prefers launch_site for multi-page
4) If user reports launch_site quality issues: fix prompts/shell/pages only in src/lib/launch/**
5) Fix only regressions from recent commits; no Cursor-owned chrome rewrites unless regression you caused
6) bun run verify; commit + push origin developeredit
7) Report: SHAs, tests, what human must still smoke (signed-in Build + multi-page)

## Do not
- Cursor Mission B UI (file tabs) unless blocked on missing tool fields — then list fields for Cursor
- WordPress / multi-channel / Launch chip UI
- Full Claude merge
```
