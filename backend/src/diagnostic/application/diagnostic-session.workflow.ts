import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { evaluateAnswer } from '@/assessment/answer-evaluator';
import { getLogger, SeverityNumber } from '@/telemetry/otel-logger';
import { updateMasteryAfterCorrect, updateMasteryAfterIncorrect, applyTimeDiscount, BKT_DEFAULTS, classifyDiagnosticState } from '../bkt-engine';
import { propagateEvidence } from '../evidence-propagation';
import { selectNextConcept } from '../mepe-selector';
import { shouldStopDiagnostic } from '../stopping-criteria';
import { bootstrapSpeedParameters, type DiagnosticResponse } from '../speed-bootstrap';
import {
  buildDiagnosticResult,
  toClientDiagnosticProblem,
  type DiagnosticAnswerInput,
  type DiagnosticConceptRecord,
  type DiagnosticProblemRecord,
  type DiagnosticSessionCompletion,
  type DiagnosticSessionProgress,
  type DiagnosticSessionQuestion,
} from '../domain/diagnostic-session.types';
import {
  loadAcademyDiagnosticConcepts,
  loadAcademyDiagnosticEdges,
  loadDiagnosticConceptCourseMap,
  loadDiagnosticCourseNames,
  loadDiagnosticProblemsForConcept,
  loadDiagnosticSessionById,
  loadInProgressDiagnosticSession,
} from '../queries/diagnostic-session.queries';

const STALE_SESSION_HOURS = 24;
const logger = getLogger('diagnostic');
type DiagnosticSessionRecord = NonNullable<
  Awaited<ReturnType<typeof loadDiagnosticSessionById>>
>;

function readDiagnosticResponses(
  responses: Prisma.JsonValue | null | undefined,
): DiagnosticResponse[] {
  return Array.isArray(responses)
    ? ((responses as unknown) as DiagnosticResponse[])
    : [];
}

function toPrismaJson(answer: unknown): Prisma.InputJsonValue | Prisma.JsonNullValueInput {
  const normalized =
    answer === undefined
      ? null
      : (JSON.parse(JSON.stringify(answer)) as Prisma.InputJsonValue | null);

  return normalized === null ? Prisma.JsonNull : normalized;
}

