import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFeatureFlagVariant } from "../useFeatureFlag";

const mocks = vi.hoisted(() => ({
  initPostHog: vi.fn(),
  getFeatureFlag: vi.fn(),
  onFeatureFlags: vi.fn(),
  posthog: { __loaded: false },
}));

vi.mock("../client", () => ({
  initPostHog: mocks.initPostHog,
  posthog: {
    get __loaded() {
      return mocks.posthog.__loaded;
    },
    getFeatureFlag: mocks.getFeatureFlag,
    onFeatureFlags: mocks.onFeatureFlags,
  },
}));

describe("useFeatureFlagVariant", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.posthog.__loaded = false;
    mocks.initPostHog.mockReset();
    mocks.getFeatureFlag.mockReset();
    mocks.onFeatureFlags.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops evaluating a late flag after settling on the fallback", () => {
    let notifyFlagsLoaded: (() => void) | undefined;
    const unsubscribe = vi.fn();
    mocks.onFeatureFlags.mockImplementation((callback: () => void) => {
      notifyFlagsLoaded = callback;
      return unsubscribe;
    });
    mocks.getFeatureFlag.mockReturnValue("product-proof");

    const { result } = renderHook(() =>
      useFeatureFlagVariant("homepage-product-proof-v1", {
        fallbackAfterMs: 500,
        fallbackVariant: "control",
      }),
    );

    expect(result.current).toBeUndefined();

    act(() => vi.advanceTimersByTime(500));

    expect(result.current).toBe("control");
    expect(unsubscribe).toHaveBeenCalledOnce();

    act(() => notifyFlagsLoaded?.());

    expect(mocks.getFeatureFlag).not.toHaveBeenCalled();
    expect(result.current).toBe("control");
  });
});
