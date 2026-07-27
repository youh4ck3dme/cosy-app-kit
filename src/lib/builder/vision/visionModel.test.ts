import { describe, expect, it } from "vitest";
import { rawNodeSchema } from "./mistralVisionModel.server";
// Test-only AST fixture (never used by production server handlers)
import { parseImageToRawNode as sampleAstFixture } from "./mockVisionModel";

describe("Vision Model Schema (Mistral-only production path)", () => {
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

  it("sample AST fixture (tests only) produces a valid RawNode tree shape", async () => {
    const node = await sampleAstFixture("data:image/png;base64,unused");

    expect(node.id).toBe("root-container");
    expect(node.type).toBe("box");
    expect(node.children).toBeDefined();
    expect(node.children!.length).toBeGreaterThan(0);
    expect(rawNodeSchema.safeParse(node).success).toBe(true);
  });
});
