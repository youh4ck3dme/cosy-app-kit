import { z } from "zod";

import type { BuilderDocument, BuilderNode } from "./document.types";
import { DOCUMENT_SCHEMA_VERSION } from "./document.types";
import { assertValidDocument, validateDocument } from "./documentInvariants";

const SpacingBoxSchema = z.object({
  top: z.string(),
  right: z.string(),
  bottom: z.string(),
  left: z.string(),
});

export const LayoutSystemSchema = z.object({
  display: z.enum(["flex", "grid", "block", "none"]),
  flexDirection: z.enum(["row", "column", "row-reverse", "column-reverse"]).optional(),
  justifyContent: z
    .enum(["flex-start", "center", "flex-end", "space-between", "space-around"])
    .optional(),
  alignItems: z.enum(["flex-start", "center", "flex-end", "stretch"]).optional(),
  gap: z.string().optional(),
  padding: SpacingBoxSchema.optional(),
  margin: SpacingBoxSchema.optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  minWidth: z.string().optional(),
  maxWidth: z.string().optional(),
  minHeight: z.string().optional(),
  maxHeight: z.string().optional(),
});

export const StyleSystemSchema = z.object({
  backgroundColor: z.string().optional(),
  color: z.string().optional(),
  fontSize: z.string().optional(),
  fontWeight: z.union([z.string(), z.number()]).optional(),
  lineHeight: z.string().optional(),
  textAlign: z.enum(["left", "center", "right", "justify"]).optional(),
  borderRadius: z.string().optional(),
  borderWidth: z.string().optional(),
  borderColor: z.string().optional(),
  borderStyle: z.enum(["none", "solid", "dashed", "dotted"]).optional(),
  boxShadow: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  overflow: z.enum(["visible", "hidden", "scroll", "auto"]).optional(),
  customCss: z.string().optional(),
});

export const InteractionSystemSchema = z.object({
  events: z.array(
    z.object({
      trigger: z.enum(["onClick", "onHover", "onMouseEnter", "onFormSubmit"]),
      action: z.enum(["navigate", "openModal", "triggerAnimation", "customScript"]),
      payload: z.record(z.string(), z.unknown()),
    }),
  ),
});

export const AssetReferencesSchema = z.object({
  images: z.record(z.string(), z.string()).optional(),
  fonts: z.record(z.string(), z.string()).optional(),
  icons: z.record(z.string(), z.string()).optional(),
});

const ResponsiveOverridesSchema = z.object({
  layout: LayoutSystemSchema.partial().optional(),
  style: StyleSystemSchema.partial().optional(),
});

export const BuilderNodeSchema: z.ZodType<BuilderNode> = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().nullable(),
  children: z.array(z.string()),
  props: z.record(z.string(), z.unknown()),
  layout: LayoutSystemSchema,
  style: StyleSystemSchema,
  interactions: InteractionSystemSchema,
  assets: AssetReferencesSchema,
  responsive: z.object({
    desktop: ResponsiveOverridesSchema,
    tablet: ResponsiveOverridesSchema,
    mobile: ResponsiveOverridesSchema,
  }),
  locked: z.boolean(),
  hidden: z.boolean(),
  metadata: z.object({
    createdAt: z.number(),
    updatedAt: z.number(),
    version: z.number(),
    sourceImport: z.enum(["vision", "html", "figma", "prompt", "manual"]).optional(),
  }),
});

export const BuilderDocumentSchema: z.ZodType<BuilderDocument> = z.object({
  metadata: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    version: z.number().int().nonnegative(),
    schemaVersion: z.number().int().positive(),
    createdAt: z.number(),
    updatedAt: z.number(),
    author: z.string(),
  }),
  tree: z.object({
    rootId: z.string().min(1),
    nodes: z.record(z.string(), BuilderNodeSchema),
  }),
  breakpoints: z.object({
    desktop: z.number().positive(),
    tablet: z.number().positive(),
    mobile: z.number().positive(),
  }),
  globalStyles: z.object({
    colors: z.record(z.string(), z.string()),
    typography: z.record(
      z.string(),
      z.object({
        fontFamily: z.string(),
        fontSize: z.string(),
      }),
    ),
  }),
});

export function parseBuilderDocument(input: unknown): BuilderDocument {
  const doc = BuilderDocumentSchema.parse(input);
  if (doc.metadata.schemaVersion !== DOCUMENT_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported document schemaVersion ${doc.metadata.schemaVersion}; expected ${DOCUMENT_SCHEMA_VERSION}`,
    );
  }
  if (!doc.tree.nodes[doc.tree.rootId]) {
    throw new Error(`Document rootId ${doc.tree.rootId} is missing from node graph`);
  }
  assertValidDocument(doc);
  return doc;
}

export function safeParseBuilderDocument(input: unknown) {
  const parsed = BuilderDocumentSchema.safeParse(input);
  if (!parsed.success) return parsed;
  if (parsed.data.metadata.schemaVersion !== DOCUMENT_SCHEMA_VERSION) {
    return {
      success: false as const,
      error: {
        issues: [
          {
            code: "custom" as const,
            path: ["metadata", "schemaVersion"],
            message: `Unsupported schemaVersion ${parsed.data.metadata.schemaVersion}`,
          },
        ],
      },
    };
  }

  const integrity = validateDocument(parsed.data);
  if (!integrity.ok) {
    return {
      success: false as const,
      error: {
        issues: integrity.issues.map((issue) => ({
          code: "custom" as const,
          path: issue.nodeId ? ["tree", "nodes", issue.nodeId] : ["tree"],
          message: `${issue.code}: ${issue.message}`,
        })),
      },
    };
  }

  return parsed;
}
