# Tutorial: Register a Plugin SDK plugin

```ts
import { PluginSdkRegistry } from "@/lib/plugin-sdk";

const registry = new PluginSdkRegistry({
  documentSource: { read: () => ({ ok: true }) },
});

registry.register(
  { name: "demo", version: "1.0.0", permissions: ["document.read"] },
  {
    onInstall: (ctx) => {
      // ctx.readDocument() available because document.read was granted
    },
  },
);

await registry.install("demo");
await registry.enable("demo");
```

Verify:

```bash
bun run test:unit src/lib/plugin-sdk/plugin-sdk.test.ts
```

See [`../../examples/custom-plugin`](../../examples/custom-plugin/).
