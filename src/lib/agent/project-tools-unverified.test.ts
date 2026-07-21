import { describe, expect, it } from "vitest";
import { buildTools } from "@/lib/agent/tools";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

describe("project validate tools UNVERIFIED", () => {
  it("returns UNVERIFIED when validate tools are disabled", async () => {
    const tools = buildTools({
      mode: "build",
      threadId: "11111111-1111-4111-8111-111111111111",
      supabase: {} as SupabaseClient<Database>,
      flags: {
        validate_project_structure: false,
        validate_links: false,
        validate_javascript_syntax: false,
        run_project_smoke: false,
        list_project_files: false,
      },
    });

    const structureTool = tools.validate_project_structure as unknown as {
      execute: (a: object, opts: object) => Promise<unknown>;
    };
    const structure = await structureTool.execute({}, {});
    expect(structure).toMatchObject({
      status: "unverified",
      message: expect.stringContaining("UNVERIFIED"),
    });

    const listTool = tools.list_project_files as unknown as {
      execute: (a: object, opts: object) => Promise<unknown>;
    };
    const list = await listTool.execute({}, {});
    expect(list).toMatchObject({
      status: "unverified",
      message: expect.stringContaining("UNVERIFIED"),
    });
  });
});
