import { describe, expect, it, vi } from "vitest";
import { MistralKeyRotator } from "./MistralKeyRotator";

describe("MistralKeyRotator Unit Tests", () => {
  it("rotates multiple API keys in Round-Robin order", () => {
    const rotator = new MistralKeyRotator(["key_a", "key_b", "key_c"]);
    expect(rotator.keyCount).toBe(3);

    expect(rotator.getNextKey()).toBe("key_a");
    expect(rotator.getNextKey()).toBe("key_b");
    expect(rotator.getNextKey()).toBe("key_c");
    expect(rotator.getNextKey()).toBe("key_a");
  });

  it("skips rate-limited keys during cooldown window", () => {
    const rotator = new MistralKeyRotator(["key_1", "key_2", "key_3"]);

    expect(rotator.getNextKey()).toBe("key_1");
    rotator.markRateLimited("key_2", 60000);

    // Next key should skip key_2 and return key_3
    expect(rotator.getNextKey()).toBe("key_3");
  });

  it("automatically fails over and retries on 429 rate limit error", async () => {
    const rotator = new MistralKeyRotator(["key_bad", "key_good"]);
    const mockOperation = vi
      .fn()
      .mockRejectedValueOnce({ status: 429, message: "Rate limit exceeded" })
      .mockResolvedValueOnce({ success: true });

    const result = await rotator.executeWithRetry(async (apiKey) => {
      return await mockOperation(apiKey);
    });

    expect(result).toEqual({ success: true });
    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(mockOperation).toHaveBeenNthCalledWith(1, "key_bad");
    expect(mockOperation).toHaveBeenNthCalledWith(2, "key_good");
  });

  it("re-throws non-429 errors without retrying", async () => {
    const rotator = new MistralKeyRotator(["key_1", "key_2"]);
    const mockOperation = vi.fn().mockRejectedValue(new Error("Authentication failed"));

    await expect(
      rotator.executeWithRetry(async (apiKey) => {
        return await mockOperation(apiKey);
      }),
    ).rejects.toThrow("Authentication failed");

    expect(mockOperation).toHaveBeenCalledTimes(1);
  });
});
