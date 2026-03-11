import { PostHog } from "posthog-node";

let posthogServer: PostHog | null = null;

export function getServerPostHog(): PostHog | null {
  if (!process.env.POSTHOG_API_KEY) return null;

  if (!posthogServer) {
    posthogServer = new PostHog(process.env.POSTHOG_API_KEY, {
      host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogServer;
}
