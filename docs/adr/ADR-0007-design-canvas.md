# ADR-0007: Design Canvas (kernel consumer)

- **Status:** Proposed — ready for owner Accept (not binding for implementation until Accepted)
- **Date:** 2026-07
- **Related:** [ADR-0001](./ADR-0001-builder-kernel.md), [ADR-0003](./ADR-0003-plugin-isolation.md), [ADR-0005](./ADR-0005-builder-runtime-foundation.md), [ADR-0006](./ADR-0006-kernel-observatory.md), [ADR-0008](./ADR-0008-document-persistence-backends.md), [ADR-0009](./ADR-0009-plugin-sdk-registry-bridge.md), [ADR-0010](./ADR-0010-marketplace-deferred.md), canvas RPC types in `src/lib/builder/renderer/canvas/canvasRpc.types.ts`, `src/lib/builder/runtime/`, `src/lib/preview-bridge.ts`

## Context

Two things in this codebase are both called "canvas" and are not the same thing:

1. **Product HTML artifact preview** (`Canvas.tsx`, `src/routes/a.$artifactId*`) — a sandboxed iframe (`sandbox="allow-scripts allow-forms"`) that renders **chat-generated HTML** and talks to the host via `src/lib/preview-bridge.ts` (console/network relay, storage polyfill, nav interception). This is a shipped, user-facing product surface. It does not know about `BuilderDocument`, the Builder Kernel, or Runtime.
2. **Design Canvas** (this ADR) — a not-yet-implemented renderer for a `BuilderDocument` (the headless Builder Kernel's own document model — see [ADR-0001](./ADR-0001-builder-kernel.md)). RPC message types already exist (`canvasRpc.types.ts`: `INIT_DOCUMENT`, `UPDATE_NODE`, `SELECT_NODE`, `NODE_SELECTED_EVENT`, `CANVAS_RESIZED`, plus `CANVAS_SANDBOX_ATTR = "allow-scripts"`), but no host, no iframe, no wiring exists yet. Runtime Foundation ([ADR-0005](./ADR-0005-builder-runtime-foundation.md)) explicitly excluded Canvas APIs from its scope — "any such surface requires its own future ADR before any slice may implement it." This is that ADR.

These two tracks stay **parallel and independent**. Design Canvas does not replace, wrap, or migrate the product HTML artifact preview. A product artifact is Supabase-stored HTML/JS/CSS files; a `BuilderDocument` is the Kernel's typed node graph. Building Canvas before the Kernel had Runtime session ownership ([ADR-0005](./ADR-0005-builder-runtime-foundation.md)) and observability ([ADR-0006](./ADR-0006-kernel-observatory.md)) would have re-coupled React UI straight to kernel internals — exactly the hazard ADR-0001/ADR-0003 exist to prevent. Both prerequisites are now shipped on `main`, which is why this ADR can move from stub to review-ready.

## Decision

### 1. Scope and sequencing

Design Canvas MVP is **read-only rendering of a `BuilderDocument`**, gated behind the sequencing already stated in [ROADMAP.md](../ROADMAP.md): Observatory (0006, shipped) → **Accept this ADR** → read-only Canvas MVP → write path under Runtime (future ADR) → plugin bridge ([ADR-0009](./ADR-0009-plugin-sdk-registry-bridge.md)) → marketplace ([ADR-0010](./ADR-0010-marketplace-deferred.md)).

### 2. Render contract

- The iframe uses `sandbox="allow-scripts"` (the existing `CANVAS_SANDBOX_ATTR` constant) — **no** `allow-same-origin`, **no** `allow-forms`, **no** `allow-popups`, **no** `allow-top-navigation`. This is intentionally narrower than the product artifact iframe (`allow-scripts allow-forms`): Design Canvas renders kernel nodes, not arbitrary user HTML forms.
- The iframe never receives a live kernel reference, `CommandManager`, or any writable registry. It receives only a serialized `BuilderDocument` snapshot in the `INIT_DOCUMENT` payload — the same trust boundary already proven by Slice C's `documentSource.read()` (`src/lib/builder/runtime/pluginDocumentBridge.ts`), which only ever hands out `runtime.getReadonlyDocument()` (deep-cloned, deep-frozen).
- **Mutations never originate from the iframe.** The iframe may emit an intent-shaped event (e.g. a future `REQUEST_UPDATE_NODE`); only the host translates that into an `ICommand` and calls `BuilderRuntime.dispatch()`. Direct document mutation from inside the sandbox is out of scope for any milestone, MVP or later.

### 3. Message catalog

| Message               | Direction     | MVP?              | Notes                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INIT_DOCUMENT`       | host → iframe | **Yes**           | Full `BuilderDocument` snapshot. Sent once on iframe ready-handshake, and again after every successful `BuilderRuntime.dispatch()` / `undo()` / `redo()` while the iframe stays mounted (whole-document resend — no incremental diffing in MVP; batching/coalescing strategy is an implementation detail, not an architecture decision). |
| `SELECT_NODE`         | host → iframe | **Yes**           | Host-driven selection highlight (e.g. user picked a node in an outline view outside the iframe). Read-only — visual only, no mutation.                                                                                                                                                                                                   |
| `NODE_SELECTED_EVENT` | iframe → host | **Yes**           | User clicked a rendered node inside the canvas. Host may update its own UI (property panel, outline) from this. It must **not**, by itself, cause a document mutation.                                                                                                                                                                   |
| `CANVAS_RESIZED`      | either        | **Yes**           | Layout metadata only (available viewport size). Exact payload units are an implementation detail.                                                                                                                                                                                                                                        |
| `UPDATE_NODE`         | —             | **No — deferred** | Name implies direct mutation, which contradicts §2. Before this ships, it must be redefined as an intent/request event that the host converts into a command — tracked under the future write-path ADR, not this one.                                                                                                                    |

**Envelope versioning (decision, not deferred):** `CanvasRpcMessage<T>` gains a `schemaVersion` field (numeric, starting at `1`) in the same PR that first implements this ADR, so that future message-shape changes can be detected instead of silently breaking an older host or iframe build. The exact field name is called out under Open questions below since it is a wire-contract detail worth an explicit owner nod even though the need for _some_ version field is decided here.

### 4. Lifecycle — Runtime session ↔ iframe

One `BuilderRuntime` session ([ADR-0005](./ADR-0005-builder-runtime-foundation.md) Slice A) maps to **exactly one** active canvas iframe at a time:

- On `BuilderRuntime.dispose()`, the host must tear down or invalidate the associated iframe's document view — mirroring the existing "disposed session must not be silently resurrected" invariant already enforced in `loadFromStore()` (re-check `#disposed` after the async gap). A disposed Runtime must never keep feeding `INIT_DOCUMENT` to a live iframe.
- A freshly mounted or remounted iframe always starts from a clean state and receives a fresh `INIT_DOCUMENT` — no RPC session state is assumed to persist across an iframe reload.
- Multiple simultaneous Runtime sessions mapping to multiple simultaneous canvases (multi-tab, multi-document) is **not** decided here — it inherits ADR-0005's own deferred open question ("How Runtime sessions map onto authenticated product users / multi-tab") and stays open.

### 5. Host surfaces — where MVP lives first

**`/dev/builder-playground` first, not product `/chat`.** Reasons:

- The playground route is already dev-only (`beforeLoad` redirects to `/` unless `import.meta.env.DEV`), `noindex, nofollow`, and carries zero production/auth exposure.
- `BuilderKernelPlayground.tsx` already renders kernel state directly in React (no iframe today) — adding an iframe-based Design Canvas view there is **additive**, reversible, and does not touch any shipped user flow.
- Product `/chat` + `Canvas.tsx` is the live, revenue-facing HTML-artifact-preview surface. Embedding an experimental read-only kernel-document renderer there before the contract is proven would (a) risk user confusion between "artifact canvas" and "kernel canvas," and (b) add real complexity to an already-large `Canvas.tsx`. Product embedding is explicitly **out of scope** for MVP and requires its own future ADR/PR once the playground MVP has validated the RPC contract.

### 6. Security

- Sandbox stays `allow-scripts` only (§2) — reaffirms the existing `CANVAS_SANDBOX_ATTR` constant; no relaxation for MVP or for any milestone described in this ADR.
- Because the sandboxed iframe (without `allow-same-origin`) has an opaque (`null`) origin, string-based origin allowlisting is not possible. Auth reuses the pattern already shipped and tested for the product preview bridge (`src/lib/preview-bridge.ts`): a per-mount random token embedded in every message payload, checked host-side together with `event.source === iframe.contentWindow`. This is an explicit decision to reuse a proven pattern, not invent a new one.
- No live kernel, `CommandManager`, or registry is ever posted into the iframe, in any message, at any point — only serialized document data (§2).
- `docs/SECURITY.md`'s existing "Canvas PostMessage origin allowlists when Canvas ships" line is satisfied by the token+source-window check above (not a literal origin allowlist, since none is possible under this sandbox model); `SECURITY.md` gets updated to reflect that in the implementation PR, not this one.

## Non-goals (MVP and this ADR)

- Figma parity, visual import adapters (Vision/Figma/HTML → IR), CRDT multiplayer, marketplace plugins drawing into canvas
- Replacing or wrapping the chat → HTML artifact flow
- The write path (`UPDATE_NODE` / any mutation-capable message) — tracked for a future ADR once MVP ships
- Embedding Design Canvas in product `/chat` (§5)
- Plugin SDK `canvasSource` wiring — reserved by [ADR-0005](./ADR-0005-builder-runtime-foundation.md)/[ADR-0009](./ADR-0009-plugin-sdk-registry-bridge.md), not this ADR
- Persistence schema decisions — that is [ADR-0008](./ADR-0008-document-persistence-backends.md)'s scope, untouched here

## Success metrics (MVP)

- A `BuilderDocument` (fixture or live playground session) renders inside `/dev/builder-playground`'s iframe with the kernel itself running only host-side — zero kernel code executes inside the sandboxed iframe.
- `INIT_DOCUMENT` → render → `NODE_SELECTED_EVENT` round-trips a selection with no document mutation anywhere in the loop.
- Origin/source auth (token + `event.source` check) has unit test coverage mirroring existing `runtime/*.test.ts` and preview-bridge test conventions.
- Existing playground direct-render mode and all currently-passing tests are unaffected — Design Canvas is additive.

## Open questions

**Must decide before Accept** (owner sign-off needed — these shape the contract implementers build against):

1. Exact `schemaVersion` field name/shape on `CanvasRpcMessage` (proposed: `schemaVersion: number`, starting at `1`).
2. Whether `/dev/builder-playground` is the sole MVP host, or the owner wants a dedicated new dev route (e.g. `/dev/design-canvas`) instead of extending the existing kernel playground.
3. Whether MVP ships behind an additional explicit opt-in flag — mirroring Slice C's `enablePluginDocumentSource: true` pattern — or is simply always-on inside the already dev-gated playground route.

**Defer to implementation PR** (does not block Accept):

1. Exact iframe rendering technique for `BuilderDocument` nodes (DOM vs Canvas2D/SVG painting).
2. Precise `CANVAS_RESIZED` payload shape/units.
3. `INIT_DOCUMENT` resend batching/coalescing strategy on rapid successive dispatches.
4. Test file naming/location (follow existing co-located `*.test.ts` convention).
5. Multi-tab / multiple simultaneous Runtime↔canvas sessions (inherits ADR-0005's own deferred open question).

## Minimal acceptance checklist for implementation (P2-1 read-only MVP)

For a future implementation PR (Cursor or otherwise) — **not** satisfied by this docs-only ADR PR, which contains no host/iframe code:

- [ ] `CanvasRpcMessage` envelope gains `schemaVersion`; MVP implements only `INIT_DOCUMENT`, `SELECT_NODE`, `NODE_SELECTED_EVENT`, `CANVAS_RESIZED` — `UPDATE_NODE` is not implemented
- [ ] iframe uses `sandbox="allow-scripts"` only (reuse `CANVAS_SANDBOX_ATTR`) — no `allow-same-origin`, no `allow-forms`
- [ ] Host↔iframe auth follows the existing per-mount-token + `event.source === iframe.contentWindow` pattern from `src/lib/preview-bridge.ts` — no string-based origin allowlist
- [ ] Iframe receives only serialized `BuilderDocument` snapshots via `INIT_DOCUMENT` — never a live kernel, `CommandManager`, or registry
- [ ] Iframe never calls `BuilderRuntime.dispatch()`/`undo()`/`redo()` directly; `NODE_SELECTED_EVENT` updates host-side UI state only
- [ ] One `BuilderRuntime` session maps to exactly one active canvas iframe; `dispose()` tears down/invalidates the iframe's document view; a remounted iframe always gets a fresh `INIT_DOCUMENT`
- [ ] MVP host surface is `/dev/builder-playground` only — no changes to product `/chat` or `Canvas.tsx`
- [ ] Unit tests cover: message envelope shape, origin/source auth check, dispose→teardown behavior
- [ ] No `document.write`/`document.modify` or any write-capable plugin-sdk context wired into this surface
- [ ] Existing playground direct-render mode and its current tests keep passing unchanged

## Sequencing

```
Observatory (0006, shipped) → Accept this ADR → read-only Canvas MVP (playground) → write path (future ADR) → plugin bridge (0009) → marketplace (0010)
```
