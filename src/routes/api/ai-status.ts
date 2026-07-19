import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_MODEL } from "@/lib/models";

/**
 * Public probe so we can verify production deploy + whether MISTRAL_API_KEY is wired.
 * Does NOT leak the key — only boolean presence.
 */
export const Route = createFileRoute("/api/ai-status")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.MISTRAL_API_KEY?.trim() ?? "";
        const body = {
          ok: true,
          provider: "mistral",
          buildMarker: "mistral-direct-1",
          defaultModel: DEFAULT_MODEL,
          mistralKeyPresent: key.length > 0,
          lovableGatewayDisabled: true,
          hint: key.length
            ? "MISTRAL_API_KEY is set on this server."
            : "Add MISTRAL_API_KEY in Lovable Cloud → Secrets (or local .env).",
        };
        return Response.json(body, {
          headers: {
            "cache-control": "no-store",
            "x-builder-ai": "mistral-direct-1",
          },
        });
      },
    },
  },
});
