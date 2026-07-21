import { createFileRoute } from "@tanstack/react-router";
import { BUILD_CODE_MODEL, DEFAULT_MODEL, SUGGESTION_MODEL } from "@/lib/models";
import { PROMPT_REV } from "@/lib/agent/prompts";
import {
  PUBLIC_SUPABASE_PROJECT_ID,
  PUBLIC_SUPABASE_PROJECT_NAME,
  PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PUBLIC_SUPABASE_REGION,
  PUBLIC_SUPABASE_URL,
} from "@/integrations/supabase/public-config";

/**
 * Public probe so we can verify production deploy + whether MISTRAL_API_KEY is wired.
 * Does NOT leak the key — only boolean presence.
 */
export const Route = createFileRoute("/api/ai-status")({
  server: {
    handlers: {
      GET: async () => {
        const key = (process.env.MISTRAL_API_KEY ?? process.env.MISTRAL_KEY)?.trim() ?? "";
        const searchKey = (process.env.SEARCH_API_KEY ?? process.env.TAVILY_API_KEY)?.trim() ?? "";
        const supabaseUrl = process.env.SUPABASE_URL || PUBLIC_SUPABASE_URL;
        let dbOk: boolean | null = null;
        try {
          // Reachability only: root REST may 401 with publishable keys; any HTTP response = up.
          const res = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
              apikey: process.env.SUPABASE_PUBLISHABLE_KEY || PUBLIC_SUPABASE_PUBLISHABLE_KEY,
              Accept: "application/json",
            },
          });
          dbOk = res.status > 0 && res.status < 500;
        } catch {
          dbOk = false;
        }

        const body = {
          ok: true,
          provider: "mistral",
          buildMarker: "mistral-agent-g2-1",
          promptRev: PROMPT_REV,
          defaultModel: DEFAULT_MODEL,
          buildCodeModel: BUILD_CODE_MODEL,
          suggestionModel: SUGGESTION_MODEL,
          tools: [
            "create_artifact",
            "edit_file",
            "read_artifact",
            "remember",
            "plan_steps",
            "launch_site",
            "list_project_files",
            "read_project_file",
            "write_project_file",
            "validate_project_structure",
            "validate_links",
            "validate_javascript_syntax",
            "run_project_smoke",
            "fetch_url",
            "web_search",
          ],
          features: {
            fenceFallback: true,
            artifactVersions: true,
            suggestFollowups: true,
            launchSite: true,
            streamDataParts: ["artifact-created", "memory-saved", "plan"],
          },
          mistralKeyPresent: key.length > 0,
          searchKeyPresent: searchKey.length > 0,
          supabase: {
            name: process.env.SUPABASE_PROJECT_NAME || PUBLIC_SUPABASE_PROJECT_NAME,
            projectId: process.env.SUPABASE_PROJECT_ID || PUBLIC_SUPABASE_PROJECT_ID,
            region: process.env.SUPABASE_REGION || PUBLIC_SUPABASE_REGION,
            url: supabaseUrl,
            reachable: dbOk,
          },
          supabaseReachable: dbOk,
          lovableGatewayDisabled: true,
          hint: key.length
            ? "MISTRAL_API_KEY is set on this server."
            : "Add MISTRAL_API_KEY in Lovable Cloud → Secrets (or local .env).",
        };
        return Response.json(body, {
          headers: {
            "cache-control": "no-store",
            "x-builder-ai": "mistral-agent-g2-1",
          },
        });
      },
    },
  },
});
