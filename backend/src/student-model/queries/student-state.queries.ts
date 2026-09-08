import { PrismaService } from '@/prisma/prisma.service';
import { activeConceptWhere, activeSectionWhere } from '@/knowledge-graph/active-course-content';
import { MasteryState, Prisma } from '@prisma/client';

export async function loadAcademyAccess(
  prisma: PrismaService,
  userId: string,
  orgId: string,
  academyId: string,
) {
  return prisma.academy.findFirst({
    where: {
      id: academyId,
      orgId,
      archivedAt: null,
      org: { isActive: true },
      enrollments: { some: { userId } },
    },
    select: { id: true, orgId: true },
  });
}

/** Read the enrollment and content boundary together before assessment writes. */
export async function loadAssessmentAccess(
  prisma: PrismaService,
  userId: string,
  orgId: string,
  courseId: string,
  conceptId?: string,
  sectionId?: string,
) {
  return prisma.course.findFirst({
    where: {
      id: courseId,
      orgId,
      archivedAt: null,
      isPublished: true,
      org: { isActive: true },
      academy: { orgId, archivedAt: null },
      OR: [
        { enrollments: { some: { userId } } },
        { academy: { enrollments: { some: { userId } } } },
      ],
      ...(conceptId ? { concepts: { some: activeConceptWhere({ id: conceptId }) } } : {}),
      ...(sectionId ? { sections: { some: activeSectionWhere({ id: sectionId }) } } : {}),
    },
    select: { academyId: true },
  });
}

export async function loadConceptStatesForCourse(
  prisma: PrismaService,
  userId: string,
  courseId: string,
) {
  return prisma.studentConceptState.findMany({
    where: {
      userId,
      concept: activeConceptWhere({ courseId, course: { isPublished: true, archivedAt: null } }),
    },
    include: { concept: true },
  });
}

export async function loadConceptStatesForAcademy(
  prisma: PrismaService,
  userId: string,
  academyId: string,
) {
  return prisma.studentConceptState.findMany({
    where: {
      userId,
      concept: activeConceptWhere({
        course: { academyId, isPublished: true, archivedAt: null },
      }),
    },
    include: { concept: true },
  });
}

export async function loadConceptStatesForAcademyCourse(
  prisma: PrismaService,
  userId: string,
  academyId: string,
  courseId: string,
) {
  return prisma.studentConceptState.findMany({
    where: {
      userId,
      concept: activeConceptWhere({ courseId, course: { academyId, isPublished: true, archivedAt: null } }),
    },
    include: { concept: true },
  });
}

export async function loadAcademyCourseMasterySummary(
  prisma: PrismaService,
  userId: string,
  academyId: string,
) {
  const states = await prisma.studentConceptState.findMany({
    where: {
      userId,
      concept: activeConceptWhere({ course: { academyId, isPublished: true, archivedAt: null } }),
    },
    select: {
      conceptId: true,
      masteryState: true,
      concept: { select: { courseId: true } },
    },
  });

  const courseMap = new Map<
    string,
    { total: number; mastered: number; inProgress: number; unstarted: number }
  >();

  for (const state of states) {
    const courseId = state.concept.courseId;
    if (!courseMap.has(courseId)) {
      courseMap.set(courseId, { total: 0, mastered: 0, inProgress: 0, unstarted: 0 });
    }
    const entry = courseMap.get(courseId)!;
    entry.total++;
    if (state.masteryState === 'mastered') {
      entry.mastered++;
    } else if (state.masteryState === 'unstarted') {
      entry.unstarted++;
    } else {
      entry.inProgress++;
    }
  }

  return courseMap;
}

export async function loadMasteryMapForCourse(
  prisma: PrismaService,
  userId: string,
  courseId: string,
): Promise<Map<string, number>> {
  const states = await prisma.studentConceptState.findMany({
    where: {
      userId,
      concept: activeConceptWhere({ courseId, course: { isPublished: true, archivedAt: null } }),
    },
    select: { conceptId: true, masteryState: true, memory: true },
  });

  return toMasteryMap(states);
}

export async function loadMasteryMapForAcademy(
  prisma: PrismaService,
  userId: string,
  academyId: string,
): Promise<Map<string, number>> {
  const states = await prisma.studentConceptState.findMany({
    where: {
      userId,
      concept: activeConceptWhere({
        course: { academyId, isPublished: true, archivedAt: null },
      }),
    },
    select: { conceptId: true, masteryState: true, memory: true },
  });

  return toMasteryMap(states);
}

export async function loadConceptState(
  prisma: Prisma.TransactionClient,
  userId: string,
  conceptId: string,
) {
  return prisma.studentConceptState.findUnique({
    where: { userId_conceptId: { userId, conceptId } },
  });
}

export async function loadConceptStateWithConcept(
  prisma: PrismaService,
  userId: string,
  conceptId: string,
) {
  return prisma.studentConceptState.findUnique({
    where: { userId_conceptId: { userId, conceptId } },
    include: {
      concept: {
        include: { section: true },
      },
    },
  });
}

