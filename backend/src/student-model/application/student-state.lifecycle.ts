import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { activeConceptWhere } from '@/knowledge-graph/active-course-content';

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
  const [concepts, existingStates] = await Promise.all([
    prisma.concept.findMany({
      where: activeConceptWhere({
        course: { academyId },
      }),
      select: { id: true },
    }),
    prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: activeConceptWhere({
          course: { academyId },
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
