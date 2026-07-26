# Architecture

This document describes the **actual** architecture of the repository: a TanStack Start product application plus a headless Builder Kernel platform and an isolated Plugin SDK. Diagrams use Mermaid.

## 1. System overview

```mermaid
flowchart TB
  subgraph product [Product application]
    UI[React routes and app-shell]
    Chat[Mistral chat via AI SDK]
    Artifacts[Artifact preview canvas]
    DB[(Supabase Auth and DB)]
  end

  subgraph platform [Builder platform libraries]
    Kernel[BuilderKernel]
    DocModel[BuilderDocument]
    Commands[Command system]
    History[HistoryManager]
    KernelPlugins[builder PluginRegistry]
    PluginSDK[plugin-sdk PluginSdkRegistry]
  end

  UI --> Chat
  UI --> Artifacts
  Chat --> DB
  Artifacts --> DB

  Kernel --> DocModel
  Kernel --> Commands
  Kernel --> History
  KernelPlugins --> Kernel

  PluginSDK -.->|Not wired| Kernel
  UI -.->|Not wired| Kernel
```

**Fact:** Product UI does not currently import `@/lib/builder`. The kernel is a library with unit tests, not the live editor runtime.

## 2. Repository layout (engineering-relevant)

```text
src/
  lib/builder/          Headless Builder Kernel
  lib/plugin-sdk/       Isolated Plugin SDK foundation
  components/           Product UI (includes artifact Canvas — not kernel Canvas)
  routes/               TanStack Router routes
  integrations/         Supabase client wiring
supabase/               Migrations and config
.github/workflows/      CI and prod smoke
docs/                   Engineering documentation
examples/               Runnable library examples
```

## 3. Builder Kernel execution flow

```mermaid
sequenceDiagram
  participant Caller
  participant Kernel as BuilderKernel
  participant Cmd as ICommand
  participant Inv as validateDocument
  participant Hist as HistoryManager

  Caller->>Kernel: dispatch(command)
  Kernel->>Kernel: clone snapshot
  Kernel->>Cmd: execute(document)
  alt execute fails or throws
    Kernel->>Kernel: restore snapshot
    Kernel-->>Caller: success false
  else execute succeeds
    Kernel->>Inv: validateDocument
    alt invariants fail
      Kernel->>Kernel: restore snapshot
      Kernel-->>Caller: success false
    else ok
      Kernel->>Hist: push HistoryEntry
      Kernel-->>Caller: success true
    end
  end
```

Entry points:

- `BuilderKernel.dispatch`
- `BuilderKernel.undo` / `redo`
- `BuilderKernel.transaction` (nested dispatch unsupported)
- `bootstrapBuilderKernel()` for registries + session wiring

## 4. Document and command dependency graph

```mermaid
flowchart LR
  Types[document.types]
  Zod[documentValidator Zod]
  Inv[documentInvariants]
  Factory[documentFactory]
  CmdIface[ICommand]
  Impl[command implementations]
  Schemas[commandSchemas]
  Kernel[BuilderKernel]
  Hist[HistoryManager]

  Types --> Zod
  Types --> Inv
  Types --> Factory
  Types --> CmdIface
  CmdIface --> Impl
  Schemas --> Impl
  Impl --> Kernel
  Inv --> Kernel
  Hist --> Kernel
```

## 5. Dual plugin systems

| System | Path | Role today |
| --- | --- | --- |
| Kernel plugins | `src/lib/builder/plugins/` | Register nodes/commands against kernel registries with permission checks |
| Plugin SDK | `src/lib/plugin-sdk/` | Manifest + lifecycle + sealed context; no live kernel reference |

```mermaid
flowchart LR
  SDK[PluginSdkRegistry]
  Ctx[PluginContext sealed]
  HostSrc[Optional documentSource canvasSource]
  KReg[builder PluginRegistry]
  Facade[BuilderKernelFacade]
  Nodes[NodeRegistry]
  Cmds[CommandRegistry]

  SDK --> Ctx
  Ctx --> HostSrc
  KReg --> Facade
  Facade --> Nodes
  Facade --> Cmds
  SDK -.->|Future bridge Planned| KReg
```

Permission vocabularies differ. Do not assume interchangeability. See [PLUGIN_SDK.md](./PLUGIN_SDK.md) and [PLUGIN_ARCHITECTURE.md](./PLUGIN_ARCHITECTURE.md).

## 6. Security boundaries (summary)

| Boundary | Enforcement |
| --- | --- |
| Document mutation | Commands only; failed execute rolls back to snapshot |
| Invariants | Post-command `validateDocument` |
| External document access | Cloned / frozen getters |
| Kernel plugins | Permission-gated facade; core commands non-overwriteable |
| Plugin SDK | Frozen manifests; sealed context; read gating |
| Product AI | Mistral-only policy |
| Secrets | Env / Lovable secrets; not committed |

Details: [SECURITY.md](./SECURITY.md).

## 7. State management

| State | Owner |
| --- | --- |
| `BuilderDocument` | `BuilderKernel` (private field) |
| Undo / redo stacks | `HistoryManager` (default capacity 100) |
| Selection / UI | `BuilderUiState` (outside document history) |
| Product chat/artifacts | Supabase-backed application state |

No CRDT layer. **Not yet implemented.**

## 8. Deployment architecture

```mermaid
flowchart LR
  Dev[developeredit / feature branch]
  PR[Pull Request]
  Main[main protected]
  Lovable[Lovable Publish]
  CF[Cloudflare Worker]
  Smoke[prod-smoke workflow]

  Dev --> PR --> Main
  Main --> Lovable --> CF
  Main --> Smoke
```

Branch protection: `.github/BRANCH_PROTECTION.md`. Deploy detail: [product/deploy.md](./product/deploy.md).

## 9. Related documents

- [BUILDER_KERNEL.md](./BUILDER_KERNEL.md)
- [DOCUMENT_MODEL.md](./DOCUMENT_MODEL.md)
- [COMMAND_SYSTEM.md](./COMMAND_SYSTEM.md)
- [diagrams/](./diagrams/)
