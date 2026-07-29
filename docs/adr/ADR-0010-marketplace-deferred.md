# ADR-0010: Marketplace — Deferred

- **Status:** Deferred (explicitly last)
- **Date:** 2026-07
- **Related:** [ADR-0009](./ADR-0009-plugin-sdk-registry-bridge.md), [ROADMAP.md](../ROADMAP.md)

## Context

Marketplace (discover / install / trust plugins) depends on a stable PluginRegistry bridge, Observatory health signals, and preferably a Design Canvas mutation path. Shipping marketplace first would freeze unstable APIs.

## Decision

Marketplace remains **last** in the sequencing queue. No implementation PRs until:

1. v0.4.6 Observatory is on `main`
2. Design Canvas ADR-0007 is Accepted and MVP read-only path exists (or explicitly waived by owner)
3. plugin-sdk ↔ registry bridge (ADR-0009) is Accepted

## Non-goals until then

Any marketplace UI, billing, or remote plugin CDN.
