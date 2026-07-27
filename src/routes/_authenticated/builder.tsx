import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { VisionUploader } from "@/components/builder/VisionUploader";
import { parseVisionImage } from "@/lib/builder/vision/mistralVisionModel.server";
import { SemanticIntentEngine } from "@/lib/builder/semantic-intent";
import type { EngineResult } from "@/lib/builder/semantic-intent/types";

export const Route = createFileRoute("/_authenticated/builder")({
  component: BuilderWorkspacePage,
});

function BuilderWorkspacePage() {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [engineResult, setEngineResult] = React.useState<EngineResult | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [sourceUsed, setSourceUsed] = React.useState<"mistral" | "mock">("mock");

  const handleImageProcess = React.useCallback(async (base64: string) => {
    setIsProcessing(true);
    setImagePreview(base64);

    try {
      // 1. Process Image through Mistral Pixtral Vision API (Server Function) -> returns RawNode AST
      const { node: rawNodeTree, source } = await parseVisionImage({ data: { imageBase64: base64 } });
      setSourceUsed(source);
      
      // 2. Pass AST through Semantic Intent Engine to detect interactivity and generate Smart Code
      const engine = new SemanticIntentEngine();
      const result = engine.generateCode("GeneratedForm", [rawNodeTree]);
      
      setEngineResult(result);
    } catch (error) {
      console.error("Failed to process image:", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      
      {/* LEFT PANEL - Uploader & Vision Context */}
      <div className="w-full md:w-1/2 p-6 border-r border-border-subtle flex flex-col relative z-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Vision Builder Workspace</h1>
          <p className="text-muted-foreground text-sm">
            Upload a design screenshot. Our Semantic Intent Engine will analyze the layout and turn it into a smart React component.
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {!imagePreview ? (
            <VisionUploader onImageProcess={handleImageProcess} isProcessing={isProcessing} />
          ) : (
            <div className="relative w-full max-w-xl mx-auto rounded-xl overflow-hidden border border-border-subtle group">
              <img src={imagePreview} alt="Uploaded design" className="w-full h-auto object-cover opacity-80" />
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
                  }}
                  className="absolute top-4 right-4 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-surface transition-colors opacity-0 group-hover:opacity-100"
                >
                  Clear & Restart
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Engine Output (Smart Code) */}
      <div className="w-full md:w-1/2 flex flex-col bg-surface relative z-10">
        <div className="border-b border-border-subtle p-4 bg-background/50 backdrop-blur-sm">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Generated Smart Component</h2>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {engineResult ? (
            <div className="space-y-6 animate-in-fade">
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Detected Intent & Model:</h3>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-medium">
                    {engineResult.intent}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md border text-xs font-medium ${sourceUsed === "mistral" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                    {sourceUsed === "mistral" ? "Mistral Pixtral Vision" : "Simulated Mock (Offline)"}
                  </span>
                  <span className="text-xs text-muted-foreground">Confidence: 98%</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">React Source Code:</h3>
                <div className="relative group rounded-xl overflow-hidden border border-border-subtle bg-[#0a0a0a]">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border/10 bg-white/5">
                    <span className="text-xs font-mono text-muted-foreground">GeneratedForm.tsx</span>
                    <button className="text-xs text-accent-primary hover:text-accent-glow transition-colors">Copy</button>
                  </div>
                  <pre className="p-4 text-xs font-mono leading-relaxed text-foreground overflow-x-auto">
                    <code>{engineResult.code}</code>
                  </pre>
                </div>
              </div>

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
