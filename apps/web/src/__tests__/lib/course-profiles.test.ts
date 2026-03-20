import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCourseProfiles } from "@/lib/course-profiles";

const { mockApiFetch } = vi.hoisted(() => ({
  mockApiFetch: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: mockApiFetch,
}));

describe("fetchCourseProfiles", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it("returns fetched profiles keyed by course id", async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        totalConcepts: 37,
        mastered: 3,
        inProgress: 10,
        needsReview: 1,
        unstarted: 23,
        completionPercent: 8,
      })
      .mockResolvedValueOnce({
        totalConcepts: 12,
        mastered: 12,
        inProgress: 0,
        needsReview: 0,
        unstarted: 0,
        completionPercent: 100,
      });

    const profiles = await fetchCourseProfiles("posthog-tam", [
      { id: "course-1" },
      { id: "course-2" },
    ]);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/orgs/posthog-tam/courses/course-1/profile",
    );
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/orgs/posthog-tam/courses/course-2/profile",
    );
    expect(profiles.get("course-1")?.mastered).toBe(3);
    expect(profiles.get("course-1")?.totalConcepts).toBe(37);
    expect(profiles.get("course-2")?.completionPercent).toBe(100);
  });

  it("skips courses whose profile request fails", async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        totalConcepts: 37,
        mastered: 3,
        inProgress: 10,
        needsReview: 1,
        unstarted: 23,
        completionPercent: 8,
      })
      .mockRejectedValueOnce(new Error("boom"));

    const profiles = await fetchCourseProfiles("posthog-tam", [
      { id: "course-1" },
      { id: "course-2" },
    ]);

    expect(profiles.size).toBe(1);
    expect(profiles.has("course-1")).toBe(true);
    expect(profiles.has("course-2")).toBe(false);
  });
});
