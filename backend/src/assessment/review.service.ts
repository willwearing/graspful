import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { Prisma } from '@prisma/client';
import { AssessmentScopeService } from './assessment-scope.service';
import { PrismaService } from '@/prisma/prisma.service';
import { FireUpdateService } from '@/spaced-repetition/fire-update.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { RemediationService } from '@/learning-engine/remediation.service';
import { XPService } from '@/gamification/xp.service';
import { evaluateAnswer } from './answer-evaluator';
import { calculateReviewXP } from './xp-calculator';
import { SectionExamService } from './section-exam.service';
import { activeProblemWhere } from '@/knowledge-graph/active-course-content';
import {
  type ClientProblem,
  serializeProblemForClient,
} from '@/shared/utils/problem-presentation';

export interface ReviewSession {
  conceptId: string;
  userId: string;
  orgId: string;
  courseId: string;
  createdAt: number;
  completion?: ReviewResult;
  effectsApplied?: boolean;
  committedResult?: ReviewResult;
  problems: ClientProblem[];
  gradingProblems: Map<string, {
    type: string;
    options: Prisma.JsonValue | null;
    correctAnswer: Prisma.JsonValue;
    explanation: string | null;
    difficulty: number;
  }>;
  attemptIds: Map<string, string>;
  answers: Array<{
    problemId: string;
    correct: boolean;
    answer: unknown;
    response: ReviewAnswerResult;
  }>;
  isComplete: boolean;
}

export interface ReviewResult {
  conceptId: string;
  passed: boolean;
  score: number;
  correctCount: number;
  totalCount: number;
  updatedMasteryState: 'mastered' | 'needs_review';
}

export interface ReviewAnswerResult {
  correct: boolean;
  feedback: string;
  xpAwarded: number;
  hasMore: boolean;
  nextProblem: ClientProblem | null;
  problemNumber: number;
  totalProblems: number;
}

interface ReviewCompletionReceipt {
  kind: 'review_completion';
  version: 1;
  sessionId: string;
  orgId: string;
  userId: string;
  courseId: string;
  conceptId: string;
  result: ReviewResult;
}

@Injectable()
export class ReviewService {
  private sessions = new Map<string, ReviewSession>();
  private mutations = new Map<string, Promise<unknown>>();

  constructor(
    private prisma: PrismaService,
    private xpService: XPService,
    private fireUpdate: FireUpdateService,
    private sectionExamService: SectionExamService,
    private studentState: StudentStateService,
    private scope: AssessmentScopeService,
    private remediationService: RemediationService,
  ) {}

  async startReview(orgId: string, userId: string, courseId: string, conceptId: string) {
    const { academyId } = await this.scope.assertConcept(orgId, userId, courseId, conceptId);
    for (const [id, session] of this.sessions) {
      if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000 && !this.mutations.has(id)) {
        this.sessions.delete(id);
      }
    }
    // Verify concept exists and student has a concept state
    const conceptState = await this.studentState.getConceptStateWithConcept(userId, conceptId);

    if (
      !conceptState ||
      !conceptState.concept ||
      conceptState.concept.isArchived ||
      conceptState.concept.section?.isArchived
    ) {
      throw new NotFoundException(`No enrollment state for concept ${conceptId}`);
    }

    // Maintenance reviews apply to previously learned concepts. The learning
    // engine can also explicitly assign a weak prerequisite for remediation.
    if (!['mastered', 'needs_review'].includes(conceptState.masteryState)) {
      const remediations = await this.remediationService.getActiveRemediations(userId, academyId);
      if (!remediations.some((remediation) => remediation.weakPrerequisiteId === conceptId)) {
        throw new BadRequestException('Complete the lesson before starting a review');
      }
    }

    // Select 3-5 review problems from this concept's KPs
    const problems = await this.prisma.problem.findMany({
      where: activeProblemWhere({
        knowledgePoint: { conceptId },
        isReviewVariant: true,
      }),
      take: 5,
      orderBy: { difficulty: 'asc' },
    });

    // Fall back to non-review problems if no review variants exist
    let selectedProblems = problems;
    if (selectedProblems.length < 3) {
      selectedProblems = await this.prisma.problem.findMany({
        where: activeProblemWhere({
          knowledgePoint: { conceptId },
        }),
        take: 5,
        orderBy: { difficulty: 'asc' },
      });
    }

