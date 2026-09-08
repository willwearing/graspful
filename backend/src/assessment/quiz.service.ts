import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { XPService } from '@/gamification/xp.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { RemediationService } from '@/learning-engine/remediation.service';
import { evaluateAnswer } from './answer-evaluator';
import { calculateQuizXP } from './xp-calculator';
import { activeProblemWhere } from '@/knowledge-graph/active-course-content';
import { serializeProblemForClient } from '@/shared/utils/problem-presentation';
import { AssessmentScopeService } from './assessment-scope.service';

export interface QuizResult {
  quizId: string;
  score: number;
  correctCount: number;
  totalCount: number;
  xpAwarded: number;
  failedConcepts: string[];
  conceptBreakdown: Record<string, { correct: number; total: number }>;
  results: Array<{ problemId: string; correct: boolean; feedback: string }>;
}

export interface QuizSession {
  quizId: string;
  orgId: string;
  userId: string;
  courseId: string;
  problems: Array<{
    id: string;
    conceptId: string;
    questionText: string;
    type: string;
    options: Prisma.JsonValue | null;
    difficulty: number;
    correctAnswer: unknown;
    explanation: string | null;
  }>;
  answers: Array<{
    problemId: string;
    conceptId: string;
    answer: unknown;
    correct: boolean;
    responseTimeMs: number;
    acknowledgement: { answeredCount: number; totalProblems: number };
  }>;
  attemptIds: Map<string, string>;
  startedAt: number;
  timeLimitMs: number;
  isComplete: boolean;
  completedAt?: number;
  result?: QuizResult;
  completionProgress: {
    needsReviewMarked: boolean;
    remediatedConceptIds: Set<string>;
    xpAwarded?: number;
  };
}

const QUIZ_TIME_LIMIT_MS = 15 * 60 * 1000;
// Keep expired sessions long enough to finish and replay completion requests.
const SESSION_RETENTION_MS = 24 * 60 * 60 * 1000;
const MIN_QUIZ_QUESTIONS = 10;
const MAX_QUIZ_QUESTIONS = 15;

@Injectable()
export class QuizService {
  private sessions = new Map<string, QuizSession>();
  private mutations = new Map<string, Promise<void>>();

  constructor(
    private prisma: PrismaService,
    private xpService: XPService,
    private studentState: StudentStateService,
    private remediationService: RemediationService,
    private scope: AssessmentScopeService,
  ) {}

  async generateQuiz(orgId: string, userId: string, courseId: string) {
    await this.scope.assertCourse(orgId, userId, courseId);
    this.cleanupSessions();

    const conceptStates = (
      await this.studentState.getConceptStatesForCourse(userId, courseId)
    ).filter((state) => ['in_progress', 'mastered'].includes(state.masteryState));

    if (conceptStates.length === 0) {
      throw new BadRequestException('No concepts available for quiz');
    }

    const shuffled = [...conceptStates];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    const selectedConceptIds = shuffled
      .slice(0, MAX_QUIZ_QUESTIONS)
      .map((state) => state.conceptId);

    const problems = await this.prisma.problem.findMany({
      where: activeProblemWhere({
        knowledgePoint: {
          conceptId: { in: selectedConceptIds },
          concept: { courseId },
        },
      }),
      include: {
        knowledgePoint: { select: { conceptId: true } },
      },
    });

    const conceptProblemMap = new Map<string, (typeof problems)[0]>();
    for (const problem of problems) {
      const conceptId = problem.knowledgePoint.conceptId;
      const existing = conceptProblemMap.get(conceptId);
      if (!existing || (existing.isReviewVariant && !problem.isReviewVariant)) {
        conceptProblemMap.set(conceptId, problem);
      }
    }

    const quizProblems = Array.from(conceptProblemMap.values()).slice(0, MAX_QUIZ_QUESTIONS);
    const requiredQuestions = Math.min(MIN_QUIZ_QUESTIONS, conceptStates.length);
    if (quizProblems.length < requiredQuestions) {
      throw new BadRequestException(
        `Not enough problems for a quiz (found ${quizProblems.length}, need ${requiredQuestions})`,
      );
    }

    const quizId = randomUUID();
    const session: QuizSession = {
      quizId,
      orgId,
      userId,
      courseId,
      problems: quizProblems.map((problem) => ({
        id: problem.id,
        conceptId: problem.knowledgePoint.conceptId,
        questionText: problem.questionText,
        type: problem.type,
        options: problem.options,
        difficulty: problem.difficulty,
        correctAnswer: problem.correctAnswer,
        explanation: problem.explanation,
      })),
      answers: [],
      attemptIds: new Map(),
      startedAt: Date.now(),
      timeLimitMs: QUIZ_TIME_LIMIT_MS,
      isComplete: false,
      completionProgress: {
        needsReviewMarked: false,
        remediatedConceptIds: new Set(),
      },
    };
    this.sessions.set(quizId, session);

    return {
      quizId,
      totalProblems: session.problems.length,
      timeLimitMs: QUIZ_TIME_LIMIT_MS,
      startedAt: session.startedAt,
      expiresAt: session.startedAt + session.timeLimitMs,
      problems: session.problems.map((problem) =>
        serializeProblemForClient({
          id: problem.id,
          questionText: problem.questionText,
          type: problem.type,
          options: problem.options,
          difficulty: problem.difficulty,
        }),
      ),
    };
  }

