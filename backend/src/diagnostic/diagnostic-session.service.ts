import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
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

interface DiagnosticSession {
  userId: string;
  courseId: string;
  orgId: string;
  masteries: Map<string, number>;
  edges: SimpleEdge[];
  concepts: Array<{ id: string; difficultyTheta: number }>;
  testedConceptIds: Set<string>;
  responses: DiagnosticResponse[];
  questionCount: number;
  currentProblem: any | null;
  currentConceptId: string | null;
}

@Injectable()
export class DiagnosticSessionService {
  // In-memory session store. For production, use Redis.
  private sessions = new Map<string, DiagnosticSession>();

  constructor(
    private prisma: PrismaService,
    private studentState: StudentStateService,
    private graphQuery: GraphQueryService,
  ) {}

  async startDiagnostic(orgId: string, userId: string, courseId: string) {
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

    const sessionId = randomUUID();
    const session: DiagnosticSession = {
      userId,
      courseId,
      orgId,
      masteries,
      edges,
      concepts: concepts.map((c) => ({ id: c.id, difficultyTheta: c.difficultyTheta })),
      testedConceptIds: testedIds,
      responses: [],
      questionCount: 0,
      currentProblem: problem,
      currentConceptId: firstConceptId,
    };
    this.sessions.set(sessionId, session);

    return {
      sessionId,
      questionNumber: 1,
      totalEstimated: Math.min(concepts.length, 60),
      isComplete: false,
      question: this.sanitizeProblem(problem),
    };
  }

  async submitAnswer(
    sessionId: string,
    input: { answer: any; responseTimeMs: number },
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('Diagnostic session not found');
    }

    const { currentProblem, currentConceptId } = session;
    if (!currentProblem || !currentConceptId) {
      throw new BadRequestException('No active question');
    }

    // Evaluate correctness
    const correct = this.evaluateAnswer(currentProblem, input.answer);

    // Determine guess rate based on problem type
    const pGuess =
      currentProblem.type === 'fill_blank'
        ? BKT_DEFAULTS.pGuessFillBlank
        : BKT_DEFAULTS.pGuessMC;

    // BKT update
    const priorPL = session.masteries.get(currentConceptId) ?? 0.5;
    let updatedPL: number;
    if (correct) {
      updatedPL = updateMasteryAfterCorrect(priorPL, pGuess);
      // Apply time discounting if applicable
      const concept = session.concepts.find((c) => c.id === currentConceptId);
      if (concept) {
        // timeRatio: actual time / expected time. Use 10s as baseline.
        const timeRatio = input.responseTimeMs / 10000;
        updatedPL = applyTimeDiscount(updatedPL, priorPL, timeRatio);
      }
    } else {
      updatedPL = updateMasteryAfterIncorrect(priorPL);
    }

    // Update mastery for tested concept
    session.masteries.set(currentConceptId, updatedPL);

    // Evidence propagation
    const propagated = propagateEvidence(
      currentConceptId,
      correct,
      updatedPL,
      session.masteries,
      session.edges,
    );
    for (const [id, val] of propagated) {
      session.masteries.set(id, val);
    }

    // Record response
    session.testedConceptIds.add(currentConceptId);
    session.questionCount++;
    const conceptData = session.concepts.find((c) => c.id === currentConceptId);
    session.responses.push({
      conceptId: currentConceptId,
      correct,
      difficultyTheta: conceptData?.difficultyTheta ?? 0,
    });

    // Record attempt in DB
    await this.prisma.problemAttempt.create({
      data: {
        userId: session.userId,
        problemId: currentProblem.id,
        answer: input.answer,
        correct,
        responseTimeMs: input.responseTimeMs,
      },
    });

    // Check stopping criteria
    if (shouldStopDiagnostic(session.questionCount, session.masteries)) {
      return this.completeDiagnostic(sessionId, session);
    }

    // Select next concept
    const nextConceptId = selectNextConcept(
      session.masteries,
      session.edges,
      session.testedConceptIds,
      BKT_DEFAULTS.pGuessMC,
    );

    if (!nextConceptId) {
      return this.completeDiagnostic(sessionId, session);
    }

    const nextProblem = await this.pickProblemForConcept(nextConceptId);
    if (!nextProblem) {
      return this.completeDiagnostic(sessionId, session);
    }

    session.currentProblem = nextProblem;
    session.currentConceptId = nextConceptId;

    return {
      sessionId,
      questionNumber: session.questionCount + 1,
      isComplete: false,
      wasCorrect: correct,
      question: this.sanitizeProblem(nextProblem),
    };
  }

  async getResult(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new NotFoundException('Diagnostic session not found');
    }

    return this.buildResult(session);
  }

  private async completeDiagnostic(sessionId: string, session: DiagnosticSession) {
    // Classify all concepts
    for (const [conceptId, pL] of session.masteries) {
      const state = classifyDiagnosticState(pL);
      await this.studentState.updateConceptDiagnosticState(
        session.userId,
        conceptId,
        state,
        pL,
      );
    }

    // Bootstrap speed parameters
    const speedResult = bootstrapSpeedParameters(
      session.responses,
      session.concepts,
    );
    await this.studentState.updateSpeedParameters(
      session.userId,
      speedResult.abilityTheta,
      speedResult.speedRD,
      speedResult.conceptSpeeds,
    );

    // Mark diagnostic complete
    await this.studentState.markDiagnosticComplete(session.userId, session.courseId);

    session.currentProblem = null;
    session.currentConceptId = null;

    return {
      sessionId,
      isComplete: true,
      questionsAnswered: session.questionCount,
      result: this.buildResult(session),
    };
  }

  private buildResult(session: DiagnosticSession) {
    const breakdown = { mastered: 0, conditionally_mastered: 0, partially_known: 0, unknown: 0 };

    for (const pL of session.masteries.values()) {
      const state = classifyDiagnosticState(pL);
      breakdown[state]++;
    }

    return {
      totalConcepts: session.masteries.size,
      questionsAnswered: session.questionCount,
      breakdown,
      conceptDetails: Array.from(session.masteries.entries()).map(
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

  private evaluateAnswer(problem: any, answer: any): boolean {
    const correct = problem.correctAnswer;

    // Handle different problem types
    if (typeof correct === 'string' && typeof answer === 'string') {
      return correct.toLowerCase().trim() === answer.toLowerCase().trim();
    }

    // JSON comparison for structured answers
    return JSON.stringify(correct) === JSON.stringify(answer);
  }

  private sanitizeProblem(problem: any) {
    // Strip correctAnswer and explanation from the response
    const { correctAnswer, explanation, explanationAudioUrl, ...safe } = problem;
    return safe;
  }
}
