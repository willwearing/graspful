import { Prisma, ProblemType } from '@prisma/client';
import type { CourseYaml } from '@graspful/shared';

type ExistingItem = { id: string; slug: string };
export type ExistingKnowledgePoint = ExistingItem & {
  conceptId: string;
  problems: Array<{ id: string; authoredId: string }>;
};
type ConceptYaml = CourseYaml['concepts'][number];
type KnowledgePointYaml = ConceptYaml['knowledgePoints'][number];

export async function syncSections(
  tx: Prisma.TransactionClient,
  courseId: string,
  sections: CourseYaml['sections'],
  existingBySlug: Map<string, ExistingItem>,
) {
  const sectionSlugToId = new Map<string, string>();
  const newSectionIds: string[] = [];
  for (const [sortOrder, section] of sections.entries()) {
    const existing = existingBySlug.get(section.id);
    const data = {
      name: section.name,
      description: section.description,
      sectionExamConfig: section.sectionExam ?? undefined,
      sortOrder,
      isArchived: false,
    };
    const saved = existing
      ? await tx.courseSection.update({ where: { id: existing.id }, data })
      : await tx.courseSection.create({ data: { ...data, courseId, slug: section.id } });
    if (!existing) newSectionIds.push(saved.id);
    sectionSlugToId.set(section.id, saved.id);
  }
  return { sectionSlugToId, newSectionIds };
}

export async function syncConcepts(
  tx: Prisma.TransactionClient,
  courseId: string,
  orgId: string,
  concepts: CourseYaml['concepts'],
  sectionSlugToId: Map<string, string>,
  existingBySlug: Map<string, ExistingItem>,
) {
  const conceptSlugToId = new Map<string, string>();
  const newConceptIds: string[] = [];
  for (const [sortOrder, concept] of concepts.entries()) {
    const existing = existingBySlug.get(concept.id);
    const data = {
      sectionId: concept.section ? sectionSlugToId.get(concept.section) ?? null : null,
      name: concept.name,
      difficulty: concept.difficulty,
      estimatedMinutes: concept.estimatedMinutes,
      tags: concept.tags,
      sourceReference: concept.sourceRef,
      sortOrder,
      isArchived: false,
    };
    const saved = existing
      ? await tx.concept.update({ where: { id: existing.id }, data })
      : await tx.concept.create({ data: { ...data, courseId, orgId, slug: concept.id } });
    if (!existing) newConceptIds.push(saved.id);
    conceptSlugToId.set(concept.id, saved.id);
  }
  return { conceptSlugToId, newConceptIds };
}

export async function syncKnowledgePoints(
  tx: Prisma.TransactionClient,
  concepts: CourseYaml['concepts'],
  conceptSlugToId: Map<string, string>,
  existingByKey: Map<string, ExistingKnowledgePoint>,
) {
  let knowledgePointCount = 0;
  let problemCount = 0;
  for (const concept of concepts) {
    const conceptId = conceptSlugToId.get(concept.id)!;
    for (const [sortOrder, kp] of concept.knowledgePoints.entries()) {
      const existing = existingByKey.get(`${concept.id}:${kp.id}`);
      const data = {
        sortOrder,
        instructionText: kp.instruction,
        instructionContent: kp.instructionContent,
        workedExampleText: kp.workedExample,
        workedExampleContent: kp.workedExampleContent,
        isArchived: false,
      };
      const saved = existing
        ? await tx.knowledgePoint.update({ where: { id: existing.id }, data })
        : await tx.knowledgePoint.create({ data: { ...data, conceptId, slug: kp.id } });
      knowledgePointCount++;
      problemCount += await syncProblems(tx, saved.id, kp.problems, existing?.problems ?? []);
    }
  }
  return { knowledgePointCount, problemCount };
}

export async function syncProblems(
  tx: Prisma.TransactionClient,
  knowledgePointId: string,
  problems: KnowledgePointYaml['problems'],
  existingProblems: Array<{ id: string; authoredId: string }>,
) {
  const existingByAuthoredId = new Map(existingProblems.map((problem) => [problem.authoredId, problem]));
  for (const problem of problems) {
    const existing = existingByAuthoredId.get(problem.id);
    const data = {
      type: problem.type as ProblemType,
      questionText: problem.question,
      options: problem.options ?? undefined,
      correctAnswer: problem.correct as Prisma.InputJsonValue,
      explanation: problem.explanation,
      difficulty: problem.difficulty ?? 3,
      authoredId: problem.id,
      isArchived: false,
    };
    if (existing) {
      await tx.problem.update({ where: { id: existing.id }, data });
    } else {
      await tx.problem.create({ data: { ...data, knowledgePointId } });
    }
  }
  return problems.length;
}
