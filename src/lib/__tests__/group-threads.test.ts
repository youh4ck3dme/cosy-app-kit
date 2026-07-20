import { describe, expect, test } from "bun:test";
import { groupThreads } from "../group-threads";

const NOW = new Date("2026-07-20T12:00:00Z").getTime();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function thread(id: string, ageMs: number) {
  return { id, title: id, updated_at: new Date(NOW - ageMs).toISOString() };
}

describe("groupThreads", () => {
  test("buckets by last activity", () => {
    const groups = groupThreads(
      [
        thread("today", 2 * HOUR),
        thread("yesterday", DAY + HOUR),
        thread("this-week", 5 * DAY),
        thread("older", 30 * DAY),
      ],
      NOW,
    );
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Previous 7 days", "Older"]);
    expect(groups.map((g) => g.items[0].id)).toEqual(["today", "yesterday", "this-week", "older"]);
  });

  test("omits empty groups", () => {
    const groups = groupThreads([thread("only", HOUR)], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Today");
  });

  test("falls back to created_at, then to now", () => {
    const created = groupThreads(
      [{ id: "c", title: "c", created_at: new Date(NOW - 3 * DAY).toISOString() }],
      NOW,
    );
    expect(created[0].label).toBe("Previous 7 days");

    const bare = groupThreads([{ id: "b", title: "b" }], NOW);
    expect(bare[0].label).toBe("Today");
  });

  test("boundary: exactly 24h old is Yesterday, not Today", () => {
    const groups = groupThreads([thread("edge", DAY)], NOW);
    expect(groups[0].label).toBe("Yesterday");
  });
});
