import { describe, expect, it } from "vitest";
import { getSectionHref } from "@/lib/course-section-entry";
import type { NextTask, SectionProgress } from "@/lib/types";

const concepts = [
  { id: "concept-1", sectionId: "section-1", sortOrder: 1 },
  { id: "concept-2", sectionId: "section-1", sortOrder: 2 },
  { id: "concept-3", sectionId: "section-2", sortOrder: 3 },
];

function buildSectionProgress(
  overrides: Partial<SectionProgress> = {},
): SectionProgress {
  return {
    sectionId: "section-1",
    status: "lesson_in_progress",
    examPassedAt: null,
    attempts: 0,
    section: {
      id: "section-1",
      slug: "section-1",
      name: "Section 1",
      description: null,
      sortOrder: 1,
      sectionExamConfig: null,
      concepts: [
        { id: "concept-1", name: "Concept 1" },
        { id: "concept-2", name: "Concept 2" },
      ],
    },
    conceptStates: [
      { conceptId: "concept-1", masteryState: "in_progress" },
      { conceptId: "concept-2", masteryState: "unstarted" },
    ],
    latestAttempt: null,
    ...overrides,
  };
}

describe("getSectionHref", () => {
  it("does not unlock section cards before the course is unlocked", () => {
    expect(
      getSectionHref({
        courseId: "course-1",
        courseUnlocked: false,
        concepts,
        nextTask: null,
        sectionProgress: buildSectionProgress(),
      }),
    ).toBeNull();
  });

  it("uses the exact task route when the current task belongs to the section", () => {
    const nextTask: NextTask = {
      taskType: "lesson",
      conceptId: "concept-2",
      reason: "next lesson",
    };

    expect(
      getSectionHref({
        courseId: "course-1",
        courseUnlocked: true,
        concepts,
        nextTask,
        sectionProgress: buildSectionProgress(),
      }),
    ).toBe("/study/course-1/lesson/concept-2");
  });

  it("falls back to the first reviewable concept for needs-review sections", () => {
    expect(
      getSectionHref({
        courseId: "course-1",
        courseUnlocked: true,
        concepts,
        nextTask: null,
        sectionProgress: buildSectionProgress({
          status: "needs_review",
          conceptStates: [
            { conceptId: "concept-1", masteryState: "needs_review" },
            { conceptId: "concept-2", masteryState: "mastered" },
          ],
        }),
      }),
    ).toBe("/study/course-1/review/concept-1");
  });

  it("routes exam-ready sections to the section exam", () => {
    expect(
      getSectionHref({
        courseId: "course-1",
        courseUnlocked: true,
        concepts,
        nextTask: null,
        sectionProgress: buildSectionProgress({ status: "exam_ready" }),
      }),
    ).toBe("/study/course-1/sections/section-1/exam");
  });
});
