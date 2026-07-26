import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED_WOW_TESTIDS } from "@/lib/ship-gates";

function walkSrcTsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === ".output") continue;
      walkSrcTsx(p, out);
    } else if (/\.(tsx|ts|jsx|js)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

describe("ship-gates / wow testids", () => {
  it("every REQUIRED_WOW_TESTID exists under src/", () => {
    const files = walkSrcTsx("src");
    const blob = files.map((f) => readFileSync(f, "utf8")).join("\n");
    const missing = REQUIRED_WOW_TESTIDS.filter((id) => {
      const needle = `data-testid="${id}"`;
      const needleSingle = `data-testid='${id}'`;
      return !blob.includes(needle) && !blob.includes(needleSingle);
    });
    expect(missing, `Missing wow testids: ${missing.join(", ")}`).toEqual([]);
  });
});
