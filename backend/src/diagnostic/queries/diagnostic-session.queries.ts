import { PrismaService } from '@/prisma/prisma.service';
import {
  activeConceptWhere,
  activeKnowledgePointWhere,
} from '@/knowledge-graph/active-course-content';
import { SimpleEdge } from '@/knowledge-graph/graph-query.service';
import type {
  DiagnosticConceptRecord,
  DiagnosticCourseRecord,
  DiagnosticProblemRecord,
} from '../domain/diagnostic-session.types';

export async function loadAcademyDiagnosticConcepts(
  prisma: PrismaService,
  academyId: string,
): Promise<DiagnosticConceptRecord[]> {
  return prisma.concept.findMany({
    where: activeConceptWhere({
      course: { academyId },
    }),
    select: { id: true, slug: true, difficultyTheta: true, courseId: true },
  });
}

export async function loadAcademyDiagnosticEdges(
  prisma: PrismaService,
  academyId: string,
): Promise<SimpleEdge[]> {
  const prereqEdges = await prisma.prerequisiteEdge.findMany({
    where: {
      sourceConcept: activeConceptWhere({
        course: { academyId },
      }),
      targetConcept: activeConceptWhere({
        course: { academyId },
      }),
    },
  });

  return prereqEdges.map((edge) => ({
    source: edge.sourceConceptId,
    target: edge.targetConceptId,
  }));
}

export async function loadInProgressDiagnosticSession(
  prisma: PrismaService,
  userId: string,
  academyId: string,
) {
  return prisma.diagnosticSession.findFirst({
    where: { userId, academyId, status: 'in_progress' },
    include: {
      masterySnapshots: true,
      currentProblem: {
        include: { knowledgePoint: { select: { conceptId: true } } },
      },
    },
  });
}

export async function loadDiagnosticSessionById(
  prisma: PrismaService,
  sessionId: string,
) {
  return prisma.diagnosticSession.findUnique({
    where: { id: sessionId },
    include: {
      masterySnapshots: true,
      currentProblem: {
        include: { knowledgePoint: { select: { conceptId: true } } },
      },
    },
  });
}

export async function loadDiagnosticProblemsForConcept(
  prisma: PrismaService,
  conceptId: string,
): Promise<DiagnosticProblemRecord[]> {
  return prisma.problem.findMany({
    where: {
      knowledgePoint: activeKnowledgePointWhere({ conceptId }),
      isArchived: false,
      isReviewVariant: false,
    },
    include: {
      knowledgePoint: { select: { conceptId: true } },
    },
  });
}

export async function loadDiagnosticConceptCourseMap(
  prisma: PrismaService,
  conceptIds: string[],
): Promise<Map<string, { courseId: string; courseName: string }>> {
  if (conceptIds.length === 0) {
    return new Map();
  }

  const concepts = await prisma.concept.findMany({
    where: { id: { in: conceptIds } },
    select: { id: true, courseId: true, course: { select: { name: true } } },
  });

  return new Map(
    concepts
      .filter((concept) => concept.courseId)
      .map((concept) => [
        concept.id,
        {
          courseId: concept.courseId,
          courseName: concept.course.name,
        },
      ]),
  );
}

export async function loadDiagnosticCourseNames(
  prisma: PrismaService,
  academyId: string,
): Promise<Map<string, DiagnosticCourseRecord>> {
  const courses = await prisma.course.findMany({
    where: { academyId },
    select: { id: true, name: true },
  });

  return new Map(courses.map((course) => [course.id, course]));
}
