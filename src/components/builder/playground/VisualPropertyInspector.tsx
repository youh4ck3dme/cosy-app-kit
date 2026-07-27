import * as React from "react";
import type { RawNode } from "@/lib/builder/semantic-intent/types";

export interface VisualPropertyInspectorProps {
  selectedNode: RawNode | null;
  onUpdateNode: (updatedNode: RawNode) => void;
}

const BG_COLORS = [
  { label: "Transparent", classVal: "bg-transparent" },
  { label: "White", classVal: "bg-white" },
  { label: "Slate Dark", classVal: "bg-slate-900" },
  { label: "Indigo", classVal: "bg-indigo-600" },
  { label: "Emerald", classVal: "bg-emerald-600" },
  { label: "Rose", classVal: "bg-rose-600" },
];

const TEXT_COLORS = [
  { label: "White", classVal: "text-white" },
  { label: "Slate Dark", classVal: "text-slate-900" },
  { label: "Indigo Light", classVal: "text-indigo-400" },
  { label: "Emerald Light", classVal: "text-emerald-400" },
];

const PADDINGS = ["p-0", "p-2", "p-4", "p-6", "p-8"];

const BORDER_RADII = ["rounded-none", "rounded-sm", "rounded-md", "rounded-xl", "rounded-full"];

const FONT_SIZES = ["text-xs", "text-sm", "text-base", "text-xl", "text-3xl", "text-5xl"];

function updateTailwindClass(
  currentClasses: string = "",
  classPrefixes: string[],
  newClass: string,
): string {
  const tokens = currentClasses.split(/\s+/).filter(Boolean);
  const filtered = tokens.filter((token) => {
    return !classPrefixes.some((prefix) => {
      if (prefix.endsWith("-")) {
        return token.startsWith(prefix);
      }
      return token === prefix || token.startsWith(prefix + "-");
    });
  });

  if (newClass) {
    filtered.push(newClass);
  }
  return filtered.join(" ");
}

export const VisualPropertyInspector: React.FC<VisualPropertyInspectorProps> = ({
  selectedNode,
  onUpdateNode,
}) => {
  if (!selectedNode) {
    return (
      <div className="p-6 text-center text-muted-foreground text-xs font-mono rounded-xl border border-border-subtle bg-surface/50">
        Kliknite na prvok v Canvas pre úpravu vlastností
      </div>
    );
  }

  const currentClassName = selectedNode.className || "";

  const handleClassChange = (prefixes: string[], newClass: string) => {
    const updatedClassName = updateTailwindClass(currentClassName, prefixes, newClass);
    onUpdateNode({
      ...selectedNode,
      className: updatedClassName,
    });
  };

  const handleTextChange = (newText: string) => {
    onUpdateNode({
      ...selectedNode,
      text: newText,
    });
  };

  return (
    <div
      data-testid="visual-property-inspector"
      className="p-4 rounded-xl border border-border-subtle bg-surface/80 space-y-5 text-sm"
    >
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <h3 className="font-semibold text-foreground text-xs uppercase tracking-wider">
          Visual Inspector
        </h3>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
          ID: {selectedNode.id}
        </span>
      </div>

      {/* Text Editing if node has text property */}
      {selectedNode.text !== undefined && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Text Content</label>
          <input
            type="text"
            data-testid="inspector-text-input"
            value={selectedNode.text || ""}
            onChange={(e) => handleTextChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
      )}

      {/* Background Color */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Background Color</label>
        <div className="flex flex-wrap gap-1.5">
          {BG_COLORS.map(({ label, classVal }) => {
            const isActive = currentClassName.includes(classVal);
            return (
              <button
                key={classVal}
                type="button"
                data-testid={`bg-color-${classVal}`}
                onClick={() => handleClassChange(["bg-"], classVal)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
                  isActive
                    ? "bg-accent-primary/20 text-accent-primary border-accent-primary"
                    : "bg-background/60 text-muted-foreground border-border/50 hover:border-border"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Text Color */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Text Color</label>
        <div className="flex flex-wrap gap-1.5">
          {TEXT_COLORS.map(({ label, classVal }) => {
            const isActive = currentClassName.includes(classVal);
            return (
              <button
                key={classVal}
                type="button"
                data-testid={`text-color-${classVal}`}
                onClick={() =>
                  handleClassChange(
                    ["text-white", "text-slate-", "text-indigo-", "text-emerald-"],
                    classVal,
                  )
                }
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
                  isActive
                    ? "bg-accent-primary/20 text-accent-primary border-accent-primary"
                    : "bg-background/60 text-muted-foreground border-border/50 hover:border-border"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Padding */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Padding</label>
        <div className="flex flex-wrap gap-1.5">
          {PADDINGS.map((padVal) => {
            const isActive = currentClassName.split(/\s+/).includes(padVal);
            return (
              <button
                key={padVal}
                type="button"
                data-testid={`padding-${padVal}`}
                onClick={() => handleClassChange(["p-"], padVal)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
                  isActive
                    ? "bg-accent-primary/20 text-accent-primary border-accent-primary"
                    : "bg-background/60 text-muted-foreground border-border/50 hover:border-border"
                }`}
              >
                {padVal}
              </button>
            );
          })}
        </div>
      </div>

      {/* Border Radius */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Border Radius</label>
        <div className="flex flex-wrap gap-1.5">
          {BORDER_RADII.map((radiusVal) => {
            const isActive = currentClassName.split(/\s+/).includes(radiusVal);
            return (
              <button
                key={radiusVal}
                type="button"
                data-testid={`radius-${radiusVal}`}
                onClick={() => handleClassChange(["rounded-"], radiusVal)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
                  isActive
                    ? "bg-accent-primary/20 text-accent-primary border-accent-primary"
                    : "bg-background/60 text-muted-foreground border-border/50 hover:border-border"
                }`}
              >
                {radiusVal.replace("rounded-", "") || "none"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Font Size</label>
        <div className="flex flex-wrap gap-1.5">
          {FONT_SIZES.map((sizeVal) => {
            const isActive = currentClassName.split(/\s+/).includes(sizeVal);
            return (
              <button
                key={sizeVal}
                type="button"
                data-testid={`font-size-${sizeVal}`}
                onClick={() =>
                  handleClassChange(
                    ["text-xs", "text-sm", "text-base", "text-xl", "text-3xl", "text-5xl"],
                    sizeVal,
                  )
                }
                className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
                  isActive
                    ? "bg-accent-primary/20 text-accent-primary border-accent-primary"
                    : "bg-background/60 text-muted-foreground border-border/50 hover:border-border"
                }`}
              >
                {sizeVal.replace("text-", "")}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
