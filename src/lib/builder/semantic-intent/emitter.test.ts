import { describe, it, expect } from "vitest";
import { CodeEmitter } from "./emitter";
import type { SmartNode } from "./types";

describe("CodeEmitter (Unit Tests)", () => {
  const emitter = new CodeEmitter();

  it("should emit valid React form code with useState for FormIntent", () => {
    const nodes: SmartNode[] = [
      {
        id: "1",
        type: "input",
        name: "email",
        stateKey: "email",
        inputType: "email",
        label: "Email",
      },
    ];

    const result = emitter.emit("TestForm", "FormIntent", nodes);

    expect(result.componentName).toBe("TestForm");
    expect(result.code).toContain("import React, { useState } from 'react'");
    expect(result.code).toContain("const [formData, setFormData] = useState");
    expect(result.code).toContain("email: ''");
    expect(result.code).toContain("value={formData.email}");
    expect(result.code).toContain("onChange={handleChange}");
  });

  it("should emit valid static React code for StaticIntent", () => {
    const nodes: SmartNode[] = [
      {
        id: "1",
        type: "text",
        text: "Just some text",
        className: "text-red-500",
      },
    ];

    const result = emitter.emit("TestStatic", "StaticIntent", nodes);

    expect(result.code).not.toContain("useState");
    expect(result.code).toContain('data-node-id="1"');
    expect(result.code).toContain('className="text-red-500"');
    expect(result.code).toContain("Just some text");
  });
});
