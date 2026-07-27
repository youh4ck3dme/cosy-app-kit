import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { VisionUploader } from "@/components/builder/VisionUploader";
import { parseVisionImage } from "@/lib/builder/vision/mistralVisionModel.server";
import {
  SemanticIntentEngine,
  AISpatialContextEngine,
  runScopedEditPipeline,
} from "@/lib/builder/semantic-intent";
import type { EngineResult, RawNode } from "@/lib/builder/semantic-intent/types";
import { applyScopedNodeEdit } from "@/lib/builder/semantic-intent/scopedEdit.server";

import { ZipExporterEngine } from "@/lib/builder/export/zipExporter";
import { LiveCanvasPreview } from "@/components/builder/LiveCanvasPreview";
import { ComponentTreeExplorer } from "@/components/builder/playground/ComponentTreeExplorer";
import { VisualPropertyInspector } from "@/components/builder/playground/VisualPropertyInspector";
import { haptic } from "@/lib/haptics";

function findNodeById(nodes: RawNode[], nodeId: string): RawNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (node.children) {
      const found = findNodeById(node.children, nodeId);
      if (found) return found;
    }
  }
  return null;
}

function findAndUpdateNode(nodes: RawNode[], updated: RawNode): RawNode[] {
  return nodes.map((node) => {
    if (node.id === updated.id) {
      return updated;
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: findAndUpdateNode(node.children, updated),
      };
    }
    return node;
  });
}

function findAndDeleteNode(nodes: RawNode[], nodeId: string): RawNode[] {
  return nodes
    .filter((node) => node.id !== nodeId)
    .map((node) => {
      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: findAndDeleteNode(node.children, nodeId),
        };
      }
      return node;
    });
}

export const Route = createFileRoute("/_authenticated/builder")({
  component: BuilderWorkspacePage,
});

