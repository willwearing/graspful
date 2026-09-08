import type { PrismaService } from '@/prisma/prisma.service';
import {
  loadAcademyDiagnosticConcepts,
  loadAcademyDiagnosticEdges,
  loadDiagnosticConceptCourseMap,
  loadDiagnosticCourseNames,
  loadDiagnosticProblemsForConcept,
} from './diagnostic-session.queries';

const publishedCourseFilter = {
  isPublished: true,
  archivedAt: null,
  academy: { archivedAt: null },
  org: { isActive: true },
};

function expectActiveConceptScope(where: unknown, scope: object) {
  expect(where).toEqual({
    AND: expect.arrayContaining([
      expect.objectContaining(scope),
      expect.objectContaining({
        isArchived: false,
        OR: [{ sectionId: null }, { section: { isArchived: false } }],
      }),
    ]),
  });
}

describe('diagnostic publication queries', () => {
  const database = {
    concept: { findMany: jest.fn() },
    prerequisiteEdge: { findMany: jest.fn() },
    problem: { findMany: jest.fn() },
    course: { findMany: jest.fn() },
  };
  const prisma = database as unknown as PrismaService;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('restricts the academy concept pool to published courses in an active organization and academy', async () => {
    const concepts = [{ id: 'published-concept', courseId: 'published-course' }];
    database.concept.findMany.mockResolvedValue(concepts);

    await expect(loadAcademyDiagnosticConcepts(prisma, 'academy-1'))
      .resolves.toEqual(concepts);

    expectActiveConceptScope(database.concept.findMany.mock.calls[0][0].where, {
      course: { academyId: 'academy-1', ...publishedCourseFilter },
    });
  });

  it('requires both edge endpoints to belong to published courses in the requested academy', async () => {
    database.prerequisiteEdge.findMany.mockResolvedValue([
      { sourceConceptId: 'foundation', targetConceptId: 'application' },
    ]);

    await expect(loadAcademyDiagnosticEdges(prisma, 'academy-1')).resolves.toEqual([
      { source: 'foundation', target: 'application' },
    ]);

    const { where } = database.prerequisiteEdge.findMany.mock.calls[0][0];
    for (const endpoint of [where.sourceConcept, where.targetConcept]) {
      expectActiveConceptScope(endpoint, {
        course: { academyId: 'academy-1', ...publishedCourseFilter },
      });
    }
  });

  it('does not let a stored draft or archived concept ID expose its diagnostic problems', async () => {
    database.problem.findMany.mockResolvedValue([]);

    await expect(loadDiagnosticProblemsForConcept(prisma, 'stored-concept'))
      .resolves.toEqual([]);

    const { where } = database.problem.findMany.mock.calls[0][0];
    expect(where).toMatchObject({ isArchived: false, isReviewVariant: false });
    expect(where.knowledgePoint.AND).toEqual(expect.arrayContaining([
      {
        conceptId: 'stored-concept',
        concept: { course: publishedCourseFilter },
      },
      expect.objectContaining({
        isArchived: false,
        concept: expect.objectContaining({
          isArchived: false,
          OR: [{ sectionId: null }, { section: { isArchived: false } }],
        }),
      }),
    ]));
  });

  it('filters course names derived from stored diagnostic snapshots through current publication and content status', async () => {
    database.concept.findMany.mockResolvedValue([
      { id: 'published-concept', courseId: 'published-course', course: { name: 'Foundations' } },
    ]);

    await expect(loadDiagnosticConceptCourseMap(prisma, ['published-concept', 'draft-concept']))
      .resolves.toEqual(new Map([
        ['published-concept', { courseId: 'published-course', courseName: 'Foundations' }],
      ]));

    expectActiveConceptScope(database.concept.findMany.mock.calls[0][0].where, {
      id: { in: ['published-concept', 'draft-concept'] },
      course: publishedCourseFilter,
    });
  });

  it('does not broaden an empty snapshot map into an unfiltered concept lookup', async () => {
    await expect(loadDiagnosticConceptCourseMap(prisma, [])).resolves.toEqual(new Map());
    expect(database.concept.findMany).not.toHaveBeenCalled();
  });

  it('excludes draft and archived courses from diagnostic result course names', async () => {
    database.course.findMany.mockResolvedValue([{ id: 'published-course', name: 'Foundations' }]);

    await expect(loadDiagnosticCourseNames(prisma, 'academy-1')).resolves.toEqual(new Map([
      ['published-course', { id: 'published-course', name: 'Foundations' }],
    ]));

    expect(database.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { academyId: 'academy-1', ...publishedCourseFilter },
    }));
  });
});
