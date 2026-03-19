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
}

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
      const existingKnowledgePointByKey = new Map(
        existingKnowledgePoints.map((kp) => [`${kp.conceptId}:${kp.slug}`, kp]),
      );

      // Create sections and build slug -> id map
      const sectionSlugToId = new Map<string, string>();
      const retainedSectionIds = new Set<string>();
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
              },
            });

        retainedSectionIds.add(section.id);
        if (!existingSection) {
          newSectionIds.push(section.id);
        }
        sectionSlugToId.set(sectionYaml.id, section.id);
      }

      // Create concepts and build slug -> id map
      const slugToId = new Map<string, string>();
      const retainedConceptIds = new Set<string>();
      const newConceptIds: string[] = [];
      const retainedKnowledgePointIds = new Set<string>();

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
              },
            });

        retainedConceptIds.add(concept.id);
        if (!existingConcept) {
          newConceptIds.push(concept.id);
        }
        slugToId.set(conceptYaml.id, concept.id);

        // Create knowledge points
        for (let kpIdx = 0; kpIdx < conceptYaml.knowledgePoints.length; kpIdx++) {
          const kpYaml = conceptYaml.knowledgePoints[kpIdx];
          const existingKnowledgePoint = existingKnowledgePointByKey.get(
            `${concept.id}:${kpYaml.id}`,
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
                },
              });

          knowledgePointCount++;
          retainedKnowledgePointIds.add(kp.id);

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

      if (existingCourse) {
        const removedKnowledgePointIds = existingKnowledgePoints
          .filter((kp) => !retainedKnowledgePointIds.has(kp.id))
          .map((kp) => kp.id);

        if (removedKnowledgePointIds.length > 0) {
          await tx.knowledgePoint.deleteMany({
            where: { id: { in: removedKnowledgePointIds } },
          });
        }

        const removedConceptIds = existingConcepts
          .filter((concept) => !retainedConceptIds.has(concept.id))
          .map((concept) => concept.id);

        if (removedConceptIds.length > 0) {
          await tx.concept.deleteMany({
            where: { id: { in: removedConceptIds } },
          });
        }

        const removedSectionIds = existingSections
          .filter((section) => !retainedSectionIds.has(section.id))
          .map((section) => section.id);

        if (removedSectionIds.length > 0) {
          await tx.courseSection.deleteMany({
            where: { id: { in: removedSectionIds } },
          });
        }
      }

      return {
        courseId: course.id,
        sectionCount: data.sections.length,
        conceptCount: data.concepts.length,
        knowledgePointCount,
        problemCount,
        prerequisiteEdgeCount: prereqCount,
        encompassingEdgeCount: encompCount,
        warnings: validation.warnings,
      };
    }, { maxWait: 30000, timeout: 60000 });

    return result;
  }
}
