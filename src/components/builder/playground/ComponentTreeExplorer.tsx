import * as React from "react";
import type { RawNode } from "@/lib/builder/semantic-intent/types";
import { Box, Type, MousePointer, TextCursorInput, List, Layers, Trash2 } from "lucide-react";

export interface ComponentTreeExplorerProps {
  nodes: RawNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
}

function getNodeIcon(type?: string) {
  switch (type?.toLowerCase()) {
    case "text":
    case "label":
    case "heading":
      return <Type className="w-3.5 h-3.5 text-sky-400" />;
    case "button":
      return <MousePointer className="w-3.5 h-3.5 text-indigo-400" />;
    case "input":
    case "textarea":
    case "select":
      return <TextCursorInput className="w-3.5 h-3.5 text-emerald-400" />;
    case "list":
    case "ul":
    case "ol":
      return <List className="w-3.5 h-3.5 text-amber-400" />;
    case "box":
    case "container":
    case "div":
    default:
      return <Box className="w-3.5 h-3.5 text-purple-400" />;
  }
}

interface TreeNodeItemProps {
  node: RawNode;
  depth: number;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({
  node,
  depth,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
}) => {
  const isSelected = selectedNodeId === node.id;

  return (
    <div className="space-y-1">
      <div
        data-testid={`tree-node-${node.id}`}
        onClick={() => onSelectNode(node.id)}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs font-mono cursor-pointer transition-all ${
          isSelected
            ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30 font-semibold"
            : "hover:bg-surface/80 text-foreground/80 hover:text-foreground"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {getNodeIcon(node.type)}
          <span className="truncate">{node.id}</span>
          {node.type && (
            <span className="text-[10px] text-muted-foreground uppercase opacity-70">
              ({node.type})
            </span>
          )}
        </div>

        {onDeleteNode && (
          <button
            type="button"
            data-testid={`delete-node-${node.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-400 transition-opacity"
            title="Delete node"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {node.children && node.children.length > 0 && (
        <div className="space-y-0.5 border-l border-border/20 ml-3">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              onDeleteNode={onDeleteNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ComponentTreeExplorer: React.FC<ComponentTreeExplorerProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
}) => {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-xs font-mono rounded-xl border border-border-subtle bg-surface/50">
        Žiadne AST uzly
      </div>
    );
  }

  return (
    <div
      data-testid="component-tree-explorer"
      className="p-4 rounded-xl border border-border-subtle bg-surface/80 space-y-3"
    >
      <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-accent-primary" />
          <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
            Component Tree
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border-subtle text-muted-foreground">
          {nodes.length} root(s)
        </span>
      </div>

      <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
        {nodes.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            onDeleteNode={onDeleteNode}
          />
        ))}
      </div>
    </div>
  );
};
