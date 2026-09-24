import { BadRequestException } from '@nestjs/common';
import type { SectionExamConfig } from './config';

type ExamConcept = {
  id: string;
  slug: string;
  knowledgePoints: Array<{ problems: Array<{ id: string; isReviewVariant: boolean }> }>;
};

/** Select the blueprint first, then fill from unused problems. */
export function selectSectionExamQuestions(
  concepts: ExamConcept[],
  config: Required<SectionExamConfig>,
) {
  const problemsByConcept = new Map<string, Array<{ id: string; isReviewVariant: boolean }>>();

  for (const concept of concepts) {
    const problems = concept.knowledgePoints.flatMap((kp) => kp.problems);
    problemsByConcept.set(
      concept.id,
      [...problems].sort((a, b) => Number(b.isReviewVariant) - Number(a.isReviewVariant)),
    );
  }

  const selectedProblemIds = new Set<string>();
  const selectedQuestions: Array<{ problemId: string; conceptId: string }> = [];
  const conceptIdBySlug = new Map(
    concepts.map((concept) => [concept.id, concept.id] as const),
  );
  for (const concept of concepts) {
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

  const remainingPool = concepts
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

  return selectedQuestions;
}
