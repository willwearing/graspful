import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { SectionExamConfig } from './config';

type ExamProblem = { id: string; isReviewVariant: boolean; purpose?: string; isTransfer?: boolean };
type ExamConcept = { id: string; slug: string; knowledgePoints: Array<{ problems: ExamProblem[] }> };
type Candidate = ExamProblem & { conceptId: string };

/** Keep authored exam cases private, honor the blueprint, and prefer fresh cases on retakes. */
export function selectSectionExamQuestions(
  concepts: ExamConcept[],
  config: Required<SectionExamConfig>,
  options: { seed?: string; exposedProblemIds?: Set<string> } = {},
) {
  const all = concepts.flatMap((concept) => concept.knowledgePoints.flatMap((kp) =>
    kp.problems.map((problem) => ({ ...problem, conceptId: concept.id })),
  ));
  const dedicated = all.some((problem) => problem.purpose === 'exam');
  const pool = dedicated ? all.filter((problem) => problem.purpose === 'exam') : all;
  const order = new Map(all.map((problem, index) => [problem.id, index]));
  const shuffledRank = (id: string) => createHash('sha256').update(`${options.seed}:${id}`).digest('hex');
  const rank = (a: Candidate, b: Candidate) =>
    (config.minTransferQuestions > 0 ? Number(Boolean(b.isTransfer)) - Number(Boolean(a.isTransfer)) : 0) ||
    Number(options.exposedProblemIds?.has(a.id) ?? false) - Number(options.exposedProblemIds?.has(b.id) ?? false) ||
    (dedicated ? 0 : Number(b.isReviewVariant) - Number(a.isReviewVariant)) ||
    (options.seed ? shuffledRank(a.id).localeCompare(shuffledRank(b.id)) : order.get(a.id)! - order.get(b.id)!);
  const selected: Candidate[] = [];
  const selectedIds = new Set<string>();
  const add = (problem: Candidate) => { selected.push(problem); selectedIds.add(problem.id); };
  const conceptIds = new Map(concepts.flatMap((concept) => [[concept.id, concept.id], [concept.slug, concept.id]]));

  for (const item of config.blueprint) {
    const conceptId = conceptIds.get(item.conceptId);
    if (!conceptId) throw new BadRequestException(`Section exam blueprint references unknown concept ${item.conceptId}`);
    const candidates = pool.filter((problem) => problem.conceptId === conceptId && !selectedIds.has(problem.id)).sort(rank);
    if (candidates.length < item.minQuestions) {
      throw new BadRequestException(`Not enough problems to satisfy blueprint for concept ${item.conceptId}`);
    }
    candidates.slice(0, item.minQuestions).forEach(add);
  }
  pool.filter((problem) => !selectedIds.has(problem.id)).sort(rank)
    .slice(0, Math.max(0, config.questionCount - selected.length)).forEach(add);
  if (selected.length !== config.questionCount) throw new BadRequestException('Not enough problems available for section exam');
  if (selected.filter((problem) => problem.isTransfer).length < config.minTransferQuestions) {
    throw new BadRequestException('Not enough transfer problems available for section exam');
  }
  return selected.map((problem) => ({ problemId: problem.id, conceptId: problem.conceptId }));
}
