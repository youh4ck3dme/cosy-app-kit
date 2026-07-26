import { describe, expect, it } from "vitest";

import {
  assertValidPluginManifest,
  validatePluginManifest,
} from "./pluginManifest";
import {
  hasPermission,
  isValidPermission,
  validatePermissions,
} from "./pluginPermissions";
import {
  PluginLifecycleError,
  runDestroy,
  runDisable,
  runEnable,
  runInstall,
} from "./pluginLifecycle";
import { PluginSdkRegistry } from "./pluginRegistry";
import type { PluginContext, PluginLifecycleHandlers } from "./plugin.types";

describe("pluginManifest", () => {
  it("accepts a minimal valid manifest", () => {
    const result = validatePluginManifest({ name: "example", version: "1.0.0" });
    expect(result.success).toBe(true);
    expect(result.manifest?.permissions).toEqual([]);
  });

  it("rejects a manifest missing name", () => {
    const result = validatePluginManifest({ version: "1.0.0" });
    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toMatch(/name/i);
  });

  it("rejects a manifest missing version", () => {
    const result = validatePluginManifest({ name: "example" });
    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toMatch(/version/i);
  });

  it("rejects a manifest with a non-semver version", () => {
    const result = validatePluginManifest({ name: "example", version: "latest" });
    expect(result.success).toBe(false);
    expect(result.errors.join(" ")).toMatch(/semver/i);
  });

  it("rejects a manifest with an unknown permission", () => {
    const result = validatePluginManifest({
      name: "example",
      version: "1.0.0",
      permissions: ["kernel.destroy"],
    });
    expect(result.success).toBe(false);
  });

  it("assertValidPluginManifest throws with a descriptive message on invalid input", () => {
    expect(() => assertValidPluginManifest({})).toThrow(/name/i);
  });

  it("assertValidPluginManifest returns a manifest on valid input", () => {
    const manifest = assertValidPluginManifest({
      name: "example",
      version: "2.1.0",
      permissions: ["document.read", "canvas.read"],
    });
    expect(manifest.name).toBe("example");
    expect(manifest.permissions).toEqual(["document.read", "canvas.read"]);
  });
});

describe("pluginPermissions", () => {
  it("isValidPermission recognizes known permissions only", () => {
    expect(isValidPermission("document.read")).toBe(true);
    expect(isValidPermission("document.modify")).toBe(true);
    expect(isValidPermission("not.a.permission")).toBe(false);
    expect(isValidPermission(42)).toBe(false);
  });

  it("validatePermissions de-dupes and preserves valid entries", () => {
    const result = validatePermissions(["document.read", "document.read", "canvas.read"]);
    expect(result).toEqual(["document.read", "canvas.read"]);
  });

  it("validatePermissions throws on an unknown permission", () => {
    expect(() => validatePermissions(["document.read", "root.access"])).toThrow(
      /invalid plugin permissions/i,
    );
  });

  it("validatePermissions throws when input is not an array", () => {
    expect(() => validatePermissions("document.read")).toThrow();
  });

  it("hasPermission checks membership only, no implicit grants", () => {
    const granted = ["document.read", "canvas.read"] as const;
    expect(hasPermission(granted, "document.read")).toBe(true);
    expect(hasPermission(granted, "document.write")).toBe(false);
    expect(hasPermission(granted, "canvas.modify")).toBe(false);
  });
});

describe("pluginLifecycle", () => {
  const noopContext = {} as PluginContext;

  it("runInstall moves registered -> installed and calls onInstall", async () => {
    let called = false;
    const handlers: PluginLifecycleHandlers = { onInstall: () => { called = true; } };
    const next = await runInstall(handlers, noopContext, "registered");
    expect(next).toBe("installed");
    expect(called).toBe(true);
  });

  it("runEnable moves installed -> enabled and calls onEnable", async () => {
    let called = false;
    const handlers: PluginLifecycleHandlers = { onEnable: () => { called = true; } };
    const next = await runEnable(handlers, noopContext, "installed");
    expect(next).toBe("enabled");
    expect(called).toBe(true);
  });

  it("runDisable moves enabled -> disabled and calls onDisable", async () => {
    let called = false;
    const handlers: PluginLifecycleHandlers = { onDisable: () => { called = true; } };
    const next = await runDisable(handlers, noopContext, "enabled");
    expect(next).toBe("disabled");
    expect(called).toBe(true);
  });

  it("runDestroy is reachable from installed, enabled, or disabled and calls onDestroy", async () => {
    let calls = 0;
    const handlers: PluginLifecycleHandlers = { onDestroy: () => { calls += 1; } };
    await runDestroy(handlers, noopContext, "installed");
    await runDestroy(handlers, noopContext, "enabled");
    await runDestroy(handlers, noopContext, "disabled");
    expect(calls).toBe(3);
  });

  it("rejects enabling a plugin that was never installed", async () => {
    await expect(runEnable({}, noopContext, "registered")).rejects.toThrow(PluginLifecycleError);
  });

  it("rejects any transition out of destroyed", async () => {
    await expect(runInstall({}, noopContext, "destroyed")).rejects.toThrow(PluginLifecycleError);
    await expect(runEnable({}, noopContext, "destroyed")).rejects.toThrow(PluginLifecycleError);
    await expect(runDisable({}, noopContext, "destroyed")).rejects.toThrow(PluginLifecycleError);
    await expect(runDestroy({}, noopContext, "destroyed")).rejects.toThrow(PluginLifecycleError);
  });

  it("rejects re-installing an already-installed plugin", async () => {
    await expect(runInstall({}, noopContext, "installed")).rejects.toThrow(PluginLifecycleError);
  });
});

