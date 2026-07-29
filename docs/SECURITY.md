# Security

## Scope

Covers the Builder Kernel, Plugin SDK, and repository operational controls that exist today. Product auth/RLS details live in Supabase migrations and [product/](./product/) docs.

## Threat model (current)

| Asset                                | Threat                                 | Mitigation in code / process                                                                       |
| ------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Kernel document integrity            | Corrupt graph via bad commands         | Snapshot rollback + `validateDocument`                                                             |
| Kernel memory safety                 | External aliasing / mutation           | `getDocument` clones; readonly freeze path                                                         |
| Plugin privilege escalation (SDK)    | Mutate granted permissions             | Frozen manifests + frozen context grants                                                           |
| Plugin privilege escalation (kernel) | Overwrite core commands / native nodes | Permission gates; core types blocked                                                               |
| Secrets                              | Leak via git                           | `.gitignore`, Lovable secrets, no keys in commits                                                  |
| Product AI provider abuse            | Wrong provider / key exfil             | Mistral-only policy; server-side key usage                                                         |
| Generated / imported code            | Hostile execution on app origin        | Policy: do not execute untrusted generated code on authenticated origin (see AGENTS / forge rules) |

## Plugin isolation

### Plugin SDK

- No live kernel reference on the registry.
- Sealed `PluginContext`.
- Read accessors return `undefined` without permission or without host source.
- Write APIs on context: **Not yet implemented** (permissions may exist as declarations only).

### Kernel plugins

- Facade-only access.
- Subscribe-only events.
- Core commands immutable.

## Immutable / sealed state

| Surface                | Mechanism                                |
| ---------------------- | ---------------------------------------- |
| Document external read | Clone / deepFreeze                       |
| SDK manifest           | `freezePluginManifest`                   |
| SDK context            | `Object.freeze` on context + permissions |

## Validation and invariants

- Zod for shape.
- Invariants for graph structure.
- Command payload schemas for registry/batch paths.

## Responsible disclosure

1. Do not open a public issue that includes exploit details for hosted production without coordination.
2. Report security concerns to the repository owner via a private channel (GitHub Security Advisory when enabled, or direct maintainer contact).
3. Include reproduction steps limited to local / non-production data when possible.

**Note:** A formal `SECURITY.md` disclosure email / SLA is **not yet** published as a separate policy document beyond this file. Treat that process maturity as **Planned** for open-source hardening.

## Known limitations

| Limitation                               | Status                                     |
| ---------------------------------------- | ------------------------------------------ |
| Design Canvas sandbox runtime            | Types only — Not yet implemented           |
| plugin-sdk write surface                 | Not yet implemented                        |
| Diagnostics audit trail as shipped API   | Future milestone                           |
| Public LICENSE / open-source legal pack  | See [LICENSE_GUIDE.md](./LICENSE_GUIDE.md) |
| Coverage badge / published coverage gate | Not configured in CI                       |

## Future hardening

- Bridge SDK permissions to kernel facade with least privilege
- Destroy-on-remove guarantees audited across hosts
- Canvas PostMessage origin allowlists when Canvas ships
- Coverage and supply-chain scanning as merge gates
