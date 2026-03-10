import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock posthog
vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
    identify: vi.fn(),
    __loaded: true,
  },
}));

import {
  trackSignUp,
  trackEnrollment,
  trackLessonComplete,
  trackQuizComplete,
  trackSubscription,
  trackDiagnosticComplete,
} from "../events";
import posthog from "posthog-js";

describe("PostHog event helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trackSignUp captures sign_up event", () => {
    trackSignUp("user-123", "test@example.com");
    expect(posthog.identify).toHaveBeenCalledWith("user-123", {
      email: "test@example.com",
    });
    expect(posthog.capture).toHaveBeenCalledWith("sign_up", {
      method: "email",
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
