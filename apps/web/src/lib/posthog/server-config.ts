const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

type PostHogEnv = Record<string, string | undefined>;

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function isAbsoluteHttpUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

export function getPostHogProjectToken(env: PostHogEnv = process.env): string | undefined {
  return env.POSTHOG_API_KEY || env.NEXT_PUBLIC_POSTHOG_KEY;
}

export function getPostHogServerHost(env: PostHogEnv = process.env): string {
  const serverHost = env.POSTHOG_HOST?.trim();
  if (serverHost) {
    return trimTrailingSlash(serverHost);
  }

  const publicHost = env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
  if (publicHost && isAbsoluteHttpUrl(publicHost)) {
    return trimTrailingSlash(publicHost);
  }

  return DEFAULT_POSTHOG_HOST;
}

export function getPostHogLogsEndpoint(env: PostHogEnv = process.env): string {
  return `${getPostHogServerHost(env)}/i/v1/logs`;
}
