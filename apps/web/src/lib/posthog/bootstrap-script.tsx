import {
  POSTHOG_BOOTSTRAP_GLOBAL,
  type PostHogBootstrap,
} from "@graspful/creator-ui/posthog-client";
import { safeJsonLd } from "@/lib/sanitize-json-ld";

/**
 * Hands server-evaluated flags to posthog-js. The inline script runs while the
 * HTML parses, before hydration calls initPostHog.
 */
export function PostHogBootstrapScript({ bootstrap }: { bootstrap: PostHogBootstrap }) {
  return (
    <script
      id="posthog-bootstrap"
      dangerouslySetInnerHTML={{
        __html: `window.${POSTHOG_BOOTSTRAP_GLOBAL}=${safeJsonLd(bootstrap)};`,
      }}
    />
  );
}
