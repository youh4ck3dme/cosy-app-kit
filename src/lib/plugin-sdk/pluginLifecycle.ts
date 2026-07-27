import type { PluginContext, PluginLifecycleHandlers, PluginLifecycleState } from "./plugin.types";

const VALID_TRANSITIONS: Record<PluginLifecycleState, PluginLifecycleState[]> = {
  registered: ["installed"],
  installed: ["enabled", "destroyed"],
  enabled: ["disabled", "destroyed"],
  disabled: ["enabled", "destroyed"],
  destroyed: [],
};

export class PluginLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginLifecycleError";
  }
}

function assertTransition(from: PluginLifecycleState, to: PluginLifecycleState): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new PluginLifecycleError(`Cannot transition plugin lifecycle from "${from}" to "${to}".`);
  }
}

export async function runInstall(
  handlers: PluginLifecycleHandlers,
  context: PluginContext,
  currentState: PluginLifecycleState,
): Promise<PluginLifecycleState> {
  assertTransition(currentState, "installed");
  await handlers.onInstall?.(context);
  return "installed";
}

export async function runEnable(
  handlers: PluginLifecycleHandlers,
  context: PluginContext,
  currentState: PluginLifecycleState,
): Promise<PluginLifecycleState> {
  assertTransition(currentState, "enabled");
  await handlers.onEnable?.(context);
  return "enabled";
}

export async function runDisable(
  handlers: PluginLifecycleHandlers,
  context: PluginContext,
  currentState: PluginLifecycleState,
): Promise<PluginLifecycleState> {
  assertTransition(currentState, "disabled");
  await handlers.onDisable?.(context);
  return "disabled";
}

export async function runDestroy(
  handlers: PluginLifecycleHandlers,
  context: PluginContext,
  currentState: PluginLifecycleState,
): Promise<PluginLifecycleState> {
  assertTransition(currentState, "destroyed");
  await handlers.onDestroy?.(context);
  return "destroyed";
}
