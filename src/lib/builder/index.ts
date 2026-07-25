export type {
  AssetReferences,
  BreakpointName,
  BuilderDocument,
  BuilderNode,
  DocumentMetadata,
  InteractionEvent,
  InteractionSystem,
  LayoutSystem,
  NodeId,
  NodeMetadata,
  NodeTree,
  NodeType,
  ResponsiveOverrides,
  SourceImport,
  SpacingBox,
  StyleSystem,
} from "./document/document.types";
export { DOCUMENT_SCHEMA_VERSION } from "./document/document.types";

export {
  BuilderDocumentSchema,
  BuilderNodeSchema,
  LayoutSystemSchema,
  parseBuilderDocument,
  safeParseBuilderDocument,
} from "./document/documentValidator";

export {
  createContainerNode,
  createDefaultDocument,
  createEmptyLayout,
  createEmptyStyle,
  createNodeFromDefaults,
} from "./document/documentFactory";

export type {
  CommandFactory,
  CommandResult,
  ICommand,
  SerializedCommand,
} from "./commands/command.interface";

export { AddNodeCommand } from "./commands/impl/addNode.command";
export { RemoveNodeCommand } from "./commands/impl/removeNode.command";
export { UpdatePropertyCommand } from "./commands/impl/updateProperty.command";
export { MoveNodeCommand } from "./commands/impl/moveNode.command";
export { BatchCommand } from "./commands/impl/batch.command";
export {
  CommandRegistry,
  createDefaultCommandRegistry,
  globalCommandRegistry,
} from "./commands/commandManager";

export {
  createHistoryEntry,
  HistoryManager,
  type HistoryEntry,
} from "./history/historyManager";

export {
  KernelEventBus,
  globalEventBus,
  type KernelEvent,
  type KernelEventType,
} from "./kernel/eventBus";

export {
  BuilderKernel,
  BuilderUiState,
  createBuilderSession,
  type KernelDispatchResult,
} from "./kernel/builderKernel";

export {
  bootstrapBuilderKernel,
  type BootstrappedKernel,
  type KernelBootstrapOptions,
} from "./kernel/kernelFacade";

export type {
  NodeCategory,
  NodeConstraints,
  NodeDefinition,
  PropertyControlSchema,
  PropertyWidget,
  RendererCapabilities,
} from "./registry/registry.types";

export { NodeRegistry, globalNodeRegistry } from "./registry/nodeRegistry";
export { nativeNodeDefinitions } from "./registry/definitions/native";

export type { BuilderKernelFacade, BuilderPlugin } from "./plugins/plugin.types";
export { PluginRegistry } from "./plugins/pluginRegistry";

export {
  IR_SCHEMA_VERSION,
  assertSupportedIrVersion,
  type IRBoundingBox,
  type IRNodeType,
  type IRSourceType,
  type UniversalDesignIR,
  type UniversalIRNode,
} from "./imports/ir/ir.types";

export { IRToCommandCompiler } from "./imports/ir/irToCommandCompiler";

export {
  CANVAS_SANDBOX_ATTR,
  type CanvasRpcMessage,
  type CanvasRpcMessageType,
} from "./renderer/canvas/canvasRpc.types";

export {
  collectDescendantIds,
  getNode,
  walkNodeIds,
} from "./nodes/nodeGraph";
