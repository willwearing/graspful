import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExamSessionStatus,
  Prisma,
  SectionMasteryState,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { XPService } from '@/gamification/xp.service';
import { evaluateAnswer } from './answer-evaluator';
import { calculateQuizXP } from './xp-calculator';

type SectionExamConfig = {
  enabled?: boolean;
  passingScore?: number;
  timeLimitMinutes?: number;
  questionCount?: number;
  blueprint?: Array<{ conceptId: string; minQuestions: number }>;
  instructions?: string;
};

const DEFAULT_PASSING_SCORE = 0.75;
const DEFAULT_QUESTION_COUNT = 10;
const DEFAULT_TIME_LIMIT_MINUTES = 12;

@Injectable()
export class SectionExamService {
  constructor(
    private prisma: PrismaService,
    private xpService: XPService,
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

    const states = await this.prisma.studentSectionState.findMany({
      where: { userId, courseId },
      include: {
        section: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            sortOrder: true,
            sectionExamConfig: true,
            concepts: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { section: { sortOrder: 'asc' } },
    });

    return Promise.all(
      states.map(async (state) => {
        const conceptIds = state.section.concepts.map((concept) => concept.id);
        const conceptStates =
          conceptIds.length === 0
            ? []
            : await this.prisma.studentConceptState.findMany({
                where: {
                  userId,
                  conceptId: { in: conceptIds },
                },
                select: {
                  conceptId: true,
                  masteryState: true,
                },
              });

        const latestAttempt = await this.prisma.sectionExamSession.findFirst({
          where: {
            userId,
            courseId,
            sectionId: state.sectionId,
            status: { in: [ExamSessionStatus.completed, ExamSessionStatus.expired] },
          },
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            score: true,
            passed: true,
            completedAt: true,
            attemptNumber: true,
          },
        });

        return {
          sectionId: state.sectionId,
          status: state.status,
          examPassedAt: state.examPassedAt,
          attempts: state.attempts,
          section: state.section,
          conceptStates,
          latestAttempt,
        };
      }),
    );
  }