function BuilderWorkspacePage() {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [engineResult, setEngineResult] = React.useState<EngineResult | null>(null);
  const [currentAST, setCurrentAST] = React.useState<RawNode[] | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [sourceUsed, setSourceUsed] = React.useState<"mistral" | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [scopedPrompt, setScopedPrompt] = React.useState("");
  const [isScopedEditing, setIsScopedEditing] = React.useState(false);
  const [scopedEditSource, setScopedEditSource] = React.useState<"mistral" | null>(null);
  const [scopedEditError, setScopedEditError] = React.useState<string | null>(null);
  const [visionError, setVisionError] = React.useState<string | null>(null);

  const regenerateFromAST = React.useCallback((ast: RawNode[], componentName = "GeneratedForm") => {
    const engine = new SemanticIntentEngine();
    // autoFix runs inside generateCode; avoid double-fix side effects on stored AST
    // by storing the user-facing AST separately from emit-time transforms.
    const result = engine.generateCode(componentName, ast);
    setEngineResult(result);
    return result;
  }, []);

  const handleExportZip = React.useCallback(async () => {
    if (!engineResult) return;
    haptic(15);
    const exporter = new ZipExporterEngine();
    const blob = await exporter.generateZipArchive({
      componentName: engineResult.componentName,
      code: engineResult.code,
      framework: "vite",
    });
    exporter.downloadBlob(blob, `${engineResult.componentName.toLowerCase()}-project.zip`);
  }, [engineResult]);

  const handleImageProcess = React.useCallback(
    async (base64: string) => {
      setIsProcessing(true);
      setImagePreview(base64);
      setSelectedNodeId(null);
      setScopedPrompt("");
      setScopedEditSource(null);
      setScopedEditError(null);
      setVisionError(null);
      setSourceUsed(null);
      setEngineResult(null);
      setCurrentAST(null);

      try {
        // Mistral Pixtral only — no mock/local AI
        const res = await parseVisionImage({ data: { imageBase64: base64 } });
        const { node: rawNodeTree } = res as {
          node: RawNode;
          source: "mistral";
        };
        setSourceUsed("mistral");

        // Store responsive-healed AST for subsequent scoped edits
        const spatial = new AISpatialContextEngine();
        const ast = spatial.autoFixMobileResponsive([rawNodeTree]);
        setCurrentAST(ast);
        regenerateFromAST(ast);
      } catch (error) {
        console.error("Failed to process image:", error);
        setVisionError(
          error instanceof Error ? error.message : "Mistral Vision failed. Set MISTRAL_API_KEY.",
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [regenerateFromAST],
  );

  const handleNodeSelected = React.useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setScopedEditError(null);
    haptic(8);
  }, []);

  const selectedNode = React.useMemo(() => {
    if (!currentAST || !selectedNodeId) return null;
    return findNodeById(currentAST, selectedNodeId);
  }, [currentAST, selectedNodeId]);

  const handleUpdateInspectorNode = React.useCallback(
    (updatedNode: RawNode) => {
      if (!currentAST) return;
      haptic(10);
      const newAST = findAndUpdateNode(currentAST, updatedNode);
      setCurrentAST(newAST);
      regenerateFromAST(newAST, engineResult?.componentName ?? "GeneratedForm");
    },
    [currentAST, regenerateFromAST, engineResult?.componentName],
  );

  const handleDeleteTreeNode = React.useCallback(
    (nodeId: string) => {
      if (!currentAST) return;
      haptic(15);
      const newAST = findAndDeleteNode(currentAST, nodeId);
      setCurrentAST(newAST);
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
      regenerateFromAST(newAST, engineResult?.componentName ?? "GeneratedForm");
    },
    [currentAST, selectedNodeId, regenerateFromAST, engineResult?.componentName],
  );

  const handleScopedEdit = React.useCallback(async () => {
    if (!currentAST || !selectedNodeId || !scopedPrompt.trim()) return;

    setIsScopedEditing(true);
    setScopedEditError(null);
    haptic(12);

    try {
      const pipeline = await runScopedEditPipeline({
        fullAST: currentAST,
        targetNodeId: selectedNodeId,
        userPrompt: scopedPrompt.trim(),
        source: "mistral",
        editNode: async (scoped, userPrompt) => {
          // Mistral only — no local / heuristic AI
          const res = await applyScopedNodeEdit({
            data: {
              targetNode: scoped.targetNode,
              minimalPromptContext: scoped.minimalPromptContext,
              userPrompt,
            },
          });
          setScopedEditSource(res.source);
          return res.node;
        },
      });

      if (!pipeline) {
        setScopedEditError(`Node "${selectedNodeId}" was not found in the current AST.`);
        return;
      }

      setCurrentAST(pipeline.updatedAST);
      regenerateFromAST(pipeline.updatedAST, engineResult?.componentName ?? "GeneratedForm");
      setScopedPrompt("");
    } catch (error) {
      console.error("Scoped edit failed:", error);
      setScopedEditSource(null);
      setScopedEditError(
        error instanceof Error
          ? error.message
          : "Mistral scoped edit failed. Check MISTRAL_API_KEY.",
      );
    } finally {
      setIsScopedEditing(false);
    }
  }, [currentAST, selectedNodeId, scopedPrompt, regenerateFromAST, engineResult?.componentName]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      {/* LEFT PANEL - Uploader, Tree Explorer & Vision Context */}
      <div className="w-full md:w-1/2 p-6 border-r border-border-subtle flex flex-col relative z-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Vision Builder Workspace</h1>
          <p className="text-muted-foreground text-sm">
            Upload a design screenshot. Select AST elements in tree explorer or canvas, edit
            properties or apply AI scoped edits.
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {!imagePreview ? (
            <VisionUploader onImageProcess={handleImageProcess} isProcessing={isProcessing} />
          ) : (
            <div className="relative w-full max-w-xl mx-auto rounded-xl overflow-hidden border border-border-subtle group">
              <img
                src={imagePreview}
                alt="Uploaded design"
                className="w-full h-auto object-cover opacity-80"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center flex-col gap-4">
                  <div className="w-12 h-12 rounded-full border-2 border-accent-primary border-t-transparent animate-spin" />
                  <p className="font-mono text-xs tracking-widest text-accent-primary animate-pulse uppercase">
                    Running Semantic Engine...
                  </p>
                </div>
              )}
              {!isProcessing && (
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setEngineResult(null);
                    setCurrentAST(null);
                    setSelectedNodeId(null);
                    setScopedPrompt("");
                    setScopedEditSource(null);
                    setVisionError(null);
                    setSourceUsed(null);
                  }}
                  className="absolute top-4 right-4 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-surface transition-colors opacity-0 group-hover:opacity-100"
                >
                  Clear & Restart
                </button>
              )}
            </div>
          )}
          {visionError && (
            <p className="mt-4 max-w-xl mx-auto text-xs font-mono text-rose-400 text-center">
              {visionError}
            </p>
          )}
        </div>

        {/* Tree Explorer */}
        {currentAST && (
          <ComponentTreeExplorer
            nodes={currentAST}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleNodeSelected}
            onDeleteNode={handleDeleteTreeNode}
          />
        )}

        {/* Scoped edit composer */}
        {engineResult && (
          <div className="mt-6 rounded-xl border border-border-subtle bg-surface/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Scoped AI Edit</h3>
              {selectedNodeId ? (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 truncate max-w-48">
                  {selectedNodeId}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Click an element in the live canvas
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={scopedPrompt}
                onChange={(e) => setScopedPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleScopedEdit();
                  }
                }}
                disabled={!selectedNodeId || isScopedEditing}
                placeholder={
                  selectedNodeId ? 'e.g. "Zmeň farbu na červenú"' : "Select a node first…"
                }
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent-primary/40 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void handleScopedEdit()}
                disabled={!selectedNodeId || !scopedPrompt.trim() || isScopedEditing}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary border border-accent-primary/30 disabled:opacity-40 transition-colors"
              >
                {isScopedEditing ? "Applying…" : "Apply"}
              </button>
            </div>
            {scopedEditSource && (
              <p className="text-[11px] text-muted-foreground">
                Last edit source:{" "}
                <span className="font-medium text-foreground">{scopedEditSource}</span>
                {" · "}delta re-applied, canvas re-rendered
              </p>
            )}
            {scopedEditError && (
              <p className="text-[11px] text-rose-400 font-mono">{scopedEditError}</p>
            )}
          </div>
        )}
      </div>

      {/* RIGHT PANEL - Engine Output (Smart Code) */}
      <div className="w-full md:w-1/2 flex flex-col bg-surface relative z-10">
        <div className="border-b border-border-subtle p-4 bg-background/50 backdrop-blur-sm">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Generated Smart Component
          </h2>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {engineResult ? (
            <div className="space-y-6 animate-in-fade">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Detected Intent & Model:</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-medium">
                    {engineResult.intent}
                  </span>
                  <span className="px-2.5 py-1 rounded-md border text-xs font-medium bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                    {sourceUsed === "mistral" ? "Mistral Pixtral Vision" : "Mistral API"}
                  </span>
                  <span className="text-xs text-muted-foreground">Confidence: 98%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">React Source Code:</h3>
                  <div className="relative group rounded-xl overflow-hidden border border-border-subtle bg-[#0a0a0a]">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border/10 bg-white/5">
                      <span className="text-xs font-mono text-muted-foreground">
                        GeneratedForm.tsx
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleExportZip}
                          className="text-xs px-2.5 py-1 rounded-md bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary border border-accent-primary/30 font-medium transition-all flex items-center gap-1.5"
                        >
                          Export Project (.zip)
                        </button>
                        <button className="text-xs text-accent-primary hover:text-accent-glow transition-colors">
                          Copy
                        </button>
                      </div>
                    </div>
                    <pre className="p-4 text-xs font-mono leading-relaxed text-foreground overflow-x-auto max-h-125">
                      <code>{engineResult.code}</code>
                    </pre>
                  </div>
                </div>

                <div className="space-y-2 h-140">
                  <h3 className="text-sm font-medium text-foreground">Live Interactive Canvas:</h3>
                  <LiveCanvasPreview
                    code={engineResult.code}
                    css={engineResult.css}
                    selectedNodeId={selectedNodeId}
                    onNodeSelected={handleNodeSelected}
                  />
                </div>
              </div>

              {/* Visual No-Code Property Inspector Panel */}
              <VisualPropertyInspector
                selectedNode={selectedNode}
                onUpdateNode={handleUpdateInspectorNode}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/50 space-y-4">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-border-subtle flex items-center justify-center">
                <span className="font-mono text-xl">&lt;/&gt;</span>
              </div>
              <p className="text-sm">Waiting for design input...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
