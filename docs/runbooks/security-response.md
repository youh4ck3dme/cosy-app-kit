# Runbook: Security response

## Intake

Follow [.github/SECURITY.md](../../.github/SECURITY.md).

1. Acknowledge privately
2. Reproduce on a local / non-prod checkout
3. Classify: product app / kernel / plugin-sdk / CI
4. Patch on a private or restricted branch if needed
5. PR with tests; avoid disclosing exploit details in the public PR description
6. After merge, decide on advisory publication

## Known process gaps (honest)

- No published SLA
- No dedicated security@ mail documented beyond GitHub owner contact
- Formal on-call: Not yet implemented