    if (selectedProblems.length === 0) {
      throw new NotFoundException(`No problems available for concept ${conceptId}`);
    }

    // Take 3-5 problems
    const finalProblems = selectedProblems.slice(
      0,
      Math.max(3, Math.min(5, selectedProblems.length)),
    );

    const sessionId = randomUUID();
    const session: ReviewSession = {
      conceptId,
      userId,
      orgId,
      courseId,
      createdAt: Date.now(),
      problems: finalProblems.map((problem) => serializeProblemForClient(problem)),
      gradingProblems: new Map(finalProblems.map((problem) => [problem.id, problem])),
      attemptIds: new Map(),
      answers: [],
      isComplete: false,
    };

    this.sessions.set(sessionId, session);

    return {
      sessionId,
      totalProblems: session.problems.length,
      currentProblem: session.problems[0],
      problemNumber: 1,
    };
  }

  async submitReviewAnswer(
    orgId: string,
    userId: string,
    courseId: string,
    conceptId: string,
    sessionId: string,
    problemId: string,
    answer: unknown,
    responseTimeMs: number,
  ) {
    const session = this.ownedSession(orgId, userId, courseId, conceptId, sessionId);
    await this.scope.assertConcept(orgId, userId, courseId, conceptId);
    return this.serializeMutation(sessionId, async () => {
      const existing = session.answers.find((entry) => entry.problemId === problemId);
      if (existing) {
        if (isDeepStrictEqual(existing.answer, answer)) return existing.response;
        throw new BadRequestException('Problem already answered');
      }
      if (session.isComplete) {
        throw new BadRequestException('Review session is already complete');
      }
      if (!session.problems.some((problem) => problem.id === problemId)) {
        throw new NotFoundException('Problem not found in this review');
      }
      // Review is sequential, so changing the problem ID cannot skip a question.
      const expectedProblem = session.problems[session.answers.length];
      if (expectedProblem?.id !== problemId) {
        throw new BadRequestException('Answer the current review problem first');
      }
      if (answer === null || answer === undefined || !Number.isSafeInteger(responseTimeMs) || responseTimeMs <= 0) {
        throw new BadRequestException('An answer and positive response time are required');
      }
      const problem = session.gradingProblems.get(problemId)!;
      const evaluation = evaluateAnswer(problem.type, answer, problem.correctAnswer,
        problem.explanation ?? undefined, problem.options as unknown[] | null);
      const attemptId = session.attemptIds.get(problemId) ?? randomUUID();
      session.attemptIds.set(problemId, attemptId);

      // Keep review grading separate from lesson progression. A review answer
      // records evidence and XP; mastery and repetition change on completion.
      const attempt = await this.prisma.problemAttempt.upsert({
        where: { id: attemptId },
        create: {
          id: attemptId, userId, problemId, answer: answer as Prisma.InputJsonValue,
          correct: evaluation.correct, responseTimeMs, xpAwarded: 0,
        },
        update: {},
      });
      if (!isDeepStrictEqual(attempt.answer, answer)) {
        throw new BadRequestException('Problem already answered');
      }
      const xp = calculateReviewXP(problem.difficulty, attempt.correct, attempt.responseTimeMs, 10_000);
      const recorded = await this.xpService.recordXPEvent({
        userId, courseId, source: 'review', amount: xp.xp, conceptId,
        idempotencyKey: `review:${sessionId}:${problemId}`,
      });
      await this.prisma.problemAttempt.update({
        where: { id: attemptId }, data: { xpAwarded: recorded.amount },
      });
      const nextIndex = session.answers.length + 1;
      const hasMore = nextIndex < session.problems.length;
      const response = {
        correct: attempt.correct,
        feedback: evaluation.feedback,
        xpAwarded: recorded.amount,
        hasMore,
        nextProblem: hasMore ? session.problems[nextIndex] : null,
        problemNumber: nextIndex + 1,
        totalProblems: session.problems.length,
      };
      session.answers.push({ problemId, answer, correct: attempt.correct, response });
      return response;
    });
  }

  async completeReview(
    orgId: string,
    userId: string,
    courseId: string,
    conceptId: string,
    sessionId: string,
  ): Promise<ReviewResult> {
    const session = this.ownedSession(orgId, userId, courseId, conceptId, sessionId);
    const { academyId } = await this.scope.assertConcept(orgId, userId, courseId, conceptId);
    return this.serializeMutation(sessionId, async () => {
      if (session.completion) return session.completion;
      const answeredIds = new Set(session.answers.map((answer) => answer.problemId));
      if (session.answers.length !== session.problems.length ||
          answeredIds.size !== session.problems.length ||
          session.problems.some((problem) => !answeredIds.has(problem.id))) {
        throw new BadRequestException('Answer every assigned review problem before completing');
      }
      const correctCount = session.answers.filter((answer) => answer.correct).length;
      const totalCount = session.problems.length;
      const score = correctCount / totalCount;
      const passed = score >= 0.6;
      const updatedMasteryState = passed ? 'mastered' : 'needs_review';
      const result: ReviewResult = {
        conceptId, passed, score, correctCount, totalCount, updatedMasteryState,
      };
      const finalProblemId = session.problems[session.problems.length - 1].id;
      const finalAttemptId = session.attemptIds.get(finalProblemId);
      if (!finalAttemptId) throw new NotFoundException('Final review attempt not found');

      // The final attempt carries a durable completion receipt. It commits
      // with mastery and repetition, including when the commit response is lost.
      if (!session.effectsApplied) {
        for (let attempt = 0; ; attempt++) {
          try {
            session.committedResult = await this.prisma.$transaction(async (tx) => {
              const finalAttempt = await tx.problemAttempt.findUnique({ where: { id: finalAttemptId } });
              if (!finalAttempt || finalAttempt.userId !== userId || finalAttempt.problemId !== finalProblemId) {
                throw new NotFoundException('Final review attempt not found');
              }
              if (finalAttempt.submissionReceipt !== null) {
                const receipt = finalAttempt.submissionReceipt as unknown as ReviewCompletionReceipt;
                if (receipt.kind !== 'review_completion' || receipt.version !== 1 ||
                    receipt.sessionId !== sessionId || receipt.orgId !== orgId ||
                    receipt.userId !== userId || receipt.courseId !== courseId || receipt.conceptId !== conceptId) {
                  throw new BadRequestException('Review completion receipt does not match this session');
                }
                return receipt.result;
              }
              const conceptState = await this.studentState.getConceptState(userId, conceptId, tx);
              if (!conceptState) throw new NotFoundException('Enrollment state not found');
              await this.studentState.updateConceptAfterPractice(userId, conceptId, {
                masteryState: updatedMasteryState,
                failCount: passed ? 0 : conceptState.failCount + 1,
              }, tx);
              await this.fireUpdate.updateAfterReview(userId, conceptId, passed, score, academyId, tx);
              const receipt: ReviewCompletionReceipt = {
                kind: 'review_completion', version: 1, sessionId, orgId, userId, courseId, conceptId, result,
              };
              await tx.problemAttempt.update({
                where: { id: finalAttemptId },
                data: { submissionReceipt: receipt as unknown as Prisma.InputJsonValue },
              });
              return result;
            }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
            break;
          } catch (error) {
            if (attempt >= 2 || !(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') throw error;
          }
        }
        session.effectsApplied = true;
      }
      await this.sectionExamService.syncSectionStates(userId, courseId);
      session.isComplete = true;
      session.completion = session.committedResult ?? result;
      return session.completion;
    });
  }

  private ownedSession(
    orgId: string, userId: string, courseId: string, conceptId: string, sessionId: string,
  ) {
    const session = this.sessions.get(sessionId);
    if (!session || session.orgId !== orgId || session.userId !== userId ||
        session.courseId !== courseId || session.conceptId !== conceptId ||
        Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
      throw new NotFoundException('Review session not found');
    }
    return session;
  }

  private async serializeMutation<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.mutations.get(sessionId) ?? Promise.resolve();
    const pending = previous.catch(() => undefined).then(operation);
    this.mutations.set(sessionId, pending);
    try {
      return await pending;
    } finally {
      if (this.mutations.get(sessionId) === pending) this.mutations.delete(sessionId);
    }
  }
}
