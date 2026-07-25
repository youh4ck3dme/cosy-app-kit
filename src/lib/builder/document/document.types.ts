/** Headless Builder Kernel document model (Blueprint v1.1.1). */

export type NodeId = string;
export type NodeType = string;

export interface SpacingBox {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface LayoutSystem {
  display: "flex" | "grid" | "block" | "none";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  gap?: string;
  padding?: SpacingBox;
  margin?: SpacingBox;
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;
}

export interface StyleSystem {
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string | number;
  lineHeight?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  borderRadius?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  boxShadow?: string;
  opacity?: number;
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  customCss?: string;
}

export interface InteractionEvent {
  trigger: "onClick" | "onHover" | "onMouseEnter" | "onFormSubmit";
  action: "navigate" | "openModal" | "triggerAnimation" | "customScript";
  payload: Record<string, unknown>;
}

export interface InteractionSystem {
  events: InteractionEvent[];
}

export interface AssetReferences {
  images?: Record<string, string>;
  fonts?: Record<string, string>;
  icons?: Record<string, string>;
}

export type BreakpointName = "desktop" | "tablet" | "mobile";

export interface ResponsiveOverrides {
  layout?: Partial<LayoutSystem>;
  style?: Partial<StyleSystem>;
}

export type SourceImport = "vision" | "html" | "figma" | "prompt" | "manual";

export interface NodeMetadata {
  createdAt: number;
  updatedAt: number;
  version: number;
  sourceImport?: SourceImport;
}

export interface BuilderNode<TProps = Record<string, unknown>> {
  id: NodeId;
  type: NodeType;
  name: string;
  parentId: NodeId | null;
  children: NodeId[];
  props: TProps;
  layout: LayoutSystem;
  style: StyleSystem;
  interactions: InteractionSystem;
  assets: AssetReferences;
  responsive: Record<BreakpointName, ResponsiveOverrides>;
  locked: boolean;
  hidden: boolean;
  metadata: NodeMetadata;
}

export interface NodeTree {
  rootId: NodeId;
  nodes: Record<NodeId, BuilderNode>;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  version: number;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
  author: string;
}

export interface BuilderDocument {
  metadata: DocumentMetadata;
  tree: NodeTree;
  breakpoints: { desktop: number; tablet: number; mobile: number };
  globalStyles: {
    colors: Record<string, string>;
    typography: Record<string, { fontFamily: string; fontSize: string }>;
  };
}

/** Current document schema version for migration guards. */
export const DOCUMENT_SCHEMA_VERSION = 1;
