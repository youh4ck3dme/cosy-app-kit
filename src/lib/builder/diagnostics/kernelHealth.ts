import type { CommandTelemetry } from "./commandTelemetry";
import { globalCommandTelemetry } from "./commandTelemetry";
import type { InvariantReporter } from "./invariantReporter";
import { globalInvariantReporter } from "./invariantReporter";
import type {
  KernelHealthPluginsSummary,
  KernelHealthReport,
  KernelHealthStatus,
} from "./diagnostics.types";

const RECENT_LIMIT = 20;

export interface PluginHealthSnapshot {
  readonly registered: number;
  readonly ids?: readonly string[];
}

export interface KernelHealthOptions {
  readonly telemetry?: CommandTelemetry;
  readonly invariants?: InvariantReporter;
  readonly plugins?: PluginHealthSnapshot;
  readonly now?: () => number;
  readonly recentLimit?: number;
}

let pluginSnapshot: PluginHealthSnapshot = { registered: 0, ids: [] };

/** Optional plugin census for health reports (does not mutate PluginRegistry). */
export function setPluginHealthSnapshot(snapshot: PluginHealthSnapshot): void {
  pluginSnapshot = {
    registered: snapshot.registered,
    ids: snapshot.ids ? Object.freeze([...snapshot.ids]) : [],
  };
}

export function getPluginHealthSnapshot(): PluginHealthSnapshot {
  return {
    registered: pluginSnapshot.registered,
    ids: pluginSnapshot.ids ?? [],
  };
}

function deriveStatus(
  failedCommands: number,
  criticalInvariants: number,
  errorInvariants: number,
): KernelHealthStatus {
  if (criticalInvariants > 0) return "critical";
  if (errorInvariants > 0 || failedCommands > 0) return "degraded";
  return "healthy";
}

/**
 * Aggregate Observatory health snapshot from diagnostic stores.
 * Read-only — does not execute commands or touch BuilderKernel state.
 */
export function getKernelHealth(options: KernelHealthOptions = {}): KernelHealthReport {
  const telemetry = options.telemetry ?? globalCommandTelemetry;
  const invariants = options.invariants ?? globalInvariantReporter;
  const pluginsInput = options.plugins ?? getPluginHealthSnapshot();
  const now = options.now ?? Date.now;
  const recentLimit = options.recentLimit ?? RECENT_LIMIT;

  const commandSummary = telemetry.summarize();
  const invariantReports = invariants.getReports();
  const criticalCount = invariants.countBySeverity("critical");
  const errorCount = invariants.countBySeverity("error");

  const plugins: KernelHealthPluginsSummary = Object.freeze({
    registered: pluginsInput.registered,
    ids: Object.freeze([...(pluginsInput.ids ?? [])]),
  });

  const status = deriveStatus(commandSummary.failed, criticalCount, errorCount);

  return Object.freeze({
    status,
    commands: Object.freeze({
      total: commandSummary.total,
      succeeded: commandSummary.succeeded,
      failed: commandSummary.failed,
      recent: telemetry.getRecent(recentLimit),
    }),
    invariants: Object.freeze({
      violationCount: invariantReports.length,
      criticalCount,
      recent: invariants.getRecent(recentLimit),
    }),
    plugins,
    lastCheck: now(),
  });
}
