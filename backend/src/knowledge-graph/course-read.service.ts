import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
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

/** Draft visibility is granted by authenticated owner/admin controllers only. */
export interface CourseReadOptions {
  includeDrafts?: boolean;
}

function visibleCourseWhere(options: CourseReadOptions = {}): Prisma.CourseWhereInput {
  return {
    archivedAt: null,
    academy: { archivedAt: null },
    org: { isActive: true },
    ...(options.includeDrafts ? {} : { isPublished: true }),
  };
}

function visibleAcademyWhere(options: CourseReadOptions = {}): Prisma.AcademyWhereInput {
  return {
    archivedAt: null,
    org: { isActive: true },
    ...(options.includeDrafts ? {} : { courses: { some: visibleCourseWhere() } }),
  };
}

@Injectable()
export class CourseReadService {
  constructor(
    private prisma: PrismaService,
    private studentState: StudentStateService,
    private graphQuery: GraphQueryService,
    private graphValidation: GraphValidationService,
  ) {}

  async listCourses(orgId: string, options: CourseReadOptions = {}) {
    return this.prisma.course.findMany({
      where: { orgId, ...visibleCourseWhere(options) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAcademies(orgId: string, options: CourseReadOptions = {}) {
    return this.prisma.academy.findMany({
      where: { orgId, ...visibleAcademyWhere(options) },
      include: {
        courses: {
          where: visibleCourseWhere(options),
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

  async getAcademy(orgId: string, academyId: string, options: CourseReadOptions = {}) {
    return this.findAcademyOrThrow(orgId, academyId, options);
  }

  async getAcademyBySlug(orgId: string, academySlug: string, options: CourseReadOptions = {}) {
    return this.findAcademyBySlugOrThrow(orgId, academySlug, options);
  }

  async listAcademyCourses(orgId: string, academyId: string, options: CourseReadOptions = {}) {
    await this.findAcademyOrThrow(orgId, academyId, options);

    return this.prisma.course.findMany({
      where: { orgId, academyId, ...visibleCourseWhere(options) },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getAcademyGraph(orgId: string, academyId: string, options: CourseReadOptions = {}) {
    const academy = await this.findAcademyOrThrow(orgId, academyId, options);

    const [parts, courses, sections, concepts, prerequisiteEdges, encompassingEdges] =
      await Promise.all([
        this.prisma.academyPart.findMany({
          where: {
            academyId,
            ...(options.includeDrafts ? {} : { courses: { some: visibleCourseWhere() } }),
          },
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.course.findMany({
          where: { orgId, academyId, ...visibleCourseWhere(options) },
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.courseSection.findMany({
          where: activeSectionWhere({
            course: { orgId, academyId, ...visibleCourseWhere(options) },
          }),
          orderBy: [{ course: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        }),
        this.prisma.concept.findMany({
          where: activeConceptWhere({
            course: { orgId, academyId, ...visibleCourseWhere(options) },
          }),
          orderBy: [{ course: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        }),
        this.prisma.prerequisiteEdge.findMany({
          where: {
            sourceConcept: activeConceptWhere({
              course: { orgId, academyId, ...visibleCourseWhere(options) },
            }),
            targetConcept: activeConceptWhere({
              course: { orgId, academyId, ...visibleCourseWhere(options) },
            }),
          },
        }),
        this.prisma.encompassingEdge.findMany({
          where: {
            sourceConcept: activeConceptWhere({
              course: { orgId, academyId, ...visibleCourseWhere(options) },
            }),
            targetConcept: activeConceptWhere({
              course: { orgId, academyId, ...visibleCourseWhere(options) },
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

  async getCourseGraph(orgId: string, courseId: string, options: CourseReadOptions = {}) {
    const course = await this.findCourseOrThrow(orgId, courseId, options);

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

  async getCourse(orgId: string, courseId: string, options: CourseReadOptions = {}) {
    return this.findCourseOrThrow(orgId, courseId, options);
  }

  async getCourseBySlug(orgId: string, courseSlug: string, options: CourseReadOptions = {}) {
    return this.findCourseBySlugOrThrow(orgId, courseSlug, options);
  }

  async listConcepts(orgId: string, courseId: string, options: CourseReadOptions = {}) {
    await this.findCourseOrThrow(orgId, courseId, options);

    return this.prisma.concept.findMany({
      where: activeConceptWhere({ courseId }),
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getConceptDetail(orgId: string, courseId: string, conceptId: string, options: CourseReadOptions = {}) {
    await this.findCourseOrThrow(orgId, courseId, options);

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
          where: { targetConcept: activeConceptWhere({ course: { orgId, ...visibleCourseWhere(options) } }) },
          include: { targetConcept: true },
        },
        prerequisiteFor: {
          where: { sourceConcept: activeConceptWhere({ course: { orgId, ...visibleCourseWhere(options) } }) },
          include: { sourceConcept: true },
        },
        encompassedBy: {
          where: { targetConcept: activeConceptWhere({ course: { orgId, ...visibleCourseWhere(options) } }) },
          include: { targetConcept: true },
        },
        encompasses: {
          where: { sourceConcept: activeConceptWhere({ course: { orgId, ...visibleCourseWhere(options) } }) },
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
    await this.findCourseOrThrow(orgId, courseId, { includeDrafts: true });

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
    await this.findAcademyOrThrow(orgId, academyId, { includeDrafts: true });

    const [courses, concepts, prereqEdges, encompEdges] = await Promise.all([
      this.prisma.course.findMany({
        where: { academyId, archivedAt: null },
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
    await this.studentState.assertAssessmentAccess(userId, orgId, courseId);

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
    await this.studentState.assertAcademyAccess(userId, orgId, academyId);

    const [concepts, prereqEdges, conceptStates] = await Promise.all([
      this.prisma.concept.findMany({
        where: activeConceptWhere({
          course: { academyId, ...visibleCourseWhere() },
        }),
      }),
      this.prisma.prerequisiteEdge.findMany({
        where: {
          sourceConcept: activeConceptWhere({
            course: { academyId, ...visibleCourseWhere() },
          }),
          targetConcept: activeConceptWhere({
            course: { academyId, ...visibleCourseWhere() },
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
        course: { academyId, ...visibleCourseWhere() },
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
          course: { academyId, ...visibleCourseWhere() },
        }),
        targetConcept: activeConceptWhere({
          course: { academyId, ...visibleCourseWhere() },
        }),
      },
      select: { sourceConceptId: true, targetConceptId: true },
    });
  }

  async getCourseIdsForAcademy(academyId: string) {
    const courses = await this.prisma.course.findMany({
      where: { academyId, ...visibleCourseWhere() },
      select: { id: true },
      orderBy: { sortOrder: 'asc' },
    });
    return courses.map((c) => c.id);
  }

  private async findCourseOrThrow(orgId: string, courseId: string, options: CourseReadOptions = {}) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, orgId, ...visibleCourseWhere(options) },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  private async findCourseBySlugOrThrow(orgId: string, courseSlug: string, options: CourseReadOptions = {}) {
    const course = await this.prisma.course.findFirst({
      where: { slug: courseSlug, orgId, ...visibleCourseWhere(options) },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  private async findAcademyOrThrow(orgId: string, academyId: string, options: CourseReadOptions = {}) {
    const academy = await this.prisma.academy.findFirst({
      where: { id: academyId, orgId, ...visibleAcademyWhere(options) },
    });

    if (!academy) {
      throw new NotFoundException('Academy not found');
    }

    return academy;
  }

  private async findAcademyBySlugOrThrow(orgId: string, academySlug: string, options: CourseReadOptions = {}) {
    const academy = await this.prisma.academy.findFirst({
      where: { slug: academySlug, orgId, ...visibleAcademyWhere(options) },
    });

    if (!academy) {
      throw new NotFoundException('Academy not found');
    }

    return academy;
  }
}
