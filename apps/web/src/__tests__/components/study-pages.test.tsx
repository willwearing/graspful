import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import CourseStudyPage from "@/app/(app)/study/[courseId]/page";
import AcademyStudyPage from "@/app/(app)/academy/[academyId]/study/page";
import LearnCourseStudyPage from "@/app/learn/[orgSlug]/courses/[courseSlug]/study/page";
import LearnAcademyStudyPage from "@/app/learn/[orgSlug]/academies/[academySlug]/study/page";
import QuizPage from "@/app/(app)/study/[courseId]/quiz/page";
import ReviewPage from "@/app/(app)/study/[courseId]/review/[conceptId]/page";
import SectionExamPage from "@/app/(app)/study/[courseId]/sections/[sectionId]/exam/page";
import LearnQuizPage from "@/app/learn/[orgSlug]/courses/[courseSlug]/study/quiz/page";
import LearnReviewPage from "@/app/learn/[orgSlug]/courses/[courseSlug]/study/review/[conceptId]/page";
import LearnSectionExamPage from "@/app/learn/[orgSlug]/courses/[courseSlug]/study/sections/[sectionId]/exam/page";

const apiFetch = vi.fn();
const push = vi.fn();
const redirect = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }), redirect: (...args: unknown[]) => redirect(...args) }));
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => apiFetch(...args), createApiFetcher: () => apiFetch }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: {
    getUser: async () => ({ data: { user: { id: "learner" } } }),
    getSession: async () => ({ data: { session: { access_token: "token" } } }),
  } }),
}));
vi.mock("@/lib/brand/resolve", () => ({ resolvePageBrand: async () => ({ orgSlug: "acme" }) }));
vi.mock("@/lib/learn-server", () => ({
  requireLearnAccess: async () => ({ token: "token", serverApiFetch: apiFetch }),
  resolveCourseBySlug: async () => ({ id: "course-1", slug: "basics" }),
  resolveAcademyBySlug: async () => ({ id: "academy-1", slug: "training" }),
}));

const courseParams = Promise.resolve({ courseId: "course-1", conceptId: "concept-1", sectionId: "section-1" });
const learnParams = Promise.resolve({ orgSlug: "acme", courseSlug: "basics", academySlug: "training", conceptId: "concept-1", sectionId: "section-1" });
const task = { taskType: "lesson", courseId: "course-1", conceptId: "concept-1", reason: "Next" };

beforeEach(() => {
  apiFetch.mockReset();
  push.mockReset();
  redirect.mockReset();
});

describe("Study page server/client contract", () => {
  it.each([
    ["course", () => LearnCourseStudyPage({ params: learnParams })],
    ["academy", () => LearnAcademyStudyPage({ params: learnParams })],
  ])("passes serializable route data for the %s study entry", async (_name, page) => {
    apiFetch.mockResolvedValueOnce(task).mockResolvedValueOnce([{ id: "course-1", slug: "basics" }]);
    const result = await page();
    const clientElement = result.props.children as ReactElement<Record<string, unknown>>;
    expect(() => structuredClone(clientElement.props)).not.toThrow();
    expect(clientElement.props.taskHref).toBe("/learn/acme/courses/basics/study/lesson/concept-1");
    render(result);
    expect(push).toHaveBeenCalledWith("/learn/acme/courses/basics/study/lesson/concept-1");
  });

  it.each([
    ["course", () => CourseStudyPage({ params: courseParams })],
    ["academy", () => AcademyStudyPage({ params: Promise.resolve({ academyId: "academy-1" }) })],
    ["platform course", () => LearnCourseStudyPage({ params: learnParams })],
    ["platform academy", () => LearnAcademyStudyPage({ params: learnParams })],
  ])("shows an error when the %s next-task request fails", async (_name, page) => {
    apiFetch.mockRejectedValueOnce(new Error("backend unavailable"));
    render(await page());
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your next activity");
    expect(screen.queryByText("Session Complete")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows an error when academy task routing data cannot be loaded", async () => {
    apiFetch.mockResolvedValueOnce(task).mockRejectedValueOnce(new Error("backend unavailable"));
    render(await LearnAcademyStudyPage({ params: learnParams }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("routes a course entry to the course chosen by the academy scheduler", async () => {
    apiFetch.mockResolvedValueOnce({ ...task, courseId: "course-2" })
      .mockResolvedValueOnce([{ id: "course-2", slug: "next-course" }]);
    render(await LearnCourseStudyPage({ params: learnParams }));
    expect(push).toHaveBeenCalledWith("/learn/acme/courses/next-course/study/lesson/concept-1");
  });
});

describe("Activity start recovery", () => {
  it.each([
    ["quiz", () => QuizPage({ params: courseParams })],
    ["review", () => ReviewPage({ params: courseParams })],
    ["section exam", () => SectionExamPage({ params: courseParams })],
    ["platform quiz", () => LearnQuizPage({ params: learnParams })],
    ["platform review", () => LearnReviewPage({ params: learnParams })],
    ["platform section exam", () => LearnSectionExamPage({ params: learnParams })],
  ])("keeps the %s start failure available for retry", async (_name, page) => {
    apiFetch.mockRejectedValueOnce(new Error("backend unavailable"));
    render(await page());
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Back to Course" })).toHaveAttribute("href");
    expect(redirect).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
