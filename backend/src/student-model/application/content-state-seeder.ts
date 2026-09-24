import type { Prisma } from '@prisma/client';

/** Seed imported content inside the import transaction without resetting existing progress. */
export async function seedStudentStateForNewConcepts(
  tx: Prisma.TransactionClient,
  courseId: string,
  conceptIds: string[],
  sectionIds: string[],
): Promise<void> {
  if (conceptIds.length === 0 && sectionIds.length === 0) return;
  const enrollments = await tx.courseEnrollment.findMany({
    where: { courseId },
    select: { userId: true },
  });
  if (enrollments.length === 0) return;
  if (conceptIds.length > 0) {
    await tx.studentConceptState.createMany({
      data: enrollments.flatMap(({ userId }) => conceptIds.map((conceptId) => ({ userId, conceptId }))),
      skipDuplicates: true,
    });
  }
  if (sectionIds.length > 0) {
    await tx.studentSectionState.createMany({
      data: enrollments.flatMap(({ userId }) => sectionIds.map((sectionId) => ({
        userId, courseId, sectionId, status: 'locked',
      }))),
      skipDuplicates: true,
    });
  }
}
