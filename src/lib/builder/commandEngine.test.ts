import { describe, expect, it } from "vitest";

import { AddNodeCommand } from "@/lib/builder/commands/impl/addNode.command";
import { RemoveNodeCommand } from "@/lib/builder/commands/impl/removeNode.command";
import { UpdatePropertyCommand } from "@/lib/builder/commands/impl/updateProperty.command";
import { createDefaultDocument, createNodeFromDefaults } from "@/lib/builder/document/documentFactory";
import { BuilderKernel } from "@/lib/builder/kernel/builderKernel";

describe("commandEngine", () => {
  it("executes AddNodeCommand, serializes, and restores on undo", () => {
    const kernel = new BuilderKernel(createDefaultDocument());
    const rootId = kernel.getDocument().tree.rootId;
    const child = createNodeFromDefaults("Text", "Headline", rootId, {
      props: { text: "Hello" },
    });

    const command = new AddNodeCommand({ parentId: rootId, node: child });
    const result = kernel.dispatch(command);

    expect(result.success).toBe(true);
    expect(kernel.getDocument().tree.nodes[child.id]?.props.text).toBe("Hello");
    expect(kernel.getDocument().tree.nodes[rootId]?.children).toContain(child.id);
    expect(kernel.getHistory().canUndo()).toBe(true);

    const serialized = command.serialize();
    expect(serialized.type).toBe("ADD_NODE");
    expect(JSON.parse(JSON.stringify(serialized)).payload.node.id).toBe(child.id);

    const undo = kernel.undo();
    expect(undo.success).toBe(true);
    expect(kernel.getDocument().tree.nodes[child.id]).toBeUndefined();
    expect(kernel.getDocument().tree.nodes[rootId]?.children).not.toContain(child.id);

    const redo = kernel.redo();
    expect(redo.success).toBe(true);
    expect(kernel.getDocument().tree.nodes[child.id]?.props.text).toBe("Hello");
  });

  it("updates properties via dot-notation and undoes them", () => {
    const kernel = new BuilderKernel(createDefaultDocument());
    const rootId = kernel.getDocument().tree.rootId;
    const child = createNodeFromDefaults("Text", "Body", rootId, {
      props: { text: "Before" },
    });
    kernel.dispatch(new AddNodeCommand({ parentId: rootId, node: child }));

    const update = new UpdatePropertyCommand({
      nodeId: child.id,
      path: "props.text",
      value: "After",
    });
    expect(kernel.dispatch(update).success).toBe(true);
    expect(kernel.getDocument().tree.nodes[child.id]?.props.text).toBe("After");

    expect(kernel.undo().success).toBe(true);
    expect(kernel.getDocument().tree.nodes[child.id]?.props.text).toBe("Before");
  });

  it("recursively removes a node subtree", () => {
    const kernel = new BuilderKernel(createDefaultDocument());
    const rootId = kernel.getDocument().tree.rootId;
    const section = createNodeFromDefaults("Section", "Hero", rootId);
    const title = createNodeFromDefaults("Text", "Title", section.id, {
      props: { text: "Build" },
    });

    kernel.dispatch(new AddNodeCommand({ parentId: rootId, node: section }));
    // Parent for title must already exist; mutate section children via add under section.
    kernel.dispatch(new AddNodeCommand({ parentId: section.id, node: title }));

    expect(kernel.dispatch(new RemoveNodeCommand({ nodeId: section.id })).success).toBe(true);
    expect(kernel.getDocument().tree.nodes[section.id]).toBeUndefined();
    expect(kernel.getDocument().tree.nodes[title.id]).toBeUndefined();
    expect(kernel.getDocument().tree.nodes[rootId]?.children).not.toContain(section.id);
  });

  it("refuses to remove the root node", () => {
    const kernel = new BuilderKernel(createDefaultDocument());
    const rootId = kernel.getDocument().tree.rootId;
    const result = kernel.dispatch(new RemoveNodeCommand({ nodeId: rootId }));
    expect(result.success).toBe(false);
  });
});
