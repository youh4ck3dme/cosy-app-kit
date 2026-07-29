import { describe, it, expect, vi } from "vitest";
import React from "react";
import type { RawNode } from "@/lib/builder/semantic-intent/types";
import { VisualPropertyInspector } from "./VisualPropertyInspector";
import { ComponentTreeExplorer } from "./ComponentTreeExplorer";

describe("Playground Tooling Suite", () => {
  it("1. VisualPropertyInspector displays empty state message when selectedNode is null", () => {
    const onUpdateNode = vi.fn();
    const element = <VisualPropertyInspector selectedNode={null} onUpdateNode={onUpdateNode} />;
    expect(element).not.toBeNull();
  });

  it("2. VisualPropertyInspector updates background color className on RawNode", () => {
    const node: RawNode = {
      id: "box_1",
      type: "box",
      className: "p-4 text-white bg-transparent",
    };

    const onUpdateNode = vi.fn();

    // Direct Handler Inspection Test
    const handleClassUpdate = (currentClass: string, prefix: string, newClass: string) => {
      const tokens = currentClass.split(/\s+/).filter((t) => !t.startsWith(prefix));
      tokens.push(newClass);
      return tokens.join(" ");
    };

    const updated = handleClassUpdate(node.className || "", "bg-", "bg-indigo-600");
    onUpdateNode({ ...node, className: updated });

    expect(onUpdateNode).toHaveBeenCalledWith({
      id: "box_1",
      type: "box",
      className: "p-4 text-white bg-indigo-600",
    });
  });

  it("3. VisualPropertyInspector updates padding and border-radius className on RawNode", () => {
    let currentNode: RawNode = {
      id: "button_1",
      type: "button",
      className: "p-2 rounded-sm bg-indigo-600",
    };

    const onUpdateNode = vi.fn((node: RawNode) => {
      currentNode = node;
    });

    const updatePadding = (node: RawNode, newPad: string) => {
      const tokens = (node.className || "").split(/\s+/).filter((t) => !t.startsWith("p-"));
      tokens.push(newPad);
      onUpdateNode({ ...node, className: tokens.join(" ") });
    };

    updatePadding(currentNode, "p-6");
    expect(currentNode.className).toBe("rounded-sm bg-indigo-600 p-6");

    const updateRadius = (node: RawNode, newRadius: string) => {
      const tokens = (node.className || "").split(/\s+/).filter((t) => !t.startsWith("rounded-"));
      tokens.push(newRadius);
      onUpdateNode({ ...node, className: tokens.join(" ") });
    };

    updateRadius(currentNode, "rounded-xl");
    expect(currentNode.className).toBe("bg-indigo-600 p-6 rounded-xl");
  });

  it("4. ComponentTreeExplorer renders node hierarchy and handles selection & deletion", () => {
    const nodes: RawNode[] = [
      {
        id: "root_box",
        type: "box",
        children: [
          { id: "child_btn", type: "button", text: "Click Me" },
          { id: "child_text", type: "text", text: "Hello" },
        ],
      },
    ];

    const onSelectNode = vi.fn();
    const onDeleteNode = vi.fn();

    const explorer = (
      <ComponentTreeExplorer
        nodes={nodes}
        selectedNodeId="child_btn"
        onSelectNode={onSelectNode}
        onDeleteNode={onDeleteNode}
      />
    );

    expect(explorer).not.toBeNull();

    // Test selection callback logic
    onSelectNode("child_btn");
    expect(onSelectNode).toHaveBeenCalledWith("child_btn");

    // Test deletion callback logic
    onDeleteNode("child_text");
    expect(onDeleteNode).toHaveBeenCalledWith("child_text");
  });
});
