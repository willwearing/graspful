import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  posthog: { __loaded: false },
}));

vi.mock("posthog-js", () => ({
  default: {
    get __loaded() {
      return mocks.posthog.__loaded;
    },
    init: mocks.init,
  },
}));

import { POSTHOG_BOOTSTRAP_GLOBAL } from "@graspful/creator-ui/posthog-client";
import { initPostHog } from "../client";

const bootstrapWindow = window as unknown as Record<string, unknown>;

describe("initPostHog bootstrap", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    mocks.init.mockReset();
    mocks.posthog.__loaded = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete bootstrapWindow[POSTHOG_BOOTSTRAP_GLOBAL];
  });

  it("passes server-rendered flags to posthog-js", () => {
    const bootstrap = {
      distinctID: "first-visit",
      featureFlags: { "homepage-product-proof-v2": "product-proof" },
    };
    bootstrapWindow[POSTHOG_BOOTSTRAP_GLOBAL] = bootstrap;

    initPostHog();

    expect(mocks.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({ bootstrap }),
    );
  });

  it("initializes without a bootstrap on pages that do not set one", () => {
    initPostHog();

    expect(mocks.init).toHaveBeenCalledOnce();
    expect(mocks.init.mock.calls[0][1]).not.toHaveProperty("bootstrap");
  });
});
