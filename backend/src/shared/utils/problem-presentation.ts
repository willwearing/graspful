import { Prisma } from '@prisma/client';

export interface ClientProblemOption {
  id: string;
  text: string;
}

export interface ClientProblemPair {
  left: string;
  right: string;
}

export interface ClientProblem {
  id: string;
  questionText: string;
  type: string;
  difficulty: number;
  options?: ClientProblemOption[];
  items?: string[];
  pairs?: ClientProblemPair[];
}

interface ProblemPresentationInput {
  id: string;
  questionText: string;
  type: string;
  options?: Prisma.JsonValue | null;
  difficulty: number;
}

function getProblemOptionValues(options: Prisma.JsonValue | null | undefined): string[] {
  return Array.isArray(options) ? options.map((item) => String(item)) : [];
}

export function serializeProblemForClient(
  problem: ProblemPresentationInput,
): ClientProblem {
  const values = getProblemOptionValues(problem.options);

  if (problem.type === 'matching') {
    return {
      id: problem.id,
      questionText: problem.questionText,
      type: problem.type,
      difficulty: problem.difficulty,
      pairs: values.map((item) => {
        const [left, right] = item.split('|');
        return {
          left: left?.trim() ?? item,
          right: right?.trim() ?? '',
        };
      }),
    };
  }

  if (problem.type === 'ordering') {
    return {
      id: problem.id,
      questionText: problem.questionText,
      type: problem.type,
      difficulty: problem.difficulty,
      items: values.map((item) => item.trim()),
    };
  }

  if (values.length > 0) {
    return {
      id: problem.id,
      questionText: problem.questionText,
      type: problem.type,
      difficulty: problem.difficulty,
      options: values.map((text, index) => ({
        id: String(index),
        text,
      })),
    };
  }

  return {
    id: problem.id,
    questionText: problem.questionText,
    type: problem.type,
    difficulty: problem.difficulty,
  };
}
