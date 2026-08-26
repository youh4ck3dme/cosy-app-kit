import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HTMLAdapterEngine } from "./HTMLAdapterEngine";

describe("HTMLAdapterEngine fallback parser", () => {
  let originalDOMParser: typeof globalThis.DOMParser | undefined;

  beforeEach(() => {
    originalDOMParser = globalThis.DOMParser;
    vi.stubGlobal("DOMParser", undefined);
    if (typeof window !== "undefined") {
      Object.defineProperty(window, "DOMParser", { value: undefined, configurable: true });
    }
  });

  afterEach(() => {
    if (originalDOMParser !== undefined) {
      vi.stubGlobal("DOMParser", originalDOMParser);
      if (typeof window !== "undefined") {
        Object.defineProperty(window, "DOMParser", {
          value: originalDOMParser,
          configurable: true,
        });
      }
    }
    vi.unstubAllGlobals();
  });

  it("parses self-closing input tags at top level", () => {
    const adapter = new HTMLAdapterEngine();
    const nodes = adapter.parseHTMLString('<input type="email" class="w-full" />');

    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("input");
    expect(nodes[0].inputType).toBe("email");
    expect(nodes[0].className).toBe("w-full");
  });

  it("preserves nested self-closing inputs alongside buttons", () => {
    const adapter = new HTMLAdapterEngine();
    const nodes = adapter.parseHTMLString(
      '<form><input type="password" /><button type="submit">Login</button></form>',
    );

    expect(nodes).toHaveLength(1);
    expect(nodes[0].type).toBe("box");
    expect(nodes[0].children).toHaveLength(2);

    const [inputNode, buttonNode] = nodes[0].children ?? [];
    expect(inputNode.type).toBe("input");
    expect(inputNode.inputType).toBe("password");
    expect(buttonNode.type).toBe("button");
    expect(buttonNode.action).toBe("submit");
    expect(buttonNode.children?.[0]?.text).toBe("Login");
  });

  it("parses nested header trees with inputs and headings", () => {
    const adapter = new HTMLAdapterEngine();
    const nodes = adapter.parseHTMLString(
      '<header class="bg-indigo-600"><h1>Dashboard</h1><input type="search" /><button>Log In</button></header>',
    );

    expect(nodes).toHaveLength(1);
    expect(nodes[0].className).toBe("bg-indigo-600");
    expect(nodes[0].children?.map((c) => c.type)).toEqual(["text", "input", "button"]);
    expect(nodes[0].children?.[0].children?.[0]?.text).toBe("Dashboard");
    expect(nodes[0].children?.[1].inputType).toBe("text");
  });

  it("handles same-tag nesting without losing siblings", () => {
    const adapter = new HTMLAdapterEngine();
    const nodes = adapter.parseHTMLString(
      '<div class="outer"><div class="inner">Nested</div><button>Done</button></div>',
    );

    expect(nodes[0].children).toHaveLength(2);
    expect(nodes[0].children?.[0].className).toBe("inner");
    expect(nodes[0].children?.[0].children?.[0]?.text).toBe("Nested");
    expect(nodes[0].children?.[1].type).toBe("button");
  });
});
