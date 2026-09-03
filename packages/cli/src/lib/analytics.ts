import { PostHog } from 'posthog-node';
import { createHash, randomUUID } from 'node:crypto';

const posthogKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;

let client: PostHog | null = null;
const anonymousDistinctId = `anonymous-cli:${randomUUID()}`;

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

export function cliDistinctId(): string {
  if (process.env.GRASPFUL_USER_ID) {
    return process.env.GRASPFUL_USER_ID;
  }

  if (process.env.GRASPFUL_API_KEY) {
    const digest = createHash('sha256')
      .update(process.env.GRASPFUL_API_KEY)
      .digest('hex');
    return `credential:${digest}`;
  }

  return anonymousDistinctId;
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
