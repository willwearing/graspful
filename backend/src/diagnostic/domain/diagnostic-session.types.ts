import type { Prisma } from '@prisma/client';
import type { ClientProblem } from '@/shared/utils/problem-presentation';
import { serializeProblemForClient } from '@/shared/utils/problem-presentation';
import { classifyDiagnosticState } from '../bkt-engine';

export interface DiagnosticAnswerInput {
  answer: unknown;
  responseTimeMs: number;
}

export interface DiagnosticConceptRecord {
  id: string;
  difficultyTheta: number;
  courseId: string;
}

export interface DiagnosticCourseRecord {
  id: string;
  name: string;
}

export type DiagnosticProblemRecord = Prisma.ProblemGetPayload<{
  include: { knowledgePoint: { select: { conceptId: true } } };
}>;

export interface DiagnosticSessionQuestion {
  sessionId: string;
  questionNumber: number;
  totalEstimated: number;
  isComplete: boolean;
  question: ClientProblem | null;
}

export interface DiagnosticSessionProgress extends DiagnosticSessionQuestion {
  wasCorrect?: boolean;
}

export interface DiagnosticConceptDetail {
  conceptId: string;
  pL: number;
  classification: ReturnType<typeof classifyDiagnosticState>;
}

export interface DiagnosticCourseBreakdownEntry {
  courseId: string;
  courseName: string;
  totalConcepts: number;
  mastered: number;
  partiallyKnown: number;
  unknown: number;
}

export interface DiagnosticResult {
  totalConcepts: number;
  questionsAnswered: number;
  breakdown: Record<
    ReturnType<typeof classifyDiagnosticState>,
    number
  >;
  conceptDetails: DiagnosticConceptDetail[];
  courseBreakdown: DiagnosticCourseBreakdownEntry[];
}

export interface DiagnosticSessionCompletion {
  sessionId: string;
  isComplete: true;
  questionsAnswered: number;
  result: DiagnosticResult;
}

function createEmptyBreakdown(): DiagnosticResult['breakdown'] {
  return {
    mastered: 0,
    conditionally_mastered: 0,
    partially_known: 0,
    unknown: 0,
  };
}

export function toClientDiagnosticProblem(
  problem: DiagnosticProblemRecord,
): ClientProblem {
  return serializeProblemForClient({
    id: problem.id,
    questionText: problem.questionText,
    type: problem.type,
    options: problem.options,
    difficulty: problem.difficulty,
  });
}

export function buildDiagnosticCourseBreakdown(
  conceptDetails: DiagnosticConceptDetail[],
  conceptCourseMap?: Map<string, { courseId: string; courseName: string }>,
): DiagnosticCourseBreakdownEntry[] {
  if (!conceptCourseMap || conceptCourseMap.size === 0) {
    return [];
  }

  const courseAgg = new Map<
    string,
    DiagnosticCourseBreakdownEntry
  >();

  for (const detail of conceptDetails) {
    const courseInfo = conceptCourseMap.get(detail.conceptId);
    if (!courseInfo) {
      continue;
    }

    if (!courseAgg.has(courseInfo.courseId)) {
      courseAgg.set(courseInfo.courseId, {
        courseId: courseInfo.courseId,
        courseName: courseInfo.courseName,
        totalConcepts: 0,
        mastered: 0,
        partiallyKnown: 0,
        unknown: 0,
      });
    }

    const entry = courseAgg.get(courseInfo.courseId)!;
    entry.totalConcepts++;

    if (detail.classification === 'mastered') {
      entry.mastered++;
    } else if (detail.classification === 'unknown') {
      entry.unknown++;
    } else {
      entry.partiallyKnown++;
    }
  }

  return Array.from(courseAgg.values());
}

export function buildDiagnosticResult(
  masteries: Map<string, number>,
  questionCount: number,
  conceptCourseMap?: Map<string, { courseId: string; courseName: string }>,
): DiagnosticResult {
  const breakdown = createEmptyBreakdown();

  for (const pL of masteries.values()) {
    const state = classifyDiagnosticState(pL);
    breakdown[state]++;
  }

  const conceptDetails = Array.from(masteries.entries()).map(
    ([conceptId, pL]) => ({
      conceptId,
      pL: Math.round(pL * 1000) / 1000,
      classification: classifyDiagnosticState(pL),
    }),
  );

  return {
    totalConcepts: masteries.size,
    questionsAnswered: questionCount,
    breakdown,
    conceptDetails,
    courseBreakdown: buildDiagnosticCourseBreakdown(
      conceptDetails,
      conceptCourseMap,
    ),
  };
}
