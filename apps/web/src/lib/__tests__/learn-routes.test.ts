import { describe, expect, it } from "vitest";
import {
  extractOrgSlugFromLearnPath,
  getLearnAcademyHref,
  getLearnCourseHref,
  getLearnLessonHref,
} from "@/lib/learn-routes";

describe("learn-routes", () => {
  it("builds platform learner URLs from org and slug", () => {
    expect(getLearnAcademyHref("posthog-tam", "posthog-tam")).toBe(
      "/learn/posthog-tam/academies/posthog-tam",
    );
    expect(getLearnCourseHref("posthog-tam", "posthog-data-model")).toBe(
      "/learn/posthog-tam/courses/posthog-data-model",
    );
    expect(getLearnLessonHref("posthog-tam", "posthog-data-model", "concept-1")).toBe(
      "/learn/posthog-tam/courses/posthog-data-model/study/lesson/concept-1",
    );
  });

  it("extracts org slug from platform learner paths", () => {
    expect(extractOrgSlugFromLearnPath("/learn/posthog-tam")).toBe("posthog-tam");
    expect(extractOrgSlugFromLearnPath("/learn/posthog-tam/courses/posthog-data-model")).toBe(
      "posthog-tam",
    );
    expect(extractOrgSlugFromLearnPath("/dashboard")).toBeNull();
  });
});
