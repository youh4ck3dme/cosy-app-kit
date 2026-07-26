import { describe, expect, it } from "vitest";

import { bootstrapBuilderKernel } from "@/lib/builder/kernel/kernelFacade";
import { NodeRegistry } from "@/lib/builder/registry/nodeRegistry";
import type { BuilderPlugin } from "@/lib/builder/plugins/plugin.types";
import type { NodeDefinition } from "@/lib/builder/registry/registry.types";

describe("pluginEngine", () => {
  it("registers plugin nodes and emits PLUGIN_REGISTERED", () => {
    const nodeRegistry = new NodeRegistry();
    const session = bootstrapBuilderKernel({ nodeRegistry });
    const events: unknown[] = [];
    session.eventBus.subscribe("PLUGIN_REGISTERED", (event) => {
      events.push(event.payload);
    });

    const cardDefinition: NodeDefinition = {
      type: "Card",
      displayName: "Card",
      category: "Advanced",
      icon: "square",
      capabilities: { canvas: true, react: true, html: true },
      constraints: { canHaveChildren: true },
      defaultProps: {},
      defaultLayout: { display: "flex", flexDirection: "column" },
      defaultStyle: {},
      propertyControls: [],
      canvasRendererId: "canvas.card",
      codeGeneratorId: "html.card",
    };

    const plugin: BuilderPlugin = {
      id: "example.card",
      name: "Card Plugin",
      version: "1.0.0",
      nodes: [cardDefinition],
      register() {},
    };

    session.pluginRegistry.register(plugin);

    expect(session.nodeRegistry.get("Card")?.displayName).toBe("Card");
    expect(session.nodeRegistry.get("Container")).toBeDefined();
    expect(events).toEqual([{ pluginId: "example.card", name: "Card Plugin", version: "1.0.0" }]);
  });

  it("exposes renderer ids without React component types", () => {
    const session = bootstrapBuilderKernel({ nodeRegistry: new NodeRegistry() });
    const text = session.nodeRegistry.get("Text");
    expect(text?.canvasRendererId).toBe("canvas.text");
    expect(text?.codeGeneratorId).toBe("html.text");
    expect("canvasRenderer" in (text ?? {})).toBe(false);
  });

  it("allows native overwrite only with nodes.overwrite permission", () => {
    const session = bootstrapBuilderKernel({ nodeRegistry: new NodeRegistry() });
    session.pluginRegistry.register({
      id: "allowed",
      name: "allowed",
      version: "1.0.0",
      permissions: ["nodes.register", "nodes.overwrite"],
      nodes: [
        {
          type: "Container",
          displayName: "CustomContainer",
          category: "Layout",
          icon: "box",
          capabilities: { canvas: true, react: true, html: true },
          constraints: { canHaveChildren: true },
          defaultProps: {},
          defaultLayout: { display: "flex" },
          defaultStyle: {},
          propertyControls: [],
          canvasRendererId: "canvas.container",
          codeGeneratorId: "html.container",
        },
      ],
      register() {},
    });
    expect(session.nodeRegistry.get("Container")?.displayName).toBe("CustomContainer");
  });

  it("exposes only sealed registry views to plugins", () => {
    const session = bootstrapBuilderKernel({ nodeRegistry: new NodeRegistry() });
    let sawRegisterOnNode: unknown;
    let sawRegisterOnCmd: unknown;
    session.pluginRegistry.register({
      id: "inspect",
      name: "inspect",
      version: "1.0.0",
      register(kernel) {
        sawRegisterOnNode = (kernel.nodeRegistry as { register?: unknown }).register;
        sawRegisterOnCmd = (kernel.commandRegistry as { register?: unknown }).register;
        expect(kernel.nodeRegistry.has("Container")).toBe(true);
        expect(kernel.commandRegistry.has("ADD_NODE")).toBe(true);
      },
    });
    expect(sawRegisterOnNode).toBeUndefined();
    expect(sawRegisterOnCmd).toBeUndefined();
  });
});
