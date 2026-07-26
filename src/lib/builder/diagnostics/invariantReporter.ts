import type { InvariantSeverity, InvariantViolationReport } from "./diagnostics.types";

const DEFAULT_MAX_REPORTS = 200;

export interface InvariantReporterOptions {
  readonly maxReports?: number;
}

export interface ReportInvariantInput {
  readonly code: string;
  readonly message: string;
  readonly severity?: InvariantSeverity;
  readonly nodeId?: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly timestamp?: number;
  readonly id?: string;
}

/**
 * Structured invariant failure reporting with severity + timestamps.
 */
export class InvariantReporter {
  private readonly maxReports: number;
  private readonly reports: InvariantViolationReport[] = [];
  private seq = 0;

  constructor(options: InvariantReporterOptions = {}) {
    this.maxReports = Math.max(1, options.maxReports ?? DEFAULT_MAX_REPORTS);
  }

  report(input: ReportInvariantInput): InvariantViolationReport {
    const entry: InvariantViolationReport = Object.freeze({
      id: input.id ?? this.nextId(),
      code: input.code,
      message: input.message,
      severity: input.severity ?? "error",
      timestamp: input.timestamp ?? Date.now(),
      ...(input.nodeId !== undefined ? { nodeId: input.nodeId } : {}),
      ...(input.details !== undefined ? { details: Object.freeze({ ...input.details }) } : {}),
    });
    this.reports.push(entry);
    while (this.reports.length > this.maxReports) {
      this.reports.shift();
    }
    return entry;
  }

  /** Map a batch of invariant issues into reports (e.g. from validateDocument). */
  reportMany(
    issues: ReadonlyArray<{
      code: string;
      message: string;
      nodeId?: string;
    }>,
    severity: InvariantSeverity = "error",
  ): readonly InvariantViolationReport[] {
    return issues.map((issue) =>
      this.report({
        code: issue.code,
        message: issue.message,
        nodeId: issue.nodeId,
        severity,
      }),
    );
  }

  getReports(): readonly InvariantViolationReport[] {
    return this.reports.map((report) =>
      Object.freeze({
        ...report,
        ...(report.details !== undefined ? { details: Object.freeze({ ...report.details }) } : {}),
      }),
    );
  }

  getRecent(limit: number): readonly InvariantViolationReport[] {
    const n = Math.max(0, limit);
    return this.getReports().slice(-n);
  }

  countBySeverity(severity: InvariantSeverity): number {
    let count = 0;
    for (const report of this.reports) {
      if (report.severity === severity) count += 1;
    }
    return count;
  }

  clear(): void {
    this.reports.length = 0;
  }

  private nextId(): string {
    this.seq += 1;
    return `inv_${this.seq}_${Date.now().toString(36)}`;
  }
}

export const globalInvariantReporter = new InvariantReporter();
