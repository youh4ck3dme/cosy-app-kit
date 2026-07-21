import { createFileRoute } from "@tanstack/react-router";
import { handleProjectPreviewRequest } from "@/lib/project-fs.server";

export const Route = createFileRoute("/preview/$artifactId/~/$token/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const artifactId = params.artifactId;
        const token = params.token;
        const splat = (params as { _splat?: string })._splat ?? "";
        const filePath = String(splat || "index.html");
        const url = new URL(request.url);
        if (!url.searchParams.has("t")) url.searchParams.set("t", token);
        const req = new Request(url.toString(), request);
        return handleProjectPreviewRequest(req, { artifactId, filePath });
      },
    },
  },
});
