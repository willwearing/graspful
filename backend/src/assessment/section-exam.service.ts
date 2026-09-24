import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExamSessionStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { XPService } from '@/gamification/xp.service';
import { StudentStateService } from '@/student-model/student-state.service';
import {
  activeConceptWhere,
  activeKnowledgePointWhere,
  activeSectionWhere,
} from '@/knowledge-graph/active-course-content';
import { evaluateAnswer } from './answer-evaluator';
import { calculateQuizXP } from './xp-calculator';
import { AssessmentScopeService } from './assessment-scope.service';
import { isDeepStrictEqual } from 'node:util';

import { parseSectionExamConfig } from './section-exam/config';
import { serializeSectionExamSession } from './section-exam/presentation';
import { selectSectionExamQuestions } from './section-exam/question-selection';
import { gradeSectionExam, hasSectionExamExpired } from './section-exam/grading';
import { getSectionExamProgress, getSectionExamStatus } from './section-exam/queries';

@Injectable()
export class SectionExamService {
  constructor(
    private prisma: PrismaService,
    private xpService: XPService,
    private studentState: StudentStateService,
    private scope: AssessmentScopeService,
  ) {}

  async getReadySectionExam(userId: string, courseId: string) {
    const states = await this.syncSectionStates(userId, courseId);
    return (
      states.find(
        (state) =>
          state.status === 'exam_ready' && state.section.sectionExamConfig,
      ) ?? null
    );
  }

  async getSectionStates(userId: string, courseId: string) {
    await this.syncSectionStates(userId, courseId);
    return getSectionExamProgress(this.prisma, this.studentState, userId, courseId);
  }

  async getExamStatus(orgId: string, userId: string, courseId: string, sectionId: string) {
    await this.scope.assertSection(orgId, userId, courseId, sectionId);
    await this.syncSectionStates(userId, courseId);
    return getSectionExamStatus(this.prisma, this.studentState, userId, courseId, sectionId);
  }

