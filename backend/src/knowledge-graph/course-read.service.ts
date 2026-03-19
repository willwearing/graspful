import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { GraphQueryService } from './graph-query.service';
import { GraphValidationService, ValidationResult } from './graph-validation.service';
import {
  activeConceptWhere,
  activeEncompassingEdgeWhere,
  activeKnowledgePointWhere,
  activePrerequisiteEdgeWhere,
  activeSectionWhere,
} from './active-course-content';

@Injectable()
export class CourseReadService {
  constructor(
    private prisma: PrismaService,
    private studentState: StudentStateService,
    private graphQuery: GraphQueryService,
    private graphValidation: GraphValidationService,
  ) {}

  async listCourses(orgId: string) {
    return this.prisma.course.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourseGraph(orgId: string, courseId: string) {
    const course = await this.findCourseOrThrow(orgId, courseId);

    const [sections, concepts, prerequisiteEdges, encompassingEdges] = await Promise.all([
      this.prisma.courseSection.findMany({
        where: activeSectionWhere({ courseId }),
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.concept.findMany({
        where: activeConceptWhere({ courseId }),
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.prerequisiteEdge.findMany({
        where: activePrerequisiteEdgeWhere(courseId),
      }),
      this.prisma.encompassingEdge.findMany({
        where: activeEncompassingEdgeWhere(courseId),
      }),
    ]);

    return { course, sections, concepts, prerequisiteEdges, encompassingEdges };
  }

  async listConcepts(orgId: string, courseId: string) {
    await this.findCourseOrThrow(orgId, courseId);

    return this.prisma.concept.findMany({
      where: activeConceptWhere({ courseId }),
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getConceptDetail(orgId: string, courseId: string, conceptId: string) {
    const concept = await this.prisma.concept.findFirst({
      where: activeConceptWhere({ id: conceptId, courseId, orgId }),
      include: {
        knowledgePoints: {
          where: activeKnowledgePointWhere(),
          orderBy: { sortOrder: 'asc' },
          include: {
            problems: true,
          },
        },
        prerequisiteOf: {
          where: { targetConcept: activeConceptWhere() },
          include: { targetConcept: true },
        },
        prerequisiteFor: {
          where: { sourceConcept: activeConceptWhere() },
          include: { sourceConcept: true },
        },
        encompassedBy: {
          where: { targetConcept: activeConceptWhere() },
          include: { targetConcept: true },
        },
        encompasses: {
          where: { sourceConcept: activeConceptWhere() },
          include: { sourceConcept: true },
        },
      },
    });

    if (!concept) {
      throw new NotFoundException('Concept not found');
    }

    return concept;
  }

  async validateCourseGraph(orgId: string, courseId: string): Promise<ValidationResult> {
    await this.findCourseOrThrow(orgId, courseId);

    const [concepts, prereqEdges, encompEdges] = await Promise.all([
      this.prisma.concept.findMany({ where: activeConceptWhere({ courseId }) }),
      this.prisma.prerequisiteEdge.findMany({
        where: activePrerequisiteEdgeWhere(courseId),
      }),
      this.prisma.encompassingEdge.findMany({
        where: activeEncompassingEdgeWhere(courseId),
      }),
    ]);

    const conceptIds = concepts.map((concept) => concept.id);
    const simplePrereqs = prereqEdges.map((edge) => ({
      source: edge.sourceConceptId,
      target: edge.targetConceptId,
    }));
    const weightedEncompassing = encompEdges.map((edge) => ({
      source: edge.sourceConceptId,
      target: edge.targetConceptId,
      weight: edge.weight,
    }));

    return this.graphValidation.validate(
      conceptIds,
      simplePrereqs,
      weightedEncompassing,
    );
  }

  async getKnowledgeFrontier(orgId: string, courseId: string, userId: string) {
    await this.findCourseOrThrow(orgId, courseId);

    const [concepts, prereqEdges, conceptStates] = await Promise.all([
      this.prisma.concept.findMany({ where: activeConceptWhere({ courseId }) }),
      this.prisma.prerequisiteEdge.findMany({
        where: activePrerequisiteEdgeWhere(courseId),
      }),
      this.studentState.getConceptStates(userId, courseId),
    ]);

    const masteredIds = new Set(
      conceptStates
        .filter((state) => state.masteryState === 'mastered')
        .map((state) => state.conceptId),
    );

    const conceptIds = concepts.map((concept) => concept.id);
    const edges = prereqEdges.map((edge) => ({
      source: edge.sourceConceptId,
      target: edge.targetConceptId,
    }));

    const frontier = this.graphQuery.knowledgeFrontier(
      conceptIds,
      edges,
      masteredIds,
    );

    return {
      courseId,
      userId,
      frontier,
      totalConcepts: concepts.length,
      masteredCount: masteredIds.size,
    };
  }

  private async findCourseOrThrow(orgId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }
}
