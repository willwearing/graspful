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
      where: { orgId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAcademies(orgId: string) {
    return this.prisma.academy.findMany({
      where: { orgId },
      include: {
        courses: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            sortOrder: true,
            partId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAcademy(orgId: string, academyId: string) {
    return this.findAcademyOrThrow(orgId, academyId);
  }

  async listAcademyCourses(orgId: string, academyId: string) {
    await this.findAcademyOrThrow(orgId, academyId);

    return this.prisma.course.findMany({
      where: { orgId, academyId, archivedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getAcademyGraph(orgId: string, academyId: string) {
    const academy = await this.findAcademyOrThrow(orgId, academyId);

    const [parts, courses, sections, concepts, prerequisiteEdges, encompassingEdges] =
      await Promise.all([
        this.prisma.academyPart.findMany({
          where: { academyId },
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.course.findMany({
          where: { academyId },
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.courseSection.findMany({
          where: activeSectionWhere({
            course: { academyId },
          }),
          orderBy: [{ course: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        }),
        this.prisma.concept.findMany({
          where: activeConceptWhere({
            course: { academyId },
          }),
          orderBy: [{ course: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        }),
        this.prisma.prerequisiteEdge.findMany({
          where: {
            sourceConcept: activeConceptWhere({
              course: { academyId },
            }),
            targetConcept: activeConceptWhere({
              course: { academyId },
            }),
          },
        }),
        this.prisma.encompassingEdge.findMany({
          where: {
            sourceConcept: activeConceptWhere({
              course: { academyId },
            }),
            targetConcept: activeConceptWhere({
              course: { academyId },
            }),
          },
        }),
      ]);

    return {
      academy,
      parts,
      courses,
      sections,
      concepts,
      prerequisiteEdges,
      encompassingEdges,
    };
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

  async validateAcademyGraph(
    orgId: string,
    academyId: string,
  ): Promise<ValidationResult> {
    await this.findAcademyOrThrow(orgId, academyId);

    const [courses, concepts, prereqEdges, encompEdges] = await Promise.all([
      this.prisma.course.findMany({
        where: { academyId },
        select: { slug: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.concept.findMany({
        where: activeConceptWhere({
          course: { academyId },
        }),
        select: {
          id: true,
          course: {
            select: {
              slug: true,
            },
          },
        },
      }),
      this.prisma.prerequisiteEdge.findMany({
        where: {
          sourceConcept: activeConceptWhere({
            course: { academyId },
          }),
          targetConcept: activeConceptWhere({
            course: { academyId },
          }),
        },
      }),
      this.prisma.encompassingEdge.findMany({
        where: {
          sourceConcept: activeConceptWhere({
            course: { academyId },
          }),
          targetConcept: activeConceptWhere({
            course: { academyId },
          }),
        },
      }),
    ]);

    const courseSlugs = courses.map((course) => course.slug);
    const simplePrereqs = prereqEdges.map((edge) => ({
      source: edge.sourceConceptId,
      target: edge.targetConceptId,
    }));
    const weightedEncompassing = encompEdges.map((edge) => ({
      source: edge.sourceConceptId,
      target: edge.targetConceptId,
      weight: edge.weight,
    }));

    return this.graphValidation.validateAcademy(
      courseSlugs,
      concepts.map((concept) => ({
        id: concept.id,
        courseSlug: concept.course.slug,
      })),
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

  async getAcademyKnowledgeFrontier(
    orgId: string,
    academyId: string,
    userId: string,
  ) {
    await this.findAcademyOrThrow(orgId, academyId);

    const [concepts, prereqEdges, conceptStates] = await Promise.all([
      this.prisma.concept.findMany({
        where: activeConceptWhere({
          course: { academyId },
        }),
      }),
      this.prisma.prerequisiteEdge.findMany({
        where: {
          sourceConcept: activeConceptWhere({
            course: { academyId },
          }),
          targetConcept: activeConceptWhere({
            course: { academyId },
          }),
        },
      }),
      this.studentState.getConceptStatesForAcademy(userId, academyId),
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
      academyId,
      userId,
      frontier,
      totalConcepts: concepts.length,
      masteredCount: masteredIds.size,
    };
  }

  async getConceptsForAcademy(academyId: string) {
    return this.prisma.concept.findMany({
      where: activeConceptWhere({
        course: { academyId },
      }),
      select: {
        id: true,
        courseId: true,
        sectionId: true,
        difficulty: true,
      },
    });
  }

  async getPrereqEdgesForAcademy(academyId: string) {
    return this.prisma.prerequisiteEdge.findMany({
      where: {
        sourceConcept: activeConceptWhere({
          course: { academyId },
        }),
        targetConcept: activeConceptWhere({
          course: { academyId },
        }),
      },
      select: { sourceConceptId: true, targetConceptId: true },
    });
  }

  async getCourseIdsForAcademy(academyId: string) {
    const courses = await this.prisma.course.findMany({
      where: { academyId },
      select: { id: true },
      orderBy: { sortOrder: 'asc' },
    });
    return courses.map((c) => c.id);
  }

  private async findCourseOrThrow(orgId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId, archivedAt: null },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  private async findAcademyOrThrow(orgId: string, academyId: string) {
    const academy = await this.prisma.academy.findFirst({
      where: { id: academyId, orgId },
    });

    if (!academy) {
      throw new NotFoundException('Academy not found');
    }

    return academy;
  }
}
