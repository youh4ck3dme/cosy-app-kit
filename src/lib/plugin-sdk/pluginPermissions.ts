import { z } from "zod";

import { PLUGIN_PERMISSIONS, type PluginPermission } from "./plugin.types";

export const PluginPermissionSchema = z.enum(PLUGIN_PERMISSIONS);

const PERMISSION_SET = new Set<string>(PLUGIN_PERMISSIONS);

export function isValidPermission(value: unknown): value is PluginPermission {
  return typeof value === "string" && PERMISSION_SET.has(value);
}

/** Parses + de-dupes a raw permission list; throws on any unknown permission string. */
export function validatePermissions(permissions: unknown): PluginPermission[] {
  const parsed = z.array(PluginPermissionSchema).safeParse(permissions);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid plugin permissions: ${message}`);
  }
  return [...new Set(parsed.data)];
}

export function hasPermission(
  granted: readonly PluginPermission[],
  permission: PluginPermission,
): boolean {
  return granted.includes(permission);
}
