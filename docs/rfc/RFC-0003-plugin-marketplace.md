# RFC-0003: Plugin marketplace

- **Status:** Draft (Not yet implemented)

## Problem

Kernel plugins and Plugin SDK foundations exist, but there is no discovery, packaging, signing, or install UX for third parties.

## Proposal (direction only)

A marketplace requires, at minimum:

- package manifest contract (likely extending Plugin SDK manifests)
- permission review UX
- host bridge into kernel registries
- supply-chain controls

None of these product surfaces exist today.

## Alternatives

- First-party plugins only (in-repo)
- Delay marketplace until after Runtime + Canvas

## Risks

- Privilege escalation if bridge is rushed
- Dual permission vocabularies without an adapter

## Open questions

- Signing / verification model
- Whether SDK write permissions become real APIs in the same release

## Decision

Undecided — draft only. Explicitly out of scope for v0.4.5.x / v0.4.7.
