import { PostHog } from 'posthog-node';
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Credentials } from './auth';
import { resolveCredentials } from './auth';

const posthogKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;

let client: PostHog | null = null;
let anonymousDistinctId: string | null = null;
const analyticsIdPath = path.join(os.homedir(), '.graspful', 'analytics-id');

function getClient(): PostHog | null {
  if (!posthogKey) return null;
  if (!client) {
    client = new PostHog(posthogKey, {
      host: process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

function hashCredential(credential: string): string {
  const digest = createHash('sha256').update(credential).digest('hex');
  return `credential:${digest}`;
}

function getOrCreateAnonymousDistinctId(): string {
  if (anonymousDistinctId) return anonymousDistinctId;

  try {
    const storedId = fs.readFileSync(analyticsIdPath, 'utf8').trim();
    if (storedId) {
      anonymousDistinctId = storedId;
      return storedId;
    }
  } catch {
    // Create an installation ID below when the file is absent or unreadable.
  }

  anonymousDistinctId = `anonymous-cli:${randomUUID()}`;
  try {
    fs.mkdirSync(path.dirname(analyticsIdPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(analyticsIdPath, anonymousDistinctId, { mode: 0o600 });
  } catch {
    // Analytics must never block a CLI command on a read-only filesystem.
  }
  return anonymousDistinctId;
}

export function cliDistinctId(
  credentials?: Pick<Credentials, 'apiKey' | 'jwt'>,
  fallbackAnonymousId?: string,
): string {
  if (process.env.GRASPFUL_USER_ID) {
    return process.env.GRASPFUL_USER_ID;
  }

  const resolvedCredentials = credentials ?? resolveCredentials();
  const credential =
    process.env.GRASPFUL_API_KEY ??
    resolvedCredentials.apiKey ??
    resolvedCredentials.jwt;
  if (credential) {
    return hashCredential(credential);
  }

  return fallbackAnonymousId ?? getOrCreateAnonymousDistinctId();
}

export function cliCapture(event: string, properties: Record<string, unknown> = {}) {
  getClient()?.capture({
    distinctId: cliDistinctId(),
    event,
    properties: { ...properties, source: 'cli' },
  });
}

export async function cliShutdown() {
  if (client) await client.shutdown();
}
