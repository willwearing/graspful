import { NotFoundException } from '@nestjs/common';
import { ExamSessionStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';

export async function getSectionExamProgress(prisma: PrismaService, studentState: StudentStateService, userId: string, courseId: string) {
  const states = await studentState.getSectionExamProgress(userId, courseId);

  return Promise.all(
    states.map(async (state) => {
      const conceptIds = state.section.concepts.map((concept) => concept.id);
      const masteryMap = await studentState.getConceptMasteryForIds(userId, conceptIds);
      const conceptStates = Array.from(masteryMap.entries()).map(
        ([conceptId, masteryState]) => ({ conceptId, masteryState }),
      );

      const latestAttempt = await prisma.sectionExamSession.findFirst({
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

export async function getSectionExamStatus(prisma: PrismaService, studentState: StudentStateService, userId: string, courseId: string, sectionId: string) {
  const [state, activeSession, latestSession] = await Promise.all([
    studentState.getSectionExamState(userId, sectionId),
    prisma.sectionExamSession.findFirst({
      where: {
        userId,
        courseId,
        sectionId,
        status: ExamSessionStatus.in_progress,
      },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.sectionExamSession.findFirst({
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
