import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// This fixed scenario set measures the measurement contract, not conversion lift.
const directory = await mkdtemp(join(tmpdir(), "graspful-experiment-"));
const output = join(directory, "results.json");
try {
  const run = Bun.spawn([
    "bunx", "vitest", "run",
    "src/components/marketing/__tests__/landing-hero-experiment.test.tsx",
    "src/lib/posthog/__tests__/useFeatureFlag.test.tsx",
    "src/lib/posthog/__tests__/provider.test.tsx",
    "--reporter=json", `--outputFile=${output}`,
  ], { cwd: join(import.meta.dir, ".."), stdout: "ignore", stderr: "inherit" });
  const exitCode = await run.exited;
  const results = await Bun.file(output).json();
  if (results.numTotalTests !== 13 || results.numPendingTests !== 0 ||
      results.numPassedTests + results.numFailedTests !== 13 || exitCode > 1) {
    throw new Error("The fixed measurement scenario set did not run completely");
  }
  console.log((results.numPassedTests / 13 * 100).toFixed(6));
} finally {
  await rm(directory, { recursive: true, force: true });
}
