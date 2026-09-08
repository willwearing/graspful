import { AcademyProgressQueryService } from './academy-progress.query';

describe('AcademyProgressQueryService publication boundary', () => {
  it('counts only published active course states in the learner profile', async () => {
    const courseStates = [
      { status: 'active', course: { academyId: 'academy-1', isPublished: true, archivedAt: null } },
      { status: 'active', course: { academyId: 'academy-1', isPublished: false, archivedAt: null } },
      { status: 'completed', course: { academyId: 'academy-1', isPublished: true, archivedAt: new Date() } },
    ];
    const prisma = {
      studentCourseState: {
        findMany: jest.fn().mockImplementation(({ where }) => Promise.resolve(
          courseStates.filter((state) => Object.entries(where.course).every(
            ([key, value]) => state.course[key as keyof typeof state.course] === value,
          )),
        )),
      },
    };
    const studentState = {
      getConceptStatesForAcademy: jest.fn().mockResolvedValue([{ masteryState: 'mastered' }]),
      isDiagnosticCompleted: jest.fn().mockResolvedValue(true),
    };
    const service = new AcademyProgressQueryService(prisma as any, studentState as any);

    const profile = await service.getProfileSummary('user-1', 'academy-1');

    expect(profile).toMatchObject({ activeCourses: 1, completedCourses: 0, mastered: 1 });
    expect(prisma.studentCourseState.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', course: { academyId: 'academy-1', isPublished: true, archivedAt: null } },
      select: { status: true },
    });
  });

  it('omits courses unpublished after the mastery state snapshot was loaded', async () => {
    const stats = { total: 2, mastered: 1, inProgress: 1, unstarted: 0 };
    const studentState = {
      getAcademyCourseMasterySummary: jest.fn().mockResolvedValue(new Map([
        ['published-course', stats],
        ['unpublished-course', stats],
      ])),
    };
    const prisma = {
      course: {
        findMany: jest.fn().mockResolvedValue([{ id: 'published-course', name: 'Published course', sortOrder: 0 }]),
      },
    };
    const service = new AcademyProgressQueryService(prisma as any, studentState as any);

    const courses = await service.getCourseMasterySummary('user-1', 'academy-1');

    expect(courses).toEqual([{
      courseId: 'published-course',
      courseName: 'Published course',
      sortOrder: 0,
      ...stats,
      completionPercent: 50,
    }]);
    expect(prisma.course.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['published-course', 'unpublished-course'] },
        academyId: 'academy-1',
        isPublished: true,
        archivedAt: null,
      },
      select: { id: true, name: true, sortOrder: true },
    });
  });
});
