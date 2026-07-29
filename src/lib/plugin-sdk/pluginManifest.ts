import { z } from "zod";

import type { PluginManifest } from "./plugin.types";
import { PluginPermissionSchema } from "./pluginPermissions";

/** Lenient semver-shape check — major.minor.patch prefix, not the full spec. */
const SEMVER_LIKE = /^\d+\.\d+\.\d+/;

export const PluginManifestSchema = z.object({
  name: z.string().min(1, 'Plugin manifest requires a non-empty "name".'),
  version: z
    .string()
    .min(1, 'Plugin manifest requires a non-empty "version".')
    .regex(SEMVER_LIKE, 'Plugin manifest "version" must look like semver (e.g. "1.0.0").'),
  description: z.string().optional(),
  permissions: z.array(PluginPermissionSchema).default([]),
});

export interface ManifestValidationResult {
  success: boolean;
  manifest?: PluginManifest;
  errors: string[];
}

/** Deep-freeze a validated manifest so permissions cannot be mutated post-validation. */
export function freezePluginManifest(manifest: PluginManifest): PluginManifest {
  return Object.freeze({
    name: manifest.name,
    version: manifest.version,
    ...(manifest.description !== undefined ? { description: manifest.description } : {}),
    permissions: Object.freeze([...manifest.permissions]),
  });
}

export function validatePluginManifest(input: unknown): ManifestValidationResult {
  const parsed = PluginManifestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`,
      ),
    };
  }
  return { success: true, manifest: freezePluginManifest(parsed.data), errors: [] };
}

export function assertValidPluginManifest(input: unknown): PluginManifest {
  const result = validatePluginManifest(input);
  if (!result.success || !result.manifest) {
    throw new Error(`Invalid plugin manifest: ${result.errors.join("; ")}`);
  }
  return result.manifest;
}
