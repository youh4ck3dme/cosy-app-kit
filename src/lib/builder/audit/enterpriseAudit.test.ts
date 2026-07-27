// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { RawNode } from "../semantic-intent/types";
import { A11yAuditorEngine } from "./A11yAuditorEngine";
import { MobileTouchAuditor } from "./MobileTouchAuditor";
import { PWAUpdateGuard } from "./PWAUpdateGuard";

describe("Enterprise Audits Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe("A11yAuditorEngine", () => {
    it("adds aria-label to icon buttons without text", () => {
      const auditor = new A11yAuditorEngine();
      const nodes: RawNode[] = [
        {
          id: "icon_btn_1",
          type: "button",
          meta: { figmaName: "CloseIconButton" },
        },
      ];

      const { fixedNodes, violationsCount } = auditor.auditAndFix(nodes);

      expect(violationsCount).toBe(1);
      expect(fixedNodes[0].meta?.["aria-label"]).toBe("CloseIconButton");
      expect(fixedNodes[0].label).toBe("CloseIconButton");
    });

    it("adds aria-label to inputs without labels and role='button' to interactive boxes", () => {
      const auditor = new A11yAuditorEngine();
      const nodes: RawNode[] = [
        {
          id: "input_1",
          type: "input",
        },
        {
          id: "card_box",
          type: "box",
          action: "navigate",
        },
      ];

      const { fixedNodes, violationsCount } = auditor.auditAndFix(nodes);

      expect(violationsCount).toBe(2);
      expect(fixedNodes[0].meta?.["aria-label"]).toBe("Input input_1");
      expect(fixedNodes[1].meta?.role).toBe("button");
    });

    it("guarantees alt attribute for images", () => {
      const auditor = new A11yAuditorEngine();
      const nodes: RawNode[] = [
        {
          id: "img_node",
          type: "box",
          meta: { isImage: true, figmaName: "HeroBanner" },
        },
      ];

      const { fixedNodes, violationsCount } = auditor.auditAndFix(nodes);

      expect(violationsCount).toBe(1);
      expect(fixedNodes[0].meta?.alt).toBe("HeroBanner");
    });
  });

  describe("MobileTouchAuditor", () => {
    it("adds min-h-[44px] min-w-[44px] touch target classes to interactive elements", () => {
      const auditor = new MobileTouchAuditor();
      const nodes: RawNode[] = [
        {
          id: "btn_small",
          type: "button",
          className: "p-2 bg-indigo-600",
        },
        {
          id: "txt_static",
          type: "text",
          className: "text-sm",
        },
      ];

      const audited = auditor.auditMobileTouchTargets(nodes);

      expect(audited[0].className).toContain("min-h-[44px]");
      expect(audited[0].className).toContain("min-w-[44px]");
      expect(audited[0].className).toContain("inline-flex");
      expect(audited[1].className).not.toContain("min-h-[44px]");
    });
  });

  describe("PWAUpdateGuard", () => {
    it("preserves and restores AST state across contactless SW updates", async () => {
      const guard = new PWAUpdateGuard({ storageKey: "test:pwa:ast" });
      const testAST: RawNode[] = [{ id: "root", type: "box", text: "PWA Backup Test" }];

      const saved = await guard.preserveASTBeforeRefresh(testAST);
      expect(saved).toBe(true);

      const restored = guard.getPreservedAST();
      expect(restored).toEqual(testAST);

      guard.clearPreservedAST();
      expect(guard.getPreservedAST()).toBeNull();
    });
  });
});
