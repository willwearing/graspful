import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Set these before any CLI or MCP application module is imported. Test runs
// must not inherit account credentials, production endpoints, or telemetry.
process.env.GRASPFUL_TELEMETRY_DISABLED = '1';
for (const key of ['GRASPFUL_API_KEY', 'GRASPFUL_USER_ID', 'POSTHOG_API_KEY', 'NEXT_PUBLIC_POSTHOG_KEY']) {
  delete process.env[key];
}
const configDirectory = mkdtempSync(join(tmpdir(), 'graspful-package-tests-'));
process.env.GRASPFUL_CONFIG_DIR = configDirectory;
process.env.GRASPFUL_API_URL = 'http://127.0.0.1:1';
process.once('exit', () => rmSync(configDirectory, { recursive: true, force: true }));

const networkFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, options?: RequestInit) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error(`Test blocked an unmocked external request to ${url.origin}`);
  }
  return networkFetch(input, options);
}) as typeof fetch;
