/**
 * Example: undo / redo after AddNodeCommand.
 * Run: bun run test:unit examples/undo-redo/undo-redo.example.test.ts
 */
import { describe, expect, it } from "vitest";

import {
  AddNodeCommand,
  BuilderKernel,
  createDefaultDocument,
  createNodeFromDefaults,
} from "../../src/lib/builder";

describe("example: undo-redo", () => {
  it("undoes and redoes an add", () => {
    const kernel = new BuilderKernel(createDefaultDocument());
    const rootId = kernel.getDocument().tree.rootId;
    const node = createNodeFromDefaults("Text", "T", rootId, {
      props: { text: "T" },
    });

    expect(
      kernel.dispatch(new AddNodeCommand({ parentId: rootId, node })).success,
    ).toBe(true);
    expect(kernel.undo().success).toBe(true);
    expect(kernel.getDocument().tree.nodes[node.id]).toBeUndefined();
    expect(kernel.redo().success).toBe(true);
    expect(kernel.getDocument().tree.nodes[node.id]?.props.text).toBe("T");
  });
});
