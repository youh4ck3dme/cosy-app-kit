import { describe, expect, it } from "vitest";
import { SemanticIntentEngine } from "./index";
import type { RawNode } from "./types";

describe("Smoke Test: Heavy Layout Prompt & Code Generation", () => {
  it("processes a complex multi-field dashboard UI layout into a functional React component", () => {
    const complexAST: RawNode[] = [
      {
        id: "app-shell",
        type: "box",
        className: "min-h-screen bg-background p-6 flex flex-col gap-6",
        children: [
          {
            id: "header",
            type: "box",
            className: "flex justify-between items-center border-b pb-4",
            children: [
              { id: "title", type: "text", text: "Complex Dashboard Settings" },
              { id: "nav-button", type: "button", action: "navigate", text: "Go to Overview" },
            ],
          },
          {
            id: "form-section",
            type: "box",
            className: "grid grid-cols-2 gap-4",
            children: [
              {
                id: "user-info",
                type: "box",
                children: [
                  { id: "lbl-name", type: "text", text: "Full Name" },
                  { id: "in-name", type: "input", inputType: "text", name: "fullName" },
                  { id: "lbl-email", type: "text", text: "Email Address" },
                  { id: "in-email", type: "input", inputType: "email", name: "email" },
                  { id: "lbl-pass", type: "text", text: "Security Token" },
                  { id: "in-pass", type: "input", inputType: "password", name: "securityToken" },
                ],
              },
              {
                id: "filter-section",
                type: "box",
                children: [
                  { id: "lbl-search", type: "text", text: "Search Query" },
                  { id: "in-search", type: "input", inputType: "text", name: "query" },
                  { id: "item-list", type: "list", text: "Recent Activity Log" },
                ],
              },
            ],
          },
          {
            id: "actions",
            type: "box",
            className: "flex justify-end gap-3",
            children: [
              { id: "btn-cancel", type: "button", action: "cancel", text: "Discard Changes" },
              { id: "btn-submit", type: "button", action: "submit", text: "Save All Settings" },
            ],
          },
        ],
      },
    ];

    const startTime = performance.now();
    const engine = new SemanticIntentEngine();
    const result = engine.generateCode("ComplexDashboard", complexAST);
    const duration = performance.now() - startTime;

    // Assertions
    expect(result.componentName).toBe("ComplexDashboard");
    expect(result.intent).toBe("FormIntent");
    // Spatial auto-fix + heal adds work; keep a tight but non-flaky budget
    expect(duration).toBeLessThan(100);

    // Code structure checks
    expect(result.code).toContain("export default function ComplexDashboard");
    expect(result.code).toContain("const [formData, setFormData] = useState");
    expect(result.code).toContain("fullName: ''");
    expect(result.code).toContain("email: ''");
    expect(result.code).toContain("securityToken: ''");
    expect(result.code).toContain("query: ''");
    // iPhone 17 Air pass: 44pt touch targets on inputs/buttons (emitted in FormIntent JSX)
    expect(result.code).toContain("min-h-[44px]");
    expect(result.code).toContain("min-w-[44px]");
    // data-node-id selection hooks for canvas
    expect(result.code).toContain("data-node-id=");
    expect(result.code).toContain("const handleChange =");
    expect(result.code).toContain("const handleSubmit =");
    expect(result.code).toContain("<form");
    expect(result.code).toContain("Save All Settings");
  });
});
