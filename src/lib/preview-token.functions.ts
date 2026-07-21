import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { artifactToFiles, cachePreviewFiles, signPreviewToken } from "@/lib/project-fs.server";

export const mintPreviewToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ artifactId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("artifacts")
      .select("id,kind,content,files,entry_path,is_public")
      .eq("id", data.artifactId)
      .maybeSingle();
    if (error || !row) {
      throw new Error("Artifact not found");
    }
    const files = artifactToFiles(row);
    const token = signPreviewToken(data.artifactId);
    cachePreviewFiles({
      token,
      artifactId: data.artifactId,
      files,
      entryPath: row.entry_path,
      isPublic: row.is_public,
    });
    return { token, expiresInSec: 3600, isPublic: row.is_public as boolean };
  });
