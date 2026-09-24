import * as learn from '@/lib/learn-routes';

/** A server-side route builder shared by branded and learning-hub views. */
export interface LearnerRoutes {
  course: string;
  study: string;
  diagnostic: string;
  home: string;
  lesson: (conceptId: string) => string;
  academy: (id: string, slug: string) => string;
  academyStudy: (id: string, slug: string) => string;
  academyDiagnostic: (id: string, slug: string) => string;
  fromCoursePath: (path: string) => string;
}

export function appLearnerRoutes(courseId: string): LearnerRoutes {
  const id = encodeURIComponent(courseId);
  return {
    course: `/browse/${id}`,
    study: `/study/${id}`,
    diagnostic: `/diagnostic/${id}`,
    home: '/browse',
    lesson: (conceptId) => `/study/${id}/lesson/${encodeURIComponent(conceptId)}`,
    academy: (academyId) => `/academy/${encodeURIComponent(academyId)}`,
    academyStudy: (academyId) => `/academy/${encodeURIComponent(academyId)}/study`,
    academyDiagnostic: (academyId) => `/academy/${encodeURIComponent(academyId)}/diagnostic`,
    fromCoursePath: (path) => path,
  };
}

export function learnLearnerRoutes(orgSlug: string, courseSlug: string, courseId: string): LearnerRoutes {
  const study = learn.getLearnCourseStudyHref(orgSlug, courseSlug);
  return {
    course: learn.getLearnCourseHref(orgSlug, courseSlug),
    study,
    diagnostic: learn.getLearnCourseDiagnosticHref(orgSlug, courseSlug),
    home: learn.getLearnOrgHref(orgSlug),
    lesson: (conceptId) => learn.getLearnLessonHref(orgSlug, courseSlug, conceptId),
    academy: (_id, slug) => learn.getLearnAcademyHref(orgSlug, slug),
    academyStudy: (_id, slug) => learn.getLearnAcademyStudyHref(orgSlug, slug),
    academyDiagnostic: (_id, slug) => learn.getLearnAcademyDiagnosticHref(orgSlug, slug),
    fromCoursePath: (path) => path.replace(`/study/${courseId}`, study),
  };
}
