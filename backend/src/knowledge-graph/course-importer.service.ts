import { Injectable, BadRequestException } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { ProblemType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { GraphValidationService } from './graph-validation.service';
import { buildQualifiedConceptRef, parseConceptRef } from './concept-ref';
import { CourseYamlSchema, type CourseYaml } from '@graspful/shared';

export interface ImportResult {
  courseId: string;
  sectionCount: number;
  conceptCount: number;
  knowledgePointCount: number;
  problemCount: number;
  prerequisiteEdgeCount: number;
  encompassingEdgeCount: number;
  warnings: string[];
}

export interface ImportOptions {
  replace?: boolean;
  archiveMissing?: boolean;
  isPublished?: boolean;
}

export interface CourseImportScope {
  academyId?: string;
  academySlug?: string;
  academyName?: string;
  academyDescription?: string;
  academyVersion?: string;
  partId?: string | null;
  sortOrder?: number;
  expectedCourseSlug?: string;
  expectedCourseName?: string;
  expectedCourseDescription?: string;
}

export interface CourseStructureSyncResult {
  courseId: string;
  courseSlug: string;
  sectionCount: number;
  conceptCount: number;
  knowledgePointCount: number;
  problemCount: number;
  warnings: string[];
  conceptSlugToId: Map<string, string>;
  edgeOwnerConceptIds: string[];
}

export interface CourseEdgeSyncResult {
  prerequisiteEdgeCount: number;
  encompassingEdgeCount: number;
}

type RemovedContent = {
  sections: Array<{ id: string; slug: string }>;
  concepts: Array<{ id: string; slug: string }>;
  knowledgePoints: Array<{ id: string; key: string }>;
  problems: Array<{ id: string; key: string }>;
};

@Injectable()
export class CourseImporterService {
  constructor(
    private prisma: PrismaService,
    private graphValidation: GraphValidationService,
  ) {}

  parseCourseYaml(yamlContent: string, scope?: CourseImportScope): CourseYaml {
    let raw: unknown = yamlContent;
    for (let depth = 0; depth < 3 && typeof raw === 'string'; depth++) {
      raw = yaml.load(raw);
    }
    const parseResult = CourseYamlSchema.safeParse(raw);

    if (!parseResult.success) {
      throw new BadRequestException(
        `Invalid course YAML: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
      );
    }

    const data = parseResult.data;

    if (scope?.expectedCourseSlug && data.course.id !== scope.expectedCourseSlug) {
      throw new BadRequestException(
        `Academy manifest expected course "${scope.expectedCourseSlug}" but course file declares "${data.course.id}"`,
      );
    }

    return data;
  }

  validateCourseGraph(data: CourseYaml) {
    const currentCourseSlug = data.course.id;
    const conceptIds = data.concepts.map((concept) => concept.id);
    const prereqEdges = data.concepts.flatMap((concept) =>
      concept.prerequisites.map((prereqRef) => {
        const parsedRef = parseConceptRef(prereqRef, currentCourseSlug);
        if (parsedRef.courseSlug !== currentCourseSlug) {
          throw new BadRequestException(
            `Cross-course prerequisite "${prereqRef}" requires academy import. Use the academy manifest/import path for qualified refs.`,
          );
        }

        return {
          source: parsedRef.conceptSlug,
          target: concept.id,
        };
      }),
    );
    const encompEdges = data.concepts.flatMap((concept) =>
      concept.encompassing.map((edgeRef) => {
        const parsedRef = parseConceptRef(edgeRef.concept, currentCourseSlug);
        if (parsedRef.courseSlug !== currentCourseSlug) {
          throw new BadRequestException(
            `Cross-course encompassing ref "${edgeRef.concept}" requires academy import. Use the academy manifest/import path for qualified refs.`,
          );
        }

        return {
          source: concept.id,
          target: parsedRef.conceptSlug,
          weight: edgeRef.weight,
        };
      }),
    );

    return this.graphValidation.validate(conceptIds, prereqEdges, encompEdges);
  }

  async importFromYaml(
    yamlContent: string,
    orgId: string,
    options: ImportOptions = {},
    scope?: CourseImportScope,
  ): Promise<ImportResult> {
    const data = this.parseCourseYaml(yamlContent, scope);
    const validation = this.validateCourseGraph(data);

    if (!validation.isValid) {
      throw new BadRequestException(
        `Invalid knowledge graph: ${validation.errors.join('; ')}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const structure = await this.syncCourseStructure(
        tx,
        data,
        orgId,
        options,
        scope,
      );

      const resolver = new Map<string, string>();
      for (const [conceptSlug, conceptId] of structure.conceptSlugToId.entries()) {
        resolver.set(
          buildQualifiedConceptRef(structure.courseSlug, conceptSlug),
          conceptId,
        );
      }

      const edgeCounts = await this.syncCourseEdges(
        tx,
        data,
        structure,
        resolver,
      );

      return this.buildImportResult(structure, edgeCounts, validation.warnings);
    }, { maxWait: 30000, timeout: 60000 });
  }

  async syncCourseStructure(
    tx: any,
    data: CourseYaml,
    orgId: string,
    options: ImportOptions = {},
    scope?: CourseImportScope,
  ): Promise<CourseStructureSyncResult> {
    let knowledgePointCount = 0;
    let problemCount = 0;

    const existingCourse = await tx.course.findUnique({
      where: { orgId_slug: { orgId, slug: data.course.id } },
    });
    const academy = scope?.academyId
      ? await tx.academy.update({
          where: { id: scope.academyId },
          data: {
            name: scope.academyName ?? data.course.name,
            description: scope.academyDescription ?? data.course.description,
            version: scope.academyVersion ?? data.course.version,
          },
        })
      : existingCourse
        ? await tx.academy.update({
            where: { id: existingCourse.academyId },
            data: {
              name: data.course.name,
              description: data.course.description,
              version: data.course.version,
            },
          })
        : await tx.academy.upsert({
            where: { orgId_slug: { orgId, slug: data.course.id } },
            update: {
              name: data.course.name,
              description: data.course.description,
              version: data.course.version,
            },
            create: {
              orgId,
              slug: data.course.id,
              name: data.course.name,
              description: data.course.description,
              version: data.course.version,
            },
          });

    if (existingCourse && !options.replace) {
      throw new BadRequestException(
        `Course "${data.course.id}" already exists for this org. Re-run with replace mode to update it in place.`,
      );
    }

    const course = existingCourse && options.replace
      ? await tx.course.update({
          where: { id: existingCourse.id },
          data: {
            academyId: academy.id,
            partId: scope?.partId ?? null,
            name: scope?.expectedCourseName ?? data.course.name,
            description: scope?.expectedCourseDescription ?? data.course.description,
            version: data.course.version,
            estimatedHours: data.course.estimatedHours,
            sortOrder: scope?.sortOrder ?? existingCourse.sortOrder ?? 0,
            ...(options.isPublished !== undefined && { isPublished: options.isPublished }),
          },
        })
      : await tx.course.create({
          data: {
            orgId,
            academyId: academy.id,
            partId: scope?.partId ?? null,
            slug: data.course.id,
            name: scope?.expectedCourseName ?? data.course.name,
            description: scope?.expectedCourseDescription ?? data.course.description,
            version: data.course.version,
            estimatedHours: data.course.estimatedHours,
            sortOrder: scope?.sortOrder ?? 0,
            ...(options.isPublished !== undefined && { isPublished: options.isPublished }),
          },
        });

    const [existingSections, existingConcepts, existingKnowledgePoints, enrollments]: [
      Array<{ id: string; slug: string }>,
      Array<{ id: string; slug: string }>,
      Array<{
        id: string;
        slug: string;
        conceptId: string;
        problems: Array<{ id: string; authoredId: string }>;
      }>,
      Array<{ userId: string }>,
    ] =
      existingCourse && options.replace
        ? await Promise.all([
            tx.courseSection.findMany({
              where: { courseId: course.id },
              select: { id: true, slug: true },
            }),
            tx.concept.findMany({
              where: { courseId: course.id },
              select: { id: true, slug: true },
            }),
            tx.knowledgePoint.findMany({
              where: { concept: { courseId: course.id } },
              select: {
                id: true,
                slug: true,
                conceptId: true,
                problems: {
                  select: {
                    id: true,
                    authoredId: true,
                  },
                },
              },
            }),
            tx.courseEnrollment.findMany({
              where: { courseId: course.id },
              select: { userId: true },
            }),
          ])
        : [[], [], [], []];

    const existingSectionBySlug = new Map<string, { id: string; slug: string }>(
      existingSections.map((section) => [section.slug, section]),
    );
    const existingConceptBySlug = new Map<string, { id: string; slug: string }>(
      existingConcepts.map((concept) => [concept.slug, concept]),
    );
    const existingConceptSlugById = new Map<string, string>(
      existingConcepts.map((concept) => [concept.id, concept.slug]),
    );
    const existingKnowledgePointByKey = new Map<
      string,
      {
        id: string;
        slug: string;
        conceptId: string;
        problems: Array<{ id: string; authoredId: string }>;
      }
    >(
      existingKnowledgePoints.map((kp) => [
        `${existingConceptSlugById.get(kp.conceptId)}:${kp.slug}`,
        kp,
      ]),
    );
    const existingProblemKeys = new Map<string, Array<{ id: string; authoredId: string }>>();
    for (const kp of existingKnowledgePoints) {
      const conceptSlug = existingConceptSlugById.get(kp.conceptId);
      if (!conceptSlug) {
        continue;
      }

      existingProblemKeys.set(`${conceptSlug}:${kp.slug}`, kp.problems);
    }
    const removedContent =
      existingCourse && options.replace
        ? this.collectRemovedContent(
            existingSections,
            existingConcepts,
            existingKnowledgePoints,
            existingConceptSlugById,
            existingProblemKeys,
            data,
          )
        : this.emptyRemovedContent();

    if (existingCourse && options.replace && !options.archiveMissing) {
      this.assertNoDestructiveRemovals(removedContent);
    }

    const sectionSlugToId = new Map<string, string>();
    const newSectionIds: string[] = [];

    for (let i = 0; i < data.sections.length; i++) {
      const sectionYaml = data.sections[i];
      const existingSection = existingSectionBySlug.get(sectionYaml.id);
      const section = existingSection
        ? await tx.courseSection.update({
            where: { id: existingSection.id },
            data: {
              name: sectionYaml.name,
              description: sectionYaml.description,
              sectionExamConfig: sectionYaml.sectionExam ?? undefined,
              sortOrder: i,
              isArchived: false,
            },
          })
        : await tx.courseSection.create({
            data: {
              courseId: course.id,
              slug: sectionYaml.id,
              name: sectionYaml.name,
              description: sectionYaml.description,
              sectionExamConfig: sectionYaml.sectionExam ?? undefined,
              sortOrder: i,
              isArchived: false,
            },
          });

      if (!existingSection) {
        newSectionIds.push(section.id);
      }

      sectionSlugToId.set(sectionYaml.id, section.id);
    }

    const conceptSlugToId = new Map<string, string>();
    const newConceptIds: string[] = [];

    for (let i = 0; i < data.concepts.length; i++) {
      const conceptYaml = data.concepts[i];
      const sectionId = conceptYaml.section
        ? sectionSlugToId.get(conceptYaml.section) ?? null
        : null;

      const existingConcept = existingConceptBySlug.get(conceptYaml.id);
      const concept = existingConcept
        ? await tx.concept.update({
            where: { id: existingConcept.id },
            data: {
              sectionId,
              name: conceptYaml.name,
              difficulty: conceptYaml.difficulty,
              estimatedMinutes: conceptYaml.estimatedMinutes,
              tags: conceptYaml.tags,
              sourceReference: conceptYaml.sourceRef,
              sortOrder: i,
              isArchived: false,
            },
          })
        : await tx.concept.create({
            data: {
              courseId: course.id,
              orgId,
              sectionId,
              slug: conceptYaml.id,
              name: conceptYaml.name,
              difficulty: conceptYaml.difficulty,
              estimatedMinutes: conceptYaml.estimatedMinutes,
              tags: conceptYaml.tags,
              sourceReference: conceptYaml.sourceRef,
              sortOrder: i,
              isArchived: false,
            },
          });

      if (!existingConcept) {
        newConceptIds.push(concept.id);
      }

      conceptSlugToId.set(conceptYaml.id, concept.id);

      for (let kpIdx = 0; kpIdx < conceptYaml.knowledgePoints.length; kpIdx++) {
        const kpYaml = conceptYaml.knowledgePoints[kpIdx];
        const existingKnowledgePoint = existingKnowledgePointByKey.get(
          `${conceptYaml.id}:${kpYaml.id}`,
        );
        const kp = existingKnowledgePoint
          ? await tx.knowledgePoint.update({
              where: { id: existingKnowledgePoint.id },
              data: {
                sortOrder: kpIdx,
                instructionText: kpYaml.instruction,
                instructionContent: kpYaml.instructionContent,
                workedExampleText: kpYaml.workedExample,
                workedExampleContent: kpYaml.workedExampleContent,
                isArchived: false,
              },
            })
          : await tx.knowledgePoint.create({
              data: {
                conceptId: concept.id,
                slug: kpYaml.id,
                sortOrder: kpIdx,
                instructionText: kpYaml.instruction,
                instructionContent: kpYaml.instructionContent,
                workedExampleText: kpYaml.workedExample,
                workedExampleContent: kpYaml.workedExampleContent,
                isArchived: false,
            },
          });

        knowledgePointCount++;

        const existingProblemsByAuthoredId = new Map(
          (existingKnowledgePoint?.problems ?? []).map((problem) => [
            problem.authoredId,
            problem,
          ]),
        );

        for (const probYaml of kpYaml.problems) {
          const existingProblem = existingProblemsByAuthoredId.get(probYaml.id);
          if (existingProblem) {
            await tx.problem.update({
              where: { id: existingProblem.id },
              data: {
                type: probYaml.type as ProblemType,
                questionText: probYaml.question,
                options: probYaml.options ?? undefined,
                correctAnswer: probYaml.correct as any,
                explanation: probYaml.explanation,
                difficulty: probYaml.difficulty ?? 3,
                authoredId: probYaml.id,
                isArchived: false,
              },
            });
          } else {
            await tx.problem.create({
              data: {
                knowledgePointId: kp.id,
                authoredId: probYaml.id,
                type: probYaml.type as ProblemType,
                questionText: probYaml.question,
                options: probYaml.options ?? undefined,
                correctAnswer: probYaml.correct as any,
                explanation: probYaml.explanation,
                difficulty: probYaml.difficulty ?? 3,
                isArchived: false,
              },
            });
          }
          problemCount++;
        }
      }
    }

    const currentCourseConceptIds = Array.from(conceptSlugToId.values());
    const edgeOwnerConceptIds = existingCourse
      ? Array.from(
          new Set([
            ...existingConcepts.map((concept: { id: string }) => concept.id),
            ...currentCourseConceptIds,
          ]),
        )
      : currentCourseConceptIds;

    if (newConceptIds.length > 0 && enrollments.length > 0) {
      await tx.studentConceptState.createMany({
        data: enrollments.flatMap((enrollment: { userId: string }) =>
          newConceptIds.map((conceptId) => ({
            userId: enrollment.userId,
            conceptId,
          })),
        ),
        skipDuplicates: true,
      });
    }

    if (newSectionIds.length > 0 && enrollments.length > 0) {
      await tx.studentSectionState.createMany({
        data: enrollments.flatMap((enrollment: { userId: string }) =>
          newSectionIds.map((sectionId) => ({
            userId: enrollment.userId,
            courseId: course.id,
            sectionId,
            status: 'locked',
          })),
        ),
        skipDuplicates: true,
      });
    }

    if (existingCourse && options.replace && options.archiveMissing) {
      await this.archiveRemovedContent(tx, removedContent);
    }

    return {
      courseId: course.id,
      courseSlug: data.course.id,
      sectionCount: data.sections.length,
      conceptCount: data.concepts.length,
      knowledgePointCount,
      problemCount,
      warnings: this.buildArchivalWarnings(removedContent),
      conceptSlugToId,
      edgeOwnerConceptIds,
    };
  }

  async syncCourseEdges(
    tx: any,
    data: CourseYaml,
    structure: CourseStructureSyncResult,
    conceptResolver: Map<string, string>,
  ): Promise<CourseEdgeSyncResult> {
    if (structure.edgeOwnerConceptIds.length > 0) {
      await tx.prerequisiteEdge.deleteMany({
        where: {
          targetConceptId: { in: structure.edgeOwnerConceptIds },
        },
      });

      await tx.encompassingEdge.deleteMany({
        where: {
          sourceConceptId: { in: structure.edgeOwnerConceptIds },
        },
      });
    }

    let prerequisiteEdgeCount = 0;
    for (const conceptYaml of data.concepts) {
      const targetId = structure.conceptSlugToId.get(conceptYaml.id);
      if (!targetId) {
        throw new BadRequestException(
          `Course import failed to resolve concept "${conceptYaml.id}" in "${structure.courseSlug}"`,
        );
      }

      for (const prereqRef of conceptYaml.prerequisites) {
        const parsedRef = this.parseAuthoringRef(prereqRef, structure.courseSlug);
        const sourceId = conceptResolver.get(parsedRef.qualifiedRef);

        if (!sourceId) {
          throw new BadRequestException(
            `Concept "${structure.courseSlug}:${conceptYaml.id}" references unknown prerequisite "${prereqRef}"`,
          );
        }

        await tx.prerequisiteEdge.create({
          data: {
            sourceConceptId: sourceId,
            targetConceptId: targetId,
          },
        });
        prerequisiteEdgeCount++;
      }
    }

    let encompassingEdgeCount = 0;
    for (const conceptYaml of data.concepts) {
      const sourceId = structure.conceptSlugToId.get(conceptYaml.id);
      if (!sourceId) {
        throw new BadRequestException(
          `Course import failed to resolve concept "${conceptYaml.id}" in "${structure.courseSlug}"`,
        );
      }

      for (const edgeRef of conceptYaml.encompassing) {
        const parsedRef = this.parseAuthoringRef(
          edgeRef.concept,
          structure.courseSlug,
        );
        const targetId = conceptResolver.get(parsedRef.qualifiedRef);

        if (!targetId) {
          throw new BadRequestException(
            `Concept "${structure.courseSlug}:${conceptYaml.id}" references unknown encompassing concept "${edgeRef.concept}"`,
          );
        }

        await tx.encompassingEdge.create({
          data: {
            sourceConceptId: sourceId,
            targetConceptId: targetId,
            weight: edgeRef.weight,
          },
        });
        encompassingEdgeCount++;
      }
    }

    return {
      prerequisiteEdgeCount,
      encompassingEdgeCount,
    };
  }

  buildImportResult(
    structure: CourseStructureSyncResult,
    edgeCounts: CourseEdgeSyncResult,
    extraWarnings: string[] = [],
  ): ImportResult {
    return {
      courseId: structure.courseId,
      sectionCount: structure.sectionCount,
      conceptCount: structure.conceptCount,
      knowledgePointCount: structure.knowledgePointCount,
      problemCount: structure.problemCount,
      prerequisiteEdgeCount: edgeCounts.prerequisiteEdgeCount,
      encompassingEdgeCount: edgeCounts.encompassingEdgeCount,
      warnings: [...new Set([...extraWarnings, ...structure.warnings])],
    };
  }

  private parseAuthoringRef(ref: string, currentCourseSlug: string) {
    try {
      return parseConceptRef(ref, currentCourseSlug);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid concept ref',
      );
    }
  }

  private emptyRemovedContent(): RemovedContent {
    return {
      sections: [],
      concepts: [],
      knowledgePoints: [],
      problems: [],
    };
  }

  private collectRemovedContent(
    existingSections: Array<{ id: string; slug: string }>,
    existingConcepts: Array<{ id: string; slug: string }>,
    existingKnowledgePoints: Array<{
      id: string;
      slug: string;
      conceptId: string;
      problems: Array<{ id: string; authoredId: string }>;
    }>,
    conceptSlugById: Map<string, string>,
    existingProblemKeys: Map<string, Array<{ id: string; authoredId: string }>>,
    data: CourseYaml,
  ) {
    const incomingSectionSlugs = new Set(data.sections.map((section) => section.id));
    const incomingConceptSlugs = new Set(data.concepts.map((concept) => concept.id));
    const incomingKnowledgePointKeys = new Set(
      data.concepts.flatMap((concept) =>
        concept.knowledgePoints.map((kp) => `${concept.id}:${kp.id}`),
        ),
    );
    const incomingProblemKeys = new Set(
      data.concepts.flatMap((concept) =>
        concept.knowledgePoints.flatMap((kp) =>
          kp.problems.map((problem) => `${concept.id}:${kp.id}:${problem.id}`),
        ),
      ),
    );

    const removedSections = existingSections.filter(
      (section) => !incomingSectionSlugs.has(section.slug),
    );
    const removedConcepts = existingConcepts.filter(
      (concept) => !incomingConceptSlugs.has(concept.slug),
    );
    const removedKnowledgePoints = existingKnowledgePoints
      .map((kp) => ({
        id: kp.id,
        key: `${conceptSlugById.get(kp.conceptId)}:${kp.slug}`,
      }))
      .filter((kp) => !incomingKnowledgePointKeys.has(kp.key));
    const removedProblems = Array.from(existingProblemKeys.entries())
      .flatMap(([kpKey, problems]) =>
        problems.map((problem) => ({
          id: problem.id,
          key: `${kpKey}:${problem.authoredId}`,
        })),
      )
      .filter((problem) => !incomingProblemKeys.has(problem.key));

    return {
      sections: removedSections,
      concepts: removedConcepts,
      knowledgePoints: removedKnowledgePoints,
      problems: removedProblems,
    };
  }

  private assertNoDestructiveRemovals(removedContent: RemovedContent) {
    const removedSections = removedContent.sections.map((section) => section.slug);
    const removedConcepts = removedContent.concepts.map((concept) => concept.slug);
    const removedKnowledgePoints = removedContent.knowledgePoints.map((kp) => kp.key);
    const removedProblems = removedContent.problems.map((problem) => problem.key);

    if (
      removedSections.length === 0 &&
      removedConcepts.length === 0 &&
      removedKnowledgePoints.length === 0 &&
      removedProblems.length === 0
    ) {
      return;
    }

    const details = [
      removedSections.length > 0
        ? `sections [${removedSections.join(', ')}]`
        : null,
      removedConcepts.length > 0
        ? `concepts [${removedConcepts.join(', ')}]`
        : null,
      removedKnowledgePoints.length > 0
        ? `knowledge points [${removedKnowledgePoints.join(', ')}]`
        : null,
      removedProblems.length > 0
        ? `problems [${removedProblems.join(', ')}]`
        : null,
    ]
      .filter(Boolean)
      .join('; ');

    throw new BadRequestException(
      `Destructive course updates are blocked because they can wipe learner progress. Missing from replace import: ${details}. Keep stable slugs and revise content in place, or re-run with archiveMissing to retire missing content without deleting learner state.`,
    );
  }

  private buildArchivalWarnings(removedContent: RemovedContent) {
    const warnings: string[] = [];

    if (removedContent.sections.length > 0) {
      warnings.push(
        `Archived sections: ${removedContent.sections.map((section) => section.slug).join(', ')}`,
      );
    }

    if (removedContent.concepts.length > 0) {
      warnings.push(
        `Archived concepts: ${removedContent.concepts.map((concept) => concept.slug).join(', ')}`,
      );
    }

    if (removedContent.knowledgePoints.length > 0) {
      warnings.push(
        `Archived knowledge points: ${removedContent.knowledgePoints.map((kp) => kp.key).join(', ')}`,
      );
    }

    if (removedContent.problems.length > 0) {
      warnings.push(
        `Archived problems: ${removedContent.problems.map((problem) => problem.key).join(', ')}`,
      );
    }

    return warnings;
  }

  private async archiveRemovedContent(
    tx: {
      knowledgePoint: {
        updateMany: (args: {
          where: { id: { in: string[] } };
          data: { isArchived: boolean };
        }) => Promise<unknown>;
      };
      concept: {
        updateMany: (args: {
          where: { id: { in: string[] } };
          data: { isArchived: boolean };
        }) => Promise<unknown>;
      };
      courseSection: {
        updateMany: (args: {
          where: { id: { in: string[] } };
          data: { isArchived: boolean };
        }) => Promise<unknown>;
      };
      problem: {
        updateMany: (args: {
          where: { id: { in: string[] } };
          data: { isArchived: boolean };
        }) => Promise<unknown>;
      };
    },
    removedContent: RemovedContent,
  ) {
    if (removedContent.problems.length > 0) {
      await tx.problem.updateMany({
        where: { id: { in: removedContent.problems.map((problem) => problem.id) } },
        data: { isArchived: true },
      });
    }

    if (removedContent.knowledgePoints.length > 0) {
      await tx.knowledgePoint.updateMany({
        where: { id: { in: removedContent.knowledgePoints.map((kp) => kp.id) } },
        data: { isArchived: true },
      });
    }

    if (removedContent.concepts.length > 0) {
      await tx.concept.updateMany({
        where: { id: { in: removedContent.concepts.map((concept) => concept.id) } },
        data: { isArchived: true },
      });
    }

    if (removedContent.sections.length > 0) {
      await tx.courseSection.updateMany({
        where: { id: { in: removedContent.sections.map((section) => section.id) } },
        data: { isArchived: true },
      });
    }
  }
}
