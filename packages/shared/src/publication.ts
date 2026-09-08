import type { QualityCheckResult, QualityGateResult } from './quality-gate';

export interface CoursePublicationResponse {
  courseId: string;
  published: boolean;
  url?: string | null;
  review?: QualityGateResult;
  reviewFailures?: Array<QualityCheckResult | string>;
}

/** An HTTP success alone does not confirm that the publication gate passed. */
export function publicationFailures(result: CoursePublicationResponse): string[] {
  if (result.published === true) return [];

  const failures = [
    ...(result.reviewFailures ?? []),
    ...(result.review?.failures ?? []),
  ].map((failure) =>
    typeof failure === 'string'
      ? failure
      : `${failure.check}${failure.details ? `: ${failure.details}` : ''}`,
  );

  return failures.length > 0
    ? [...new Set(failures)]
    : ['The server did not confirm publication or return review failures.'];
}