  async startExam(orgId: string, userId: string, courseId: string, sectionId: string) {
    await this.scope.assertSection(orgId, userId, courseId, sectionId);
    await this.syncSectionStates(userId, courseId);

    const section = await this.prisma.courseSection.findFirst({
      where: activeSectionWhere({ id: sectionId, courseId }),
      include: {
        concepts: {
          where: activeConceptWhere(),
          select: {
            id: true,
            slug: true,
            name: true,
            knowledgePoints: {
              where: activeKnowledgePointWhere(),
              select: {
                problems: {
                  where: { isArchived: false },
                  select: {
                    id: true,
                    type: true,
                    questionText: true,
                    options: true,
                    correctAnswer: true,
                    explanation: true,
                    isReviewVariant: true,
                    difficulty: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const config = parseSectionExamConfig(section.sectionExamConfig);
    if (!config.enabled) {
      throw new BadRequestException('Section exam is not enabled for this section');
    }

    const state = await this.studentState.getSectionExamState(userId, sectionId);

    if (!state) {
      throw new NotFoundException('Section state not found');
    }

    if (state.status !== 'exam_ready') {
      throw new BadRequestException(
        `Section exam is not available while section is ${state.status}`,
      );
    }

    const existing = await this.prisma.sectionExamSession.findFirst({
      where: {
        userId,
        courseId,
        sectionId,
        status: ExamSessionStatus.in_progress,
      },
      include: {
        questions: {
          include: { problem: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (existing) {
      return serializeSectionExamSession(existing, config);
    }

    const selectedQuestions = selectSectionExamQuestions(section.concepts, config);

    const session = await this.prisma.$transaction(async (tx) => {
      const currentState = await this.studentState.lockSectionForExam(tx, userId, sectionId);
      const resumed = await tx.sectionExamSession.findFirst({
        where: { userId, courseId, sectionId, status: ExamSessionStatus.in_progress },
        include: {
          questions: {
            include: { problem: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { startedAt: 'desc' },
      });
      if (resumed) {
        return resumed;
      }

      const created = await tx.sectionExamSession.create({
        data: {
          userId,
          courseId,
          sectionId,
          attemptNumber: currentState.attempts + 1,
          timeLimitMs: config.timeLimitMinutes * 60 * 1000,
        },
      });

      await tx.sectionExamQuestion.createMany({
        data: selectedQuestions.map((question, index) => ({
          sessionId: created.id,
          problemId: question.problemId,
          conceptId: question.conceptId,
          sortOrder: index,
        })),
      });

      await this.studentState.recordSectionExamAttempt(tx, userId, sectionId);

      return tx.sectionExamSession.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          questions: {
            include: { problem: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    return serializeSectionExamSession(session, config);
  }

  async submitAnswer(
    orgId: string,
    userId: string,
    courseId: string,
    sectionId: string,
    sessionId: string,
    problemId: string,
    answer: unknown,
    responseTimeMs: number,
  ) {
    await this.scope.assertSection(orgId, userId, courseId, sectionId);
    return this.prisma.$transaction(async (tx) => {
      // Serialize answers and completion on the session row. Read questions only
      // after taking the lock so duplicate requests cannot overwrite an answer.
      await this.lockSession(tx, userId, courseId, sectionId, sessionId);
      const session = await tx.sectionExamSession.findUnique({
        where: { id: sessionId },
        include: {
          questions: {
            where: { problemId },
            include: { problem: true },
          },
        },
      });

      if (!session || session.userId !== userId || session.courseId !== courseId || session.sectionId !== sectionId) {
        throw new NotFoundException('Section exam session not found');
      }
      const question = session.questions[0];
      if (!question) {
        throw new NotFoundException('Problem not found in this section exam');
      }
      if (question.response !== null) {
        if (!isDeepStrictEqual(question.response, answer)) {
          throw new BadRequestException('Problem already answered');
        }
        const questions = await tx.sectionExamQuestion.findMany({
          where: { sessionId },
          select: { response: true },
        });
        return {
          answeredCount: questions.filter((item) => item.response !== null).length,
          totalProblems: questions.length,
        };
      }
      if (session.status !== ExamSessionStatus.in_progress) {
        throw new BadRequestException('Section exam session is already complete');
      }
      if (hasSectionExamExpired(session)) {
        throw new BadRequestException('Section exam time has expired');
      }

      const evaluation = evaluateAnswer(
        question.problem.type,
        answer,
        question.problem.correctAnswer,
        question.problem.explanation ?? undefined,
        question.problem.options as unknown[] | null,
      );
      await tx.sectionExamQuestion.update({
        where: { id: question.id },
        data: {
          response: answer as Prisma.InputJsonValue,
          correct: evaluation.correct,
          responseTimeMs,
        },
      });
      await tx.problemAttempt.create({
        data: {
          userId,
          problemId,
          answer: answer as Prisma.InputJsonValue,
          correct: evaluation.correct,
          responseTimeMs,
          xpAwarded: 0,
        },
      });

      const questions = await tx.sectionExamQuestion.findMany({
        where: { sessionId },
        select: { response: true },
      });
      return {
        answeredCount: questions.filter((item) => item.response !== null).length,
        totalProblems: questions.length,
      };
    });
  }

  async completeExam(
    orgId: string,
    userId: string,
    courseId: string,
    sectionId: string,
    sessionId: string,
  ) {
    await this.scope.assertSection(orgId, userId, courseId, sectionId);

    const completion = await this.prisma.$transaction(async (tx) => {
      await this.lockSession(tx, userId, courseId, sectionId, sessionId);
      const session = await tx.sectionExamSession.findUnique({
        where: { id: sessionId },
        include: {
          section: true,
          questions: {
            include: {
              concept: { select: { id: true, name: true } },
              problem: true,
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!session || session.userId !== userId || session.courseId !== courseId || session.sectionId !== sectionId) {
        throw new NotFoundException('Section exam session not found');
      }

      const { result, expired } = gradeSectionExam(session);
      if (result.alreadyCompleted) return result;
      const { score, passed, failedConcepts } = result;

      await tx.sectionExamSession.update({
        where: { id: sessionId },
        data: {
          status: expired ? ExamSessionStatus.expired : ExamSessionStatus.completed,
          score,
          passed,
          completedAt: new Date(),
        },
      });
      await this.studentState.applySectionExamResult(tx, {
        userId,
        courseId,
        sectionId,
        sectionSortOrder: session.section.sortOrder,
        passed,
        failedConcepts,
      });
      return result;
    });

    const xpResult = calculateQuizXP(completion.totalCount, completion.correctCount);
    let awardedXP = 0;
    if (xpResult.xp > 0) {
      const recorded = await this.xpService.recordXPEvent({
        userId,
        courseId,
        source: 'quiz',
        amount: xpResult.xp,
        idempotencyKey: `section-exam:${sessionId}`,
      });
      awardedXP = recorded.amount;
    }
    await this.syncSectionStates(userId, courseId);
    return { ...completion, xpAwarded: awardedXP };
  }

  private async lockSession(
    tx: Prisma.TransactionClient,
    userId: string,
    courseId: string,
    sectionId: string,
    sessionId: string,
  ) {
    await tx.sectionExamSession.updateMany({
      where: {
        id: sessionId,
        userId,
        courseId,
        sectionId,
        status: ExamSessionStatus.in_progress,
      },
      data: { updatedAt: new Date() },
    });
  }

  async syncSectionStates(userId: string, courseId: string) {
    return this.studentState.syncSectionStates(userId, courseId);
  }
}
