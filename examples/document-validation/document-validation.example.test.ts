/**
 * Example: document invariant validation.
 * Run: bun run test:unit examples/document-validation/document-validation.example.test.ts
 */
import { describe, expect, it } from "vitest";

import {
  createDefaultDocument,
  validateDocument,
} from "../../src/lib/builder";

describe("example: document-validation", () => {
  it("accepts a factory default document", () => {
    const result = validateDocument(createDefaultDocument());
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("flags a missing root", () => {
    const doc = createDefaultDocument();
    const rootId = doc.tree.rootId;
    delete doc.tree.nodes[rootId];
    const result = validateDocument(doc);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "ROOT_MISSING")).toBe(true);
  });
});
