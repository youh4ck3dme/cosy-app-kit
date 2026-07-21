import { describe, expect, it } from "vitest";
import {
  PUBLIC_SUPABASE_PROJECT_ID,
  PUBLIC_SUPABASE_PROJECT_NAME,
  PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PUBLIC_SUPABASE_REGION,
  PUBLIC_SUPABASE_URL,
} from "./public-config";

describe("public Supabase config (cosy-app-kit)", () => {
  it("points at magqgwqyijuuaoovyjps in eu-west-1", () => {
    expect(PUBLIC_SUPABASE_PROJECT_NAME).toBe("cosy-app-kit");
    expect(PUBLIC_SUPABASE_PROJECT_ID).toBe("magqgwqyijuuaoovyjps");
    expect(PUBLIC_SUPABASE_REGION).toBe("eu-west-1");
    expect(PUBLIC_SUPABASE_URL).toBe("https://magqgwqyijuuaoovyjps.supabase.co");
  });

  it("uses publishable key format (never service_role)", () => {
    expect(PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")).toBe(true);
    expect(PUBLIC_SUPABASE_PUBLISHABLE_KEY.includes("service_role")).toBe(false);
  });
});
