import type { BuilderDocument, BuilderNode, LayoutSystem, StyleSystem } from "./document.types";
import { DOCUMENT_SCHEMA_VERSION } from "./document.types";

function now(): number {
  return Date.now();
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createEmptyLayout(display: LayoutSystem["display"] = "flex"): LayoutSystem {
  return {
    display,
    flexDirection: "column",
    gap: "0px",
  };
}

export function createEmptyStyle(): StyleSystem {
  return {};
}

export function createContainerNode(
  overrides?: Partial<BuilderNode> & Pick<BuilderNode, "id" | "name">,
): BuilderNode {
  const timestamp = now();
  return {
    id: overrides?.id ?? createId("node"),
    type: "Container",
    name: overrides?.name ?? "Root",
    parentId: overrides?.parentId ?? null,
    children: overrides?.children ?? [],
    props: overrides?.props ?? {},
    layout: overrides?.layout ?? createEmptyLayout("flex"),
    style: overrides?.style ?? createEmptyStyle(),
    interactions: overrides?.interactions ?? { events: [] },
    assets: overrides?.assets ?? {},
    responsive: overrides?.responsive ?? { desktop: {}, tablet: {}, mobile: {} },
    locked: overrides?.locked ?? false,
    hidden: overrides?.hidden ?? false,
    metadata: overrides?.metadata ?? {
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
      sourceImport: "manual",
    },
  };
}

export interface CreateDocumentOptions {
  title?: string;
  author?: string;
  id?: string;
}

/** Creates a blank valid document with a single root Container node. */
export function createDefaultDocument(options: CreateDocumentOptions = {}): BuilderDocument {
  const timestamp = now();
  const root = createContainerNode({
    id: createId("root"),
    name: "Page",
  });

  return {
    metadata: {
      id: options.id ?? createId("doc"),
      title: options.title ?? "Untitled",
      version: 1,
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      createdAt: timestamp,
      updatedAt: timestamp,
      author: options.author ?? "system",
    },
    tree: {
      rootId: root.id,
      nodes: {
        [root.id]: root,
      },
    },
    breakpoints: {
      desktop: 1280,
      tablet: 768,
      mobile: 390,
    },
    globalStyles: {
      colors: {
        background: "#0f1419",
        foreground: "#e8edf2",
        accent: "#6366f1",
      },
      typography: {
        body: { fontFamily: "Inter Variable, sans-serif", fontSize: "16px" },
        heading: { fontFamily: "Inter Variable, sans-serif", fontSize: "32px" },
      },
    },
  };
}

export function createNodeFromDefaults(
  type: string,
  name: string,
  parentId: string | null,
  extras?: Partial<BuilderNode>,
): BuilderNode {
  const timestamp = now();
  return {
    id: extras?.id ?? createId("node"),
    type,
    name,
    parentId,
    children: extras?.children ?? [],
    props: extras?.props ?? {},
    layout: extras?.layout ?? createEmptyLayout("flex"),
    style: extras?.style ?? createEmptyStyle(),
    interactions: extras?.interactions ?? { events: [] },
    assets: extras?.assets ?? {},
    responsive: extras?.responsive ?? { desktop: {}, tablet: {}, mobile: {} },
    locked: extras?.locked ?? false,
    hidden: extras?.hidden ?? false,
    metadata: extras?.metadata ?? {
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
      sourceImport: extras?.metadata?.sourceImport ?? "manual",
    },
  };
}
