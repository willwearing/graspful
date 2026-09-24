import type { Prisma } from '@prisma/client';
import { serializeProblemForClient } from '@/shared/utils/problem-presentation';
import type { SectionExamConfig } from './config';

export function serializeSectionExamSession(
  session: {
    id: string;
    timeLimitMs: number | null;
    startedAt: Date;
    questions: Array<{
      problemId: string;
      response: Prisma.JsonValue | null;
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
    startedAt: session.startedAt,
    expiresAt: session.timeLimitMs === null
      ? null
      : new Date(session.startedAt.getTime() + session.timeLimitMs).toISOString(),
    answeredProblemIds: session.questions
      .filter((question) => question.response !== null)
      .map((question) => question.problemId),
    instructions: config.instructions,
    passingScore: config.passingScore,
    problems: session.questions.map((question) =>
      serializeProblemForClient(question.problem),
    ),
  };
}
