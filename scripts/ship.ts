/**
 * OmniOps One-Command Ship Loop.
 *
 * Runs: typecheck → unit → lint:gate → ship-gates → e2e:ship
 * Then prints the PR checklist from docs/runbooks/daily-dev.md.
 *
 *   bun run ship
 */
import { spawnSync } from "node:child_process";

const steps: Array<{ name: string; args: string[] }> = [
  { name: "typecheck", args: ["bun", "run", "typecheck"] },
  { name: "unit", args: ["bun", "run", "test:unit"] },
  { name: "lint:gate", args: ["bun", "run", "lint:gate"] },
  { name: "ship-gates", args: ["bun", "run", "test:ship-gates"] },
  { name: "e2e:ship", args: ["bun", "run", "test:e2e:ship"] },
];

function run(name: string, args: string[]): void {
  console.log(`\n── ship: ${name} ──`);
  const result = spawnSync(args[0]!, args.slice(1), {
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\nship failed at step: ${name} (exit ${result.status ?? 1})`);
    process.exit(result.status ?? 1);
  }
}

for (const step of steps) {
  run(step.name, step.args);
}

console.log(`
═══════════════════════════════════════════════════════════
  SHIP GREEN — PR checklist (OmniOps)
═══════════════════════════════════════════════════════════
  [ ] Branch is developeredit or feature/* (never push main)
  [ ] git push -u origin HEAD
  [ ] gh pr create --base main
  [ ] Wait for CI: Install · test · typecheck · build
  [ ] After deploy: smoke GET /api/ai-status + open /chat
  [ ] Lane: Cursor=ship / Claude=shape (one agent = one branch)

  Docs: docs/runbooks/daily-dev.md
═══════════════════════════════════════════════════════════
`);