describe("PluginSdkRegistry", () => {
  it("registers a valid plugin and rejects an invalid one", () => {
    const registry = new PluginSdkRegistry();
    const metadata = registry.register({ name: "good-plugin", version: "1.0.0" });
    expect(metadata.state).toBe("registered");

    expect(() => registry.register({ name: "", version: "1.0.0" })).toThrow(/invalid plugin manifest/i);
  });

  it("rejects registering the same plugin id twice", () => {
    const registry = new PluginSdkRegistry();
    registry.register({ name: "dup", version: "1.0.0" });
    expect(() => registry.register({ name: "dup", version: "1.0.1" })).toThrow(/already registered/i);
  });

  it("get/list/remove work as expected", () => {
    const registry = new PluginSdkRegistry();
    registry.register({ name: "a", version: "1.0.0" });
    registry.register({ name: "b", version: "1.0.0" });

    expect(registry.get("a")?.manifest.name).toBe("a");
    expect(registry.list().map((p) => p.manifest.name).sort()).toEqual(["a", "b"]);

    registry.remove("a");
    expect(registry.get("a")).toBeUndefined();
    expect(registry.list().map((p) => p.manifest.name)).toEqual(["b"]);
  });

  it("operating on an unregistered plugin id throws", async () => {
    const registry = new PluginSdkRegistry();
    await expect(registry.install("ghost")).rejects.toThrow(/unknown plugin/i);
  });

  it("drives a full lifecycle: register -> install -> enable -> disable -> enable -> destroy", async () => {
    const events: string[] = [];
    const registry = new PluginSdkRegistry();
    registry.register(
      { name: "lifecycle-plugin", version: "1.0.0" },
      {
        onInstall: () => { events.push("install"); },
        onEnable: () => { events.push("enable"); },
        onDisable: () => { events.push("disable"); },
        onDestroy: () => { events.push("destroy"); },
      },
    );

    expect((await registry.install("lifecycle-plugin")).state).toBe("installed");
    expect((await registry.enable("lifecycle-plugin")).state).toBe("enabled");
    expect((await registry.disable("lifecycle-plugin")).state).toBe("disabled");
    expect((await registry.enable("lifecycle-plugin")).state).toBe("enabled");
    expect((await registry.destroy("lifecycle-plugin")).state).toBe("destroyed");

    expect(events).toEqual(["install", "enable", "disable", "enable", "destroy"]);

    // Terminal state — no further transitions.
    await expect(registry.enable("lifecycle-plugin")).rejects.toThrow(PluginLifecycleError);
  });

  it("permissions are enforced on the context handed to lifecycle hooks", async () => {
    const registry = new PluginSdkRegistry({
      documentSource: { read: () => ({ secret: "doc" }) },
      canvasSource: { read: () => ({ secret: "canvas" }) },
    });

    let seenWithPermission: PluginContext | undefined;
    registry.register(
      { name: "reader", version: "1.0.0", permissions: ["document.read"] },
      { onInstall: (ctx) => { seenWithPermission = ctx; } },
    );
    await registry.install("reader");

    expect(seenWithPermission?.hasPermission("document.read")).toBe(true);
    expect(seenWithPermission?.hasPermission("canvas.read")).toBe(false);
    expect(seenWithPermission?.readDocument()).toEqual({ secret: "doc" });
    // Not granted canvas.read — must not receive canvas data even though a source exists.
    expect(seenWithPermission?.readCanvas()).toBeUndefined();

    let seenWithoutPermission: PluginContext | undefined;
    registry.register(
      { name: "no-permissions", version: "1.0.0" },
      { onInstall: (ctx) => { seenWithoutPermission = ctx; } },
    );
    await registry.install("no-permissions");

    expect(seenWithoutPermission?.readDocument()).toBeUndefined();
    expect(seenWithoutPermission?.readCanvas()).toBeUndefined();
  });

  it("PluginContext never exposes kernel internals: no commandManager, no mutation methods, no registries", async () => {
    let capturedContext: PluginContext | undefined;
    const registry = new PluginSdkRegistry({
      documentSource: { read: () => ({ ok: true }) },
    });
    registry.register(
      { name: "inspector", version: "1.0.0", permissions: ["document.read", "document.write", "document.modify"] },
      { onInstall: (ctx) => { capturedContext = ctx; } },
    );
    await registry.install("inspector");

    expect(capturedContext).toBeDefined();
    const context = capturedContext as unknown as Record<string, unknown>;

    // Explicitly forbidden surfaces — must never be present, granted or not.
    expect(context.commandManager).toBeUndefined();
    expect(context.commandRegistry).toBeUndefined();
    expect(context.nodeRegistry).toBeUndefined();
    expect(context.dispatch).toBeUndefined();
    expect(context.transaction).toBeUndefined();
    expect(context.undo).toBeUndefined();
    expect(context.redo).toBeUndefined();
    expect(context.writeDocument).toBeUndefined();
    expect(context.modifyDocument).toBeUndefined();
    expect(context.getDocument).toBeUndefined();
    expect(context.eventBus).toBeUndefined();
    expect(context.registerNode).toBeUndefined();
    expect(context.registerCommand).toBeUndefined();

    // Only the sealed foundation surface exists.
    expect(Object.keys(context).sort()).toEqual(
      ["hasPermission", "manifest", "pluginId", "readCanvas", "readDocument"].sort(),
    );

    // Context object itself is frozen — a plugin cannot bolt on new capabilities either.
    expect(Object.isFrozen(capturedContext)).toBe(true);
  });
});
