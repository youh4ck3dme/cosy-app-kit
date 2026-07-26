import { describe, expect, it } from "vitest";
import {
  PERF_BUDGETS,
  PERF_CONTRACT_OUT_OF_SCOPE,
  PERFORMANCE_CONTRACT_VERSION,
  previewCspAllowsBareScriptCdn,
  trimMessagesForModel,
} from "@/lib/performance-contract";
import { buildPreviewCsp } from "@/lib/project-fs";

describe("performance-contract v0.1", () => {
  it("pins version and out-of-scope ship blockers", () => {
    expect(PERFORMANCE_CONTRACT_VERSION).toBe("0.1");
    expect(PERF_CONTRACT_OUT_OF_SCOPE).toContain("marketplace");
    expect(PERF_CONTRACT_OUT_OF_SCOPE).toContain("crdt-multiplayer");
  });

  it("exposes budgets used by chat trim + field targets", () => {
    expect(PERF_BUDGETS.maxContextMessages).toBe(24);
    expect(PERF_BUDGETS.maxTextPartChars).toBeGreaterThan(1000);
    expect(PERF_BUDGETS.artifactFirstPaintMs).toBeLessThanOrEqual(1000);
  });

  it("trims message count to budget", () => {
    const messages = Array.from({ length: 40 }, (_, i) => ({
      id: String(i),
      role: i % 2 === 0 ? "user" : "assistant",
      parts: [{ type: "text", text: `m${i}` }],
    }));
    const out = trimMessagesForModel(messages);
    expect(out).toHaveLength(PERF_BUDGETS.maxContextMessages);
    expect(out[0]?.parts?.[0]?.text).toBe("m16");
  });

  it("clips oversized text parts for stream-safe context", () => {
    const huge = "x".repeat(PERF_BUDGETS.maxTextPartChars + 5000);
    const out = trimMessagesForModel([
      { id: "1", role: "assistant", parts: [{ type: "text", text: huge }] },
      { id: "2", role: "user", parts: [{ type: "text", text: "fix it" }] },
    ]);
    const assistant = out[0]?.parts?.[0]?.text ?? "";
    expect(assistant.length).toBeLessThan(huge.length);
    expect(assistant).toContain("truncated for model context");
    expect(out[1]?.parts?.[0]?.text).toBe("fix it");
  });

  it("enforces total char budget preferring older turns", () => {
    const chunk = "y".repeat(20_000);
    const messages = [
      { id: "a", role: "assistant", parts: [{ type: "text", text: chunk }] },
      { id: "b", role: "assistant", parts: [{ type: "text", text: chunk }] },
      { id: "c", role: "assistant", parts: [{ type: "text", text: chunk }] },
      { id: "d", role: "assistant", parts: [{ type: "text", text: chunk }] },
      { id: "e", role: "assistant", parts: [{ type: "text", text: chunk }] },
      { id: "u", role: "user", parts: [{ type: "text", text: "keep me" }] },
    ];
    const out = trimMessagesForModel(messages, {
      maxTextPartChars: 50_000,
      maxTotalContextChars: 30_000,
    });
    const total = out.reduce((n, m) => {
      for (const p of m.parts ?? []) {
        if (p.type === "text" && typeof p.text === "string") n += p.text.length;
      }
      return n;
    }, 0);
    expect(total).toBeLessThanOrEqual(30_000 + 80); // truncation markers
    expect(out.at(-1)?.parts?.[0]?.text).toBe("keep me");
  });

  it("preview CSP guardrail blocks bare script CDNs", () => {
    const csp = buildPreviewCsp({});
    expect(previewCspAllowsBareScriptCdn(csp)).toBe(false);
    expect(csp).toMatch(/script-src 'self' 'unsafe-inline'/);
    expect(
      previewCspAllowsBareScriptCdn(
        "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net",
      ),
    ).toBe(true);
  });
});
