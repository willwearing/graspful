import { apiFetch, type ApiFetcher } from "@/lib/api";

export interface CourseProfile {
  totalConcepts: number;
  mastered: number;
  inProgress: number;
  needsReview: number;
  unstarted: number;
  completionPercent: number;
}

export async function fetchCourseProfiles(
  orgSlug: string,
  courses: Array<{ id: string }>,
  fetcher: ApiFetcher = apiFetch,
): Promise<Map<string, CourseProfile>> {
  const profiles = new Map<string, CourseProfile>();

  const profileResults = await Promise.allSettled(
    courses.map(async (course) => {
      const profile = await fetcher<CourseProfile>(
        `/orgs/${orgSlug}/courses/${course.id}/profile`,
      );

      return { courseId: course.id, profile };
    }),
  );

  for (const result of profileResults) {
    if (result.status === "fulfilled") {
      profiles.set(result.value.courseId, result.value.profile);
    }
  }

  return profiles;
}
