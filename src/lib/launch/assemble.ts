import type { ArtifactFile } from "@/lib/agent/artifacts";
import type { LaunchBlueprint } from "./schema";
import { PAGE_PATHS, type PageId } from "./schema";

export type AssembledLaunch = {
  title: string;
  kind: "html";
  entry_path: string;
  files: ArtifactFile[];
};

export function assembleFiles(
  blueprint: LaunchBlueprint,
  pages: Array<{ pageId: PageId; html: string }>,
): AssembledLaunch {
  const byId = new Map(pages.map((p) => [p.pageId, p.html]));
  const required: PageId[] = ["home", "about", "contact", "pricing"];
  for (const id of required) {
    if (!byId.has(id) || !byId.get(id)?.trim()) {
      throw new Error(`Missing generated page: ${id}`);
    }
  }

  const files: ArtifactFile[] = required.map((id) => ({
    path: PAGE_PATHS[id],
    language: "html",
    content: byId.get(id)!,
  }));

  files.push({
    path: "blueprint.json",
    language: "json",
    content: JSON.stringify(blueprint, null, 2),
  });

  // Every nav href that ends with .html should exist as a file path
  const paths = new Set(files.map((f) => f.path));
  for (const item of blueprint.nav) {
    if (!paths.has(item.href)) {
      throw new Error(`Nav href «${item.href}» has no matching file in artifact`);
    }
  }

  return {
    title: blueprint.project.name.slice(0, 120),
    kind: "html",
    entry_path: PAGE_PATHS.home,
    files,
  };
}
