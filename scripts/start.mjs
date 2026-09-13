import { spawnSync } from "node:child_process";

function run(script) {
  const result = spawnSync(process.execPath, [script], { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run("scripts/migrate.mjs");
run("scripts/bootstrap.mjs");
await import("./server-start.mjs");
