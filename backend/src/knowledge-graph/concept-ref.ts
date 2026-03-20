export interface ResolvedConceptRef {
  originalRef: string;
  courseSlug: string;
  conceptSlug: string;
  qualifiedRef: string;
  isQualified: boolean;
}

export function buildQualifiedConceptRef(
  courseSlug: string,
  conceptSlug: string,
): string {
  return `${courseSlug}:${conceptSlug}`;
}

export function parseConceptRef(
  ref: string,
  currentCourseSlug: string,
): ResolvedConceptRef {
  const trimmed = ref.trim();

  if (!trimmed) {
    throw new Error('Concept refs must not be empty');
  }

  if (!trimmed.includes(':')) {
    return {
      originalRef: ref,
      courseSlug: currentCourseSlug,
      conceptSlug: trimmed,
      qualifiedRef: buildQualifiedConceptRef(currentCourseSlug, trimmed),
      isQualified: false,
    };
  }

  const parts = trimmed.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      `Invalid concept ref "${ref}". Qualified refs must use "course-slug:concept-slug".`,
    );
  }

  return {
    originalRef: ref,
    courseSlug: parts[0],
    conceptSlug: parts[1],
    qualifiedRef: buildQualifiedConceptRef(parts[0], parts[1]),
    isQualified: true,
  };
}
