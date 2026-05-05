import { describe, expect, it } from "vitest";
import {
  getPostHogLogsEndpoint,
  getPostHogProjectToken,
  getPostHogServerHost,
} from "@/lib/posthog/server-config";

describe("PostHog server config", () => {
  it("uses the server-side PostHog host before the browser ingest proxy", () => {
    const env = {
      POSTHOG_HOST: "https://eu.i.posthog.com/",
      NEXT_PUBLIC_POSTHOG_HOST: "/ingest",
    };

    expect(getPostHogServerHost(env)).toBe("https://eu.i.posthog.com");
    expect(getPostHogLogsEndpoint(env)).toBe("https://eu.i.posthog.com/i/v1/logs");
  });

  it("does not send server OTLP logs to a relative browser proxy", () => {
    expect(getPostHogLogsEndpoint({ NEXT_PUBLIC_POSTHOG_HOST: "/ingest" })).toBe(
      "https://us.i.posthog.com/i/v1/logs",
    );
  });

  it("falls back to an absolute public host when a server host is not configured", () => {
    expect(
      getPostHogServerHost({
        NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com/",
      }),
    ).toBe("https://eu.i.posthog.com");
  });

  it("prefers the private project token on the server", () => {
    expect(
      getPostHogProjectToken({
        POSTHOG_API_KEY: "phc_private",
        NEXT_PUBLIC_POSTHOG_KEY: "phc_public",
      }),
    ).toBe("phc_private");
  });
});
