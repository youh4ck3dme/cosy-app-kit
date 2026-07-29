import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { ZipExporterEngine } from "./zipExporter";

describe("ZipExporterEngine Unit Tests", () => {
  it("generates a valid .zip Blob with mandatory Vite React project files", async () => {
    const exporter = new ZipExporterEngine();
    const sampleCode = `import React from 'react'; export default function SmartCard() { return <div>Smart Card</div>; }`;

    // Set up canvas mocks if HTMLCanvasElement is available (for environments that provide it)
    if (typeof HTMLCanvasElement !== "undefined") {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D);
      vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("mockDataUrl");
    }

    const blob = await exporter.generateZipArchive({
      componentName: "SmartCard",
      code: sampleCode,
      framework: "vite",
    });

    expect(blob).toBeDefined();
    if (typeof blob?.size === "number") {
      expect(blob.size).toBeGreaterThan(100);
    }

    // Read back zip content to verify file structure
    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    expect(zip.file("package.json")).not.toBeNull();
    expect(zip.file("index.html")).not.toBeNull();
    expect(zip.file("src/main.tsx")).not.toBeNull();
    expect(zip.file("src/SmartCard.tsx")).not.toBeNull();

    const componentContent = await zip.file("src/SmartCard.tsx")!.async("text");
    expect(componentContent).toContain("SmartCard");
  });
});
