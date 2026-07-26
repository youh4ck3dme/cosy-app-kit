/**
 * Kernel Observatory Foundation (v0.4.6) — shared diagnostic types.
 * Pure types only; no runtime coupling to BuilderKernel.
 */

export type KernelHealthStatus = "healthy" | "degraded" | "critical";

export type InvariantSeverity = "info" | "warning" | "error" | "critical";

export interface CommandTelemetryEvent {
  readonly id: string;
  readonly commandName: string;
  readonly timestamp: number;
  readonly durationMs: number;
  readonly success: boolean;
  readonly error?: string;
}

export interface InvariantViolationReport {
  readonly id: string;
  readonly code: string;
  readonly message: string;
  readonly severity: InvariantSeverity;
  readonly timestamp: number;
  readonly nodeId?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface PerformanceMetric {
  readonly id: string;
  readonly name: string;
  readonly durationMs: number;
  readonly timestamp: number;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface AuditEntry {
  readonly id: string;
  readonly action: string;
  readonly timestamp: number;
  readonly actor?: string;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface KernelHealthCommandsSummary {
  readonly total: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly recent: readonly CommandTelemetryEvent[];
}

export interface KernelHealthInvariantsSummary {
  readonly violationCount: number;
  readonly criticalCount: number;
  readonly recent: readonly InvariantViolationReport[];
}

export interface KernelHealthPluginsSummary {
  readonly registered: number;
  readonly ids: readonly string[];
}

export interface KernelHealthReport {
  readonly status: KernelHealthStatus;
  readonly commands: KernelHealthCommandsSummary;
  readonly invariants: KernelHealthInvariantsSummary;
  readonly plugins: KernelHealthPluginsSummary;
  readonly lastCheck: number;
}
