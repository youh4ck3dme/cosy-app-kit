import { describe, it, expect } from "vitest";
import { SemanticIntentEngine } from "./index";
import type { RawNode } from "./types";

describe("SemanticIntentEngine", () => {
  const engine = new SemanticIntentEngine();

  it("detects FormIntent and generates smart components", () => {
    const rawNodes: RawNode[] = [
      { id: "1", type: "text", text: "Welcome back" },
      {
        id: "2",
        type: "input",
        label: "Email Address",
        inputType: "email",
        name: "email",
      },
      {
        id: "3",
        type: "input",
        label: "Password",
        inputType: "password",
        name: "password",
      },
      { id: "4", type: "button", text: "Sign In", action: "submit" },
    ];

    const result = engine.generateCode("LoginForm", rawNodes);

    expect(result.intent).toBe("FormIntent");
    expect(result.code).toContain("import React, { useState } from 'react'");
    expect(result.code).toContain("const [formData, setFormData] = useState");
    expect(result.code).toContain("email: ''");
    expect(result.code).toContain("password: ''");
    expect(result.code).toContain("<form onSubmit={handleSubmit}");
    // iPhone 17 Air: Apple HIG 44×44pt touch targets on inputs + submit
    expect(result.code).toContain("min-h-[44px]");
    expect(result.code).toContain("min-w-[44px]");
  });

  it("detects StaticIntent for basic nodes without interaction", () => {
    const rawNodes: RawNode[] = [
      {
        id: "1",
        type: "text",
        text: "Hello World",
        className: "text-2xl font-bold",
      },
      { id: "2", type: "text", text: "This is a static block of text." },
    ];

    const result = engine.generateCode("StaticCard", rawNodes);

    expect(result.intent).toBe("StaticIntent");
    expect(result.code).not.toContain("useState");
    // data-node-id for canvas selection + mobile auto-fixer text overflow classes
    expect(result.code).toContain('data-node-id="1"');
    expect(result.code).toContain(
      'className="text-2xl font-bold break-words overflow-hidden"',
    );
    expect(result.code).toContain("Hello World");
    expect(result.code).toContain('data-node-id="2"');
    expect(result.code).toContain("This is a static block of text.");
  });
});
