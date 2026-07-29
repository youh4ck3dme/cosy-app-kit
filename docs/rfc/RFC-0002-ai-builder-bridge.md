# RFC-0002: AI Builder ↔ Kernel bridge

- **Status:** Draft (Not yet implemented)
- **Related:** product chat exists; kernel is separate

## Problem

Product chat already generates artifacts (HTML/markdown) for the artifact preview canvas. That path does not produce or mutate `BuilderDocument` via the kernel.

## Proposal (direction only)

Define an explicit bridge that can translate selected AI outputs into IR/commands — only after IR adapters and safety review exist. Adapters for vision/html/figma remain **Not yet implemented**.

## Alternatives

- Keep AI artifacts forever outside the kernel (valid product mode; limits “builder platform” story)
- Let the model emit raw document JSON (high integrity risk)

## Risks

- Prompt injection → malicious document graphs
- Executing generated code on authenticated origin (forbidden by project rules)

## Open questions

- Which artifact types map to commands first
- Human confirmation gates before dispatch

## Decision

Undecided — draft only.
