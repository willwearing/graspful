import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { activeConceptWhere } from '@/knowledge-graph/active-course-content';
import { Prisma } from '@prisma/client';

export async function getAcademyIdForCourse(
  prisma: PrismaService,
  courseId: string,
): Promise<string> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { academyId: true },
  });

  if (!course?.academyId) {
    throw new NotFoundException('Course academy not found');
  }

  return course.academyId;
}

export async function ensureConceptStatesForAcademy(
  prisma: PrismaService,
  userId: string,
  academyId: string,
): Promise<void> {
  const academy = await prisma.academy.findFirst({
    where: { id: academyId, archivedAt: null, org: { isActive: true } },
    select: {
      orgId: true,
      enrollments: { where: { userId }, select: { id: true } },
    },
  });
  if (!academy) {
    throw new NotFoundException('Academy or enrollment not found');
  }

  const courseScope: Prisma.CourseWhereInput = {
    academyId,
    orgId: academy.orgId,
    archivedAt: null,
    isPublished: true,
  };
  if (academy.enrollments.length === 0) {
    // Legacy course enrollments authorize only those courses, not their siblings.
    courseScope.enrollments = { some: { userId } };
    const enrolledCourse = await prisma.course.findFirst({
      where: courseScope,
      select: { id: true },
    });
    if (!enrolledCourse) {
      throw new NotFoundException('Academy or enrollment not found');
    }
  }

  const [concepts, existingStates] = await Promise.all([
    prisma.concept.findMany({
      where: activeConceptWhere({
        course: courseScope,
      }),
      select: { id: true },
    }),
    prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: activeConceptWhere({
          course: courseScope,
        }),
      },
      select: { conceptId: true },
    }),
  ]);

  const existingConceptIds = new Set(existingStates.map((state) => state.conceptId));
  const missingConceptIds = concepts
    .map((concept) => concept.id)
    .filter((conceptId) => !existingConceptIds.has(conceptId));

  if (missingConceptIds.length === 0) {
    return;
  }

  await prisma.studentConceptState.createMany({
    data: missingConceptIds.map((conceptId) => ({
      userId,
      conceptId,
    })),
    skipDuplicates: true,
  });
}
