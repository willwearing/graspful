import { createHash } from 'node:crypto';

const DEFAULT_POSTHOG_KEY = 'phc_ahQLCJsOBzeuro1yDeurs1a3xx07pIreJWeXG9T4d4';

export function telemetryConfig(): { key: string | null; host: string } {
  return {
    key: process.env.GRASPFUL_TELEMETRY_DISABLED === '1' || process.env.NODE_ENV === 'test'
      ? null
      : process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY || DEFAULT_POSTHOG_KEY,
    host: process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  };
}

export function hashCredential(credential: string): string {
  return `credential:${createHash('sha256').update(credential).digest('hex')}`;
}
