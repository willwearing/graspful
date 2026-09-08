import { NotFoundException } from '@nestjs/common';
import { activeConceptWhere } from '@/knowledge-graph/active-course-content';
import { ensureConceptStatesForAcademy } from './student-state.lifecycle';

describe('ensureConceptStatesForAcademy', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = {
      academy: {
        findFirst: jest.fn().mockResolvedValue({
          orgId: 'org-1',
          enrollments: [{ id: 'academy-enrollment-1' }],
        }),
      },
      course: { findFirst: jest.fn().mockResolvedValue(null) },
      concept: { findMany: jest.fn().mockResolvedValue([{ id: 'concept-1' }, { id: 'concept-2' }]) },
      studentConceptState: {
        findMany: jest.fn().mockResolvedValue([{ conceptId: 'concept-1' }]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
  });

  it('requires an active academy and organization before reading or creating states', async () => {
    prisma.academy.findFirst.mockResolvedValue(null);

    await expect(ensureConceptStatesForAcademy(prisma, 'user-1', 'academy-1'))
      .rejects.toThrow(NotFoundException);

    expect(prisma.academy.findFirst).toHaveBeenCalledWith({
      where: { id: 'academy-1', archivedAt: null, org: { isActive: true } },
      select: {
        orgId: true,
        enrollments: { where: { userId: 'user-1' }, select: { id: true } },
      },
    });
    expect(prisma.concept.findMany).not.toHaveBeenCalled();
    expect(prisma.studentConceptState.findMany).not.toHaveBeenCalled();
    expect(prisma.studentConceptState.createMany).not.toHaveBeenCalled();
  });

  it('rejects callers with no academy or legacy course enrollment before hydration', async () => {
    prisma.academy.findFirst.mockResolvedValue({ orgId: 'org-1', enrollments: [] });

    await expect(ensureConceptStatesForAcademy(prisma, 'user-1', 'academy-1'))
      .rejects.toThrow(NotFoundException);

    expect(prisma.course.findFirst).toHaveBeenCalledWith({
      where: {
        academyId: 'academy-1',
        orgId: 'org-1',
        archivedAt: null,
        isPublished: true,
        enrollments: { some: { userId: 'user-1' } },
      },
      select: { id: true },
    });
    expect(prisma.concept.findMany).not.toHaveBeenCalled();
    expect(prisma.studentConceptState.findMany).not.toHaveBeenCalled();
    expect(prisma.studentConceptState.createMany).not.toHaveBeenCalled();
  });

  it('hydrates only missing active concepts for an enrolled academy learner', async () => {
    await ensureConceptStatesForAcademy(prisma, 'user-1', 'academy-1');

    expect(prisma.concept.findMany).toHaveBeenCalledWith({
      where: activeConceptWhere({
        course: { academyId: 'academy-1', orgId: 'org-1', archivedAt: null, isPublished: true },
      }),
      select: { id: true },
    });
    expect(prisma.course.findFirst).not.toHaveBeenCalled();
    expect(prisma.studentConceptState.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-1', conceptId: 'concept-2' }],
      skipDuplicates: true,
    });
  });

  it('creates no state for an unpublished course in an enrolled academy', async () => {
    const concepts = [
      { id: 'published-concept', course: { isPublished: true } },
      { id: 'draft-concept', course: { isPublished: false } },
    ];
    prisma.concept.findMany.mockImplementation(({ where }: any) => {
      const courseScope = where.AND[0].course;
      return Promise.resolve(concepts.filter((concept) =>
        courseScope.isPublished === undefined || concept.course.isPublished === courseScope.isPublished,
      ));
    });
    prisma.studentConceptState.findMany.mockResolvedValue([]);

    await ensureConceptStatesForAcademy(prisma, 'user-1', 'academy-1');

    expect(prisma.studentConceptState.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-1', conceptId: 'published-concept' }],
      skipDuplicates: true,
    });
  });

  it('limits legacy course enrollment hydration to enrolled courses within the academy', async () => {
    prisma.academy.findFirst.mockResolvedValue({ orgId: 'org-1', enrollments: [] });
    prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });

    await ensureConceptStatesForAcademy(prisma, 'user-1', 'academy-1');

    const conceptScope = activeConceptWhere({
      course: {
        academyId: 'academy-1',
        orgId: 'org-1',
        archivedAt: null,
        isPublished: true,
        enrollments: { some: { userId: 'user-1' } },
      },
    });
    expect(prisma.concept.findMany).toHaveBeenCalledWith({ where: conceptScope, select: { id: true } });
    expect(prisma.studentConceptState.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', concept: conceptScope },
      select: { conceptId: true },
    });
    expect(prisma.studentConceptState.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-1', conceptId: 'concept-2' }],
      skipDuplicates: true,
    });
  });
});
