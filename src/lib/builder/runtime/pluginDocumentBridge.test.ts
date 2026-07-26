import { describe, expect, it } from "vitest";

import type { PluginContext } from "@/lib/plugin-sdk";
import { AddNodeCommand } from "../commands/impl/addNode.command";
import { createNodeFromDefaults } from "../document/documentFactory";
import { createBuilderRuntime } from "./builderRuntime";
import {
  createDevPluginSdkHost,
  createReadonlyPluginDocumentSource,
} from "./pluginDocumentBridge";

describe("Runtime Plugin documentSource bridge (ADR-0005 Slice C)", () => {
  it("createReadonlyPluginDocumentSource reads a frozen document via Runtime", () => {
    const runtime = createBuilderRuntime();
    const source = createReadonlyPluginDocumentSource(runtime);
    const viaSource = source.read() as ReturnType<typeof runtime.getReadonlyDocument>;
    const viaRuntime = runtime.getReadonlyDocument();

    expect(viaSource.tree.rootId).toBe(viaRuntime.tree.rootId);
    expect(() => {
      (viaSource.tree.nodes[viaSource.tree.rootId] as { name?: string }).name = "hack";
    }).toThrow();

    runtime.dispose();
  });

  it("documentSource.read() throws after Runtime dispose()", () => {
    const runtime = createBuilderRuntime();
    const source = createReadonlyPluginDocumentSource(runtime);
    runtime.dispose();
    expect(() => source.read()).toThrow(/disposed/i);
  });

  it("createDevPluginSdkHost requires enablePluginDocumentSource: true", () => {
    const runtime = createBuilderRuntime();
    expect(() =>
      createDevPluginSdkHost({
        runtime,
        // @ts-expect-error — flag must be literal true
        enablePluginDocumentSource: false,
      }),
    ).toThrow(/enablePluginDocumentSource/i);
    runtime.dispose();
  });

  it("createDevPluginSdkHost wires document.read but never canvasSource", async () => {
    const runtime = createBuilderRuntime();
    const rootId = runtime.getReadonlyDocument().tree.rootId;
    const node = createNodeFromDefaults("Text", "Bridge", rootId, {
      props: { text: "from-runtime" },
    });
    expect(runtime.dispatch(new AddNodeCommand({ parentId: rootId, node })).success).toBe(true);

    const host = createDevPluginSdkHost({
      runtime,
      enablePluginDocumentSource: true,
    });

    let ctx: PluginContext | undefined;
    host.register(
      {
        name: "runtime-reader",
        version: "1.0.0",
        permissions: ["document.read", "canvas.read", "document.write"],
      },
      {
        onInstall: (c) => {
          ctx = c;
        },
      },
    );
    await host.install("runtime-reader");

    expect(ctx?.hasPermission("document.read")).toBe(true);
    expect(ctx?.hasPermission("document.write")).toBe(true);
    // Write is declared on the manifest but SDK context exposes no write API —
    // only permission check + readDocument/readCanvas.
    expect(typeof ctx?.readDocument).toBe("function");
    expect((ctx as { writeDocument?: unknown }).writeDocument).toBeUndefined();

    const doc = ctx?.readDocument() as ReturnType<typeof runtime.getReadonlyDocument>;
    expect(
      Object.values(doc.tree.nodes).some((n) => n.props.text === "from-runtime"),
    ).toBe(true);

    // Host never passes canvasSource — even with canvas.read granted.
    expect(ctx?.readCanvas()).toBeUndefined();

    runtime.dispose();
  });

  it("createDevPluginSdkHost refuses a disposed Runtime", () => {
    const runtime = createBuilderRuntime();
    runtime.dispose();
    expect(() =>
      createDevPluginSdkHost({ runtime, enablePluginDocumentSource: true }),
    ).toThrow(/disposed/i);
  });
});
