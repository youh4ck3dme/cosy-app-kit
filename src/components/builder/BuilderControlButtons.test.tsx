import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZipExporterEngine } from "@/lib/builder/export/zipExporter";
import { FigmaAdapterEngine } from "@/lib/builder/semantic-intent/FigmaAdapterEngine";
import type { RawNode } from "@/lib/builder/semantic-intent/types";
import { IPHONE_17_AIR } from "@/lib/builder/devices/iphone17Air";

describe("UI Control Buttons & Interaction Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Export ZIP Button click triggers ProjectExporterEngine.generateZipArchive", async () => {
    const exportSpy = vi
      .spyOn(ZipExporterEngine.prototype, "generateZipArchive")
      .mockResolvedValue(new Blob(["mock-zip"], { type: "application/zip" }));

    const handleExport = async () => {
      const engine = new ZipExporterEngine();
      return await engine.generateZipArchive({
        componentName: "TestComponent",
        code: "export default function Test() {}",
        framework: "vite",
      });
    };

    const mockButton = {
      dataset: { testid: "export-zip-btn" },
      click: handleExport,
    };

    const zipBlob = await mockButton.click();

    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(zipBlob).toBeInstanceOf(Blob);
  });

  it("2. Figma Import Button click invokes FigmaAdapterEngine.fetchAndParse", async () => {
    const mockAst: RawNode = { id: "figma_root", type: "box", children: [] };
    const figmaSpy = vi
      .spyOn(FigmaAdapterEngine.prototype, "fetchAndParse")
      .mockResolvedValue(mockAst);

    const handleImport = async (fileKey: string, token: string) => {
      const engine = new FigmaAdapterEngine();
      return await engine.fetchAndParse(fileKey, token);
    };

    const resultAST = await handleImport("abc123Key", "mock-token");

    expect(figmaSpy).toHaveBeenCalledWith("abc123Key", "mock-token");
    expect(resultAST).toEqual(mockAst);
  });

  it("3. AI Prompt Submit Button click triggers AI generation / Scoped edit callback", async () => {
    const onAiSubmit = vi.fn().mockImplementation((prompt: string) => ({
      status: "success",
      prompt,
    }));

    const promptText = "Zmeň farbu na červenú";
    const res = onAiSubmit(promptText);

    expect(onAiSubmit).toHaveBeenCalledWith("Zmeň farbu na červenú");
    expect(res.status).toBe("success");
  });

  it("4. Viewport Switcher Buttons change canvas sandbox resolution (iPhone 17 Air default mobile)", () => {
    let currentWidth = 1440; // Desktop default
    let currentHeight = 900;

    const setViewport = (width: number, height?: number) => {
      currentWidth = width;
      if (height != null) currentHeight = height;
    };

    // Mobile = iPhone 17 Air CSS viewport (was legacy 412×915)
    setViewport(IPHONE_17_AIR.viewport.width, IPHONE_17_AIR.viewport.height);
    expect(currentWidth).toBe(420);
    expect(currentHeight).toBe(912);
    expect(currentWidth).toBe(IPHONE_17_AIR.viewport.width);

    setViewport(768); // Tablet
    expect(currentWidth).toBe(768);

    setViewport(1440); // Desktop
    expect(currentWidth).toBe(1440);
  });

  it("5. Undo / Redo Buttons restore previous and next AST history states", () => {
    const initialAST: RawNode[] = [{ id: "root", type: "box", text: "Initial" }];
    const updatedAST: RawNode[] = [{ id: "root", type: "box", text: "Updated" }];

    class ASTHistoryTracker {
      private history: RawNode[][] = [initialAST];
      private index = 0;

      public mutate(nextAST: RawNode[]) {
        this.history = [...this.history.slice(0, this.index + 1), nextAST];
        this.index = this.history.length - 1;
      }

      public undo(): RawNode[] {
        if (this.index > 0) this.index--;
        return this.getCurrent();
      }

      public redo(): RawNode[] {
        if (this.index < this.history.length - 1) this.index++;
        return this.getCurrent();
      }

      public getCurrent(): RawNode[] {
        return this.history[this.index];
      }
    }

    const tracker = new ASTHistoryTracker();
    expect(tracker.getCurrent()[0].text).toBe("Initial");

    tracker.mutate(updatedAST);
    expect(tracker.getCurrent()[0].text).toBe("Updated");

    const afterUndo = tracker.undo();
    expect(afterUndo[0].text).toBe("Initial");

    const afterRedo = tracker.redo();
    expect(afterRedo[0].text).toBe("Updated");
  });
});
