export type {
  AuditEntry,
  CommandTelemetryEvent,
  InvariantSeverity,
  InvariantViolationReport,
  KernelHealthCommandsSummary,
  KernelHealthInvariantsSummary,
  KernelHealthPluginsSummary,
  KernelHealthReport,
  KernelHealthStatus,
  PerformanceMetric,
} from "./diagnostics.types";

export {
  CommandTelemetry,
  globalCommandTelemetry,
  type CommandTelemetryOptions,
  type TrackCommandOptions,
} from "./commandTelemetry";

export {
  PerformanceTracker,
  globalPerformanceTracker,
  type PerformanceTrackerOptions,
  type TimeMetricOptions,
} from "./performanceTracker";

export {
  InvariantReporter,
  globalInvariantReporter,
  type InvariantReporterOptions,
  type ReportInvariantInput,
} from "./invariantReporter";

export {
  AuditTrail,
  globalAuditTrail,
  type AppendAuditInput,
  type AuditTrailOptions,
} from "./auditTrail";

export {
  getKernelHealth,
  getPluginHealthSnapshot,
  setPluginHealthSnapshot,
  type KernelHealthOptions,
  type PluginHealthSnapshot,
} from "./kernelHealth";
