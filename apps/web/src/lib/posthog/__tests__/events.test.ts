import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock posthog
vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
    captureException: vi.fn(),
    identify: vi.fn(),
    isFeatureEnabled: vi.fn(),
    reset: vi.fn(),
    __loaded: true,
  },
}));

import {
  trackSignUp,
  trackSignUpStarted,
  trackEnrollment,
  trackLessonComplete,
  trackQuizComplete,
  trackSubscription,
  trackDiagnosticComplete,
  captureError,
  resetPostHog,
  trackLandingCtaClick,
  trackDocsCodeCopied,
} from "../events";
import posthog from "posthog-js";

const captureExceptionMock = posthog.captureException as ReturnType<typeof vi.fn>;

describe("PostHog event helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trackSignUp identifies user without PII and captures sign_up event", () => {
    trackSignUp("user-123");
    expect(posthog.identify).toHaveBeenCalledWith("user-123");
    expect(posthog.capture).toHaveBeenCalledWith("sign_up", {
      method: "email",
    });
  });

  it("trackSignUpStarted captures the anonymous signup intent", () => {
    trackSignUpStarted("graspful");
    expect(posthog.capture).toHaveBeenCalledWith("sign_up_started", {
      method: "email",
      brand_id: "graspful",
    });
  });

  it("trackLandingCtaClick captures placement and destination", () => {
    trackLandingCtaClick("header", "graspful", "/sign-up");
    expect(posthog.capture).toHaveBeenCalledWith("landing_cta_clicked", {
      location: "header",
      brand_id: "graspful",
      destination: "/sign-up",
      page: "/",
    });
  });

  it("trackDocsCodeCopied captures the code context", () => {
    trackDocsCodeCopied("Install the CLI", "bash");
    expect(posthog.capture).toHaveBeenCalledWith("docs_code_copied", {
      title: "Install the CLI",
      language: "bash",
    });
  });

  it("resetPostHog clears PostHog identity state", () => {
    resetPostHog();
    expect(posthog.reset).toHaveBeenCalled();
  });

  it("captureError sends exception through PostHog error tracking", () => {
    captureError("Something broke", "auth-form");
    expect(posthog.captureException).toHaveBeenCalledWith(expect.any(Error), {
      source: "auth-form",
    });
    expect(captureExceptionMock.mock.calls[0][0].message).toBe("Something broke");
  });

  it("captureError omits source when not provided", () => {
    captureError("Oops");
    expect(posthog.captureException).toHaveBeenCalledWith(expect.any(Error), {});
  });

  it("captureError preserves existing Error instances and properties", () => {
    const error = new Error("Original");
    captureError(error, "route-error", { digest: "abc123" });
    expect(posthog.captureException).toHaveBeenCalledWith(error, {
      source: "route-error",
      digest: "abc123",
    });
  });

  it("trackEnrollment captures course_enrolled event", () => {
    trackEnrollment("course-abc", "NEC Electrical");
    expect(posthog.capture).toHaveBeenCalledWith("course_enrolled", {
      course_id: "course-abc",
      course_name: "NEC Electrical",
    });
  });

  it("trackLessonComplete captures lesson_completed event", () => {
    trackLessonComplete("concept-1", "Grounding", 120);
    expect(posthog.capture).toHaveBeenCalledWith("lesson_completed", {
      concept_id: "concept-1",
      concept_name: "Grounding",
      duration_seconds: 120,
    });
  });

  it("trackQuizComplete captures quiz_completed event", () => {
    trackQuizComplete("concept-1", true, 0.85);
    expect(posthog.capture).toHaveBeenCalledWith("quiz_completed", {
      concept_id: "concept-1",
      passed: true,
      score: 0.85,
    });
  });

  it("trackSubscription captures subscription_started event", () => {
    trackSubscription("individual", "monthly");
    expect(posthog.capture).toHaveBeenCalledWith("subscription_started", {
      plan: "individual",
      billing_period: "monthly",
    });
  });

  it("trackDiagnosticComplete captures diagnostic_completed event", () => {
    trackDiagnosticComplete("course-abc", 15, 50);
    expect(posthog.capture).toHaveBeenCalledWith("diagnostic_completed", {
      course_id: "course-abc",
      concepts_known: 15,
      total_concepts: 50,
    });
  });
});
