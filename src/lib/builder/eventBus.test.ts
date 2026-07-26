import { describe, expect, it, vi } from "vitest";

import { AddNodeCommand } from "@/lib/builder/commands/impl/addNode.command";
import { createDefaultDocument, createNodeFromDefaults } from "@/lib/builder/document/documentFactory";
import { BuilderKernel, BuilderUiState } from "@/lib/builder/kernel/builderKernel";
import { KernelEventBus } from "@/lib/builder/kernel/eventBus";

describe("eventBus", () => {
  it("broadcasts COMMAND_EXECUTED synchronously on dispatch", () => {
    const bus = new KernelEventBus();
    const kernel = new BuilderKernel(createDefaultDocument(), bus);
    const rootId = kernel.getDocument().tree.rootId;
    const child = createNodeFromDefaults("Button", "CTA", rootId, {
      props: { label: "Go" },
    });

    const received: unknown[] = [];
    const unsubscribe = bus.subscribe("COMMAND_EXECUTED", (event) => {
      received.push(event.payload);
    });

    kernel.dispatch(new AddNodeCommand({ parentId: rootId, node: child }));
    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      command: { type: "ADD_NODE" },
      mutatedNodeIds: expect.arrayContaining([child.id, rootId]),
    });

    unsubscribe();
    kernel.dispatch(
      new AddNodeCommand({
        parentId: rootId,
        node: createNodeFromDefaults("Text", "Extra", rootId),
      }),
    );
    expect(received).toHaveLength(1);
  });

  it("keeps selection UI state outside document history", () => {
    const bus = new KernelEventBus();
    const kernel = new BuilderKernel(createDefaultDocument(), bus);
    const ui = new BuilderUiState(bus);
    const onSelect = vi.fn();
    bus.subscribe("SELECTION_CHANGED", onSelect);

    const rootId = kernel.getDocument().tree.rootId;
    ui.setSelectedNodes([rootId]);

    expect(ui.getSelectedNodeIds()).toEqual([rootId]);
    expect(onSelect).toHaveBeenCalledOnce();
    expect(kernel.getHistory().canUndo()).toBe(false);
  });
});
