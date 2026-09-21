import { beforeEach, describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { initPostHog } from "@/lib/posthog/client";
import { trackAuthFormEvent } from "@/lib/posthog/events";

vi.mock("posthog-js", () => ({ default: { __loaded: true, capture: vi.fn() } }));
vi.mock("@/lib/posthog/client", () => ({ initPostHog: vi.fn() }));

describe("auth funnel events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    posthog.__loaded = true;
  });

  it("initializes before the first view and sends only bounded form context", () => {
    trackAuthFormEvent("sign-in", "viewed", "use-case-selling");
    expect(initPostHog).toHaveBeenCalledOnce();
    expect(posthog.capture).toHaveBeenCalledWith("sign_in_viewed", { method: "email", brand_id: "use-case-selling" });
    trackAuthFormEvent("sign-up", "failed", "use-case-selling", "authentication");
    expect(posthog.capture).toHaveBeenLastCalledWith("sign_up_failed", {
      method: "email", brand_id: "use-case-selling", failure_stage: "authentication",
    });
  });

  it("does not send when analytics is unavailable", () => {
    posthog.__loaded = false;
    trackAuthFormEvent("sign-in", "submitted", "graspful");
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("keeps analytics failures out of the authentication flow", () => {
    vi.mocked(posthog.capture).mockImplementationOnce(() => { throw new Error("Analytics blocked"); });
    expect(() => trackAuthFormEvent("sign-in", "submitted", "graspful")).not.toThrow();
  });
});
