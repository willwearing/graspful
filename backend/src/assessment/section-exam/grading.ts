import { BadRequestException } from '@nestjs/common';
import { ExamSessionStatus, Prisma } from '@prisma/client';
import { parseSectionExamConfig } from './config';

export function hasSectionExamExpired(session: { timeLimitMs: number | null; startedAt: Date }) {
  return session.timeLimitMs !== null &&
    Date.now() - session.startedAt.getTime() >= session.timeLimitMs;
}

type GradableSession = {
  id: string;
  sectionId: string;
  status: ExamSessionStatus;
  timeLimitMs: number | null;
  startedAt: Date;
  score: number | null;
  passed: boolean | null;
  section: { sectionExamConfig: Prisma.JsonValue | null };
  questions: Array<{
    conceptId: string;
    problemId: string;
    response: Prisma.JsonValue | null;
    correct: boolean | null;
    concept: { name: string };
  }>;
};

export function gradeSectionExam(session: GradableSession) {
  const sessionId = session.id;
  const sectionId = session.sectionId;
  const alreadyCompleted = session.status !== ExamSessionStatus.in_progress;
  const expired = hasSectionExamExpired(session);
  const totalCount = session.questions.length;
  if (totalCount === 0) {
    throw new BadRequestException('Section exam has no assigned questions');
  }
  if (!alreadyCompleted && !expired && session.questions.some((question) => question.response === null)) {
    throw new BadRequestException('Answer every assigned question before completing the section exam');
  }

  const config = parseSectionExamConfig(session.section.sectionExamConfig);
  const correctCount = session.questions.filter((question) => question.response !== null && question.correct === true).length;
  const score = alreadyCompleted ? (session.score ?? 0) : correctCount / totalCount;
  const passed = alreadyCompleted ? (session.passed ?? false) : score >= config.passingScore;
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
    if (question.response !== null && question.correct === true) {
      entry.correct += 1;
    }
    conceptBreakdownMap.set(question.conceptId, entry);
  }
  const conceptBreakdown = [...conceptBreakdownMap.values()];
  const failedConcepts = conceptBreakdown
    .filter((entry) => entry.correct / entry.total < 0.5)
    .map((entry) => entry.conceptId);
  const result = {
    sessionId,
    sectionId,
    passed,
    score,
    correctCount,
    totalCount,
    alreadyCompleted,
    failedConcepts,
    conceptBreakdown,
    results: session.questions.map((question) => ({
      problemId: question.problemId,
      correct: question.response !== null && question.correct === true,
    })),
  };
  return { result, expired };
}
