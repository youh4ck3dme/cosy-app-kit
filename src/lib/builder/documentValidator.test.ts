import { describe, expect, it } from "vitest";

import { createDefaultDocument } from "@/lib/builder/document/documentFactory";
import {
  BuilderDocumentSchema,
  parseBuilderDocument,
  safeParseBuilderDocument,
} from "@/lib/builder/document/documentValidator";
import { DOCUMENT_SCHEMA_VERSION } from "@/lib/builder/document/document.types";

describe("documentValidator", () => {
  it("accepts a factory-created default document", () => {
    const doc = createDefaultDocument({ title: "Kernel Demo", author: "test" });
    const parsed = BuilderDocumentSchema.parse(doc);
    expect(parsed.metadata.schemaVersion).toBe(DOCUMENT_SCHEMA_VERSION);
    expect(parsed.tree.nodes[parsed.tree.rootId]?.type).toBe("Container");
  });

  it("rejects documents missing structural node fields", () => {
    const doc = createDefaultDocument();
    const rootId = doc.tree.rootId;
    const broken = {
      ...doc,
      tree: {
        rootId,
        nodes: {
          [rootId]: {
            id: rootId,
            // missing type/name/children/etc.
          },
        },
      },
    };

    const result = safeParseBuilderDocument(broken);
    expect(result.success).toBe(false);
  });

  it("rejects unsupported schemaVersion", () => {
    const doc = createDefaultDocument();
    doc.metadata.schemaVersion = 999;
    expect(() => parseBuilderDocument(doc)).toThrow(/schemaVersion/);
  });
});
