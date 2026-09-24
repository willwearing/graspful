import type { Prisma } from '@prisma/client';

export type SectionExamConfig = {
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

export function parseSectionExamConfig(raw: Prisma.JsonValue | null): Required<SectionExamConfig> {
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