  async getExamStatus(userId: string, courseId: string, sectionId: string) {
    await this.syncSectionStates(userId, courseId);

    const [state, activeSession, latestSession] = await Promise.all([
      this.prisma.studentSectionState.findUnique({
        where: { userId_sectionId: { userId, sectionId } },
      }),
      this.prisma.sectionExamSession.findFirst({
        where: {
          userId,
          courseId,
          sectionId,
          status: ExamSessionStatus.in_progress,
        },
        include: { questions: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.sectionExamSession.findFirst({
        where: {
          userId,
          courseId,
          sectionId,
          status: { in: [ExamSessionStatus.completed, ExamSessionStatus.expired] },
        },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    if (!state) {
      throw new NotFoundException('Section state not found');
    }

    return {
      sectionId,
      status: state.status,
      attempts: state.attempts,
      examPassedAt: state.examPassedAt,
      activeSession: activeSession
        ? {
            sessionId: activeSession.id,
            answeredCount: activeSession.questions.filter(
              (question) => question.response !== null,
            ).length,
            totalProblems: activeSession.questions.length,
            startedAt: activeSession.startedAt,
            timeLimitMs: activeSession.timeLimitMs,
          }
        : null,
      latestSession,
    };
  }

  async startExam(userId: string, courseId: string, sectionId: string) {
    await this.syncSectionStates(userId, courseId);

    const section = await this.prisma.courseSection.findFirst({
      where: { id: sectionId, courseId },
      include: {
        concepts: {
          select: {
            id: true,
            slug: true,
            name: true,
            knowledgePoints: {
              select: {
                problems: {
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

    const config = this.parseConfig(section.sectionExamConfig);
    if (!config.enabled) {
      throw new BadRequestException('Section exam is not enabled for this section');
    }

    const state = await this.prisma.studentSectionState.findUnique({
      where: { userId_sectionId: { userId, sectionId } },
    });

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
      return this.serializeSession(existing, config);
    }

    const problemsByConcept = new Map<
      string,
      Array<{
        id: string;
        type: string;
        questionText: string;
        options: Prisma.JsonValue | null;
        correctAnswer: Prisma.JsonValue;
        explanation: string | null;
        isReviewVariant: boolean;
        difficulty: number;
      }>
    >();

    for (const concept of section.concepts) {
      const problems = concept.knowledgePoints.flatMap((kp) => kp.problems);
      problemsByConcept.set(
        concept.id,
        [...problems].sort((a, b) => Number(b.isReviewVariant) - Number(a.isReviewVariant)),
      );
    }

    const selectedProblemIds = new Set<string>();
    const selectedQuestions: Array<{ problemId: string; conceptId: string }> = [];
    const conceptIdBySlug = new Map(
      section.concepts.map((concept) => [concept.id, concept.id] as const),
    );
    for (const concept of section.concepts) {
      conceptIdBySlug.set(concept.slug, concept.id);
    }

    for (const item of config.blueprint) {
      const resolvedConceptId = conceptIdBySlug.get(item.conceptId);
      if (!resolvedConceptId) {
        throw new BadRequestException(
          `Section exam blueprint references unknown concept ${item.conceptId}`,
        );
      }

      const candidates = [...(problemsByConcept.get(resolvedConceptId) ?? [])].filter(
        (problem) => !selectedProblemIds.has(problem.id),
      );

      if (candidates.length < item.minQuestions) {
        throw new BadRequestException(
          `Not enough problems to satisfy blueprint for concept ${item.conceptId}`,
        );
      }

      for (const problem of candidates.slice(0, item.minQuestions)) {
        selectedProblemIds.add(problem.id);
        selectedQuestions.push({
          problemId: problem.id,
          conceptId: resolvedConceptId,
        });
      }
    }

    const remainingPool = section.concepts
      .flatMap((concept) =>
        concept.knowledgePoints.flatMap((kp) =>
          kp.problems.map((problem) => ({
            problemId: problem.id,
            conceptId: concept.id,
            isReviewVariant: problem.isReviewVariant,
          })),
        ),
      )
      .filter((item) => !selectedProblemIds.has(item.problemId))
      .sort((a, b) => Number(b.isReviewVariant) - Number(a.isReviewVariant));

    for (const candidate of remainingPool) {
      if (selectedQuestions.length >= config.questionCount) {
        break;
      }
      selectedProblemIds.add(candidate.problemId);
      selectedQuestions.push({
        problemId: candidate.problemId,
        conceptId: candidate.conceptId,
      });
    }

    if (selectedQuestions.length < config.questionCount) {
      throw new BadRequestException('Not enough problems available for section exam');
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sectionExamSession.create({
        data: {
          userId,
          courseId,
          sectionId,
          attemptNumber: state.attempts + 1,
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

      await tx.studentSectionState.update({
        where: { userId_sectionId: { userId, sectionId } },
        data: {
          attempts: { increment: 1 },
          lastExamAttemptAt: new Date(),
        },
      });

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

    return this.serializeSession(session, config);
  }

  async submitAnswer(
    userId: string,
    sessionId: string,
    problemId: string,
    answer: unknown,
    responseTimeMs: number,
  ) {
    const session = await this.prisma.sectionExamSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          where: { problemId },
          include: { problem: true },
        },
      },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Section exam session not found');
    }

    if (session.status !== ExamSessionStatus.in_progress) {
      throw new BadRequestException('Section exam session is already complete');
    }

    const question = session.questions[0];
    if (!question) {
      throw new NotFoundException('Problem not found in this section exam');
    }

    if (question.response !== null) {
      throw new BadRequestException('Problem already answered');
    }

    if (
      session.timeLimitMs &&
      Date.now() - session.startedAt.getTime() > session.timeLimitMs
    ) {
      throw new BadRequestException('Section exam time has expired');
    }

    const evaluation = evaluateAnswer(
      question.problem.type,
      answer,
      question.problem.correctAnswer,
      question.problem.explanation ?? undefined,
    );

    await this.prisma.$transaction([
      this.prisma.sectionExamQuestion.update({
        where: { id: question.id },
        data: {
          response: answer as Prisma.InputJsonValue,
          correct: evaluation.correct,
          responseTimeMs,
        },
      }),
      this.prisma.problemAttempt.create({
        data: {
          userId,
          problemId,
          answer: answer as Prisma.InputJsonValue,
          correct: evaluation.correct,
          responseTimeMs,
          xpAwarded: 0,
        },
      }),
    ]);

    const questions = await this.prisma.sectionExamQuestion.findMany({
      where: { sessionId },
      select: { response: true },
    });
    const answeredCount = questions.filter(
      (question) => question.response !== null,
    ).length;
    const totalProblems = questions.length;

    return {
      answeredCount,
      totalProblems,
    };
  }

  async completeExam(userId: string, courseId: string, sectionId: string, sessionId: string) {
    const session = await this.prisma.sectionExamSession.findUnique({
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

    if (session.status !== ExamSessionStatus.in_progress) {
      throw new BadRequestException('Section exam session is already complete');
    }

    const config = this.parseConfig(session.section.sectionExamConfig);
    const totalCount = session.questions.length;
    const correctCount = session.questions.filter((question) => question.correct).length;
    const score = totalCount > 0 ? correctCount / totalCount : 0;
    const passed = score >= config.passingScore;

    const conceptBreakdownMap = new Map<
      string,
      { conceptId: string; conceptName: string; correct: number; total: number }
    >();
    for (const question of session.questions) {
      const entry = conceptBreakdownMap.get(question.conceptId) ?? {
        conceptId: question.conceptId,
        conceptName: question.concept.name,
        correct: 0,
        total: 0,
      };
      entry.total += 1;
      if (question.correct) {
        entry.correct += 1;
      }
      conceptBreakdownMap.set(question.conceptId, entry);
    }

    const conceptBreakdown = [...conceptBreakdownMap.values()];
    const failedConcepts = conceptBreakdown
      .filter((entry) => entry.correct / entry.total < 0.5)
      .map((entry) => entry.conceptId);

    const xpResult = calculateQuizXP(totalCount, correctCount);

    await this.prisma.$transaction(async (tx) => {
      await tx.sectionExamSession.update({
        where: { id: sessionId },
        data: {
          status: ExamSessionStatus.completed,
          score,
          passed,
          completedAt: new Date(),
        },
      });

      if (passed) {
        await tx.studentSectionState.update({
          where: { userId_sectionId: { userId, sectionId } },
          data: {
            status: SectionMasteryState.certified,
            examPassedAt: new Date(),
          },
        });

        const nextSection = await tx.courseSection.findFirst({
          where: {
            courseId,
            sortOrder: { gt: session.section.sortOrder },
          },
          orderBy: { sortOrder: 'asc' },
          select: { id: true },
        });

        if (nextSection) {
          await tx.studentSectionState.updateMany({
            where: {
              userId,
              sectionId: nextSection.id,
              status: SectionMasteryState.locked,
            },
            data: {
              status: SectionMasteryState.lesson_in_progress,
            },
          });
        }
      } else {
        await tx.studentSectionState.update({
          where: { userId_sectionId: { userId, sectionId } },
          data: {
            status: SectionMasteryState.needs_review,
          },
        });

        if (failedConcepts.length > 0) {
          await tx.studentConceptState.updateMany({
            where: {
              userId,
              conceptId: { in: failedConcepts },
            },
            data: {
              masteryState: 'needs_review',
            },
          });
        }
      }
    });

    let awardedXP = 0;
    if (xpResult.xp > 0) {
      const recorded = await this.xpService.recordXPEvent({
        userId,
        courseId,
        source: 'quiz',
        amount: xpResult.xp,
      });
      awardedXP = recorded.amount;
    }

    await this.syncSectionStates(userId, courseId);

    return {
      sessionId,
      sectionId,
      passed,
      score,
      correctCount,
      totalCount,
      xpAwarded: awardedXP,
      failedConcepts,
      conceptBreakdown,
      results: session.questions.map((question) => ({
        problemId: question.problemId,
        correct: question.correct ?? false,
      })),
    };
  }

  async syncSectionStates(userId: string, courseId: string) {
    const sections = await this.prisma.courseSection.findMany({
      where: { courseId },
      include: {
        concepts: {
          select: { id: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const conceptIds = sections.flatMap((section) =>
      section.concepts.map((concept) => concept.id),
    );
    const [conceptStates, sectionStates] = await Promise.all([
      conceptIds.length === 0
        ? Promise.resolve([])
        : this.prisma.studentConceptState.findMany({
            where: {
              userId,
              conceptId: { in: conceptIds },
            },
            select: {
              conceptId: true,
              masteryState: true,
            },
          }),
      this.prisma.studentSectionState.findMany({
        where: { userId, courseId },
      }),
    ]);

    const conceptStateMap = new Map(
      conceptStates.map((state) => [state.conceptId, state.masteryState]),
    );
    const sectionStateMap = new Map(
      sectionStates.map((state) => [state.sectionId, state]),
    );

    let previousCertified = true;
    for (const section of sections) {
      const current = sectionStateMap.get(section.id);
      if (!current) {
        continue;
      }

      const config = this.parseConfig(section.sectionExamConfig);
      const sectionConceptStates = section.concepts.map(
        (concept) => conceptStateMap.get(concept.id) ?? 'unstarted',
      );
      const allMastered =
        sectionConceptStates.length > 0 &&
        sectionConceptStates.every((state) => state === 'mastered');
      const hasNeedsReview = sectionConceptStates.some(
        (state) => state === 'needs_review',
      );

      let nextStatus: SectionMasteryState;
      if (!previousCertified && current.status !== SectionMasteryState.certified) {
        nextStatus = SectionMasteryState.locked;
      } else if (!config.enabled) {
        if (allMastered) {
          nextStatus = SectionMasteryState.certified;
        } else if (hasNeedsReview) {
          nextStatus = SectionMasteryState.needs_review;
        } else {
          nextStatus = SectionMasteryState.lesson_in_progress;
        }
      } else if (current.status === SectionMasteryState.certified) {
        nextStatus = SectionMasteryState.certified;
      } else if (allMastered && !hasNeedsReview) {
        nextStatus = SectionMasteryState.exam_ready;
      } else if (hasNeedsReview) {
        nextStatus = SectionMasteryState.needs_review;
      } else {
        nextStatus = SectionMasteryState.lesson_in_progress;
      }

      if (nextStatus !== current.status) {
        await this.prisma.studentSectionState.update({
          where: { id: current.id },
          data: { status: nextStatus },
        });
        current.status = nextStatus;
      }

      previousCertified = current.status === SectionMasteryState.certified;
    }

    return this.prisma.studentSectionState.findMany({
      where: { userId, courseId },
      include: {
        section: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            sortOrder: true,
            sectionExamConfig: true,
          },
        },
      },
      orderBy: { section: { sortOrder: 'asc' } },
    });
  }

  private parseConfig(raw: Prisma.JsonValue | null): Required<SectionExamConfig> {
    const config = (raw ?? {}) as SectionExamConfig;
    return {
      enabled: config.enabled ?? false,
      passingScore: config.passingScore ?? DEFAULT_PASSING_SCORE,
      timeLimitMinutes: config.timeLimitMinutes ?? DEFAULT_TIME_LIMIT_MINUTES,
      questionCount: config.questionCount ?? DEFAULT_QUESTION_COUNT,
      blueprint: config.blueprint ?? [],
      instructions: config.instructions ?? '',
    };
  }

  private serializeSession(
    session: {
      id: string;
      timeLimitMs: number | null;
      questions: Array<{
        problem: {
          id: string;
          questionText: string;
          type: string;
          options: Prisma.JsonValue | null;
          difficulty: number;
        };
      }>;
    },
    config: Required<SectionExamConfig>,
  ) {
    return {
      sessionId: session.id,
      totalProblems: session.questions.length,
      timeLimitMs: session.timeLimitMs ?? config.timeLimitMinutes * 60 * 1000,
      instructions: config.instructions,
      passingScore: config.passingScore,
      problems: session.questions.map((question) =>
        this.serializeProblem(question.problem),
      ),
    };
  }

  private serializeProblem(problem: {
    id: string;
    questionText: string;
    type: string;
    options: Prisma.JsonValue | null;
    difficulty: number;
  }) {
    const values = Array.isArray(problem.options)
      ? problem.options.map((item) => String(item))
      : [];

    if (problem.type === 'matching') {
      return {
        id: problem.id,
        questionText: problem.questionText,
        type: problem.type,
        pairs: values.map((item) => {
          const [left, right] = item.split('|');
          return {
            left: left?.trim() ?? item,
            right: right?.trim() ?? '',
          };
        }),
        difficulty: problem.difficulty,
      };
    }

    if (problem.type === 'ordering') {
      return {
        id: problem.id,
        questionText: problem.questionText,
        type: problem.type,
        items: values,
        difficulty: problem.difficulty,
      };
    }

    return {
      id: problem.id,
      questionText: problem.questionText,
      type: problem.type,
      options: values.map((text, index) => ({
        id: String(index),
        text,
      })),
      difficulty: problem.difficulty,
    };
  }
}
