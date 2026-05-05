import { PostHog } from "posthog-node";
import { getPostHogProjectToken, getPostHogServerHost } from "./server-config";

let posthogServer: PostHog | null = null;

export function getServerPostHog(): PostHog | null {
  const token = getPostHogProjectToken();
  if (!token) return null;

  if (!posthogServer) {
    posthogServer = new PostHog(token, {
      host: getPostHogServerHost(),
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogServer;
}
