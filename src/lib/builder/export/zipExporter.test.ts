import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { ZipExporterEngine } from "./zipExporter";

describe("ZipExporterEngine Unit Tests", () => {
  it("generates a valid .zip Blob with mandatory Vite React project files", async () => {
    const exporter = new ZipExporterEngine();
    const sampleCode = `import React from 'react'; export default function SmartCard() { return <div>Smart Card</div>; }`;

    const blob = await exporter.generateZipArchive({
      componentName: "SmartCard",
      code: sampleCode,
      framework: "vite",
    });

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(100);

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
