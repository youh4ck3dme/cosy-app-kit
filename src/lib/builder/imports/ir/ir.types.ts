/** Canonical Universal Design IR (Blueprint v1.1.1) with explicit versioning. */

export const IR_SCHEMA_VERSION = "1.0.0" as const;

export type IRNodeType = "container" | "text" | "image" | "button" | "input" | "group";

export type IRSourceType = "vision" | "figma" | "html" | "sketch" | "prompt";

export interface IRBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UniversalIRNode {
  id: string;
  type: IRNodeType;
  name: string;
  bounds?: IRBoundingBox;
  children: UniversalIRNode[];
  properties: {
    text?: string;
    src?: string;
    alt?: string;
    label?: string;
    placeholder?: string;
    href?: string;
  };
  styles: {
    backgroundColor?: string;
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    borderRadius?: string;
    padding?: string;
    flexDirection?: "row" | "column";
  };
  metadata: {
    confidence?: number;
    originalSourceId?: string;
  };
}

export interface UniversalDesignIR {
  /** Semver schema version for IR payloads. */
  version: typeof IR_SCHEMA_VERSION | string;
  sourceType: IRSourceType;
  root: UniversalIRNode;
}

export function assertSupportedIrVersion(version: string): void {
  if (version !== IR_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported Universal Design IR version "${version}"; expected "${IR_SCHEMA_VERSION}"`,
    );
  }
}
