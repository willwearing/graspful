import { PrismaService } from '@/prisma/prisma.service';
import { activeConceptWhere, activeSectionWhere } from '@/knowledge-graph/active-course-content';
import { MasteryState } from '@prisma/client';

export async function loadConceptStatesForCourse(
  prisma: PrismaService,
  userId: string,
  courseId: string,
) {
  return prisma.studentConceptState.findMany({
    where: {
      userId,
      concept: activeConceptWhere({ courseId }),
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
        course: { academyId },
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
      concept: activeConceptWhere({ courseId, course: { academyId } }),
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
      concept: activeConceptWhere({ course: { academyId } }),
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
      concept: activeConceptWhere({ courseId }),
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
        course: { academyId },
      }),
    },
    select: { conceptId: true, masteryState: true, memory: true },
  });

  return toMasteryMap(states);
}

export async function loadConceptState(
  prisma: PrismaService,
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
  prisma: PrismaService,
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
  prisma: PrismaService,
  userId: string,
  knowledgePointId: string,
) {
  return prisma.studentKPState.findUnique({
    where: { userId_knowledgePointId: { userId, knowledgePointId } },
  });
}

export async function loadKPStatesForIds(
  prisma: PrismaService,
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
  const conceptWhere: Record<string, unknown> = {};
  if (filter.courseId) {
    conceptWhere.courseId = filter.courseId;
  }
  if (filter.academyId) {
    conceptWhere.course = { academyId: filter.academyId };
  }

  return prisma.studentConceptState.count({
    where: {
      userId,
      concept: conceptWhere,
      masteryState: 'mastered',
    },
  });
}

export async function loadSectionState(
  prisma: PrismaService,
  userId: string,
  sectionId: string,
) {
  return prisma.studentSectionState.findUnique({
    where: { userId_sectionId: { userId, sectionId } },
    select: { status: true },
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
      course: { academyId },
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
  prisma: PrismaService,
  userId: string,
  academyId: string,
) {
  return prisma.studentConceptState.findMany({
    where: {
      userId,
      concept: activeConceptWhere({ course: { academyId } }),
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
        course: { academyId },
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
