import { PostHog } from 'posthog-node';

const posthogKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;

let client: PostHog | null = null;

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

function distinctId(): string {
  return process.env.GRASPFUL_USER_ID || process.env.GRASPFUL_API_KEY || 'anonymous-cli';
}

export function cliCapture(event: string, properties: Record<string, unknown> = {}) {
  getClient()?.capture({
    distinctId: distinctId(),
    event,
    properties: { ...properties, source: 'cli' },
  });
}

export async function cliShutdown() {
  if (client) await client.shutdown();
}
