# Documentation Coverage Report

Generated for branch `docs/enterprise-open-source-prep`. Scores are judgment based on honesty and completeness relative to the audited codebase — not marketing.

## Repository Coverage %

| Area                         | Documented? | Notes                    |
| ---------------------------- | ----------- | ------------------------ |
| Product app stack            | Yes         | README + product docs    |
| Builder Kernel               | Yes         | Dedicated docs + ADR     |
| Plugin SDK                   | Yes         | Dedicated docs + ADR     |
| Commands / undo / invariants | Yes         |                          |
| Dual plugin systems          | Yes         | Explicitly separated     |
| CI / branch protection       | Yes         | DEVOPS + runbooks        |
| Deploy                       | Yes         | `docs/product/deploy.md` |
| Observatory v0.4.6           | Honest gap  | Marked Future milestone  |
| Canvas / marketplace         | Honest gap  | Not yet implemented      |
| Auto-generated API reference | No          | Manual `docs/api/` only  |

**Estimated documentation coverage of shipped surfaces: ~85%**  
**Estimated coverage if counting Planned features as requiring docs: ~70%** (draft RFCs present)

## Missing documentation (honest)

| Item                               | Status                                    |
| ---------------------------------- | ----------------------------------------- |
| Published coverage reports / badge | Not configured in CI                      |
| TypeDoc / API site                 | Not yet implemented                       |
| Real product screenshots           | Not in repo                               |
| CODE_OF_CONDUCT                    | Deferred (not open community yet)         |
| FUNDING.yml                        | Deferred                                  |
| postmortems/                       | Deferred (no fabricated incidents)        |
| OSI open-source LICENSE            | Not adopted (proprietary LICENSE present) |
| Kernel↔UI integration guide        | N/A until wired                           |

## Suggested future docs

- Runtime host guide when v0.5.0 exists
- Canvas PostMessage contract guide when implemented
- Permission adapter guide when SDK bridges to kernel
- SBOM / dependency license report automation

## Scores (0–100)

| Score                 | Value  | Rationale                                                                                          |
| --------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| Documentation Quality | **82** | Consistent, evidence-linked, explicit gaps; some legacy product prompt noise under `docs/product/` |
| Repository Maturity   | **74** | Strong kernel/SDK + CI; private package; dual remotes complexity; kernel not product-wired         |
| Open Source Readiness | **45** | Proprietary license; private npm; no CoC; solid SECURITY stubs                                     |
| Enterprise Readiness  | **70** | ADRs, runbooks, branch protection, smoke; limited formal incident/SLA                              |
| Portfolio Readiness   | **80** | Clear architecture story, ADRs, truthful roadmap, examples                                         |

## Open Source Readiness

**Not open-source licensed.** Documentation is portfolio-ready; redistribution is not granted.

## Enterprise Readiness

Suitable to show engineering discipline (invariants, sealed plugins, CI). Not a complete enterprise ops pack (no APM, no SLA, no on-call).

## Portfolio Readiness

**Ready to present** as a platform-in-progress with honest boundaries — provided reviewers are shown tags `v0.4.5.1-hardening` and `v0.4.7-plugin-sdk` and the “not wired to UI” fact.
