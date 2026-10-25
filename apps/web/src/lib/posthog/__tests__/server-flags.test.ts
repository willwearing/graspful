import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFeatureFlag: vi.fn(),
  server: { enabled: true },
}));

vi.mock("../server", () => ({
  getServerPostHog: () =>
    mocks.server.enabled ? { getFeatureFlag: mocks.getFeatureFlag } : null,
}));

import {
  assignServerFlag,
  getPostHogCookieName,
  readPostHogDistinctId,
} from "../server-flags";

const TOKEN = "phc_test";
const FLAG = "homepage-product-proof-v2";

function cookieJar(values: Record<string, string> = {}) {
  return {
    get: (name: string) => (name in values ? { value: values[name] } : undefined),
  };
}

function posthogCookie(distinctId: string) {
  return {
    [getPostHogCookieName(TOKEN)]: encodeURIComponent(
      JSON.stringify({ distinct_id: distinctId, $sesid: [1, "s", 1] }),
    ),
  };
}

describe("readPostHogDistinctId", () => {
  it("reads the distinct ID from an encoded posthog-js cookie", () => {
    expect(readPostHogDistinctId(posthogCookie("user-1")[getPostHogCookieName(TOKEN)])).toBe(
      "user-1",
    );
  });

  it.each([undefined, "", "not-json", encodeURIComponent("{}"), encodeURIComponent('{"distinct_id":""}')])(
    "treats %j as a first visit",
    (value) => {
      expect(readPostHogDistinctId(value)).toBeUndefined();
    },
  );
});

describe("assignServerFlag", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", TOKEN);
    vi.stubEnv("POSTHOG_API_KEY", "");
    mocks.server.enabled = true;
    mocks.getFeatureFlag.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("evaluates against the visitor's existing ID and does not re-bootstrap it", async () => {
    mocks.getFeatureFlag.mockResolvedValue("product-proof");

    const assignment = await assignServerFlag(FLAG, cookieJar(posthogCookie("returning-visitor")));

    expect(mocks.getFeatureFlag).toHaveBeenCalledWith(FLAG, "returning-visitor", {
      sendFeatureFlagEvents: false,
    });
    expect(assignment).toEqual({
      variant: "product-proof",
      bootstrap: { featureFlags: { [FLAG]: "product-proof" } },
    });
  });

  it("creates and bootstraps a distinct ID for a first visit", async () => {
    mocks.getFeatureFlag.mockResolvedValue("control");

    const assignment = await assignServerFlag(FLAG, cookieJar());

    const distinctId = mocks.getFeatureFlag.mock.calls[0][1];
    expect(distinctId).toMatch(/^[0-9a-f-]{36}$/);
    expect(assignment).toEqual({
      variant: "control",
      bootstrap: { distinctID: distinctId, featureFlags: { [FLAG]: "control" } },
    });
  });

  it.each([false, undefined])("leaves the visitor unassigned when the flag is %s", async (value) => {
    mocks.getFeatureFlag.mockResolvedValue(value);

    await expect(assignServerFlag(FLAG, cookieJar())).resolves.toBeNull();
  });

  it("leaves the visitor unassigned when PostHog errors", async () => {
    mocks.getFeatureFlag.mockRejectedValue(new Error("flags unavailable"));

    await expect(assignServerFlag(FLAG, cookieJar())).resolves.toBeNull();
  });

  it("stops waiting for PostHog after the timeout", async () => {
    vi.useFakeTimers();
    mocks.getFeatureFlag.mockReturnValue(new Promise(() => {}));

    const pending = assignServerFlag(FLAG, cookieJar(), { timeoutMs: 400 });
    await vi.advanceTimersByTimeAsync(400);

    await expect(pending).resolves.toBeNull();
  });

  it("skips evaluation without a PostHog client", async () => {
    mocks.server.enabled = false;

    await expect(assignServerFlag(FLAG, cookieJar())).resolves.toBeNull();
    expect(mocks.getFeatureFlag).not.toHaveBeenCalled();
  });
});
