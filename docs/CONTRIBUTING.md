# Contributing

## Before you start

1. Read [GETTING_STARTED.md](./GETTING_STARTED.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).
2. Agree whether your change touches the **product app**, the **Builder Kernel**, the **Plugin SDK**, or **docs only**.
3. Work on `feature/*`, `feat/*`, `docs/*`, or `developeredit` — not directly on `main`.

## Development loop

```bash
bun install
bun run dev          # app
bun run test:watch   # unit
bun run typecheck
```

Kernel-focused:

```bash
bun run test:unit src/lib/builder
```

Plugin SDK-focused:

```bash
bun run test:unit src/lib/plugin-sdk
```

## Code requirements

- TypeScript strictness as configured in the repo
- No `any` in new kernel/SDK code
- Do not invent cross-wires between Plugin SDK and kernel plugins without an explicit milestone
- Do not execute untrusted generated code on the authenticated application origin

See [CODE_STYLE.md](./CODE_STYLE.md).

## Tests required

| Change area | Minimum |
| --- | --- |
| Kernel | Targeted Vitest + `src/lib/builder` green |
| Plugin SDK | `plugin-sdk.test.ts` green |
| Product UI | Relevant unit tests; e2e when flow-critical (local) |
| Docs only | Link and command accuracy |

## Pull requests

Follow the checklist in [DEVOPS.md](./DEVOPS.md). Prefer clear commit subjects:

```text
feat(builder): ...
fix(plugin-sdk): ...
docs(architecture): ...
```

## Documentation honesty

If a feature is incomplete, say **Planned**, **Future milestone**, or **Not yet implemented**. Do not document aspirations as shipped APIs.

## Security

See [SECURITY.md](./SECURITY.md). Never commit secrets.
