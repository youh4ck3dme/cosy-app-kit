# ADR-0009: plugin-sdk ↔ PluginRegistry bridge — Proposed

- **Status:** Proposed
- **Date:** 2026-07
- **Related:** [ADR-0003](./ADR-0003-plugin-sdk.md), Runtime PluginRegistry, [ADR-0007](./ADR-0007-design-canvas.md)

## Context

`@cosy/plugin-sdk` defines a host-agnostic contract. Product PluginRegistry / Runtime registry enforce permissions and registration. A typed bridge that maps SDK plugin descriptors into registry entries (with permission checks) is not shipped.

## Decision (when Accepted)

1. Bridge lives under Builder Kernel / Runtime — not in React UI.
2. Permissions are enforced server-side / registry-side before any command mutation.
3. Marketplace distribution is **out of scope** for the bridge ADR (marketplace is last).

## Sequencing

After Observatory + Design Canvas ADR acceptance; before Marketplace.
