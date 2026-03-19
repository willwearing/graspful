import { spawnSync } from "node:child_process";
import path from "node:path";

const backendDir = path.resolve(__dirname, "../backend");
const backendScript = path.resolve(backendDir, "scripts/load-course.ts");
const args = process.argv.slice(2);

const result = spawnSync(
  "bunx",
  ["ts-node", backendScript, ...args],
  {
    cwd: backendDir,
    stdio: "inherit",
    env: {
      ...process.env,
      INVOCATION_CWD: process.cwd(),
    },
  },
);

if (result.error) {
  console.error("Failed to run backend course loader:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
