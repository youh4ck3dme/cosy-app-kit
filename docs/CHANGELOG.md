# Changelog

All notable platform releases below are anchored to **git tags**. The npm package does not declare a `version` field.

Format follows Keep a Changelog conventions where applicable.

## [v0.4.8-repo-readiness] — Enterprise repository readiness

**Tag (after merge):** `v0.4.8-repo-readiness`

Documentation and governance only — no Builder Runtime / Canvas / marketplace code.

### Added

- Redesigned root README; proprietary LICENSE; root stubs for SECURITY / CONTRIBUTING / ROADMAP / CHANGELOG
- GitHub ISSUE/PR templates, CODEOWNERS, `.github/SECURITY.md`
- Engineering docs under `docs/` (architecture, kernel, plugin SDK, security, devops, ADRs, draft RFCs, runbooks, tutorials, examples)
- Tag-anchored release notes under [releases/](./releases/)

### Notes

- Observatory (v0.4.6), Runtime (v0.5.0), Canvas, marketplace remain Planned / Not yet implemented
- npm package remains `"private": true`

## [v0.4.7-plugin-sdk] — Plugin SDK Foundation

**Tag:** `v0.4.7-plugin-sdk`  
**Release notes:** [releases/v0.4.7-plugin-sdk.md](./releases/v0.4.7-plugin-sdk.md)

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
**Release notes:** [releases/v0.4.5.1-hardening.md](./releases/v0.4.5.1-hardening.md)

### Hardened

- Sealed document access (`getDocument` clone / readonly freeze path)
- Document invariants after mutations
- Undo/redo exception safety
- Batch / transaction semantics
- Plugin permission defaults denying native overwrite without explicit grant
- Reality-check / hardening regression tests under `src/lib/builder/`

## [v0.4.5-kernel-foundation] — Builder Kernel foundation

**Tags:** `v0.4.5-kernel-foundation`, `v0.4.5-kernel-foundation-audited`  
**Release notes:** [releases/v0.4.5-kernel-foundation.md](./releases/v0.4.5-kernel-foundation.md)

### Added

- Headless Builder Kernel (`BuilderKernel`)
- Document model + Zod validation
- Command system (ADD / REMOVE / UPDATE / MOVE / BATCH)
- History manager
- Node registry + IR compiler scaffolding
- Canvas RPC **types only**

## Earlier product history

Application features (chat, artifacts, auth, deploy smoke) predate the NEXIFY Forge kernel tags. See git history on `main` and [product/](./product/) for operational notes.
