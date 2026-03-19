import { Injectable, BadRequestException } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { PrismaService } from '@/prisma/prisma.service';
import { CourseYamlSchema, CourseYaml } from './schemas/course-yaml.schema';
import { GraphValidationService } from './graph-validation.service';
import { ProblemType } from '@prisma/client';

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
}

type RemovedContent = {
  sections: Array<{ id: string; slug: string }>;
  concepts: Array<{ id: string; slug: string }>;
  knowledgePoints: Array<{ id: string; key: string }>;
};

@Injectable()
export class CourseImporterService {
  constructor(
    private prisma: PrismaService,
    private graphValidation: GraphValidationService,
  ) {}

  async importFromYaml(
    yamlContent: string,
    orgId: string,
    options: ImportOptions = {},
  ): Promise<ImportResult> {
    // 1. Parse YAML
    const raw = yaml.load(yamlContent);

    // 2. Validate structure with Zod
    const parseResult = CourseYamlSchema.safeParse(raw);
    if (!parseResult.success) {
      throw new BadRequestException(
        `Invalid course YAML: ${parseResult.error.errors.map((e) => e.message).join(', ')}`,
      );
    }
    const data: CourseYaml = parseResult.data;

    // 3. Validate graph integrity before import
    const conceptIds = data.concepts.map((c) => c.id);
    const prereqEdges = data.concepts.flatMap((c) =>
      c.prerequisites.map((prereq) => ({ source: prereq, target: c.id })),
    );
    const encompEdges = data.concepts.flatMap((c) =>
      c.encompassing.map((e) => ({ source: c.id, target: e.concept, weight: e.weight })),
    );

    const validation = this.graphValidation.validate(conceptIds, prereqEdges, encompEdges);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Invalid knowledge graph: ${validation.errors.join('; ')}`,
      );
    }

    // Validate section references
    const sectionIds = new Set(data.sections.map((s) => s.id));
    for (const concept of data.concepts) {
      if (concept.section && !sectionIds.has(concept.section)) {
        throw new BadRequestException(
          `Concept "${concept.id}" references unknown section "${concept.section}"`,
        );
      }
    }

    // 4. Import everything in a transaction
    let knowledgePointCount = 0;
    let problemCount = 0;

    const result = await this.prisma.$transaction(async (tx) => {
      const existingCourse = await tx.course.findUnique({
        where: { orgId_slug: { orgId, slug: data.course.id } },
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
              name: data.course.name,
              description: data.course.description,
              version: data.course.version,
              estimatedHours: data.course.estimatedHours,
            },
          })
        : await tx.course.create({
            data: {
              orgId,
              slug: data.course.id,
              name: data.course.name,
              description: data.course.description,
              version: data.course.version,
              estimatedHours: data.course.estimatedHours,
            },
          });

      const [existingSections, existingConcepts, existingKnowledgePoints, enrollments] =
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
                select: { id: true, slug: true, conceptId: true },
              }),
              tx.courseEnrollment.findMany({
                where: { courseId: course.id },
                select: { userId: true },
              }),
            ])
          : [[], [], [], []];

      const existingSectionBySlug = new Map(
        existingSections.map((section) => [section.slug, section]),
      );
      const existingConceptBySlug = new Map(
        existingConcepts.map((concept) => [concept.slug, concept]),
      );
      const existingConceptSlugById = new Map(
        existingConcepts.map((concept) => [concept.id, concept.slug]),
      );
      const existingKnowledgePointByKey = new Map(
        existingKnowledgePoints.map((kp) => [
          `${existingConceptSlugById.get(kp.conceptId)}:${kp.slug}`,
          kp,
        ]),
      );
      const removedContent =
        existingCourse && options.replace
          ? this.collectRemovedContent(
              existingSections,
              existingConcepts,
              existingKnowledgePoints,
              existingConceptSlugById,
              data,
            )
          : this.emptyRemovedContent();

      if (existingCourse && options.replace && !options.archiveMissing) {
        this.assertNoDestructiveRemovals(removedContent);
      }

      // Create sections and build slug -> id map
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

      // Create concepts and build slug -> id map
      const slugToId = new Map<string, string>();
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
        slugToId.set(conceptYaml.id, concept.id);

        // Create knowledge points
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

          await tx.problem.deleteMany({
            where: { knowledgePointId: kp.id },
          });

          // Create problems
          for (const probYaml of kpYaml.problems) {
            await tx.problem.create({
              data: {
                knowledgePointId: kp.id,
                type: probYaml.type as ProblemType,
                questionText: probYaml.question,
                options: probYaml.options ?? undefined,
                correctAnswer: probYaml.correct as any,
                explanation: probYaml.explanation,
                difficulty: probYaml.difficulty ?? 3,
              },
            });
            problemCount++;
          }
        }
      }

      const courseConceptIds = Array.from(slugToId.values());
      const conceptIdsForEdgeCleanup = existingCourse
        ? Array.from(new Set([...existingConcepts.map((concept) => concept.id), ...courseConceptIds]))
        : courseConceptIds;

      if (conceptIdsForEdgeCleanup.length > 0) {
        await tx.prerequisiteEdge.deleteMany({
          where: {
            OR: [
              { sourceConceptId: { in: conceptIdsForEdgeCleanup } },
              { targetConceptId: { in: conceptIdsForEdgeCleanup } },
            ],
          },
        });

        await tx.encompassingEdge.deleteMany({
          where: {
            OR: [
              { sourceConceptId: { in: conceptIdsForEdgeCleanup } },
              { targetConceptId: { in: conceptIdsForEdgeCleanup } },
            ],
          },
        });
      }

      // Create prerequisite edges
      let prereqCount = 0;
      for (const conceptYaml of data.concepts) {
        for (const prereqSlug of conceptYaml.prerequisites) {
          const sourceId = slugToId.get(prereqSlug);
          const targetId = slugToId.get(conceptYaml.id);
          if (sourceId && targetId) {
            await tx.prerequisiteEdge.create({
              data: {
                sourceConceptId: sourceId,
                targetConceptId: targetId,
              },
            });
            prereqCount++;
          }
        }
      }

      // Create encompassing edges
      let encompCount = 0;
      for (const conceptYaml of data.concepts) {
        for (const enc of conceptYaml.encompassing) {
          const sourceId = slugToId.get(conceptYaml.id);
          const targetId = slugToId.get(enc.concept);
          if (sourceId && targetId) {
            await tx.encompassingEdge.create({
              data: {
                sourceConceptId: sourceId,
                targetConceptId: targetId,
                weight: enc.weight,
              },
            });
            encompCount++;
          }
        }
      }

      if (newConceptIds.length > 0 && enrollments.length > 0) {
        await tx.studentConceptState.createMany({
          data: enrollments.flatMap((enrollment) =>
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
          data: enrollments.flatMap((enrollment) =>
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

      const warnings = [
        ...validation.warnings,
        ...this.buildArchivalWarnings(removedContent),
      ];

      return {
        courseId: course.id,
        sectionCount: data.sections.length,
        conceptCount: data.concepts.length,
        knowledgePointCount,
        problemCount,
        prerequisiteEdgeCount: prereqCount,
        encompassingEdgeCount: encompCount,
        warnings,
      };
    }, { maxWait: 30000, timeout: 60000 });

    return result;
  }

  private emptyRemovedContent(): RemovedContent {
    return {
      sections: [] as Array<{ id: string; slug: string }>,
      concepts: [] as Array<{ id: string; slug: string }>,
      knowledgePoints: [] as Array<{ id: string; key: string }>,
    };
  }

  private collectRemovedContent(
    existingSections: Array<{ id: string; slug: string }>,
    existingConcepts: Array<{ id: string; slug: string }>,
    existingKnowledgePoints: Array<{ id: string; slug: string; conceptId: string }>,
    conceptSlugById: Map<string, string>,
    data: CourseYaml,
  ) {
    const incomingSectionSlugs = new Set(data.sections.map((section) => section.id));
    const incomingConceptSlugs = new Set(data.concepts.map((concept) => concept.id));
    const incomingKnowledgePointKeys = new Set(
      data.concepts.flatMap((concept) =>
        concept.knowledgePoints.map((kp) => `${concept.id}:${kp.id}`),
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

    return {
      sections: removedSections,
      concepts: removedConcepts,
      knowledgePoints: removedKnowledgePoints,
    };
  }

  private assertNoDestructiveRemovals(removedContent: RemovedContent) {
    const removedSections = removedContent.sections.map((section) => section.slug);
    const removedConcepts = removedContent.concepts.map((concept) => concept.slug);
    const removedKnowledgePoints = removedContent.knowledgePoints.map((kp) => kp.key);

    if (
      removedSections.length === 0 &&
      removedConcepts.length === 0 &&
      removedKnowledgePoints.length === 0
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
    ]
      .filter(Boolean)
      .join('; ');

    throw new BadRequestException(
      `Destructive course updates are blocked because they can wipe learner progress. Missing from replace import: ${details}. Keep stable slugs and revise content in place, or re-run with archiveMissing to retire missing content without deleting learner state.`,
    );
  }

  private buildArchivalWarnings(
    removedContent: RemovedContent,
  ) {
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

    return warnings;
  }

  private async archiveRemovedContent(
    tx: {
      knowledgePoint: { updateMany: (args: { where: { id: { in: string[] } }; data: { isArchived: boolean } }) => Promise<unknown> };
      concept: { updateMany: (args: { where: { id: { in: string[] } }; data: { isArchived: boolean } }) => Promise<unknown> };
      courseSection: { updateMany: (args: { where: { id: { in: string[] } }; data: { isArchived: boolean } }) => Promise<unknown> };
    },
    removedContent: RemovedContent,
  ) {
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
