import type { BuilderNode } from "../../document/document.types";
import type { NodeDefinition } from "../registry.types";

export const containerDefinition: NodeDefinition = {
  type: "Container",
  displayName: "Container",
  category: "Layout",
  icon: "box",
  capabilities: { canvas: true, react: true, html: true },
  constraints: { canHaveChildren: true },
  defaultProps: {},
  defaultLayout: { display: "flex", flexDirection: "column", gap: "8px" },
  defaultStyle: {},
  propertyControls: [],
  canvasRendererId: "canvas.container",
  codeGeneratorId: "html.container",
  generateCode: (node: BuilderNode, childOutputs: string[]) =>
    `<div data-node-id="${node.id}" data-node-type="Container">${childOutputs.join("")}</div>`,
};

export const sectionDefinition: NodeDefinition = {
  type: "Section",
  displayName: "Section",
  category: "Layout",
  icon: "layout",
  capabilities: { canvas: true, react: true, html: true },
  constraints: { canHaveChildren: true },
  defaultProps: {},
  defaultLayout: { display: "flex", flexDirection: "column", gap: "16px" },
  defaultStyle: {},
  propertyControls: [],
  canvasRendererId: "canvas.section",
  codeGeneratorId: "html.section",
};

export const textDefinition: NodeDefinition<Record<string, unknown>> = {
  type: "Text",
  displayName: "Text",
  category: "Basic",
  icon: "type",
  capabilities: { canvas: true, react: true, html: true },
  constraints: { canHaveChildren: false },
  defaultProps: { text: "Text" },
  defaultLayout: { display: "block" },
  defaultStyle: { color: "#e8edf2", fontSize: "16px" },
  propertyControls: [
    { name: "text", label: "Text", widget: "text-input", defaultValue: "Text" },
  ],
  canvasRendererId: "canvas.text",
  codeGeneratorId: "html.text",
  generateCode: (node: BuilderNode) => {
    const text = String(node.props.text ?? "");
    return `<p data-node-id="${node.id}">${escapeHtml(text)}</p>`;
  },
};

export const buttonDefinition: NodeDefinition<Record<string, unknown>> = {
  type: "Button",
  displayName: "Button",
  category: "Basic",
  icon: "mouse-pointer-click",
  capabilities: { canvas: true, react: true, html: true },
  constraints: { canHaveChildren: false },
  defaultProps: { label: "Button", variant: "primary" },
  defaultLayout: { display: "block" },
  defaultStyle: {
    backgroundColor: "#6366f1",
    color: "#ffffff",
    borderRadius: "8px",
  },
  propertyControls: [
    { name: "label", label: "Label", widget: "text-input", defaultValue: "Button" },
    {
      name: "variant",
      label: "Variant",
      widget: "select",
      defaultValue: "primary",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
      ],
    },
  ],
  canvasRendererId: "canvas.button",
  codeGeneratorId: "html.button",
  generateCode: (node: BuilderNode) => {
    const label = String(node.props.label ?? "Button");
    return `<button data-node-id="${node.id}" type="button">${escapeHtml(label)}</button>`;
  },
};

export const imageDefinition: NodeDefinition<Record<string, unknown>> = {
  type: "Image",
  displayName: "Image",
  category: "Media",
  icon: "image",
  capabilities: { canvas: true, react: true, html: true },
  constraints: { canHaveChildren: false },
  defaultProps: { src: "", alt: "" },
  defaultLayout: { display: "block", width: "100%" },
  defaultStyle: {},
  propertyControls: [
    { name: "src", label: "Source", widget: "text-input", defaultValue: "" },
    { name: "alt", label: "Alt text", widget: "text-input", defaultValue: "" },
  ],
  canvasRendererId: "canvas.image",
  codeGeneratorId: "html.image",
  generateCode: (node: BuilderNode) => {
    const src = String(node.props.src ?? "");
    const alt = String(node.props.alt ?? "");
    return `<img data-node-id="${node.id}" src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />`;
  },
};

export const nativeNodeDefinitions: NodeDefinition[] = [
  containerDefinition,
  sectionDefinition,
  textDefinition,
  buttonDefinition,
  imageDefinition,
];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
