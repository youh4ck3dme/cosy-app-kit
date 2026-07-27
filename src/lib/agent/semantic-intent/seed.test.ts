import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { formatSkeletonSystemAppendix, seedInstantProductSkeleton } from "./seed";

type Client = SupabaseClient<Database>;

describe("seedInstantProductSkeleton", () => {
  it("formats skeleton system appendix correctly", () => {
    const appendix = formatSkeletonSystemAppendix({
      artifactId: "art_123",
      title: "CRM Dashboard",
      kind: "html",
      intent: "dashboard",
      confidence: 0.95,
      brand: "CosyCRM",
    });

    expect(appendix).toContain("art_123");
    expect(appendix).toContain("CRM Dashboard");
    expect(appendix).toContain("CosyCRM");
    expect(appendix).toContain("do NOT call create_artifact");
  });

  it("returns null when disabled or prompt is empty", async () => {
    const mockSupabase = {} as unknown as Client;
    const result1 = await seedInstantProductSkeleton({
      supabase: mockSupabase,
      threadId: "thread_1",
      userPrompt: "",
    });
    expect(result1).toBeNull();

    const result2 = await seedInstantProductSkeleton({
      supabase: mockSupabase,
      threadId: "thread_1",
      userPrompt: "Build CRM",
      enabled: false,
    });
    expect(result2).toBeNull();
  });

  it("returns null if artifacts count > 0", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      }),
    } as unknown as Client;

    const result = await seedInstantProductSkeleton({
      supabase: mockSupabase,
      threadId: "thread_1",
      userPrompt: "Build CRM",
    });

    expect(result).toBeNull();
  });

  it("seeds skeleton when thread has 0 artifacts", async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "artifacts") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "new_art_1", title: "CosyCRM Dashboard" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "artifact_versions") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "v1" }, error: null }),
              }),
            }),
          };
        }
        if (table === "threads") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      }),
    } as unknown as Client;

    const result = await seedInstantProductSkeleton({
      supabase: mockSupabase,
      threadId: "thread_clean",
      userPrompt: "Build a modern CRM dashboard",
    });

    expect(result).not.toBeNull();
    expect(result?.artifactId).toBe("new_art_1");
  });

  it("prevents concurrent seed calls for the same threadId (race condition guard)", async () => {
    let resolveCount: (val: { count: number; error: null }) => void;
    const countPromise = new Promise<{ count: number; error: null }>((res) => {
      resolveCount = res;
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "artifacts") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => countPromise),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "art_concurrent", title: "CosyCRM Dashboard" },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "artifact_versions") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: "v1" }, error: null }),
              }),
            }),
          };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
    } as unknown as Client;

    // Start 2 concurrent requests for the exact same threadId
    const p1 = seedInstantProductSkeleton({
      supabase: mockSupabase,
      threadId: "thread_concurrent",
      userPrompt: "Build a modern CRM dashboard",
    });
    const p2 = seedInstantProductSkeleton({
      supabase: mockSupabase,
      threadId: "thread_concurrent",
      userPrompt: "Build a modern CRM dashboard",
    });

    // Unblock the DB count query for request 1
    resolveCount!({ count: 0, error: null });

    const [r1, r2] = await Promise.all([p1, p2]);

    // Exactly one request should succeed (non-null), and the concurrent one should return null
    expect((r1 !== null && r2 === null) || (r1 === null && r2 !== null)).toBe(true);
  });
});
