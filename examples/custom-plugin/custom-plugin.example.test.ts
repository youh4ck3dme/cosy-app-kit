/**
 * Example: Plugin SDK register → install → enable with sealed permissions.
 * Run: bun run test:unit examples/custom-plugin/custom-plugin.example.test.ts
 */
import { describe, expect, it } from "vitest";

import { PluginSdkRegistry } from "../../src/lib/plugin-sdk";

describe("example: custom-plugin", () => {
  it("installs a read-only plugin without escalating permissions", async () => {
    const registry = new PluginSdkRegistry({
      documentSource: { read: () => ({ hello: "world" }) },
    });

    let sawDoc: unknown;
    registry.register(
      {
        name: "example-plugin",
        version: "1.0.0",
        permissions: ["document.read"],
      },
      {
        onInstall: (ctx) => {
          sawDoc = ctx.readDocument();
          expect(ctx.hasPermission("canvas.read")).toBe(false);
          expect(ctx.readCanvas()).toBeUndefined();
          expect(Object.isFrozen(ctx.manifest.permissions)).toBe(true);
        },
      },
    );

    await registry.install("example-plugin");
    await registry.enable("example-plugin");

    expect(sawDoc).toEqual({ hello: "world" });
    expect(registry.get("example-plugin")?.state).toBe("enabled");
  });
});
