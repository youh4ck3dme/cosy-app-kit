import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import {
  BuilderPlaygroundController,
  createBuilderPlayground,
  type PlaygroundSnapshot,
} from "@/lib/builder/playground/playgroundController";
import { cn } from "@/lib/utils";

function usePlayground(controller: BuilderPlaygroundController): PlaygroundSnapshot {
  return useSyncExternalStore(
    (onStoreChange) => controller.subscribe(onStoreChange),
    () => controller.getSnapshot(),
    () => controller.getSnapshot(),
  );
}

function JsonBlock({ value, className }: { value: unknown; className?: string }) {
  return (
    <pre
      className={cn(
        "max-h-72 overflow-auto rounded-lg border border-border-subtle bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground",
        className,
      )}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-xl border border-border-subtle bg-card/40 backdrop-blur-sm",
        className,
      )}
    >
      <header className="border-b border-border-subtle px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  );
}

export function BuilderKernelPlayground() {
  const controller = useMemo(() => createBuilderPlayground(), []);
  useEffect(() => () => controller.dispose(), [controller]);
  const snap = usePlayground(controller);

  const [textInput, setTextInput] = useState("Hello from playground");
  const [propPath, setPropPath] = useState("props.text");
  const [propValue, setPropValue] = useState("Updated");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");

  const nodeIds = Object.keys(snap.document.tree.nodes);
  const activeNodeId = selectedNodeId || snap.document.tree.rootId;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-border-subtle bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80 disabled:opacity-40"
          disabled={!snap.canUndo}
          onClick={() => controller.undo()}
        >
          Undo
        </button>
        <button
          type="button"
          className="rounded-md border border-border-subtle bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80 disabled:opacity-40"
          disabled={!snap.canRedo}
          onClick={() => controller.redo()}
        >
          Redo
        </button>
        <button
          type="button"
          className="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => controller.clearEvents()}
        >
          Clear events
        </button>
        <button
          type="button"
          className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          onClick={() => {
            controller.resetDocument();
            setSelectedNodeId("");
          }}
        >
          Reset document
        </button>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          version {snap.version}
        </span>
      </div>

      <div className="grid flex-1 gap-3 lg:grid-cols-12">
        <Panel title="Document viewer" className="lg:col-span-4">
          <p className="mb-2 text-xs text-muted-foreground">
            Root: <code className="text-foreground">{snap.document.tree.rootId}</code>
          </p>
          <ul className="space-y-1">
            {nodeIds.map((id) => {
              const node = snap.document.tree.nodes[id]!;
              const selected = id === activeNodeId;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setSelectedNodeId(id)}
                    className={cn(
                      "w-full rounded-md border px-2 py-1.5 text-left font-mono text-[11px] transition-colors",
                      selected
                        ? "border-primary/50 bg-primary/10 text-foreground"
                        : "border-transparent hover:bg-secondary/60 text-muted-foreground",
                    )}
                  >
                    <span className="text-foreground">{node.type}</span> · {node.name}
                    <div className="truncate opacity-70">{id}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="flex flex-col gap-3 lg:col-span-4">
          <Panel title="Command execution">
            <div className="space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
                  Add Text node
                </label>
                <div className="flex gap-2">
                  <input
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-border-subtle bg-background px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    onClick={() => controller.addTextNode(textInput)}
                  >
                    Dispatch
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
                  Update property
                </label>
                <div className="mb-2 font-mono text-[10px] text-muted-foreground">
                  node: {activeNodeId}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    value={propPath}
                    onChange={(e) => setPropPath(e.target.value)}
                    placeholder="props.text"
                    className="rounded-md border border-border-subtle bg-background px-2 py-1.5 text-xs"
                  />
                  <input
                    value={propValue}
                    onChange={(e) => setPropValue(e.target.value)}
                    className="rounded-md border border-border-subtle bg-background px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-border-subtle bg-secondary px-3 py-1.5 text-xs"
                    onClick={() => controller.updateNodeProp(activeNodeId, propPath, propValue)}
                  >
                    Update property
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive disabled:opacity-40"
                    disabled={activeNodeId === snap.document.tree.rootId}
                    onClick={() => controller.removeNode(activeNodeId)}
                  >
                    Remove selected node
                  </button>
                </div>
              </div>

              {snap.lastResult ? (
                <div
                  className={cn(
                    "rounded-md border px-2 py-1.5 font-mono text-[11px]",
                    snap.lastResult.success
                      ? "border-emerald-500/30 text-emerald-400"
                      : "border-destructive/40 text-destructive",
                  )}
                >
                  {snap.lastResult.success
                    ? `OK · mutated ${snap.lastResult.mutatedNodeIds.length}`
                    : `FAIL · ${snap.lastResult.error ?? "unknown"}`}
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel title="Validation status">
            <div
              className={cn(
                "mb-2 inline-flex rounded-full px-2 py-0.5 font-mono text-[11px]",
                snap.validation.ok
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              {snap.validation.ok ? "VALID" : "INVALID"}
            </div>
            {snap.validation.issues.length === 0 ? (
              <p className="text-xs text-muted-foreground">No invariant issues.</p>
            ) : (
              <ul className="space-y-1 text-xs text-destructive">
                {snap.validation.issues.map((issue, i) => (
                  <li key={`${issue.code}-${i}`}>
                    <code>{issue.code}</code> — {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-4">
          <Panel title="Command history">
            {snap.historyLog.length === 0 ? (
              <p className="text-xs text-muted-foreground">Empty history.</p>
            ) : (
              <ol className="space-y-2">
                {[...snap.historyLog].reverse().map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-md border border-border-subtle px-2 py-1.5 font-mono text-[11px]"
                  >
                    <div className="text-foreground">{entry.type}</div>
                    <div className="text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleTimeString()} ·{" "}
                      {entry.mutatedNodeIds.length} nodes
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="Plugin event viewer">
            {snap.events.length === 0 ? (
              <p className="text-xs text-muted-foreground">No events yet.</p>
            ) : (
              <ul className="space-y-1">
                {[...snap.events]
                  .reverse()
                  .slice(0, 40)
                  .map((ev, i) => (
                    <li
                      key={`${ev.type}-${ev.timestamp}-${i}`}
                      className="font-mono text-[11px] text-muted-foreground"
                    >
                      <span className="text-foreground">{ev.type}</span>{" "}
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="JSON inspector" className="lg:col-span-12">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Full document
              </p>
              <JsonBlock value={snap.document} />
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                Selected node
              </p>
              <JsonBlock value={snap.document.tree.nodes[activeNodeId] ?? null} />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
