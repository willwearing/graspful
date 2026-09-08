import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CourseReadService } from './course-read.service';
import { activeConceptWhere, activeSectionWhere } from './active-course-content';

const publishedCourse = {
  isPublished: true,
  archivedAt: null,
  academy: { archivedAt: null },
  org: { isActive: true },
};

describe('CourseReadService', () => {
  let service: CourseReadService;
  let mockPrisma: any;
  let mockStudentState: any;
  let mockGraphQuery: any;
  let mockGraphValidation: any;

  beforeEach(() => {
    mockPrisma = {
      academy: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      academyPart: { findMany: jest.fn() },
      course: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      courseSection: {
        findMany: jest.fn(),
      },
      concept: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      prerequisiteEdge: {
        findMany: jest.fn(),
      },
      encompassingEdge: {
        findMany: jest.fn(),
      },
    };

    mockStudentState = {
      getConceptStates: jest.fn(),
      getConceptStatesForAcademy: jest.fn(),
      assertAssessmentAccess: jest.fn(),
      assertAcademyAccess: jest.fn(),
    };

    mockGraphQuery = {
      knowledgeFrontier: jest.fn(),
    };

    mockGraphValidation = {
      validate: jest.fn(),
      validateAcademy: jest.fn(),
    };

    service = new CourseReadService(
      mockPrisma,
      mockStudentState,
      mockGraphQuery,
      mockGraphValidation,
    );
  });

  it('lists courses for an organization', async () => {
    const courses = [{ id: 'course-1' }];
    mockPrisma.course.findMany.mockResolvedValue(courses);

    await expect(service.listCourses('org-1')).resolves.toEqual(courses);
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith({
      where: { orgId: 'org-1', ...publishedCourse },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns a full course graph projection', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    mockPrisma.courseSection.findMany.mockResolvedValue([{ id: 'section-1' }]);
    mockPrisma.concept.findMany.mockResolvedValue([{ id: 'concept-1' }]);
    mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([
      { sourceConceptId: 'concept-1', targetConceptId: 'concept-2' },
    ]);
    mockPrisma.encompassingEdge.findMany.mockResolvedValue([
      { sourceConceptId: 'concept-2', targetConceptId: 'concept-1', weight: 0.5 },
    ]);

    await expect(service.getCourseGraph('org-1', 'course-1')).resolves.toEqual({
      course: { id: 'course-1' },
      sections: [{ id: 'section-1' }],
      concepts: [{ id: 'concept-1' }],
      prerequisiteEdges: [
        { sourceConceptId: 'concept-1', targetConceptId: 'concept-2' },
      ],
      encompassingEdges: [
        { sourceConceptId: 'concept-2', targetConceptId: 'concept-1', weight: 0.5 },
      ],
    });
  });

  it('computes frontier using the learner mastery map', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    mockPrisma.concept.findMany.mockResolvedValue([
      { id: 'concept-1' },
      { id: 'concept-2' },
    ]);
    mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([
      { sourceConceptId: 'concept-1', targetConceptId: 'concept-2' },
    ]);
    mockStudentState.getConceptStates.mockResolvedValue([
      { conceptId: 'concept-1', masteryState: 'mastered' },
      { conceptId: 'concept-2', masteryState: 'unstarted' },
    ]);
    mockGraphQuery.knowledgeFrontier.mockReturnValue(['concept-2']);

    await expect(
      service.getKnowledgeFrontier('org-1', 'course-1', 'user-1'),
    ).resolves.toEqual({
      courseId: 'course-1',
      userId: 'user-1',
      frontier: ['concept-2'],
      totalConcepts: 2,
      masteredCount: 1,
    });

    expect(mockGraphQuery.knowledgeFrontier).toHaveBeenCalledWith(
      ['concept-1', 'concept-2'],
      [{ source: 'concept-1', target: 'concept-2' }],
      new Set(['concept-1']),
    );
  });

  it('throws when the course is not visible to the org', async () => {
    mockPrisma.course.findFirst.mockResolvedValue(null);

    await expect(
      service.getCourseGraph('org-1', 'course-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('resolves a course by org-scoped slug', async () => {
    const course = { id: 'course-1', slug: 'posthog-data-model' };
    mockPrisma.course.findFirst.mockResolvedValue(course);

    await expect(service.getCourseBySlug('org-1', 'posthog-data-model')).resolves.toEqual(course);
    expect(mockPrisma.course.findFirst).toHaveBeenCalledWith({
      where: { slug: 'posthog-data-model', orgId: 'org-1', ...publishedCourse },
    });
  });

  it('resolves an academy by org-scoped slug', async () => {
    const academy = { id: 'academy-1', slug: 'posthog-tam' };
    mockPrisma.academy.findFirst.mockResolvedValue(academy);

    await expect(service.getAcademyBySlug('org-1', 'posthog-tam')).resolves.toEqual(academy);
    expect(mockPrisma.academy.findFirst).toHaveBeenCalledWith({
      where: {
        slug: 'posthog-tam', orgId: 'org-1', archivedAt: null,
        org: { isActive: true },
        courses: { some: publishedCourse },
      },
    });
  });

  it('validates an academy graph across all persisted academy concepts', async () => {
    mockPrisma.academy.findFirst.mockResolvedValue({ id: 'academy-1' });
    mockPrisma.course.findMany.mockResolvedValue([
      { slug: 'data-models' },
      { slug: 'pipelines' },
    ]);
    mockPrisma.concept.findMany.mockResolvedValue([
      { id: 'concept-1', course: { slug: 'data-models' } },
      { id: 'concept-2', course: { slug: 'pipelines' } },
    ]);
    mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([
      { sourceConceptId: 'concept-1', targetConceptId: 'concept-2' },
    ]);
    mockPrisma.encompassingEdge.findMany.mockResolvedValue([
      { sourceConceptId: 'concept-2', targetConceptId: 'concept-1', weight: 0.4 },
    ]);
    mockGraphValidation.validateAcademy.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    await expect(
      service.validateAcademyGraph('org-1', 'academy-1'),
    ).resolves.toEqual({
      isValid: true,
      errors: [],
      warnings: [],
    });

    expect(mockGraphValidation.validateAcademy).toHaveBeenCalledWith(
      ['data-models', 'pipelines'],
      [
        { id: 'concept-1', courseSlug: 'data-models' },
        { id: 'concept-2', courseSlug: 'pipelines' },
      ],
      [{ source: 'concept-1', target: 'concept-2' }],
      [{ source: 'concept-2', target: 'concept-1', weight: 0.4 }],
    );
  });

  it('denies draft course detail and content before reading concepts', async () => {
    mockPrisma.course.findFirst.mockImplementation(({ where }: { where: { isPublished?: boolean } }) =>
      Promise.resolve(where.isPublished ? null : { id: 'draft', isPublished: false }),
    );

    await expect(service.getCourseBySlug('org-1', 'draft')).rejects.toThrow(NotFoundException);
    await expect(service.getCourseGraph('org-1', 'draft')).rejects.toThrow(NotFoundException);
    await expect(service.listConcepts('org-1', 'draft')).rejects.toThrow(NotFoundException);
    await expect(service.getConceptDetail('org-1', 'draft', 'draft-concept'))
      .rejects.toThrow(NotFoundException);
    expect(mockPrisma.concept.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.concept.findFirst).not.toHaveBeenCalled();

    await expect(service.getCourseBySlug('org-1', 'draft', { includeDrafts: true }))
      .resolves.toEqual({ id: 'draft', isPublished: false });
  });

  it('keeps explicit creator draft listings and empty academy previews available', async () => {
    mockPrisma.course.findMany.mockResolvedValue([{ id: 'draft' }]);
    mockPrisma.academy.findFirst.mockResolvedValue({ id: 'empty-academy' });

    await service.listCourses('org-1', { includeDrafts: true });
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith({
      where: {
        orgId: 'org-1', archivedAt: null,
        academy: { archivedAt: null }, org: { isActive: true },
      },
      orderBy: { createdAt: 'desc' },
    });
    await service.getAcademy('org-1', 'empty-academy', { includeDrafts: true });
    expect(mockPrisma.academy.findFirst).toHaveBeenCalledWith({
      where: { id: 'empty-academy', orgId: 'org-1', archivedAt: null, org: { isActive: true } },
    });
  });

  it('omits draft-only academies and nested draft course summaries', async () => {
    mockPrisma.academy.findMany.mockResolvedValue([]);
    await service.listAcademies('org-1');
    expect(mockPrisma.academy.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        orgId: 'org-1', archivedAt: null, org: { isActive: true },
        courses: { some: publishedCourse },
      },
      include: {
        courses: expect.objectContaining({ where: publishedCourse }),
      },
    }));
  });

  it('omits draft courses, parts, content, and either endpoint of graph edges from academy reads', async () => {
    mockPrisma.academy.findFirst.mockResolvedValue({ id: 'academy-1' });
    mockPrisma.academyPart.findMany.mockResolvedValue([]);
    mockPrisma.course.findMany.mockResolvedValue([]);
    mockPrisma.courseSection.findMany.mockResolvedValue([]);
    mockPrisma.concept.findMany.mockResolvedValue([]);
    mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);
    mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);

    await service.getAcademyGraph('org-1', 'academy-1');
    const course = { orgId: 'org-1', academyId: 'academy-1', ...publishedCourse };
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: course }));
    expect(mockPrisma.academyPart.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { academyId: 'academy-1', courses: { some: publishedCourse } },
    }));
    expect(mockPrisma.courseSection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: activeSectionWhere({ course }),
    }));
    expect(mockPrisma.concept.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: activeConceptWhere({ course }),
    }));
    for (const edge of [mockPrisma.prerequisiteEdge, mockPrisma.encompassingEdge]) {
      expect(edge.findMany).toHaveBeenCalledWith({
        where: {
          sourceConcept: activeConceptWhere({ course }),
          targetConcept: activeConceptWhere({ course }),
        },
      });
    }
  });

  it('filters draft references out of a published concept detail', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    mockPrisma.concept.findFirst.mockResolvedValue({ id: 'concept-1' });
    await service.getConceptDetail('org-1', 'course-1', 'concept-1');
    const relatedConcept = activeConceptWhere({ course: { orgId: 'org-1', ...publishedCourse } });
    const include = mockPrisma.concept.findFirst.mock.calls[0][0].include;
    expect(include.prerequisiteOf.where.targetConcept).toEqual(relatedConcept);
    expect(include.prerequisiteFor.where.sourceConcept).toEqual(relatedConcept);
    expect(include.encompassedBy.where.targetConcept).toEqual(relatedConcept);
    expect(include.encompasses.where.sourceConcept).toEqual(relatedConcept);
  });

  it('requires learner entitlement before computing course or academy frontiers', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    mockPrisma.academy.findFirst.mockResolvedValue({ id: 'academy-1' });
    mockStudentState.assertAssessmentAccess.mockRejectedValue(new ForbiddenException());
    mockStudentState.assertAcademyAccess.mockRejectedValue(new ForbiddenException());

    await expect(service.getKnowledgeFrontier('org-1', 'course-1', 'user-1'))
      .rejects.toThrow(ForbiddenException);
    await expect(service.getAcademyKnowledgeFrontier('org-1', 'academy-1', 'user-1'))
      .rejects.toThrow(ForbiddenException);
    expect(mockPrisma.concept.findMany).not.toHaveBeenCalled();
    expect(mockStudentState.getConceptStates).not.toHaveBeenCalled();
    expect(mockStudentState.getConceptStatesForAcademy).not.toHaveBeenCalled();
  });

  it('restricts every scheduler projection to published active courses', async () => {
    mockPrisma.course.findMany.mockResolvedValue([{ id: 'published' }]);
    mockPrisma.concept.findMany.mockResolvedValue([]);
    mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);

    await expect(service.getCourseIdsForAcademy('academy-1')).resolves.toEqual(['published']);
    await service.getConceptsForAcademy('academy-1');
    await service.getPrereqEdgesForAcademy('academy-1');
    const course = { academyId: 'academy-1', ...publishedCourse };
    expect(mockPrisma.course.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: course }));
    expect(mockPrisma.concept.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: activeConceptWhere({ course }),
    }));
    expect(mockPrisma.prerequisiteEdge.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        sourceConcept: activeConceptWhere({ course }),
        targetConcept: activeConceptWhere({ course }),
      },
    }));
  });

});
