import { createFileRoute } from "@tanstack/react-router";
import { handleProjectPreviewRequest } from "@/lib/project-fs.server";

export const Route = createFileRoute("/api/projects/$artifactId/files/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const artifactId = params.artifactId;
        const splat = (params as { _splat?: string })._splat ?? "";
        const filePath = String(splat || "index.html");
        return handleProjectPreviewRequest(request, { artifactId, filePath });
      },
    },
  },
});
