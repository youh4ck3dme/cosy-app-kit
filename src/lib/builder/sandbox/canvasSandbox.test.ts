// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { CanvasSandboxManager } from "./canvasSandbox";

describe("CanvasSandboxManager Unit Tests", () => {
  it("instantiates correctly and handles iframe container mounting", () => {
    const container = document.createElement("div");
    const onMessage = vi.fn();

    const sandbox = new CanvasSandboxManager(container, onMessage);
    sandbox.mount();

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin");

    sandbox.destroy();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("triggers timeout callback when rendering times out", async () => {
    const container = document.createElement("div");
    const onMessage = vi.fn();

    const sandbox = new CanvasSandboxManager(container, onMessage);
    sandbox.mount();

    sandbox.render("const App = () => <div>Test</div>;", undefined, 10);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onMessage).toHaveBeenCalledWith({
      type: "EXECUTION_TIMEOUT",
      timeoutMs: 10,
    });

    sandbox.destroy();
  });
});
