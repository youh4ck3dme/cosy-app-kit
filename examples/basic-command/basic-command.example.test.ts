/**
 * Example: basic command dispatch against BuilderKernel.
 * Run: bun run test:unit examples/basic-command/basic-command.example.test.ts
 */
import { describe, expect, it } from "vitest";

import {
  AddNodeCommand,
  BuilderKernel,
  createDefaultDocument,
  createNodeFromDefaults,
} from "../../src/lib/builder";

describe("example: basic-command", () => {
  it("adds a text node under root", () => {
    const kernel = new BuilderKernel(createDefaultDocument());
    const rootId = kernel.getDocument().tree.rootId;
    const node = createNodeFromDefaults("Text", "Hello", rootId, {
      props: { text: "Hello" },
    });

    const result = kernel.dispatch(
      new AddNodeCommand({ parentId: rootId, node }),
    );

    expect(result.success).toBe(true);
    expect(kernel.getDocument().tree.nodes[node.id]?.props.text).toBe("Hello");
  });
});
