import { describe, expect, it, vi } from "vitest";
import { deleteMemory, formatMemoryBlock, loadThreadMemory, upsertMemory } from "./memory";

type SupabaseClientParam = Parameters<typeof loadThreadMemory>[0];

describe("agent memory unit tests", () => {
  it("loadThreadMemory returns rows ordered by updated_at", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  { id: "1", key: "brand", value: "Cosy", updated_at: "2026-07-27T00:00:00Z" },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClientParam;

    const res = await loadThreadMemory(mockSupabase, "thread-1");
    expect(res).toHaveLength(1);
    expect(res[0]?.key).toBe("brand");
  });

  it("formatMemoryBlock formats memory rows correctly", () => {
    const text = formatMemoryBlock([
      { id: "1", key: "brand", value: "CosyApp", updated_at: "2026-07-27" },
      { id: "2", key: "tone", value: { style: "dark" }, updated_at: "2026-07-27" },
    ]);
    expect(text).toContain("## User preferences for this thread");
    expect(text).toContain("- brand: CosyApp");
    expect(text).toContain('- tone: {"style":"dark"}');
  });

  it("upsertMemory calls .upsert with onConflict: thread_id,key", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { value: "OldBrand" } }),
            }),
          }),
        }),
        upsert: upsertMock,
      }),
    } as unknown as SupabaseClientParam;

    const res = await upsertMemory(mockSupabase, "t-1", "brand", "NewBrand");
    expect(res).toEqual({ ok: true, previous: "OldBrand" });
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        thread_id: "t-1",
        key: "brand",
        value: "NewBrand",
      }),
      { onConflict: "thread_id,key" },
    );
  });

  it("upsertMemory handles empty key gracefully", async () => {
    const mockSupabase = {} as unknown as SupabaseClientParam;
    const res = await upsertMemory(mockSupabase, "t-1", "   ", "Val");
    expect(res).toEqual({ ok: false, error: "Memory key is required" });
  });

  it("deleteMemory deletes by thread_id and key", async () => {
    const deleteMock = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: deleteMock,
          }),
        }),
      }),
    } as unknown as SupabaseClientParam;

    const res = await deleteMemory(mockSupabase, "t-1", "brand");
    expect(res).toEqual({ ok: true });
    expect(deleteMock).toHaveBeenCalledWith("key", "brand");
  });
});
