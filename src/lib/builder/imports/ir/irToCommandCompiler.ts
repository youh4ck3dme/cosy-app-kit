import { AddNodeCommand } from "../../commands/impl/addNode.command";
import type { ICommand } from "../../commands/command.interface";
import type { BuilderNode } from "../../document/document.types";
import { createEmptyLayout, createEmptyStyle } from "../../document/documentFactory";
import {
  assertSupportedIrVersion,
  type UniversalDesignIR,
  type UniversalIRNode,
  type IRSourceType,
} from "./ir.types";

function mapSourceImport(
  sourceType: IRSourceType,
): NonNullable<BuilderNode["metadata"]["sourceImport"]> {
  switch (sourceType) {
    case "vision":
      return "vision";
    case "html":
      return "html";
    case "figma":
      return "figma";
    case "prompt":
      return "prompt";
    default:
      return "manual";
  }
}

function mapIRTypeToNodeType(irType: UniversalIRNode["type"]): string {
  switch (irType) {
    case "container":
    case "group":
      return "Container";
    case "text":
      return "Text";
    case "button":
      return "Button";
    case "image":
      return "Image";
    case "input":
      return "Text";
    default:
      return "Container";
  }
}

function buildProps(irNode: UniversalIRNode): Record<string, unknown> {
  const props: Record<string, unknown> = { ...irNode.properties };
  if (irNode.type === "button" && irNode.properties.label == null && irNode.properties.text) {
    props.label = irNode.properties.text;
  }
  if (irNode.type === "text" && irNode.properties.text == null && irNode.properties.label) {
    props.text = irNode.properties.label;
  }
  return props;
}

export class IRToCommandCompiler {
  compile(ir: UniversalDesignIR, targetParentId: string): ICommand[] {
    assertSupportedIrVersion(ir.version);
    const commands: ICommand[] = [];
    this.traverseNode(ir, ir.root, targetParentId, commands);
    return commands;
  }

  private traverseNode(
    ir: UniversalDesignIR,
    irNode: UniversalIRNode,
    parentId: string,
    commands: ICommand[],
  ): void {
    const timestamp = Date.now();
    const nodeId = irNode.id || crypto.randomUUID();

    const padding = irNode.styles.padding;
    const node: BuilderNode = {
      id: nodeId,
      type: this.mapType(irNode.type),
      name: irNode.name || irNode.type,
      parentId,
      children: [],
      props: buildProps(irNode),
      layout: {
        ...createEmptyLayout("flex"),
        flexDirection: irNode.styles.flexDirection || "column",
        padding: padding
          ? { top: padding, right: padding, bottom: padding, left: padding }
          : undefined,
      },
      style: {
        ...createEmptyStyle(),
        backgroundColor: irNode.styles.backgroundColor,
        color: irNode.styles.color,
        fontSize: irNode.styles.fontSize,
        fontWeight: irNode.styles.fontWeight,
        borderRadius: irNode.styles.borderRadius,
      },
      interactions: { events: [] },
      assets: {},
      responsive: { desktop: {}, tablet: {}, mobile: {} },
      locked: false,
      hidden: false,
      metadata: {
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 1,
        sourceImport: mapSourceImport(ir.sourceType),
      },
    };

    commands.push(new AddNodeCommand({ parentId, node }));

    for (const child of irNode.children) {
      this.traverseNode(ir, child, nodeId, commands);
    }
  }

  private mapType(irType: UniversalIRNode["type"]): string {
    return mapIRTypeToNodeType(irType);
  }
}
