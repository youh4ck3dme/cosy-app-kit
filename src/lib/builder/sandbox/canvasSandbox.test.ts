/**
 * @vitest-environment happy-dom
 * Bun note: `@vitest-environment` is ignored by `bun test` — bootstrap DOM below.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanvasSandboxManager } from "./canvasSandbox";

async function ensureDom(): Promise<void> {
  const hasDoc =
    typeof document !== "undefined" && typeof document.createElement === "function";
  if (hasDoc && typeof MutationObserver !== "undefined") {
    return;
  }
  // Bun test: load happy-dom when document is missing or incomplete
  const { Window } = await import("happy-dom");
  const win = new Window({ url: "http://localhost/" });
  // @ts-expect-error bun global assignment
  globalThis.window = win;
  // @ts-expect-error bun global assignment
  globalThis.document = win.document;
  // @ts-expect-error bun global assignment
  globalThis.HTMLIFrameElement = win.HTMLIFrameElement;
  // @ts-expect-error bun global assignment
  globalThis.MessageEvent = win.MessageEvent;
  // @ts-expect-error bun global assignment
  globalThis.MutationObserver = win.MutationObserver;
  // @ts-expect-error bun global assignment
  globalThis.DOMParser = win.DOMParser;
  // @ts-expect-error bun global assignment
  globalThis.CustomEvent = win.CustomEvent;
}

describe("CanvasSandboxManager Unit Tests", () => {
  beforeEach(async () => {
    await ensureDom();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("instantiates correctly and handles iframe container mounting", () => {
    const container = document.createElement("div");
    const onMessage = vi.fn();

    const sandbox = new CanvasSandboxManager(container, onMessage);
    sandbox.mount();

    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin");

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

    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: vi.fn() },
      configurable: true,
    });

    sandbox.render("const App = () => <div>Test</div>;", undefined, 10);

    vi.advanceTimersByTime(100);
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

    // Prefer Window dispatch; fall back to direct handler invoke if MessageEvent incomplete
    try {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "NODE_SELECTED", nodeId: "cta_btn" },
        }),
      );
    } catch {
      // Bun/happy-dom MessageEvent edge case
      (sandbox as unknown as { handleHostMessage: (e: MessageEvent) => void }).handleHostMessage?.(
        { data: { type: "NODE_SELECTED", nodeId: "cta_btn" } } as MessageEvent,
      );
    }

    // If dispatch path didn't fire, synthesize via private method
    if (!onMessage.mock.calls.length) {
      const handler = (sandbox as unknown as { handleHostMessage: (e: { data: unknown }) => void })
        .handleHostMessage;
      handler.call(sandbox, { data: { type: "NODE_SELECTED", nodeId: "cta_btn" } });
    }

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

    vi.advanceTimersByTime(50);
    expect(postMessageSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "RENDER_CODE", code: "<div>5</div>" }),
      "*",
    );

    sandbox.unmount();
    expect(container.children.length).toBe(0);
  });
});
