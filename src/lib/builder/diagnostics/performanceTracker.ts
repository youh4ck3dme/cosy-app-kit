import type { PerformanceMetric } from "./diagnostics.types";

const DEFAULT_MAX_METRICS = 200;

export interface PerformanceTrackerOptions {
  readonly maxMetrics?: number;
}

export interface TimeMetricOptions {
  readonly meta?: Readonly<Record<string, unknown>>;
  readonly now?: () => number;
}

/**
 * Memory-safe timing utilities with a bounded in-memory metric ring.
 */
export class PerformanceTracker {
  private readonly maxMetrics: number;
  private readonly metrics: PerformanceMetric[] = [];
  private seq = 0;

  constructor(options: PerformanceTrackerOptions = {}) {
    this.maxMetrics = Math.max(1, options.maxMetrics ?? DEFAULT_MAX_METRICS);
  }

  /** High-resolution duration helper (does not store). */
  measureDuration(execute: () => void): number {
    const t0 = performance.now();
    execute();
    return performance.now() - t0;
  }

  /** Time a callback, store a metric, and return the callback result. */
  time<T>(name: string, execute: () => T, options: TimeMetricOptions = {}): T {
    const now = options.now ?? Date.now;
    const timestamp = now();
    const t0 = performance.now();
    try {
      return execute();
    } finally {
      this.record({
        name,
        durationMs: performance.now() - t0,
        timestamp,
        ...(options.meta !== undefined ? { meta: options.meta } : {}),
      });
    }
  }

  record(input: Omit<PerformanceMetric, "id"> & { readonly id?: string }): PerformanceMetric {
    const metric: PerformanceMetric = Object.freeze({
      id: input.id ?? this.nextId(),
      name: input.name,
      durationMs: input.durationMs,
      timestamp: input.timestamp,
      ...(input.meta !== undefined ? { meta: Object.freeze({ ...input.meta }) } : {}),
    });
    this.metrics.push(metric);
    while (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
    return metric;
  }

  getMetrics(): readonly PerformanceMetric[] {
    return this.metrics.map((metric) =>
      Object.freeze({
        ...metric,
        ...(metric.meta !== undefined ? { meta: Object.freeze({ ...metric.meta }) } : {}),
      }),
    );
  }

  getRecent(limit: number): readonly PerformanceMetric[] {
    const n = Math.max(0, limit);
    return this.getMetrics().slice(-n);
  }

  clear(): void {
    this.metrics.length = 0;
  }

  private nextId(): string {
    this.seq += 1;
    return `perf_${this.seq}_${Date.now().toString(36)}`;
  }
}

export const globalPerformanceTracker = new PerformanceTracker();