export async function loadConceptMemory(
  prisma: Prisma.TransactionClient,
  userId: string,
  conceptId: string,
): Promise<number> {
  const state = await prisma.studentConceptState.findUnique({
    where: { userId_conceptId: { userId, conceptId } },
    select: { memory: true },
  });

  return state?.memory ?? 1;
}

export async function loadKPState(
  prisma: Prisma.TransactionClient,
  userId: string,
  knowledgePointId: string,
) {
  return prisma.studentKPState.findUnique({
    where: { userId_knowledgePointId: { userId, knowledgePointId } },
  });
}

export async function loadKPStatesForIds(
  prisma: Prisma.TransactionClient,
  userId: string,
  knowledgePointIds: string[],
) {
  return prisma.studentKPState.findMany({
    where: {
      userId,
      knowledgePointId: { in: knowledgePointIds },
    },
    select: { passed: true },
  });
}

export async function loadConceptMasteryForIds(
  prisma: PrismaService,
  userId: string,
  conceptIds: string[],
): Promise<Map<string, MasteryState>> {
  if (conceptIds.length === 0) {
    return new Map();
  }

  const states = await prisma.studentConceptState.findMany({
    where: {
      userId,
      conceptId: { in: conceptIds },
    },
    select: { conceptId: true, masteryState: true },
  });

  return new Map(states.map((state) => [state.conceptId, state.masteryState]));
}

export async function countMasteredConcepts(
  prisma: PrismaService,
  userId: string,
  filter: { courseId?: string; academyId?: string },
): Promise<number> {
  const baseWhere: Prisma.ConceptWhereInput = {
    course: { isPublished: true, archivedAt: null },
  };
  if (filter.courseId) {
    baseWhere.courseId = filter.courseId;
  }
  if (filter.academyId) {
    baseWhere.course = { academyId: filter.academyId, isPublished: true, archivedAt: null };
  }

  return prisma.studentConceptState.count({
    where: {
      userId,
      concept: activeConceptWhere(baseWhere),
      masteryState: 'mastered',
    },
  });
}

export async function loadSectionState(
  prisma: Prisma.TransactionClient,
  userId: string,
  sectionId: string,
) {
  return prisma.studentSectionState.findUnique({
    where: { userId_sectionId: { userId, sectionId } },
    select: { status: true },
  });
}

export async function loadSectionStatesForCourse(
  prisma: PrismaService,
  userId: string,
  courseId: string,
) {
  return prisma.studentSectionState.findMany({
    where: {
      userId,
      courseId,
      course: { isPublished: true, archivedAt: null },
      section: activeSectionWhere(),
    },
    select: {
      sectionId: true,
      status: true,
    },
  });
}

export async function loadSectionStatesForAcademy(
  prisma: PrismaService,
  userId: string,
  academyId: string,
) {
  return prisma.studentSectionState.findMany({
    where: {
      userId,
      course: { academyId, isPublished: true, archivedAt: null },
      section: activeSectionWhere(),
    },
    select: {
      courseId: true,
      sectionId: true,
      status: true,
      section: {
        select: { sortOrder: true },
      },
    },
  });
}

export async function loadConceptStatesForFIRe(
  prisma: Prisma.TransactionClient,
  userId: string,
  academyId: string,
) {
  return prisma.studentConceptState.findMany({
    where: {
      userId,
      concept: activeConceptWhere({ course: { academyId, isPublished: true, archivedAt: null } }),
    },
    select: {
      conceptId: true,
      speed: true,
      repNum: true,
      memory: true,
    },
  });
}

export async function loadConceptStatesForDecay(
  prisma: PrismaService,
  userId: string,
  academyId: string,
) {
  return prisma.studentConceptState.findMany({
    where: {
      userId,
      concept: activeConceptWhere({
        course: { academyId, isPublished: true, archivedAt: null },
      }),
      masteryState: { not: 'unstarted' },
      lastPracticedAt: { not: null },
    },
    select: {
      userId: true,
      conceptId: true,
      memory: true,
      interval: true,
      lastPracticedAt: true,
      masteryState: true,
    },
  });
}

export async function loadConceptStatesForOrg(
  prisma: PrismaService,
  orgId: string,
) {
  return prisma.studentConceptState.findMany({
    where: {
      concept: activeConceptWhere({ course: { orgId } }),
    },
    select: {
      userId: true,
      masteryState: true,
      concept: {
        select: { courseId: true },
      },
    },
  });
}

function toMasteryMap(
  states: Array<{
    conceptId: string;
    masteryState: MasteryState;
    memory: number;
  }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const state of states) {
    const pL = state.memory === 1.0 && state.masteryState === 'unstarted' ? 0.5 : state.memory;
    map.set(state.conceptId, pL);
  }
  return map;
}
