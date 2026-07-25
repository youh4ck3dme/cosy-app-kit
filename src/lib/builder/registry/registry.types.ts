import type { LayoutSystem, StyleSystem } from "../document/document.types";
import type { BuilderNode } from "../document/document.types";

/** Renderer capability flags — no React types in the core registry (v1.1.1). */
export interface RendererCapabilities {
  canvas: boolean;
  react: boolean;
  html: boolean;
  pdf?: boolean;
}

export type PropertyWidget =
  | "text-input"
  | "number-input"
  | "color-picker"
  | "select"
  | "slider"
  | "switch";

export interface PropertyControlSchema {
  name: string;
  label: string;
  widget: PropertyWidget;
  defaultValue: unknown;
  options?: { label: string; value: unknown }[];
}

export interface NodeConstraints {
  canHaveChildren: boolean;
  allowedParents?: string[];
  allowedChildren?: string[];
  maxChildren?: number;
}

export type NodeCategory =
  | "Layout"
  | "Basic"
  | "Forms"
  | "Media"
  | "E-commerce"
  | "Advanced";

/**
 * Headless node definition.
 * `canvasRendererId` / `codeGeneratorId` are string keys resolved by UI/compiler layers,
 * keeping the core free of React component types.
 */
export interface NodeDefinition<TProps = Record<string, unknown>> {
  type: string;
  displayName: string;
  category: NodeCategory;
  icon: string;
  capabilities: RendererCapabilities;
  constraints: NodeConstraints;
  defaultProps: TProps;
  defaultLayout: Partial<LayoutSystem>;
  defaultStyle: Partial<StyleSystem>;
  propertyControls: PropertyControlSchema[];
  canvasRendererId: string;
  codeGeneratorId: string;
  /** Optional pure code emitter used by headless HTML/React compilers. */
  generateCode?: (node: BuilderNode<TProps>, childOutputs: string[]) => string;
}
