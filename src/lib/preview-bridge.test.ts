import { describe, expect, it } from "vitest";
import { buildPreviewBridgeScript } from "./preview-bridge";

describe("buildPreviewBridgeScript", () => {
  it("embeds the token as JSON string", () => {
    const script = buildPreviewBridgeScript('tok-abc"123');
    expect(script).toContain(JSON.stringify('tok-abc"123'));
    expect(script.startsWith("<script>")).toBe(true);
    expect(script.endsWith("</script>")).toBe(true);
  });

  it("includes storage polyfill, console, network, and navigate hooks", () => {
    const script = buildPreviewBridgeScript("t1");
    expect(script).toContain("makeMemoryStorage");
    expect(script).toContain("localStorage");
    expect(script).toContain("__builder_console");
    expect(script).toContain("__builder_network");
    expect(script).toContain("__builder_navigate");
    expect(script).toContain("addEventListener('click'");
  });

  it("patches fetch and XHR with typed network events", () => {
    const script = buildPreviewBridgeScript("t-net");
    expect(script).toContain("type: 'fetch'");
    expect(script).toContain("type: 'xhr'");
    expect(script).toContain("XMLHttpRequest");
    expect(script).toContain("XHR.prototype.open");
    expect(script).toContain("XHR.prototype.send");
    expect(script).toContain("resolveFetchInput");
    expect(script).toContain("capErr");
    expect(script).toContain("ok:");
  });

  it("honors networkDisabled for fetch path", () => {
    const script = buildPreviewBridgeScript("t-off", { networkDisabled: true });
    expect(script).toContain("var NET_OFF = true");
    expect(script).toContain("Network disabled in preview");
  });
});
