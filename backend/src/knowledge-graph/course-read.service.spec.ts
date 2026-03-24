import { NotFoundException } from '@nestjs/common';
import { CourseReadService } from './course-read.service';

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
      },
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
      where: { orgId: 'org-1', archivedAt: null },
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
});
