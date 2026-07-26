import type { CommandTelemetryEvent } from "./diagnostics.types";

const DEFAULT_MAX_EVENTS = 200;

export interface CommandTelemetryOptions {
  readonly maxEvents?: number;
}

export interface TrackCommandOptions<T> {
  /** Defaults to always-success when the callback returns without throwing. */
  readonly isSuccess?: (result: T) => boolean;
  readonly getError?: (result: T) => string | undefined;
  readonly now?: () => number;
}

/**
 * Observes command outcomes without altering execution semantics.
 * Callers may optionally wrap `kernel.dispatch` via {@link CommandTelemetry.track}.
 */
export class CommandTelemetry {
  private readonly maxEvents: number;
  private readonly events: CommandTelemetryEvent[] = [];
  private seq = 0;

  constructor(options: CommandTelemetryOptions = {}) {
    this.maxEvents = Math.max(1, options.maxEvents ?? DEFAULT_MAX_EVENTS);
  }

  /** Append a completed telemetry sample. */
  record(
    input: Omit<CommandTelemetryEvent, "id"> & { readonly id?: string },
  ): CommandTelemetryEvent {
    const event: CommandTelemetryEvent = Object.freeze({
      id: input.id ?? this.nextId(),
      commandName: input.commandName,
      timestamp: input.timestamp,
      durationMs: input.durationMs,
      success: input.success,
      ...(input.error !== undefined ? { error: input.error } : {}),
    });
    this.push(event);
    return event;
  }

  /**
   * Measures duration around `execute` and records success/failure.
   * Does not catch-and-swallow: thrown errors are rethrown after recording failure.
   */
  track<T>(
    commandName: string,
    execute: () => T,
    options: TrackCommandOptions<T> = {},
  ): T {
    const now = options.now ?? Date.now;
    const startedAt = now();
    const t0 = performance.now();

    try {
      const result = execute();
      const durationMs = performance.now() - t0;
      const success = options.isSuccess ? options.isSuccess(result) : true;
      const error = options.getError?.(result);
      this.record({
        commandName,
        timestamp: startedAt,
        durationMs,
        success,
        ...(error !== undefined ? { error } : {}),
      });
      return result;
    } catch (error) {
      const durationMs = performance.now() - t0;
      this.record({
        commandName,
        timestamp: startedAt,
        durationMs,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  getEvents(): readonly CommandTelemetryEvent[] {
    return this.events.map((event) => Object.freeze({ ...event }));
  }

  getRecent(limit: number): readonly CommandTelemetryEvent[] {
    const n = Math.max(0, limit);
    return this.events.slice(-n).map((event) => Object.freeze({ ...event }));
  }

  summarize(): { total: number; succeeded: number; failed: number } {
    let succeeded = 0;
    let failed = 0;
    for (const event of this.events) {
      if (event.success) succeeded += 1;
      else failed += 1;
    }
    return { total: this.events.length, succeeded, failed };
  }

  clear(): void {
    this.events.length = 0;
  }

  private push(event: CommandTelemetryEvent): void {
    this.events.push(event);
    while (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  private nextId(): string {
    this.seq += 1;
    return `cmdtel_${this.seq}_${Date.now().toString(36)}`;
  }
}

export const globalCommandTelemetry = new CommandTelemetry();
