# Changelog

All notable platform releases below are anchored to **git tags**. The npm package does not declare a `version` field.

Format follows Keep a Changelog conventions where applicable.

## [Unreleased]

- Documentation restructure under `docs/` for open-source / portfolio presentation (this branch).

## [v0.4.7-plugin-sdk] — Plugin SDK Foundation

**Tag:** `v0.4.7-plugin-sdk`

### Added

- Isolated `src/lib/plugin-sdk/` package: manifests, permissions, lifecycle FSM, `PluginSdkRegistry`
- Zod manifest validation
- Sealed `PluginContext` with permission-gated read accessors
- Unit suite `src/lib/plugin-sdk/plugin-sdk.test.ts`

### Security

- Manifest permissions deep-frozen after validation
- Context grant lists frozen; mutation / escalation via `permissions.push` rejected at runtime (strict mode)
- `remove()` lifecycle hardening (see commit history on the feature branch)

### Notes

- Not wired to `src/lib/builder/plugins/PluginRegistry`
- Write/modify permissions exist in the enum but do not expose write APIs on context (foundation)

## [v0.4.5.1-hardening] — Builder Kernel hardening

**Tag:** `v0.4.5.1-hardening`

### Hardened

- Sealed document access (`getDocument` clone / readonly freeze path)
- Document invariants after mutations
- Undo/redo exception safety
- Batch / transaction semantics
- Plugin permission defaults denying native overwrite without explicit grant
- Reality-check / hardening regression tests under `src/lib/builder/`

## [v0.4.5-kernel-foundation] — Builder Kernel foundation

**Tags:** `v0.4.5-kernel-foundation`, `v0.4.5-kernel-foundation-audited`

### Added

- Headless Builder Kernel (`BuilderKernel`)
- Document model + Zod validation
- Command system (ADD / REMOVE / UPDATE / MOVE / BATCH)
- History manager
- Node registry + IR compiler scaffolding
- Canvas RPC **types only**

## Earlier product history

Application features (chat, artifacts, auth, deploy smoke) predate the NEXIFY Forge kernel tags. See git history on `main` and [product/](./product/) for operational notes.
