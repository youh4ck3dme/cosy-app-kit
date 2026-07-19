import { describe, expect, it } from "vitest";
import {
  collectToolResultsFromSteps,
  shouldFenceArtifacts,
  summarizeToolResults,
  toolCreatedArtifact,
} from "@/lib/agent/finish";
import {
  isUuid,
  selectMessageIdsToDelete,
  selectMessageIdsToDeleteFromKeepCount,
} from "@/lib/agent/truncate";

describe("selectMessageIdsToDelete", () => {
  const ordered = [
    { id: "a", created_at: "1" },
    { id: "b", created_at: "2" },
    { id: "c", created_at: "3" },
    { id: "d", created_at: "4" },
  ];

  it("deletes anchor and everything after (edit_user)", () => {
    expect(selectMessageIdsToDelete(ordered, "b", "edit_user")).toEqual(["b", "c", "d"]);
  });

  it("deletes anchor and everything after (retry_assistant)", () => {
    expect(selectMessageIdsToDelete(ordered, "c", "retry_assistant")).toEqual(["c", "d"]);
  });

  it("returns empty when id missing", () => {
    expect(selectMessageIdsToDelete(ordered, "missing", "edit_user")).toEqual([]);
  });

  it("keepCount fallback", () => {
    expect(selectMessageIdsToDeleteFromKeepCount(ordered, 2)).toEqual(["c", "d"]);
    expect(selectMessageIdsToDeleteFromKeepCount(ordered, 0)).toEqual(["a", "b", "c", "d"]);
    expect(selectMessageIdsToDeleteFromKeepCount(ordered, 99)).toEqual([]);
  });
});

describe("isUuid", () => {
  it("accepts v4-ish uuids", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });
  it("rejects temp client ids", () => {
    expect(isUuid("msg_abc")).toBe(false);
  });
});

describe("shouldFenceArtifacts", () => {
  it("allows fence in build when tools did not create", () => {
    expect(
      shouldFenceArtifacts({
        mode: "build",
        createArtifactEnabled: true,
        toolCreatedArtifact: false,
      }),
    ).toBe(true);
  });

  it("skips fence when tool created artifact", () => {
    expect(
      shouldFenceArtifacts({
        mode: "build",
        createArtifactEnabled: true,
        toolCreatedArtifact: true,
      }),
    ).toBe(false);
  });

  it("skips fence in plan mode", () => {
    expect(
      shouldFenceArtifacts({
        mode: "plan",
        createArtifactEnabled: true,
        toolCreatedArtifact: false,
      }),
    ).toBe(false);
  });
});

describe("toolCreatedArtifact + summarize", () => {
  it("detects successful create_artifact", () => {
    const results = [
      {
        toolName: "create_artifact",
        output: { ok: true, artifactId: "550e8400-e29b-41d4-a716-446655440000", title: "Dash" },
      },
    ];
    expect(toolCreatedArtifact(results)).toBe(true);
    expect(summarizeToolResults(results)).toMatch(/Created artifact «Dash»/);
  });

  it("ignores failed create", () => {
    expect(
      toolCreatedArtifact([
        { toolName: "create_artifact", output: { ok: false, error: "nope" } },
      ]),
    ).toBe(false);
  });

  it("collects from steps", () => {
    const all = collectToolResultsFromSteps([
      { toolResults: [{ toolName: "remember", output: { ok: true, key: "brand" } }] },
      {
        toolResults: [
          {
            toolName: "create_artifact",
            output: { ok: true, artifactId: "x", title: "T" },
          },
        ],
      },
    ]);
    expect(all).toHaveLength(2);
    expect(toolCreatedArtifact(all)).toBe(true);
    expect(summarizeToolResults(all)).toMatch(/Remembered key «brand»/);
  });
});
