import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
export const CLI_BUILD_TIMEOUT_MS = 180_000;
const PACKAGE_BUILD_TIMEOUT_MS = 60_000;
let build: Promise<void> | undefined;

async function buildPackages(): Promise<void> {
  for (const name of ['shared', 'client', 'cli']) {
    await execFileAsync('bun', ['run', 'build'], {
      cwd: resolve(import.meta.dir, '../..', name),
      env: { ...process.env, NODE_ENV: 'test', GRASPFUL_TELEMETRY_DISABLED: '1' },
      timeout: PACKAGE_BUILD_TIMEOUT_MS,
    });
  }
}

// Setup hooks share one build promise. Compilation uses its own timeout and
// does not consume the time reserved for assertions about CLI behavior.
export function buildCliOnce(): Promise<void> {
  return build ??= buildPackages();
}
