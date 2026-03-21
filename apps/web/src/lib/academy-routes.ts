import type { NextTask } from "@/lib/types";

export function getAcademyHref(academyId: string) {
  return `/academy/${academyId}`;
}

export function getAcademyStudyHref(academyId: string) {
  return `${getAcademyHref(academyId)}/study`;
}

export function getCourseBrowseHref(courseId: string) {
  return `/browse/${courseId}`;
}

export function getCourseTaskHref(courseId: string, task: NextTask): string | null {
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

export function getAcademyDiagnosticHref(academyId: string) {
  return `${getAcademyHref(academyId)}/diagnostic`;
}

export function getContinueStudyingHref(courseId: string, academyId?: string | null) {
  if (academyId) {
    return getAcademyStudyHref(academyId);
  }

  return `/study/${courseId}`;
}