export async function startDiagnosticSession(
  prisma: PrismaService,
  studentState: StudentStateService,
  orgId: string,
  userId: string,
  academyId: string,
  retryCount = 0,
): Promise<DiagnosticSessionQuestion> {
  const enrollment = await prisma.academyEnrollment.findUnique({
    where: { userId_academyId: { userId, academyId } },
  });
  if (!enrollment) {
    throw new NotFoundException('Not enrolled in this academy');
  }
  if (enrollment.diagnosticCompleted) {
    throw new BadRequestException('Diagnostic already completed');
  }

  const existing = await loadInProgressDiagnosticSession(prisma, userId, academyId);

  if (existing) {
    const hoursSinceUpdate = (Date.now() - existing.updatedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceUpdate < STALE_SESSION_HOURS) {
      const concepts = await loadAcademyDiagnosticConcepts(prisma, academyId);

      let problem: DiagnosticProblemRecord | null =
        (existing.currentProblem as DiagnosticProblemRecord | null) ?? null;
      if (!problem && existing.currentConceptId) {
        problem = await pickProblemForConcept(prisma, existing.currentConceptId);
      }

      return {
        sessionId: existing.id,
        questionNumber: existing.questionCount + 1,
        totalEstimated: Math.min(concepts.length, 60),
        isComplete: false,
        question: problem ? toClientDiagnosticProblem(problem) : null,
      };
    }

    await prisma.diagnosticSession.update({
      where: { id: existing.id },
      data: { status: 'abandoned' },
    });
  }

  const concepts = await loadAcademyDiagnosticConcepts(prisma, academyId);
  const edges = await loadAcademyDiagnosticEdges(prisma, academyId);
  const masteries = await studentState.getMasteryMapForAcademy(userId, academyId);

  const testedIds = new Set<string>();
  const firstConceptId = selectNextConcept(
    masteries,
    edges,
    testedIds,
    BKT_DEFAULTS.pGuessMC,
  );

  if (!firstConceptId) {
    throw new BadRequestException('No concepts available for diagnostic');
  }

  const problem = await pickProblemForConcept(prisma, firstConceptId);
  if (!problem) {
    throw new BadRequestException('No problems available for diagnostic');
  }

  const firstConcept = concepts.find((concept) => concept.id === firstConceptId);
  let session: { id: string };
  try {
    session = await prisma.$transaction(async (tx) => {
      const created = await tx.diagnosticSession.create({
        data: {
          userId,
          courseId: firstConcept?.courseId ?? concepts[0].courseId,
          academyId,
          orgId,
          status: 'in_progress',
          questionCount: 0,
          currentProblemId: problem.id,
          currentConceptId: firstConceptId,
          responses: [],
        },
      });

      const snapshotData = Array.from(masteries.entries()).map(
        ([conceptId, pL]) => ({
          diagnosticSessionId: created.id,
          conceptId,
          pL,
          tested: false,
        }),
      );

      if (snapshotData.length > 0) {
        await tx.diagnosticMasterySnapshot.createMany({ data: snapshotData });
      }

      return created;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      if (retryCount >= 3) {
        throw new BadRequestException('Failed to create diagnostic session after retries');
      }
      return startDiagnosticSession(prisma, studentState, orgId, userId, academyId, retryCount + 1);
    }
    throw err;
  }

  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: `Diagnostic started`,
    attributes: {
      'user.id': userId,
      'academy.id': academyId,
      'course.id': firstConcept?.courseId ?? '',
      'session.id': session.id,
      'concepts.total': concepts.length,
    },
  });

  return {
    sessionId: session.id,
    questionNumber: 1,
    totalEstimated: Math.min(concepts.length, 60),
    isComplete: false,
    question: toClientDiagnosticProblem(problem),
  };
}

export async function startDiagnosticForCourse(
  prisma: PrismaService,
  studentState: StudentStateService,
  orgId: string,
  userId: string,
  courseId: string,
): Promise<DiagnosticSessionQuestion> {
  const academyId = await resolveAcademyIdForCourse(prisma, courseId);
  return startDiagnosticSession(prisma, studentState, orgId, userId, academyId);
}

