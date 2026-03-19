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
      // If replace mode, delete existing course with same slug
      if (options.replace) {
        const existing = await tx.course.findUnique({
          where: { orgId_slug: { orgId, slug: data.course.id } },
        });
        if (existing) {
          await tx.course.delete({ where: { id: existing.id } });
        }
      }

      // Create course
      const course = await tx.course.create({
        data: {
          orgId,
          slug: data.course.id,
          name: data.course.name,
          description: data.course.description,
          version: data.course.version,
          estimatedHours: data.course.estimatedHours,
        },
      });

      // Create sections and build slug -> id map
      const sectionSlugToId = new Map<string, string>();
      for (let i = 0; i < data.sections.length; i++) {
        const sectionYaml = data.sections[i];
        const section = await tx.courseSection.create({
          data: {
            courseId: course.id,
            slug: sectionYaml.id,
            name: sectionYaml.name,
            description: sectionYaml.description,
            sectionExamConfig: sectionYaml.sectionExam ?? undefined,
            sortOrder: i,
          },
        });
        sectionSlugToId.set(sectionYaml.id, section.id);
      }

      // Create concepts and build slug -> id map
      const slugToId = new Map<string, string>();

      for (let i = 0; i < data.concepts.length; i++) {
        const conceptYaml = data.concepts[i];
        const sectionId = conceptYaml.section
          ? sectionSlugToId.get(conceptYaml.section) ?? null
          : null;

        const concept = await tx.concept.create({
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
        slugToId.set(conceptYaml.id, concept.id);

        // Create knowledge points
        for (let kpIdx = 0; kpIdx < conceptYaml.knowledgePoints.length; kpIdx++) {
          const kpYaml = conceptYaml.knowledgePoints[kpIdx];
          const kp = await tx.knowledgePoint.create({
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
