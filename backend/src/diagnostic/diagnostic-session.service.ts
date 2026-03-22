import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { SimpleEdge } from '@/knowledge-graph/graph-query.service';
import {
  activeConceptWhere,
  activeKnowledgePointWhere,
} from '@/knowledge-graph/active-course-content';
import {
  updateMasteryAfterCorrect,
  updateMasteryAfterIncorrect,
  applyTimeDiscount,
  classifyDiagnosticState,
  BKT_DEFAULTS,
} from './bkt-engine';
import { propagateEvidence } from './evidence-propagation';
import { selectNextConcept } from './mepe-selector';
import { shouldStopDiagnostic } from './stopping-criteria';
import {
  bootstrapSpeedParameters,
  DiagnosticResponse,
} from './speed-bootstrap';
import { evaluateAnswer } from '../assessment/answer-evaluator';
import { getLogger, SeverityNumber } from '../telemetry/otel-logger';
import { serializeProblemForClient } from '@/shared/utils/problem-presentation';

const STALE_SESSION_HOURS = 24;
const logger = getLogger('diagnostic');

@Injectable()
export class DiagnosticSessionService {
  constructor(
    private prisma: PrismaService,
    private studentState: StudentStateService,
  ) {}

  async startDiagnostic(orgId: string, userId: string, academyId: string, retryCount = 0): Promise<{
    sessionId: string;
    questionNumber: number;
    totalEstimated: number;
    isComplete: boolean;
    question: any;
  }> {
    const enrollment = await this.prisma.academyEnrollment.findUnique({
      where: { userId_academyId: { userId, academyId } },
    });
    if (!enrollment) {
      throw new NotFoundException('Not enrolled in this academy');
    }
    if (enrollment.diagnosticCompleted) {
      throw new BadRequestException('Diagnostic already completed');
    }

    const existing = await this.prisma.diagnosticSession.findFirst({
      where: { userId, academyId, status: 'in_progress' },
      include: { masterySnapshots: true, currentProblem: { include: { knowledgePoint: { select: { conceptId: true } } } } },
    });

    if (existing) {
      const hoursSinceUpdate =
        (Date.now() - existing.updatedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate < STALE_SESSION_HOURS) {
        const concepts = await this.prisma.concept.findMany({
          where: activeConceptWhere({
            course: { academyId },
          }),
          select: { id: true, slug: true, difficultyTheta: true, courseId: true },
        });

        let problem = existing.currentProblem;
        if (!problem && existing.currentConceptId) {
          problem = await this.pickProblemForConcept(existing.currentConceptId);
        }

        return {
          sessionId: existing.id,
          questionNumber: existing.questionCount + 1,
          totalEstimated: Math.min(concepts.length, 60),
          isComplete: false,
          question: problem ? this.sanitizeProblem(problem) : null,
        };
      }

      await this.prisma.diagnosticSession.update({
        where: { id: existing.id },
        data: { status: 'abandoned' },
      });
    }

    const concepts = await this.prisma.concept.findMany({
      where: activeConceptWhere({
        course: { academyId },
      }),
      select: { id: true, slug: true, difficultyTheta: true, courseId: true },
    });

    const prereqEdges = await this.prisma.prerequisiteEdge.findMany({
      where: {
        sourceConcept: activeConceptWhere({
          course: { academyId },
        }),
        targetConcept: activeConceptWhere({
          course: { academyId },
        }),
      },
    });
    const edges: SimpleEdge[] = prereqEdges.map((e) => ({
      source: e.sourceConceptId,
      target: e.targetConceptId,
    }));

    const masteries = await this.studentState.getMasteryMapForAcademy(
      userId,
      academyId,
    );

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

    const problem = await this.pickProblemForConcept(firstConceptId);
    if (!problem) {
      throw new BadRequestException('No problems available for diagnostic');
    }

    const firstConcept = concepts.find((concept) => concept.id === firstConceptId);
    let session: { id: string };
    try {
      session = await this.prisma.$transaction(async (tx) => {
      const sess = await tx.diagnosticSession.create({
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

      // Bulk-create mastery snapshots for all concepts
      const snapshotData = Array.from(masteries.entries()).map(
        ([conceptId, pL]) => ({
          diagnosticSessionId: sess.id,
          conceptId,
          pL,
          tested: false,
        }),
      );

      if (snapshotData.length > 0) {
        await tx.diagnosticMasterySnapshot.createMany({ data: snapshotData });
      }

      return sess;
    });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        if (retryCount >= 3) {
          throw new BadRequestException('Failed to create diagnostic session after retries');
        }
        return this.startDiagnostic(orgId, userId, academyId, retryCount + 1);
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
      question: this.sanitizeProblem(problem),
    };
  }

  async startDiagnosticForCourse(orgId: string, userId: string, courseId: string) {
    const academyId = await this.resolveAcademyIdForCourse(courseId);
    return this.startDiagnostic(orgId, userId, academyId);
  }

  async submitAnswer(
    sessionId: string,
    userId: string,
    input: { answer: any; responseTimeMs: number },
  ) {
    const session = await this.prisma.diagnosticSession.findUnique({
      where: { id: sessionId },
      include: {
        masterySnapshots: true,
        currentProblem: { include: { knowledgePoint: { select: { conceptId: true } } } },
      },
    });
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

    const concepts = await this.prisma.concept.findMany({
      where: activeConceptWhere({
        course: { academyId: session.academyId },
      }),
      select: { id: true, difficultyTheta: true, courseId: true },
    });
    const prereqEdges = await this.prisma.prerequisiteEdge.findMany({
      where: {
        sourceConcept: activeConceptWhere({
          course: { academyId: session.academyId },
        }),
        targetConcept: activeConceptWhere({
          course: { academyId: session.academyId },
        }),
      },
    });
    const edges: SimpleEdge[] = prereqEdges.map((e) => ({
      source: e.sourceConceptId,
      target: e.targetConceptId,
    }));

    // Reconstruct masteries Map and testedConceptIds Set from snapshots
    const masteries = new Map<string, number>();
    const testedConceptIds = new Set<string>();
    for (const snap of session.masterySnapshots) {
      masteries.set(snap.conceptId, snap.pL);
      if (snap.tested) testedConceptIds.add(snap.conceptId);
    }

    // Check for "I don't know"
    const iDontKnow = input.answer === '__I_DONT_KNOW__';

    // Evaluate correctness
    const correct = iDontKnow
      ? false
      : this.evaluateAnswerForProblem(currentProblem, input.answer);

    // Determine guess rate based on problem type
    const pGuess =
      currentProblem.type === 'fill_blank'
        ? BKT_DEFAULTS.pGuessFillBlank
        : BKT_DEFAULTS.pGuessMC;

    // BKT update
    const priorPL = masteries.get(currentConceptId) ?? 0.5;
    let updatedPL: number;
    if (correct) {
      updatedPL = updateMasteryAfterCorrect(priorPL, pGuess);
      const concept = concepts.find((c) => c.id === currentConceptId);
      if (concept) {
        const timeRatio = input.responseTimeMs / 10000;
        updatedPL = applyTimeDiscount(updatedPL, priorPL, timeRatio);
      }
    } else if (iDontKnow) {
      updatedPL = updateMasteryAfterIncorrect(priorPL);
      updatedPL = updatedPL * 0.8;
    } else {
      updatedPL = updateMasteryAfterIncorrect(priorPL);
    }

    // Update mastery for tested concept
    masteries.set(currentConceptId, updatedPL);

    // Evidence propagation
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

    // Record response
    testedConceptIds.add(currentConceptId);
    const newQuestionCount = session.questionCount + 1;
    const conceptData = concepts.find((c) => c.id === currentConceptId);
    const responses = (session.responses ?? []) as unknown as DiagnosticResponse[];
    responses.push({
      conceptId: currentConceptId,
      correct,
      difficultyTheta: conceptData?.difficultyTheta ?? 0,
    });

    // Build snapshot upserts for changed masteries
    const snapshotUpserts = Array.from(masteries.entries()).map(
      ([conceptId, pL]) => {
        const tested = testedConceptIds.has(conceptId);
        return this.prisma.diagnosticMasterySnapshot.upsert({
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
      },
    );

    // Check stopping criteria
    if (shouldStopDiagnostic(newQuestionCount, masteries)) {
      return this.completeDiagnostic(
        sessionId,
        session.userId,
        session.academyId,
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

    // Select next concept
    const nextConceptId = selectNextConcept(
      masteries,
      edges,
      testedConceptIds,
      BKT_DEFAULTS.pGuessMC,
    );

    if (!nextConceptId) {
      return this.completeDiagnostic(
        sessionId,
        session.userId,
        session.academyId,
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

    const nextProblem = await this.pickProblemForConcept(nextConceptId);
    if (!nextProblem) {
      return this.completeDiagnostic(
        sessionId,
        session.userId,
        session.academyId,
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
    const nextConcept = concepts.find((concept) => concept.id === nextConceptId);

    // Persist everything in a transaction
    await this.prisma.$transaction([
      ...snapshotUpserts,
      this.prisma.diagnosticSession.update({
        where: { id: sessionId },
        data: {
          questionCount: newQuestionCount,
          currentProblemId: nextProblem.id,
          currentConceptId: nextConceptId,
          responses: responses as unknown as Prisma.InputJsonValue,
        },
      }),
      this.prisma.problemAttempt.create({
        data: {
          userId: session.userId,
          problemId: currentProblem.id,
          answer: input.answer,
          correct,
          responseTimeMs: input.responseTimeMs,
        },
      }),
    ]);

    return {
      sessionId,
      questionNumber: newQuestionCount + 1,
      isComplete: false,
      wasCorrect: correct,
      question: this.sanitizeProblem(nextProblem),
    };
  }

  async getResult(sessionId: string, userId: string) {
    const session = await this.prisma.diagnosticSession.findUnique({
      where: { id: sessionId },
      include: { masterySnapshots: true },
    });
    if (!session) {
      throw new NotFoundException('Diagnostic session not found');
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('Not your session');
    }

    const masteries = new Map<string, number>();
    for (const snap of session.masterySnapshots) {
      masteries.set(snap.conceptId, snap.pL);
    }

    // Fetch concept-to-course mapping for course breakdown
    const conceptIds = session.masterySnapshots.map((s) => s.conceptId);
    const concepts = await this.prisma.concept.findMany({
      where: { id: { in: conceptIds } },
      select: { id: true, courseId: true, course: { select: { name: true } } },
    });
    const conceptCourseMap = new Map<string, { courseId: string; courseName: string }>();
    for (const c of concepts) {
      conceptCourseMap.set(c.id, {
        courseId: c.courseId,
        courseName: c.course.name,
      });
    }

    return this.buildResult(masteries, session.questionCount, conceptCourseMap);
  }

  private async completeDiagnostic(
    sessionId: string,
    sessionUserId: string,
    academyId: string,
    masteries: Map<string, number>,
    responses: DiagnosticResponse[],
    concepts: Array<{ id: string; difficultyTheta: number; courseId?: string }>,
    questionCount: number,
    snapshotUpserts: any[],
    currentProblem: any,
    input: { answer: any; responseTimeMs: number },
    correct: boolean,
  ) {
    // Persist session state + record attempt first to mark session completed
    await this.prisma.$transaction([
      ...snapshotUpserts,
      this.prisma.diagnosticSession.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          questionCount,
          currentProblemId: null,
          currentConceptId: null,
          responses: responses as unknown as Prisma.InputJsonValue,
        },
      }),
      this.prisma.problemAttempt.create({
        data: {
          userId: sessionUserId,
          problemId: currentProblem.id,
          answer: input.answer,
          correct,
          responseTimeMs: input.responseTimeMs,
        },
      }),
    ]);

    // Update student model after session is safely marked completed
    for (const [conceptId, pL] of masteries) {
      const state = classifyDiagnosticState(pL);
      await this.studentState.updateConceptDiagnosticState(
        sessionUserId,
        conceptId,
        state,
        pL,
      );
    }

    const speedResult = bootstrapSpeedParameters(responses, concepts);
    await this.studentState.updateSpeedParameters(
      sessionUserId,
      speedResult.abilityTheta,
      speedResult.speedRD,
      speedResult.conceptSpeeds,
    );

    await this.studentState.markDiagnosticComplete(sessionUserId, academyId);

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body: `Diagnostic completed`,
      attributes: {
        'user.id': sessionUserId,
        'academy.id': academyId,
        'session.id': sessionId,
        'questions.answered': questionCount,
      },
    });

    // Build concept-to-course mapping for course breakdown
    const courses = await this.prisma.course.findMany({
      where: { academyId },
      select: { id: true, name: true },
    });
    const courseTitleMap = new Map(courses.map((c) => [c.id, c.name]));
    const conceptCourseMap = new Map<string, { courseId: string; courseName: string }>();
    for (const concept of concepts) {
      if (concept.courseId) {
        conceptCourseMap.set(concept.id, {
          courseId: concept.courseId,
          courseName: courseTitleMap.get(concept.courseId) ?? '',
        });
      }
    }

    return {
      sessionId,
      isComplete: true,
      questionsAnswered: questionCount,
      result: this.buildResult(masteries, questionCount, conceptCourseMap),
    };
  }

  private buildResult(
    masteries: Map<string, number>,
    questionCount: number,
    conceptCourseMap?: Map<string, { courseId: string; courseName: string }>,
  ) {
    const breakdown = { mastered: 0, conditionally_mastered: 0, partially_known: 0, unknown: 0 };

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
      courseBreakdown: this.buildCourseBreakdown(conceptDetails, conceptCourseMap),
    };
  }

  private buildCourseBreakdown(
    conceptDetails: Array<{
      conceptId: string;
      pL: number;
      classification: ReturnType<typeof classifyDiagnosticState>;
    }>,
    conceptCourseMap?: Map<string, { courseId: string; courseName: string }>,
  ): Array<{
    courseId: string;
    courseName: string;
    totalConcepts: number;
    mastered: number;
    partiallyKnown: number;
    unknown: number;
  }> {
    if (!conceptCourseMap || conceptCourseMap.size === 0) {
      return [];
    }

    const courseAgg = new Map<
      string,
      { courseName: string; totalConcepts: number; mastered: number; partiallyKnown: number; unknown: number }
    >();

    for (const detail of conceptDetails) {
      const courseInfo = conceptCourseMap.get(detail.conceptId);
      if (!courseInfo) continue;

      if (!courseAgg.has(courseInfo.courseId)) {
        courseAgg.set(courseInfo.courseId, {
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
        // conditionally_mastered and partially_known both count as partiallyKnown
        entry.partiallyKnown++;
      }
    }

    return Array.from(courseAgg.entries()).map(([courseId, stats]) => ({
      courseId,
      ...stats,
    }));
  }

  private async pickProblemForConcept(conceptId: string) {
    const problems = await this.prisma.problem.findMany({
      where: {
        knowledgePoint: activeKnowledgePointWhere({ conceptId }),
        isReviewVariant: false,
      },
      include: {
        knowledgePoint: { select: { conceptId: true } },
      },
    });

    if (problems.length === 0) return null;

    // Pick a random problem for variety
    return problems[Math.floor(Math.random() * problems.length)];
  }

  private evaluateAnswerForProblem(problem: any, answer: any): boolean {
    return evaluateAnswer(problem.type, answer, problem.correctAnswer, undefined, problem.options).correct;
  }

  private sanitizeProblem(problem: any) {
    // Strip correctAnswer and explanation from the response
    const { correctAnswer, explanation, explanationAudioUrl, knowledgePoint, ...safe } = problem;
    return serializeProblemForClient(safe);
  }

  private async resolveAcademyIdForCourse(courseId: string): Promise<string> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { academyId: true },
    });

    if (!course?.academyId) {
      throw new NotFoundException('Course academy not found');
    }

    return course.academyId;
  }
}
