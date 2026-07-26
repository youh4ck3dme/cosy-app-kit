# Documentation index

Engineering documentation for this repository. Claims are limited to what exists in code, CI, and release tags. Gaps are labeled **Planned**, **Future milestone**, or **Not yet implemented**.

## Start here

| Document | Purpose |
| --- | --- |
| [GETTING_STARTED.md](./GETTING_STARTED.md) | First successful local run |
| [INSTALLATION.md](./INSTALLATION.md) | Prerequisites and install |
| [BUILD.md](./BUILD.md) | Build, preview, verify |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture |
| [ROADMAP.md](./ROADMAP.md) | Versioned milestones |
| [CHANGELOG.md](./CHANGELOG.md) | Release history from tags/commits |
| [releases/](./releases/) | Tag-anchored release notes |

## Builder platform

| Document | Purpose |
| --- | --- |
| [BUILDER_KERNEL.md](./BUILDER_KERNEL.md) | Headless Builder Kernel |
| [DOCUMENT_MODEL.md](./DOCUMENT_MODEL.md) | `BuilderDocument` model |
| [COMMAND_SYSTEM.md](./COMMAND_SYSTEM.md) | Command architecture |
| [UNDO_REDO.md](./UNDO_REDO.md) | History and inverse commands |
| [INVARIANTS.md](./INVARIANTS.md) | Document integrity checks |
| [PLUGIN_ARCHITECTURE.md](./PLUGIN_ARCHITECTURE.md) | Kernel plugin registry |
| [PLUGIN_SDK.md](./PLUGIN_SDK.md) | Isolated Plugin SDK (v0.4.7) |
| [OBSERVABILITY.md](./OBSERVABILITY.md) | Diagnostics status |

## Engineering practice

| Document | Purpose |
| --- | --- |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution workflow |
| [CODE_STYLE.md](./CODE_STYLE.md) | Lint, format, TypeScript |
| [TESTING.md](./TESTING.md) | Unit, e2e, verify gates |
| [PERFORMANCE.md](./PERFORMANCE.md) | Kernel complexity and goals |
| [PERFORMANCE_CONTRACT.md](./PERFORMANCE_CONTRACT.md) | Product Builder budgets + dual-brain boundaries (v0.1) |
| [SECURITY.md](./SECURITY.md) | Threat model and boundaries |
| [DEVOPS.md](./DEVOPS.md) | Branches, CI, release, ops |
| [FAQ.md](./FAQ.md) | Common questions |
| [LICENSE_GUIDE.md](./LICENSE_GUIDE.md) | Licensing status |
| [adr/](./adr/) | Architecture Decision Records |
| [rfc/](./rfc/) | Draft proposals (not shipped) |
| [runbooks/](./runbooks/) | Build, release, rollback, tagging |

## Diagrams, API notes, examples

| Path | Purpose |
| --- | --- |
| [diagrams/](./diagrams/) | Mermaid architecture diagrams |
| [api/](./api/) | Public module surfaces |
| [examples/](./examples/) | Doc-side example index |
| [tutorials/](./tutorials/) | Step-by-step guides |
| [images/](./images/) | Screenshot placeholders |
| [`../examples/`](../examples/) | Runnable TypeScript examples |

## Product operations (legacy location)

Operational product docs relocated under [product/](./product/) (deploy, migrations, smoke checklist, historical prompts). Prefer the documents above for platform engineering.

| Document | Purpose |
| --- | --- |
| [product/SCORECARD_PROMPT_1.md](./product/SCORECARD_PROMPT_1.md) | Claude SCORECARD-BUILDER Prompt 1 (D1–D11 Builder-fit audit) |
| [product/deploy.md](./product/deploy.md) | Production publish + PWA notes |
| [product/smoke-checklist.md](./product/smoke-checklist.md) | Manual smoke checklist |
## Source inventory

Internal audit used to author these docs: [INVENTORY.md](./INVENTORY.md).

Coverage scores: [DOCUMENTATION_COVERAGE_REPORT.md](./DOCUMENTATION_COVERAGE_REPORT.md).
