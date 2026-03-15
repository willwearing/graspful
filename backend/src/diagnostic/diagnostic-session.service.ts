import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { GraphQueryService, SimpleEdge } from '@/knowledge-graph/graph-query.service';
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

const STALE_SESSION_HOURS = 24;

@Injectable()
export class DiagnosticSessionService {
  constructor(
    private prisma: PrismaService,
    private studentState: StudentStateService,
    private graphQuery: GraphQueryService,
  ) {}

  async startDiagnostic(orgId: string, userId: string, courseId: string): Promise<{
    sessionId: string;
    questionNumber: number;
    totalEstimated: number;
    isComplete: boolean;
    question: any;
  }> {
    // Verify enrollment
    const enrollment = await this.prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) {
      throw new NotFoundException('Not enrolled in this course');
    }
    if (enrollment.diagnosticCompleted) {
      throw new BadRequestException('Diagnostic already completed');
    }

    // Check for existing in_progress session
    const existing = await this.prisma.diagnosticSession.findFirst({
      where: { userId, courseId, status: 'in_progress' },
      include: { masterySnapshots: true, currentProblem: { include: { knowledgePoint: { select: { conceptId: true } } } } },
    });

    if (existing) {
      const hoursSinceUpdate =
        (Date.now() - existing.updatedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate < STALE_SESSION_HOURS) {
        // Resume existing session
        const concepts = await this.prisma.concept.findMany({
          where: { courseId },
          select: { id: true, slug: true, difficultyTheta: true, courseId: true },
        });

        // If no current problem (shouldn't happen, but defensive), pick one
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

      // Stale — mark abandoned, start fresh
      await this.prisma.diagnosticSession.update({
        where: { id: existing.id },
        data: { status: 'abandoned' },
      });
    }

    // Load graph data
    const concepts = await this.prisma.concept.findMany({
      where: { courseId },
      select: { id: true, slug: true, difficultyTheta: true, courseId: true },
    });

    const prereqEdges = await this.prisma.prerequisiteEdge.findMany({
      where: { sourceConcept: { courseId } },
    });
    const edges: SimpleEdge[] = prereqEdges.map((e) => ({
      source: e.sourceConceptId,
      target: e.targetConceptId,
    }));

    const masteries = await this.studentState.getMasteryMap(userId, courseId);

    // Select first concept
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

    // Pick a problem for the selected concept
    const problem = await this.pickProblemForConcept(firstConceptId);
    if (!problem) {
      throw new BadRequestException('No problems available for diagnostic');
    }

    // Create session + snapshots in a transaction.
    // The partial unique index prevents duplicate in_progress sessions;
    // if a concurrent request created one first, retry as resume.
    let session: { id: string };
    try {
      session = await this.prisma.$transaction(async (tx) => {
      const sess = await tx.diagnosticSession.create({
        data: {
          userId,
          courseId,
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
        // Concurrent create hit the unique index — recurse to resume the other session
        return this.startDiagnostic(orgId, userId, courseId);
      }
      throw err;
    }

    return {
      sessionId: session.id,
      questionNumber: 1,
      totalEstimated: Math.min(concepts.length, 60),
      isComplete: false,
      question: this.sanitizeProblem(problem),
    };
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

    // Re-fetch static graph data
    const concepts = await this.prisma.concept.findMany({
      where: { courseId: session.courseId },
      select: { id: true, difficultyTheta: true },
    });
    const prereqEdges = await this.prisma.prerequisiteEdge.findMany({
      where: { sourceConcept: { courseId: session.courseId } },
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
        session.courseId,
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
        session.courseId,
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
        session.courseId,
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

    return this.buildResult(masteries, session.questionCount);
  }

  private async completeDiagnostic(
    sessionId: string,
    sessionUserId: string,
    courseId: string,
    masteries: Map<string, number>,
    responses: DiagnosticResponse[],
    concepts: Array<{ id: string; difficultyTheta: number }>,
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

    await this.studentState.markDiagnosticComplete(sessionUserId, courseId);

    return {
      sessionId,
      isComplete: true,
      questionsAnswered: questionCount,
      result: this.buildResult(masteries, questionCount),
    };
  }

  private buildResult(masteries: Map<string, number>, questionCount: number) {
    const breakdown = { mastered: 0, conditionally_mastered: 0, partially_known: 0, unknown: 0 };

    for (const pL of masteries.values()) {
      const state = classifyDiagnosticState(pL);
      breakdown[state]++;
    }

    return {
      totalConcepts: masteries.size,
      questionsAnswered: questionCount,
      breakdown,
      conceptDetails: Array.from(masteries.entries()).map(
        ([conceptId, pL]) => ({
          conceptId,
          pL: Math.round(pL * 1000) / 1000,
          classification: classifyDiagnosticState(pL),
        }),
      ),
    };
  }

  private async pickProblemForConcept(conceptId: string) {
    const problems = await this.prisma.problem.findMany({
      where: {
        knowledgePoint: { conceptId },
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
    return evaluateAnswer(problem.type, answer, problem.correctAnswer).correct;
  }

  private sanitizeProblem(problem: any) {
    // Strip correctAnswer and explanation from the response
    const { correctAnswer, explanation, explanationAudioUrl, knowledgePoint, ...safe } = problem;

    if (safe.type === 'matching' && Array.isArray(safe.options)) {
      safe.pairs = safe.options.map((item: string) => {
        const [left, right] = item.split('|');
        return { left: left?.trim() ?? item, right: right?.trim() ?? '' };
      });
      delete safe.options;
    } else if (Array.isArray(safe.options)) {
      safe.options = safe.options.map((text: string, i: number) => ({
        id: String(i),
        text,
      }));
    }

    return safe;
  }
}
