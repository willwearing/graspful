import "server-only";
import { getServerPostHog } from "./server";
import { getPostHogProjectToken } from "./server-config";
import type { PostHogBootstrap } from "@graspful/creator-ui/posthog-client";

const DEFAULT_TIMEOUT_MS = 400;

export interface ServerFlagAssignment {
  variant: string | true;
  bootstrap: PostHogBootstrap;
}

interface CookieReader {
  get(name: string): { value: string } | undefined;
}

/** posthog-js persists the visitor's identity in this cookie. */
export function getPostHogCookieName(token: string): string {
  return `ph_${token}_posthog`;
}

export function readPostHogDistinctId(cookieValue: string | undefined): string | undefined {
  if (!cookieValue) return undefined;
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(cookieValue));
    if (parsed && typeof parsed === "object" && "distinct_id" in parsed) {
      const distinctId = (parsed as { distinct_id: unknown }).distinct_id;
      if (typeof distinctId === "string" && distinctId) return distinctId;
    }
  } catch {
    // A malformed cookie is treated like a first visit.
  }
  return undefined;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => resolve(undefined), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Evaluates a flag during server rendering so the page ships the assigned variant
 * in its first HTML. The bootstrap makes posthog-js agree with the server and
 * record the exposure once it loads.
 *
 * Returns null when the visitor is not in the experiment or PostHog does not
 * answer in time. Callers render the default experience and skip exposure.
 */
export async function assignServerFlag(
  flag: string,
  cookies: CookieReader,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<ServerFlagAssignment | null> {
  const token = getPostHogProjectToken();
  const posthog = getServerPostHog();
  if (!token || !posthog) return null;

  const existingDistinctId = readPostHogDistinctId(
    cookies.get(getPostHogCookieName(token))?.value,
  );
  const distinctId = existingDistinctId ?? crypto.randomUUID();

  // getAllFlags records no exposure. posthog-js records it for the hero that renders.
  const flags = await withTimeout(
    posthog.getAllFlags(distinctId, { flagKeys: [flag] }),
    timeoutMs,
  ).catch(() => undefined);
  const variant = flags?.[flag];

  if (variant === undefined || variant === false) return null;

  return {
    variant,
    bootstrap: {
      // Only a first visit gets a server-made ID. Bootstrapping an ID that
      // posthog-js already persisted would reset an identified visitor to anonymous.
      ...(existingDistinctId ? {} : { distinctID: distinctId }),
      featureFlags: { [flag]: variant },
    },
  };
}
