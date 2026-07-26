/**
 * Ship e2e subset: landing + chat gate (+ authenticated when secrets set).
 *
 *   bun run test:e2e:ship
 */
import { spawnSync } from "node:child_process";

const files = ["e2e/landing.pw.ts", "e2e/ship-chat.pw.ts"];
if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
  files.push("e2e/authenticated.pw.ts");
  console.log("e2e:ship — including authenticated.pw.ts (E2E_EMAIL/PASSWORD set)");
} else {
  console.log("e2e:ship — public gate only (set E2E_EMAIL/E2E_PASSWORD for auth suite)");
}

const result = spawnSync("bunx", ["playwright", "test", ...files], {
  stdio: "inherit",
  env: process.env,
  cwd: process.cwd(),
});
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
