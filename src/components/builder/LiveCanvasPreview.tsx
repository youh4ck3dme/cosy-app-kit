import React from "react";
import { CanvasSandboxManager } from "@/lib/builder/sandbox/canvasSandbox";
import type { SandboxRPCMessage } from "@/lib/builder/semantic-intent/types";

interface LiveCanvasPreviewProps {
  code: string;
  css?: string;
  isMobileViewport?: boolean;
  selectedNodeId?: string | null;
  onNodeSelected?: (nodeId: string) => void;
}

export const LiveCanvasPreview: React.FC<LiveCanvasPreviewProps> = ({
  code,
  css,
  isMobileViewport = true,
  selectedNodeId = null,
  onNodeSelected,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const managerRef = React.useRef<CanvasSandboxManager | null>(null);
  const [status, setStatus] = React.useState<
    "ready" | "rendering" | "success" | "error" | "timeout"
  >("ready");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const onNodeSelectedRef = React.useRef(onNodeSelected);
  onNodeSelectedRef.current = onNodeSelected;

  const handleMessage = React.useCallback((msg: SandboxRPCMessage) => {
    if (msg.type === "SANDBOX_READY") {
      setStatus("ready");
    } else if (msg.type === "RENDER_SUCCESS") {
      setStatus("success");
      setErrorMessage(null);
    } else if (msg.type === "RUNTIME_ERROR") {
      setStatus("error");
      setErrorMessage(msg.error.message);
    } else if (msg.type === "EXECUTION_TIMEOUT") {
      setStatus("timeout");
      setErrorMessage(`Execution timed out after ${msg.timeoutMs}ms.`);
    } else if (msg.type === "NODE_SELECTED") {
      onNodeSelectedRef.current?.(msg.nodeId);
    }
  }, []);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const manager = new CanvasSandboxManager(containerRef.current, handleMessage);
    manager.mount();
    managerRef.current = manager;

    return () => {
      manager.destroy();
      managerRef.current = null;
    };
  }, [handleMessage]);

  React.useEffect(() => {
    if (managerRef.current && code) {
      setStatus("rendering");
      managerRef.current.render(code, css);
    }
  }, [code, css]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/80 rounded-2xl border border-slate-800/60 overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Sandbox Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-xs font-mono text-slate-400 ml-2">Live Sandbox</span>
        </div>

        <div className="flex items-center gap-2">
          {selectedNodeId && (
            <span
              className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 max-w-36 truncate"
              title={selectedNodeId}
            >
              sel: {selectedNodeId}
            </span>
          )}
          {status === "rendering" && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Rendering
            </span>
          )}
          {status === "success" && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live
            </span>
          )}
          {(status === "error" || status === "timeout") && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Error
            </span>
          )}
          <span className="text-xs font-mono text-slate-500">
            {isMobileViewport ? "412 × 915" : "Responsive"}
          </span>
        </div>
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs font-mono">
          🚨 {errorMessage}
        </div>
      )}

      {/* Viewport Frame */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div
          className={`transition-all duration-300 relative bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800 ${
            isMobileViewport ? "w-103 h-180 max-h-full" : "w-full h-full"
          }`}
        >
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};
