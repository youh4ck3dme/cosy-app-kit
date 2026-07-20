import { describe, expect, it } from "vitest";
import { buildPreviewBridgeScript } from "./preview-bridge";

describe("buildPreviewBridgeScript", () => {
  it("embeds the token as JSON string", () => {
    const script = buildPreviewBridgeScript("tok-abc\"123");
    expect(script).toContain(JSON.stringify("tok-abc\"123"));
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
});