export async function submitDiagnosticAnswer(
  prisma: PrismaService,
  studentState: StudentStateService,
  sessionId: string,
  userId: string,
  input: DiagnosticAnswerInput,
): Promise<DiagnosticSessionProgress | DiagnosticSessionCompletion> {
  const session = await loadDiagnosticSessionById(prisma, sessionId);
  if (!session) {
    throw new NotFoundException('Diagnostic session not found');
  }
  if (session.userId !== userId) {
    throw new ForbiddenException('Not your session');
  }
  if (session.status !== 'in_progress') {
    throw new BadRequestException('Session is not in progress');
  }

  const currentProblem = session.currentProblem;
  const currentConceptId = session.currentConceptId;
  if (!currentProblem || !currentConceptId) {
    throw new BadRequestException('No active question');
  }

  const concepts = await loadAcademyDiagnosticConcepts(prisma, session.academyId);
  const edges = await loadAcademyDiagnosticEdges(prisma, session.academyId);
  const masteries = new Map<string, number>();
  const testedConceptIds = new Set<string>();
  for (const snapshot of session.masterySnapshots) {
    masteries.set(snapshot.conceptId, snapshot.pL);
    if (snapshot.tested) {
      testedConceptIds.add(snapshot.conceptId);
    }
  }

  const iDontKnow = input.answer === '__I_DONT_KNOW__';
  const answerOptions = Array.isArray(currentProblem.options)
    ? (currentProblem.options as unknown[])
    : undefined;
  const correct = iDontKnow
    ? false
    : evaluateAnswer(
        currentProblem.type,
        input.answer,
        currentProblem.correctAnswer,
        undefined,
        answerOptions,
      ).correct;

  const pGuess =
    currentProblem.type === 'fill_blank'
      ? BKT_DEFAULTS.pGuessFillBlank
      : BKT_DEFAULTS.pGuessMC;

  const priorPL = masteries.get(currentConceptId) ?? 0.5;
  let updatedPL: number;
  if (correct) {
    updatedPL = updateMasteryAfterCorrect(priorPL, pGuess);
    const concept = concepts.find((candidate) => candidate.id === currentConceptId);
    if (concept) {
      const timeRatio = input.responseTimeMs / 10000;
      updatedPL = applyTimeDiscount(updatedPL, priorPL, timeRatio);
    }
  } else if (iDontKnow) {
    updatedPL = updateMasteryAfterIncorrect(priorPL);
    updatedPL *= 0.8;
  } else {
    updatedPL = updateMasteryAfterIncorrect(priorPL);
  }

  masteries.set(currentConceptId, updatedPL);

  const propagated = propagateEvidence(
    currentConceptId,
    correct,
    updatedPL,
    masteries,
    edges,
  );
  for (const [id, val] of propagated) {
    masteries.set(id, val);
  }

  testedConceptIds.add(currentConceptId);
  const newQuestionCount = session.questionCount + 1;
  const responses = [...readDiagnosticResponses(session.responses)];
  const conceptData = concepts.find((candidate) => candidate.id === currentConceptId);
  responses.push({
    conceptId: currentConceptId,
    correct,
    difficultyTheta: conceptData?.difficultyTheta ?? 0,
  });

  const snapshotUpserts = Array.from(masteries.entries()).map(([conceptId, pL]) => {
    const tested = testedConceptIds.has(conceptId);
    return prisma.diagnosticMasterySnapshot.upsert({
      where: {
        diagnosticSessionId_conceptId: {
          diagnosticSessionId: sessionId,
          conceptId,
        },
      },
      update: { pL, tested },
      create: {
        diagnosticSessionId: sessionId,
        conceptId,
        pL,
        tested,
      },
    });
  });

  if (shouldStopDiagnostic(newQuestionCount, masteries)) {
    return completeDiagnosticSession(
      prisma,
      studentState,
      session,
      masteries,
      responses,
      concepts,
      newQuestionCount,
      snapshotUpserts,
      currentProblem,
      input,
      correct,
    );
  }

  const nextConceptId = selectNextConcept(
    masteries,
    edges,
    testedConceptIds,
    BKT_DEFAULTS.pGuessMC,
  );

  if (!nextConceptId) {
    return completeDiagnosticSession(
      prisma,
      studentState,
      session,
      masteries,
      responses,
      concepts,
      newQuestionCount,
      snapshotUpserts,
      currentProblem,
      input,
      correct,
    );
  }

  const nextProblem = await pickProblemForConcept(prisma, nextConceptId);
  if (!nextProblem) {
    return completeDiagnosticSession(
      prisma,
      studentState,
      session,
      masteries,
      responses,
      concepts,
      newQuestionCount,
      snapshotUpserts,
      currentProblem,
      input,
      correct,
    );
  }

  await prisma.$transaction([
    ...snapshotUpserts,
    prisma.diagnosticSession.update({
      where: { id: sessionId },
      data: {
        questionCount: newQuestionCount,
        currentProblemId: nextProblem.id,
        currentConceptId: nextConceptId,
        responses: responses as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.problemAttempt.create({
      data: {
        userId: session.userId,
        problemId: currentProblem.id,
        answer: toPrismaJson(input.answer),
        correct,
        responseTimeMs: input.responseTimeMs,
      },
    }),
  ]);

  return {
    sessionId,
    questionNumber: newQuestionCount + 1,
    totalEstimated: Math.min(concepts.length, 60),
    isComplete: false,
    wasCorrect: correct,
    question: toClientDiagnosticProblem(nextProblem),
  };
}

export async function getDiagnosticResult(
  prisma: PrismaService,
  sessionId: string,
  userId: string,
) {
  const session = await loadDiagnosticSessionById(prisma, sessionId);
  if (!session) {
    throw new NotFoundException('Diagnostic session not found');
  }
  if (session.userId !== userId) {
    throw new ForbiddenException('Not your session');
  }

  const activeSession: DiagnosticSessionRecord = session;

  const masteries = new Map<string, number>();
  for (const snapshot of activeSession.masterySnapshots) {
    masteries.set(snapshot.conceptId, snapshot.pL);
  }

  const conceptCourseMap = await loadDiagnosticConceptCourseMap(
    prisma,
    activeSession.masterySnapshots.map((snapshot) => snapshot.conceptId),
  );

  return buildDiagnosticResult(
    masteries,
    activeSession.questionCount,
    conceptCourseMap,
  );
}

async function completeDiagnosticSession(
  prisma: PrismaService,
  studentState: StudentStateService,
  session: DiagnosticSessionRecord,
  masteries: Map<string, number>,
  responses: DiagnosticResponse[],
  concepts: DiagnosticConceptRecord[],
  questionCount: number,
  snapshotUpserts: Array<Prisma.PrismaPromise<unknown>>,
  currentProblem: DiagnosticProblemRecord,
  input: DiagnosticAnswerInput,
  correct: boolean,
): Promise<DiagnosticSessionCompletion> {
  await prisma.$transaction([
    ...snapshotUpserts,
    prisma.diagnosticSession.update({
      where: { id: session.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        questionCount,
        currentProblemId: null,
        currentConceptId: null,
        responses: responses as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.problemAttempt.create({
      data: {
        userId: session.userId,
        problemId: currentProblem.id,
        answer: toPrismaJson(input.answer),
        correct,
        responseTimeMs: input.responseTimeMs,
      },
    }),
  ]);

  for (const [conceptId, pL] of masteries) {
    const state = classifyDiagnosticState(pL);
    await studentState.updateConceptDiagnosticState(
      session.userId,
      conceptId,
      state,
      pL,
    );
  }

  const speedResult = bootstrapSpeedParameters(responses, concepts);
  await studentState.updateSpeedParameters(
    session.userId,
    speedResult.abilityTheta,
    speedResult.speedRD,
    speedResult.conceptSpeeds,
  );

  await studentState.markDiagnosticComplete(session.userId, session.academyId);

  logger.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body: `Diagnostic completed`,
    attributes: {
      'user.id': session.userId,
      'academy.id': session.academyId,
      'session.id': session.id,
      'questions.answered': questionCount,
    },
  });

  const courseNames = await loadDiagnosticCourseNames(prisma, session.academyId);
  const conceptCourseMap = new Map<string, { courseId: string; courseName: string }>();
  for (const concept of concepts) {
    if (concept.courseId) {
      conceptCourseMap.set(concept.id, {
        courseId: concept.courseId,
        courseName: courseNames.get(concept.courseId)?.name ?? '',
      });
    }
  }

  return {
    sessionId: session.id,
    isComplete: true,
    questionsAnswered: questionCount,
    result: buildDiagnosticResult(masteries, questionCount, conceptCourseMap),
  };
}

async function pickProblemForConcept(
  prisma: PrismaService,
  conceptId: string,
): Promise<DiagnosticProblemRecord | null> {
  const problems = await loadDiagnosticProblemsForConcept(prisma, conceptId);
  if (problems.length === 0) {
    return null;
  }

  return problems[Math.floor(Math.random() * problems.length)];
}

async function resolveAcademyIdForCourse(
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
