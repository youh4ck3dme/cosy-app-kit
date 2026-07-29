import { describe, expect, it } from "vitest";

import {
  AuditTrail,
  CommandTelemetry,
  getKernelHealth,
  InvariantReporter,
  PerformanceTracker,
  setPluginHealthSnapshot,
  type KernelHealthReport,
} from "@/lib/builder/diagnostics";

describe("Kernel Observatory Foundation (v0.4.6)", () => {
  it("telemetry tracks command name, duration, success/failure, and timestamp", () => {
    const telemetry = new CommandTelemetry({ maxEvents: 50 });
    const fixedNow = 1_700_000_000_000;

    const ok = telemetry.track("ADD_NODE", () => ({ success: true as const }), {
      now: () => fixedNow,
      isSuccess: (r) => r.success,
    });
    expect(ok.success).toBe(true);

    const fail = telemetry.track(
      "REMOVE_NODE",
      () => ({ success: false as const, error: "missing" }),
      {
        now: () => fixedNow + 1,
        isSuccess: (r) => r.success,
        getError: (r) => r.error,
      },
    );
    expect(fail.success).toBe(false);

    expect(() =>
      telemetry.track("BOOM", () => {
        throw new Error("execute blew up");
      }),
    ).toThrow(/execute blew up/);

    const events = telemetry.getEvents();
    expect(events).toHaveLength(3);

    expect(events[0]).toMatchObject({
      commandName: "ADD_NODE",
      success: true,
      timestamp: fixedNow,
    });
    expect(events[0]!.durationMs).toBeGreaterThanOrEqual(0);

    expect(events[1]).toMatchObject({
      commandName: "REMOVE_NODE",
      success: false,
      error: "missing",
      timestamp: fixedNow + 1,
    });

    expect(events[2]).toMatchObject({
      commandName: "BOOM",
      success: false,
      error: "execute blew up",
    });

    expect(telemetry.summarize()).toEqual({
      total: 3,
      succeeded: 1,
      failed: 2,
    });
  });

  it("telemetry storage respects max history limit", () => {
    const telemetry = new CommandTelemetry({ maxEvents: 3 });
    for (let i = 0; i < 5; i += 1) {
      telemetry.record({
        commandName: `CMD_${i}`,
        timestamp: i,
        durationMs: 1,
        success: true,
      });
    }
    const names = telemetry.getEvents().map((e) => e.commandName);
    expect(names).toEqual(["CMD_2", "CMD_3", "CMD_4"]);
  });

  it("audit entries are immutable when returned", () => {
    const trail = new AuditTrail({ maxEntries: 10 });
    const stored = trail.append({
      action: "dispatch",
      actor: "test",
      payload: { type: "ADD_NODE" },
    });

    expect(Object.isFrozen(stored)).toBe(true);
    expect(Object.isFrozen(stored.payload)).toBe(true);

    const snapshot = trail.getEntries();
    expect(snapshot).toHaveLength(1);
    expect(Object.isFrozen(snapshot[0])).toBe(true);
    expect(Object.isFrozen(snapshot[0]!.payload)).toBe(true);

    expect(() => {
      (snapshot[0] as { action: string }).action = "mutated";
    }).toThrow();

    expect(() => {
      (snapshot[0]!.payload as { type: string }).type = "HACKED";
    }).toThrow();

    expect(trail.getEntries()[0]!.action).toBe("dispatch");
    expect(trail.getEntries()[0]!.payload).toEqual({ type: "ADD_NODE" });
  });

  it("audit trail storage is bounded", () => {
    const trail = new AuditTrail({ maxEntries: 2 });
    trail.append({ action: "a" });
    trail.append({ action: "b" });
    trail.append({ action: "c" });
    expect(trail.size()).toBe(2);
    expect(trail.getEntries().map((e) => e.action)).toEqual(["b", "c"]);
  });

  it("performance tracker times work and enforces max metrics", () => {
    const tracker = new PerformanceTracker({ maxMetrics: 2 });
    const value = tracker.time("compile", () => 42);
    expect(value).toBe(42);

    tracker.record({ name: "m1", durationMs: 1, timestamp: 1 });
    tracker.record({ name: "m2", durationMs: 2, timestamp: 2 });
    tracker.record({ name: "m3", durationMs: 3, timestamp: 3 });

    const metrics = tracker.getMetrics();
    expect(metrics).toHaveLength(2);
    expect(metrics.map((m) => m.name)).toEqual(["m2", "m3"]);
    expect(Object.isFrozen(metrics[0])).toBe(true);
  });

  it("invariant reporter emits structured severity + timestamps", () => {
    const reporter = new InvariantReporter({ maxReports: 50 });
    const report = reporter.report({
      code: "CYCLE_FOUND",
      message: "cycle detected",
      severity: "critical",
      nodeId: "n1",
      timestamp: 99,
    });

    expect(report).toMatchObject({
      code: "CYCLE_FOUND",
      message: "cycle detected",
      severity: "critical",
      nodeId: "n1",
      timestamp: 99,
    });
    expect(Object.isFrozen(report)).toBe(true);
    expect(reporter.countBySeverity("critical")).toBe(1);
  });

  it("getKernelHealth returns a valid frozen structure", () => {
    const telemetry = new CommandTelemetry({ maxEvents: 20 });
    const invariants = new InvariantReporter({ maxReports: 20 });

    telemetry.record({
      commandName: "ADD_NODE",
      timestamp: 10,
      durationMs: 1.5,
      success: true,
    });
    telemetry.record({
      commandName: "MOVE_NODE",
      timestamp: 11,
      durationMs: 2,
      success: false,
      error: "missing parent",
    });
    invariants.report({
      code: "ORPHAN_NODE",
      message: "orphan",
      severity: "error",
    });
    setPluginHealthSnapshot({ registered: 2, ids: ["p-a", "p-b"] });

    const health: KernelHealthReport = getKernelHealth({
      telemetry,
      invariants,
      plugins: { registered: 2, ids: ["p-a", "p-b"] },
      now: () => 12345,
      recentLimit: 5,
    });

    expect(Object.isFrozen(health)).toBe(true);
    expect(health).toMatchObject({
      status: "degraded",
      lastCheck: 12345,
      commands: {
        total: 2,
        succeeded: 1,
        failed: 1,
      },
      invariants: {
        violationCount: 1,
        criticalCount: 0,
      },
      plugins: {
        registered: 2,
        ids: ["p-a", "p-b"],
      },
    });
    expect(health.commands.recent).toHaveLength(2);
    expect(health.invariants.recent).toHaveLength(1);
  });

  it("critical invariants elevate health status to critical", () => {
    const invariants = new InvariantReporter();
    invariants.report({
      code: "ROOT_MISSING",
      message: "gone",
      severity: "critical",
    });
    const health = getKernelHealth({
      telemetry: new CommandTelemetry(),
      invariants,
      plugins: { registered: 0 },
    });
    expect(health.status).toBe("critical");
  });
});
