# Launch Multi-Agent Pipeline (LMAP)

Multi-page mini-site generation for Cosyapp Builder.

## Status

| Phase | What | Status |
|-------|------|--------|
| **1** | Canvas multi-file preview nav (`preview-nav`, `preview-bridge`) | ✅ shipped |
| **2** | Zod blueprint + `generateBlueprint` | ✅ `src/lib/launch/**` |
| **3** | Parallel page workers + assemble + `launch_site` tool | ✅ Build mode |

## Flow

```
User brief (Build mode)
  → tool launch_site({ brief })
  → generateBlueprint (mistral-small-latest, retry large)
  → generateSharedShell (template only, no LLM)
  → Promise.all 4× Codestral pages
  → assemble files + blueprint.json
  → artifacts insert (same as create_artifact)
  → data-artifact-created → canvas
```

## Manual smoke

1. Branch `developeredit`, signed in, Build mode.  
2. Prompt e.g. *„Sprav multi-page web Home/About/Contact/Cenník pre kaderníctvo Luna v BA“*.  
3. Expect tool **Launch multi-page site** / `launch_site`.  
4. Artifact with 4 HTML files + blueprint.json.  
5. Canvas: switch pages / click nav (Phase 1).  

## Out of scope (later)

- Launch mode chip / `/api/launch` UI  
- Streaming stage progress (`data-launch-stage`)  
- WordPress / multi-channel  
