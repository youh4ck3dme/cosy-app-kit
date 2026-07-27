// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasSandboxManager } from "./canvasSandbox";

describe("CanvasSandboxManager Unit Tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("instantiates correctly and handles iframe container mounting", () => {
    const container = document.createElement("div");
    const onMessage = vi.fn();

    const sandbox = new CanvasSandboxManager(container, onMessage);
    sandbox.mount();

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin");

    // Module resolver + lucide CDN present in iframe shell (srcdoc)
    const srcdoc = iframe?.getAttribute("srcdoc") ?? (iframe as HTMLIFrameElement).srcdoc ?? "";
    expect(srcdoc).toContain("lucide-react");
    expect(srcdoc).toContain("customRequire");
    expect(srcdoc).toContain("moduleRegistry");
    expect(srcdoc).toContain("require");

    sandbox.destroy();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("triggers timeout callback when rendering times out (after debounce)", () => {
    const container = document.createElement("div");
    const onMessage = vi.fn();

    const sandbox = new CanvasSandboxManager(container, onMessage);
    sandbox.mount();

    // Ensure contentWindow exists for postMessage path
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: vi.fn() },
      configurable: true,
    });

    sandbox.render("const App = () => <div>Test</div>;", undefined, 10);

    // Debounce window
    vi.advanceTimersByTime(100);
    // Execution timeout
    vi.advanceTimersByTime(10);

    expect(onMessage).toHaveBeenCalledWith({
      type: "EXECUTION_TIMEOUT",
      timeoutMs: 10,
    });

    sandbox.destroy();
  });

  it("forwards NODE_SELECTED postMessage events to the host handler", () => {
    const container = document.createElement("div");
    const onMessage = vi.fn();

    const sandbox = new CanvasSandboxManager(container, onMessage);
    sandbox.mount();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "NODE_SELECTED", nodeId: "cta_btn" },
      }),
    );

    expect(onMessage).toHaveBeenCalledWith({
      type: "NODE_SELECTED",
      nodeId: "cta_btn",
    });

    sandbox.destroy();
  });

  it("should debounce rapid render calls", () => {
    const container = document.createElement("div");
    const onMessage = vi.fn();
    const sandbox = new CanvasSandboxManager(container, onMessage);
    sandbox.mount();

    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      configurable: true,
    });

    sandbox.render("<div>1</div>");
    sandbox.render("<div>2</div>");
    sandbox.render("<div>3</div>");
    sandbox.render("<div>4</div>");
    sandbox.render("<div>5</div>");

    // Before debounce window — no posts yet
    vi.advanceTimersByTime(50);
    expect(postMessageSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);

    // Only the last debounced payload should fire
    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "RENDER_CODE", code: "<div>5</div>" }),
      "*",
    );

    sandbox.unmount();
    expect(container.children.length).toBe(0);
  });
});