  async submitQuizAnswer(
    orgId: string,
    userId: string,
    courseId: string,
    quizId: string,
    problemId: string,
    answer: unknown,
    responseTimeMs: number,
  ) {
    const session = this.getSession(orgId, userId, courseId, quizId);
    return this.withMutation(quizId, async () => {
      await this.scope.assertCourse(orgId, userId, courseId);
      const savedAnswer = session.answers.find((candidate) => candidate.problemId === problemId);
      if (savedAnswer) {
        if (!isDeepStrictEqual(savedAnswer.answer, answer)) {
          throw new BadRequestException('Problem already answered with a different answer');
        }
        return savedAnswer.acknowledgement;
      }
      if (session.isComplete) {
        throw new BadRequestException('Quiz is already complete');
      }
      if (Date.now() - session.startedAt >= session.timeLimitMs) {
        throw new BadRequestException('Quiz time has expired');
      }
      const problem = session.problems.find((candidate) => candidate.id === problemId);
      if (!problem) {
        throw new NotFoundException(`Problem ${problemId} not in this quiz`);
      }
      if (!Number.isSafeInteger(responseTimeMs) || responseTimeMs < 0) {
        throw new BadRequestException('Response time must be a non-negative integer');
      }

      const evaluation = evaluateAnswer(
        problem.type,
        answer,
        problem.correctAnswer,
        problem.explanation ?? undefined,
        problem.options as unknown[] | null,
      );

      // A stable row ID also handles a retry after the database commits but its
      // response is lost. The first stored response remains authoritative.
      const attemptId = session.attemptIds.get(problemId) ?? randomUUID();
      session.attemptIds.set(problemId, attemptId);
      const attempt = await this.prisma.problemAttempt.upsert({
        where: { id: attemptId },
        create: {
          id: attemptId,
          userId,
          problemId,
          answer: answer as Prisma.InputJsonValue,
          correct: evaluation.correct,
          responseTimeMs,
          xpAwarded: 0,
        },
        update: {},
      });

      // Only count an answer after persistence succeeds.
      const acknowledgement = {
        answeredCount: session.answers.length + 1,
        totalProblems: session.problems.length,
      };
      session.answers.push({
        problemId,
        conceptId: problem.conceptId,
        answer: attempt.answer,
        correct: attempt.correct,
        responseTimeMs: attempt.responseTimeMs,
        acknowledgement,
      });
      if (!isDeepStrictEqual(attempt.answer, answer)) {
        throw new BadRequestException('Problem already answered with a different answer');
      }
      return acknowledgement;
    });
  }

