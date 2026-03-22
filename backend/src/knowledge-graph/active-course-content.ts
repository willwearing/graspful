import type { Prisma } from '@prisma/client';

const ACTIVE_SECTION_FILTER: Prisma.CourseSectionWhereInput = {
  isArchived: false,
};

const ACTIVE_CONCEPT_FILTER: Prisma.ConceptWhereInput = {
  isArchived: false,
  OR: [
    { sectionId: null },
    { section: { isArchived: false } },
  ],
};

const ACTIVE_KNOWLEDGE_POINT_FILTER: Prisma.KnowledgePointWhereInput = {
  isArchived: false,
  concept: ACTIVE_CONCEPT_FILTER,
};

export function activeSectionWhere(
  where: Prisma.CourseSectionWhereInput = {},
): Prisma.CourseSectionWhereInput {
  return {
    AND: [where, ACTIVE_SECTION_FILTER],
  };
}

export function activeConceptWhere(
  where: Prisma.ConceptWhereInput = {},
): Prisma.ConceptWhereInput {
  return {
    AND: [where, ACTIVE_CONCEPT_FILTER],
  };
}

export function activeKnowledgePointWhere(
  where: Prisma.KnowledgePointWhereInput = {},
): Prisma.KnowledgePointWhereInput {
  return {
    AND: [where, ACTIVE_KNOWLEDGE_POINT_FILTER],
  };
}

export function activePrerequisiteEdgeWhere(
  courseId: string,
): Prisma.PrerequisiteEdgeWhereInput {
  return {
    sourceConcept: activeConceptWhere({ courseId }),
    targetConcept: activeConceptWhere({ courseId }),
  };
}

export function activeEncompassingEdgeWhere(
  courseId: string,
): Prisma.EncompassingEdgeWhereInput {
  return {
    sourceConcept: activeConceptWhere({ courseId }),
    targetConcept: activeConceptWhere({ courseId }),
  };
}

export function activePrerequisiteEdgeWhereAcademy(
  academyId: string,
): Prisma.PrerequisiteEdgeWhereInput {
  return {
    sourceConcept: activeConceptWhere({ course: { academyId } }),
    targetConcept: activeConceptWhere({ course: { academyId } }),
  };
}

export function activeEncompassingEdgeWhereAcademy(
  academyId: string,
): Prisma.EncompassingEdgeWhereInput {
  return {
    sourceConcept: activeConceptWhere({ course: { academyId } }),
    targetConcept: activeConceptWhere({ course: { academyId } }),
  };
}
