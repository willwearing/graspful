import type {
  MasteryState,
  NextTask,
  SectionProgress,
} from "@/lib/types";

interface SectionConcept {
  id: string;
  sortOrder: number;
  sectionId: string | null;
}

interface GetSectionHrefParams {
  courseId: string;
  courseUnlocked: boolean;
  concepts: SectionConcept[];
  nextTask: NextTask | null;
  sectionProgress: SectionProgress;
}

function getTaskHref(courseId: string, task: NextTask): string | null {
  switch (task.taskType) {
    case "lesson":
      return task.conceptId
        ? `/study/${courseId}/lesson/${task.conceptId}`
        : null;
    case "remediation":
      return task.conceptId
        ? `/study/${courseId}/lesson/${task.conceptId}?mode=remediation`
        : null;
    case "review":
      return task.conceptId
        ? `/study/${courseId}/review/${task.conceptId}`
        : null;
    case "section_exam":
      return task.sectionId
        ? `/study/${courseId}/sections/${task.sectionId}/exam`
        : null;
    case "quiz":
      return `/study/${courseId}/quiz`;
    default:
      return null;
  }
}

function findFirstConceptByState(
  concepts: SectionConcept[],
  conceptStates: Map<string, MasteryState>,
  states: MasteryState[],
): SectionConcept | undefined {
  return concepts.find((concept) => {
    const masteryState = conceptStates.get(concept.id) ?? "unstarted";
    return states.includes(masteryState);
  });
}

export function getSectionHref({
  courseId,
  courseUnlocked,
  concepts,
  nextTask,
  sectionProgress,
}: GetSectionHrefParams): string | null {
  if (!courseUnlocked) {
    return null;
  }

  if (sectionProgress.status === "locked" || sectionProgress.status === "certified") {
    return null;
  }

  if (sectionProgress.status === "exam_ready") {
    return `/study/${courseId}/sections/${sectionProgress.sectionId}/exam`;
  }

  const sectionConcepts = concepts
    .filter((concept) => concept.sectionId === sectionProgress.sectionId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const conceptStates = new Map(
    sectionProgress.conceptStates.map((state) => [
      state.conceptId,
      state.masteryState,
    ]),
  );
  const sectionConceptIds = new Set(sectionConcepts.map((concept) => concept.id));

  if (nextTask) {
    if (nextTask.sectionId === sectionProgress.sectionId) {
      return getTaskHref(courseId, nextTask);
    }

    if (
      nextTask.conceptId &&
      sectionConceptIds.has(nextTask.conceptId)
    ) {
      return getTaskHref(courseId, nextTask);
    }
  }

  if (sectionProgress.status === "needs_review") {
    const reviewConcept = findFirstConceptByState(sectionConcepts, conceptStates, [
      "needs_review",
    ]);
    if (reviewConcept) {
      return `/study/${courseId}/review/${reviewConcept.id}`;
    }
  }

  const activeLessonConcept = findFirstConceptByState(
    sectionConcepts,
    conceptStates,
    ["in_progress", "unstarted"],
  );
  if (activeLessonConcept) {
    return `/study/${courseId}/lesson/${activeLessonConcept.id}`;
  }

  return `/study/${courseId}`;
}
