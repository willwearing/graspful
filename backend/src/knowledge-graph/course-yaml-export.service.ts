import { Injectable, NotFoundException } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { PrismaService } from '@/prisma/prisma.service';
import {
  activeConceptWhere,
  activeSectionWhere,
  activeKnowledgePointWhere,
  activePrerequisiteEdgeWhere,
  activeEncompassingEdgeWhere,
} from './active-course-content';

@Injectable()
export class CourseYamlExportService {
  constructor(private prisma: PrismaService) {}

  async exportCourse(orgId: string, courseId: string): Promise<string> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId, archivedAt: null },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const [sections, concepts, prerequisiteEdges, encompassingEdges] =
      await Promise.all([
        this.prisma.courseSection.findMany({
          where: activeSectionWhere({ courseId }),
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.concept.findMany({
          where: activeConceptWhere({ courseId }),
          orderBy: { sortOrder: 'asc' },
          include: {
            knowledgePoints: {
              where: activeKnowledgePointWhere(),
              orderBy: { sortOrder: 'asc' },
              include: {
                problems: {
                  where: { isArchived: false },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
          },
        }),
        this.prisma.prerequisiteEdge.findMany({
          where: activePrerequisiteEdgeWhere(courseId),
        }),
        this.prisma.encompassingEdge.findMany({
          where: activeEncompassingEdgeWhere(courseId),
        }),
      ]);

    // Build lookup maps
    const conceptIdToSlug = new Map<string, string>();
    for (const c of concepts) {
      conceptIdToSlug.set(c.id, c.slug);
    }

    const sectionIdToSlug = new Map<string, string>();
    for (const s of sections) {
      sectionIdToSlug.set(s.id, s.slug);
    }

    // Build prerequisite map: target concept id -> source concept slugs
    const prereqMap = new Map<string, string[]>();
    for (const edge of prerequisiteEdges) {
      const sourceSlug = conceptIdToSlug.get(edge.sourceConceptId);
      if (sourceSlug) {
        const existing = prereqMap.get(edge.targetConceptId) ?? [];
        existing.push(sourceSlug);
        prereqMap.set(edge.targetConceptId, existing);
      }
    }

    // Build encompassing map: source concept id -> { concept slug, weight }[]
    const encompMap = new Map<string, Array<{ concept: string; weight: number }>>();
    for (const edge of encompassingEdges) {
      const targetSlug = conceptIdToSlug.get(edge.targetConceptId);
      if (targetSlug) {
        const existing = encompMap.get(edge.sourceConceptId) ?? [];
        existing.push({ concept: targetSlug, weight: edge.weight });
        encompMap.set(edge.sourceConceptId, existing);
      }
    }

    // Build YAML structure matching CourseYamlSchema
    const yamlObj: Record<string, unknown> = {
      course: {
        id: course.slug,
        name: course.name,
        ...(course.description && { description: course.description }),
        estimatedHours: course.estimatedHours,
        version: course.version,
      },
    };

    if (sections.length > 0) {
      yamlObj.sections = sections.map((s) => {
        const sectionObj: Record<string, unknown> = {
          id: s.slug,
          name: s.name,
        };
        if (s.description) sectionObj.description = s.description;
        if (s.sectionExamConfig) sectionObj.sectionExam = s.sectionExamConfig;
        return sectionObj;
      });
    }

    yamlObj.concepts = concepts.map((c) => {
      const conceptObj: Record<string, unknown> = {
        id: c.slug,
        name: c.name,
      };

      if (c.sectionId) {
        const sectionSlug = sectionIdToSlug.get(c.sectionId);
        if (sectionSlug) conceptObj.section = sectionSlug;
      }

      conceptObj.difficulty = c.difficulty;
      if (c.estimatedMinutes) conceptObj.estimatedMinutes = c.estimatedMinutes;
      if (c.tags.length > 0) conceptObj.tags = c.tags;
      if (c.sourceReference) conceptObj.sourceRef = c.sourceReference;

      const prereqs = prereqMap.get(c.id) ?? [];
      if (prereqs.length > 0) conceptObj.prerequisites = prereqs;

      const encompassing = encompMap.get(c.id) ?? [];
      if (encompassing.length > 0) conceptObj.encompassing = encompassing;

      if (c.knowledgePoints.length > 0) {
        conceptObj.knowledgePoints = c.knowledgePoints.map((kp) => {
          const kpObj: Record<string, unknown> = {
            id: kp.slug,
          };
          if (kp.instructionText) kpObj.instruction = kp.instructionText;
          if (
            kp.instructionContent &&
            Array.isArray(kp.instructionContent) &&
            (kp.instructionContent as unknown[]).length > 0
          ) {
            kpObj.instructionContent = kp.instructionContent;
          }
          if (kp.workedExampleText) kpObj.workedExample = kp.workedExampleText;
          if (
            kp.workedExampleContent &&
            Array.isArray(kp.workedExampleContent) &&
            (kp.workedExampleContent as unknown[]).length > 0
          ) {
            kpObj.workedExampleContent = kp.workedExampleContent;
          }

              if (kp.problems.length > 0) {
                kpObj.problems = kp.problems.map((p) => {
                  const pObj: Record<string, unknown> = {
                    id: p.authoredId,
                    type: p.type,
                    question: p.questionText,
                    correct: p.correctAnswer,
                  };
              if (p.options) pObj.options = p.options;
              if (p.explanation) pObj.explanation = p.explanation;
              if (p.difficulty !== 3) pObj.difficulty = p.difficulty;
              return pObj;
            });
          }

          return kpObj;
        });
      }

      return conceptObj;
    });

    return yaml.dump(yamlObj, {
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
  }
}