  async completeQuiz(orgId: string, userId: string, courseId: string, quizId: string) {
    const session = this.getSession(orgId, userId, courseId, quizId);
    return this.withMutation(quizId, async (): Promise<QuizResult> => {
      const { academyId } = await this.scope.assertCourse(orgId, userId, courseId);
      if (session.result) return session.result;
      if (
        session.answers.length !== session.problems.length &&
        Date.now() - session.startedAt < session.timeLimitMs
      ) {
        throw new BadRequestException('Answer every quiz question before completing');
      }
      // Seal the answers while completion effects run or await a retry.
      session.isComplete = true;

      const answers = new Map(session.answers.map((answer) => [answer.problemId, answer]));
      const conceptResults = new Map<string, { correct: number; total: number }>();
      const missedConceptIds = new Set<string>();
      let correctCount = 0;
      for (const problem of session.problems) {
        const correct = answers.get(problem.id)?.correct ?? false;
        const conceptResult = conceptResults.get(problem.conceptId) ?? { correct: 0, total: 0 };
        conceptResult.total++;
        if (correct) {
          correctCount++;
          conceptResult.correct++;
        } else {
          missedConceptIds.add(problem.conceptId);
        }
        conceptResults.set(problem.conceptId, conceptResult);
      }
      const totalCount = session.problems.length;
      const score = correctCount / totalCount;
      const failedConcepts = Array.from(conceptResults)
        .filter(([, result]) => result.correct / result.total < 0.5)
        .map(([conceptId]) => conceptId);
      const progress = session.completionProgress;

      if (!progress.needsReviewMarked) {
        if (failedConcepts.length > 0) {
          await this.studentState.markConceptsNeedsReview(userId, failedConcepts);
        }
        progress.needsReviewMarked = true;
      }
      for (const conceptId of missedConceptIds) {
        if (progress.remediatedConceptIds.has(conceptId)) continue;
        await this.remediationService.createRemediation(
          userId, academyId, conceptId, conceptId, courseId,
        );
        progress.remediatedConceptIds.add(conceptId);
      }
      if (progress.xpAwarded === undefined) {
        const requestedXP = session.answers.length > 0
          ? calculateQuizXP(totalCount, correctCount).xp
          : 0;
        if (requestedXP > 0) {
          const recorded = await this.xpService.recordXPEvent({
            userId,
            academyId,
            courseId,
            source: 'quiz',
            amount: requestedXP,
            idempotencyKey: `quiz:${session.quizId}`,
          });
          progress.xpAwarded = recorded.amount;
        } else {
          progress.xpAwarded = 0;
        }
      }

      session.result = {
        quizId,
        score,
        correctCount,
        totalCount,
        xpAwarded: progress.xpAwarded,
        failedConcepts,
        conceptBreakdown: Object.fromEntries(conceptResults),
        results: session.problems.map((problem) => {
          const answer = answers.get(problem.id);
          const correct = answer?.correct ?? false;
          const feedback = correct ? 'Correct!' : answer ? 'Incorrect.' : 'Unanswered.';
          return {
            problemId: problem.id,
            correct,
            feedback: `${feedback}${!correct && problem.explanation ? ' ' + problem.explanation : ''}`,
          };
        }),
      };
      session.completedAt = Date.now();
      return session.result;
    });
  }

  private getSession(orgId: string, userId: string, courseId: string, quizId: string) {
    this.cleanupSessions();
    const session = this.sessions.get(quizId);
    if (!session || session.orgId !== orgId || session.userId !== userId || session.courseId !== courseId) {
      throw new NotFoundException(`Quiz ${quizId} not found`);
    }
    return session;
  }

  private async withMutation<T>(quizId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.mutations.get(quizId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    this.mutations.set(quizId, current);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.mutations.get(quizId) === current) this.mutations.delete(quizId);
    }
  }

  private cleanupSessions() {
    const now = Date.now();
    for (const [quizId, session] of this.sessions) {
      const retainFrom = session.completedAt ?? session.startedAt + session.timeLimitMs;
      if (now - retainFrom >= SESSION_RETENTION_MS && !this.mutations.has(quizId)) {
        this.sessions.delete(quizId);
      }
    }
  }
}
