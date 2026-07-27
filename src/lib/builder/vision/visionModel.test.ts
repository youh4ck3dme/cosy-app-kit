import { describe, expect, it } from "bun:test";
import { parseImageToRawNode } from "./mockVisionModel";
import { rawNodeSchema } from "./mistralVisionModel.server";

describe("Vision Model Schema & Fallback Tests", () => {
  it("validates AST RawNode tree against Zod schema", () => {
    const validRawNode = {
      id: "root-box",
      type: "box" as const,
      className: "flex flex-col gap-4 p-4",
      children: [
        {
          id: "heading-text",
          type: "text" as const,
          text: "Login Form",
        },
        {
          id: "email-input",
          type: "input" as const,
          inputType: "email" as const,
          name: "email",
        },
        {
          id: "submit-btn",
          type: "button" as const,
          action: "submit" as const,
          text: "Submit",
        },
      ],
    };

    const parsed = rawNodeSchema.safeParse(validRawNode);
    expect(parsed.success).toBe(true);
  });

  it("returns a valid RawNode AST structure from mock fallback parser", async () => {
    const mockImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const node = await parseImageToRawNode(mockImage);

    expect(node.id).toBe("root-container");
    expect(node.type).toBe("box");
    expect(node.children).toBeDefined();
    expect(node.children!.length).toBeGreaterThan(0);
  });
});
