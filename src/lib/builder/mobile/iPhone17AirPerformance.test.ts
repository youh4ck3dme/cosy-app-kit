import { describe, it, expect } from "vitest";
import { IPhone17AirAdapter } from "./iPhone17AirAdapter";
import type { RawNode } from "../semantic-intent/types";
import { SemanticIntentEngine } from "../semantic-intent";
import { IPHONE_17_AIR } from "../devices/iphone17Air";

describe("iPhone 17 Air Specific Hardware & UX Suite", () => {
  const adapter = new IPhone17AirAdapter();

  it("1. Mali by sme nahradiť h-screen za h-[100dvh] pre iOS Safari", () => {
    const inputAST: RawNode[] = [{ id: "root", type: "box", className: "h-screen bg-slate-900" }];
    const result = adapter.optimizeForIPhone17Air(inputAST);
    expect(result[0].className).toContain("h-[100dvh]");
    expect(result[0].className).not.toContain("h-screen");
  });

  it("2. Mali by sme pridať Safe Area Insets pre Dynamic Island", () => {
    const inputAST: RawNode[] = [{ id: "root", type: "box", className: "min-h-[100dvh]" }];
    const result = adapter.optimizeForIPhone17Air(inputAST);
    expect(result[0].className).toContain("pt-[env(safe-area-inset-top,20px)]");
    expect(result[0].className).toContain("pb-[env(safe-area-inset-bottom,20px)]");
  });

  it("3. Mali by sme pridať GPU akceleráciu (transform-gpu) pre 120Hz ProMotion animácie", () => {
    const inputAST: RawNode[] = [
      { id: "card", type: "box", className: "transition-all duration-300" },
    ];
    const result = adapter.optimizeForIPhone17Air(inputAST);
    expect(result[0].className).toContain("transform-gpu");
    expect(result[0].className).toContain("will-change-transform");
  });

  it("4. Touch targets: button/input min 44×44pt", () => {
    const inputAST: RawNode[] = [
      { id: "btn", type: "button", text: "OK", className: "bg-blue-600" },
      { id: "email", type: "input", inputType: "email", name: "email", className: "border" },
    ];
    const result = adapter.optimizeForIPhone17Air(inputAST);
    expect(result[0].className).toContain("min-h-[44px]");
    expect(result[0].className).toContain("min-w-[44px]");
    expect(result[1].className).toContain("min-h-[44px]");
    expect(result[1].className).toContain("min-w-[44px]");
  });

  it("5. Nested children get dvh + touch fixes recursively", () => {
    const inputAST: RawNode[] = [
      {
        id: "root",
        type: "box",
        className: "min-h-screen",
        children: [{ id: "cta", type: "button", text: "Go", className: "px-2" }],
      },
    ];
    const result = adapter.optimizeForIPhone17Air(inputAST);
    expect(result[0].className).toContain("min-h-[100dvh]");
    expect(result[0].className).toContain("pt-[env(safe-area-inset-top,20px)]");
    expect(result[0].children?.[0].className).toContain("min-h-[44px]");
  });

  it("6. Frame Budget Benchmark: Optimalizácia 500 uzlov prebieha pod 8.33ms (120fps limit)", () => {
    const largeAST: RawNode[] = Array.from({ length: 500 }, (_, i) => ({
      id: `node_${i}`,
      type: (i % 2 === 0 ? "button" : "box") as RawNode["type"],
      className: "h-screen transition-all",
    }));

    // Warm-up (JIT / V8) so the measured pass reflects steady-state cost
    adapter.optimizeForIPhone17Air(largeAST.slice(0, 20));

    const samples: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      adapter.optimizeForIPhone17Air(largeAST);
      samples.push(performance.now() - start);
    }

    const duration = Math.min(...samples);
    console.log(
      `[iPhone 17 Air Benchmark] 500 uzlov spracovaných za: ${duration.toFixed(2)} ms (best of 5)`,
    );

    // 120Hz frame budget is ~8.33ms. On cold CI hosts allow a small slack,
    // but keep a hard real-time-oriented ceiling for production gates.
    expect(duration).toBeLessThan(8.33);
  });

  it("7. Idempotent: second optimize does not duplicate safe-area / GPU tokens", () => {
    const inputAST: RawNode[] = [{ id: "root", type: "box", className: "h-screen transition-all" }];
    const once = adapter.optimizeForIPhone17Air(inputAST);
    const twice = adapter.optimizeForIPhone17Air(once);
    expect(twice[0].className).toBe(once[0].className);
    const gpuCount = (twice[0].className?.match(/transform-gpu/g) || []).length;
    expect(gpuCount).toBe(1);
  });

  it("8. SemanticIntentEngine always runs Air pass (end-to-end generateCode)", () => {
    const engine = new SemanticIntentEngine();
    const result = engine.generateCode("AirLogin", [
      {
        id: "root",
        type: "box",
        className: "min-h-screen w-[900px]",
        children: [
          {
            id: "email",
            type: "input",
            name: "email",
            inputType: "email",
            label: "Email",
          },
          { id: "go", type: "button", action: "submit", text: "Sign in" },
        ],
      },
    ]);
    expect(result.intent).toBe("FormIntent");
    expect(result.code).toContain("min-h-[44px]");
    expect(result.code).not.toMatch(/\bw-\[900px\]/);
  });

  it("9. Device profile viewport matches Live Canvas mobile chrome", () => {
    expect(IPHONE_17_AIR.frameLabel).toBe("420 × 912");
    expect(IPHONE_17_AIR.viewport).toEqual({ width: 420, height: 912 });
  });
});
