// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { HTMLAdapterEngine } from "../semantic-intent/HTMLAdapterEngine";
import { AISpatialContextEngine } from "../semantic-intent/spatialEngine";
import { compressImageToBase64 } from "@/lib/builder/vision/compressImage";

describe("Vision Image-to-HTML Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("HTMLAdapterEngine", () => {
    it("parses HTML string into RawNode AST hierarchy", () => {
      const adapter = new HTMLAdapterEngine();
      const html = `
        <header class="bg-indigo-600 text-white p-4">
          <h1 class="text-xl font-bold">Dashboard</h1>
          <button class="bg-white text-indigo-600 px-4 py-2 rounded">Log In</button>
        </header>
      `;

      const nodes = adapter.parseHTMLString(html);
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes[0].type).toBe("box");
      expect(nodes[0].className).toContain("bg-indigo-600");
    });
  });

  describe("AISpatialContextEngine Integration", () => {
    it("passes generated HTML AST through autoFixMobileResponsive for responsiveness", () => {
      const adapter = new HTMLAdapterEngine();
      const spatial = new AISpatialContextEngine();

      const html = `<div class="w-[1440px] flex">Header Content</div>`;
      const initialAST = adapter.parseHTMLString(html);

      const responsiveAST = spatial.autoFixMobileResponsive(initialAST);

      expect(responsiveAST.length).toBeGreaterThan(0);
      expect(responsiveAST[0].className).toContain("w-full");
      expect(responsiveAST[0].className).not.toContain("w-[1440px]");
    });
  });

  describe("Client Image Compressor", () => {
    it("compresses file into Base64 Data URL", async () => {
      const blob = new Blob(["fake-image-bytes"], { type: "image/png" });
      const file = new File([blob], "test-design.png", { type: "image/png" });

      // Mock HTMLCanvasElement methods for happy-dom environment
      const mockDataUrl =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D);
      vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(mockDataUrl);

      const result = await compressImageToBase64(file, 1024);
      expect(result.base64).toBe(mockDataUrl);
      expect(result.mimeType).toBe("image/png");
    });
  });
});
