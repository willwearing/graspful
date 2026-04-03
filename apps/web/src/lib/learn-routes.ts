import type { NextTask } from "@/lib/types";

function encodePathPart(value: string): string {
  return encodeURIComponent(value);
}

export function getLearnOrgHref(orgSlug: string) {
  return `/learn/${encodePathPart(orgSlug)}`;
}

export function getLearnAcademyHref(orgSlug: string, academySlug: string) {
  return `${getLearnOrgHref(orgSlug)}/academies/${encodePathPart(academySlug)}`;
}

export function getLearnAcademyStudyHref(orgSlug: string, academySlug: string) {
  return `${getLearnAcademyHref(orgSlug, academySlug)}/study`;
}

export function getLearnAcademyDiagnosticHref(orgSlug: string, academySlug: string) {
  return `${getLearnAcademyHref(orgSlug, academySlug)}/diagnostic`;
}

export function getLearnCourseHref(orgSlug: string, courseSlug: string) {
  return `${getLearnOrgHref(orgSlug)}/courses/${encodePathPart(courseSlug)}`;
}

export function getLearnCourseStudyHref(orgSlug: string, courseSlug: string) {
  return `${getLearnCourseHref(orgSlug, courseSlug)}/study`;
}

export function getLearnCourseDiagnosticHref(orgSlug: string, courseSlug: string) {
  return `${getLearnCourseHref(orgSlug, courseSlug)}/diagnostic`;
}

export function getLearnLessonHref(
  orgSlug: string,
  courseSlug: string,
  conceptId: string,
) {
  return `${getLearnCourseStudyHref(orgSlug, courseSlug)}/lesson/${encodePathPart(conceptId)}`;
}

export function getLearnReviewHref(
  orgSlug: string,
  courseSlug: string,
  conceptId: string,
) {
  return `${getLearnCourseStudyHref(orgSlug, courseSlug)}/review/${encodePathPart(conceptId)}`;
}

export function getLearnQuizHref(orgSlug: string, courseSlug: string) {
  return `${getLearnCourseStudyHref(orgSlug, courseSlug)}/quiz`;
}

export function getLearnSectionExamHref(
  orgSlug: string,
  courseSlug: string,
  sectionId: string,
) {
  return `${getLearnCourseStudyHref(orgSlug, courseSlug)}/sections/${encodePathPart(sectionId)}/exam`;
}

export function getLearnTaskHref(
  orgSlug: string,
  courseSlug: string,
  task: NextTask,
): string | null {
  switch (task.taskType) {
    case "lesson":
      return task.conceptId ? getLearnLessonHref(orgSlug, courseSlug, task.conceptId) : null;
    case "remediation":
      return task.conceptId
        ? `${getLearnLessonHref(orgSlug, courseSlug, task.conceptId)}?mode=remediation`
        : null;
    case "review":
      return task.conceptId ? getLearnReviewHref(orgSlug, courseSlug, task.conceptId) : null;
    case "section_exam":
      return task.sectionId ? getLearnSectionExamHref(orgSlug, courseSlug, task.sectionId) : null;
    case "quiz":
      return getLearnQuizHref(orgSlug, courseSlug);
    default:
      return null;
  }
}

export function extractOrgSlugFromLearnPath(pathname: string): string | null {
  const match = pathname.match(/^\/learn\/([^/]+)(?:\/|$)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
