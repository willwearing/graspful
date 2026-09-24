import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseView } from "@/lib/server-views/course";
import { appLearnerRoutes, learnLearnerRoutes } from "@/lib/learner-routes";
import { ApiError, type ApiFetcher } from "@/lib/api-core";
import type { CourseGraph, CourseProfile, SectionProgress } from "@graspful/shared";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/components/app/page-view-tracker", () => ({ CourseBrowseTracker: () => null }));

const section = { id: "section-id", slug: "section", name: "Section one", description: null, sortOrder: 0 };
const graph: CourseGraph = {
  course: { id: "course-id", academyId: "academy-id", name: "Course one", description: null },
  sections: [section],
  concepts: [{ id: "concept-id", slug: "concept", name: "Concept one", description: null, sortOrder: 0, difficulty: 1, sectionId: section.id }],
};
const profile: CourseProfile = {
  totalConcepts: 1, mastered: 0, inProgress: 1, needsReview: 0, unstarted: 0, completionPercent: 0,
};
const progress: SectionProgress = {
  sectionId: section.id, status: "exam_ready", examPassedAt: null, attempts: 0, latestAttempt: null,
  section: { ...section, concepts: [{ id: "concept-id", name: "Concept one" }] },
  conceptStates: [{ conceptId: "concept-id", masteryState: "in_progress" }],
};

function courseFetcher(progressAvailable = true) {
  return vi.fn(async (path: string) => {
    if (path.endsWith("/graph")) return structuredClone(graph);
    if (path.endsWith("/academies/academy-id")) return { id: "academy-id", slug: "academy", name: "Academy one", description: null };
    if (!progressAvailable) throw new ApiError(404, "Not enrolled");
    if (path.endsWith("/profile")) return profile;
    if (path.endsWith("/sections")) return [progress];
    if (path.endsWith("/mastery")) return progress.conceptStates;
    if (path.endsWith("/next-task")) return { taskType: "section_exam", sectionId: section.id };
    throw new Error(`Unexpected request: ${path}`);
  });
}

describe("shared course view", () => {
  it.each([
    ["app", appLearnerRoutes("course-id"), "/academy/academy-id", "/study/course-id/sections/section-id/exam", "/study/course-id/lesson/concept-id"],
    ["learning hub", learnLearnerRoutes("school", "course", "course-id"), "/learn/school/academies/academy", "/learn/school/courses/course/study/sections/section-id/exam", "/learn/school/courses/course/study/lesson/concept-id"],
  ] as const)("keeps %s section and concept links on the requested surface", async (_name, routes, academyHref, examHref, lessonHref) => {
    render(await CourseView({ orgSlug: "school", courseId: "course-id", routes, fetcher: courseFetcher() as ApiFetcher }));
    expect(screen.getByRole("heading", { name: "Course one" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to Academy" })).toHaveAttribute("href", academyHref);
    expect(screen.getByRole("link", { name: /Section one/ })).toHaveAttribute("href", examHref);
    expect(screen.getByRole("link", { name: /Concept one/ })).toHaveAttribute("href", lessonHref);
  });

  it("allows unenrolled members to browse while keeping their lesson links locked", async () => {
    const fetcher = courseFetcher(false);
    render(await CourseView({ orgSlug: "school", courseId: "course-id", routes: learnLearnerRoutes("school", "course", "course-id"), fetcher: fetcher as ApiFetcher }));
    expect(screen.getByRole("heading", { name: "Course one" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Concept one/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take Diagnostic" })).toHaveAttribute("href", "/learn/school/academies/academy/diagnostic");
    expect(fetcher.mock.calls.every((args) => args.length === 1)).toBe(true);
  });

  it("renders an inaccessible course as not found", async () => {
    const fetcher = vi.fn().mockRejectedValue(new ApiError(404, "No access"));
    await expect(CourseView({ orgSlug: "school", courseId: "course-id", routes: appLearnerRoutes("course-id"), fetcher })).rejects.toThrow("not-found");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("lets the error boundary handle a backend outage", async () => {
    const failure = new ApiError(503, "Service unavailable");
    await expect(CourseView({ orgSlug: "school", courseId: "course-id", routes: appLearnerRoutes("course-id"), fetcher: vi.fn().mockRejectedValue(failure) })).rejects.toBe(failure);
  });
});
