import { Prisma } from '@prisma/client';
import { seedStudentStateForNewConcepts } from './content-state-seeder';

describe('imported content student state', () => {
  function setup(userIds = ['learner-1', 'learner-2']) {
    const tx = {
      courseEnrollment: { findMany: jest.fn().mockResolvedValue(userIds.map((userId) => ({ userId }))) },
      studentConceptState: { createMany: jest.fn() },
      studentSectionState: { createMany: jest.fn() },
    };
    return { tx, client: tx as unknown as Prisma.TransactionClient };
  }

  it('seeds only the new content for course enrollees in the supplied transaction', async () => {
    const { tx, client } = setup();
    await seedStudentStateForNewConcepts(client, 'course-1', ['concept-new'], ['section-new']);
    expect(tx.courseEnrollment.findMany).toHaveBeenCalledWith({
      where: { courseId: 'course-1' }, select: { userId: true },
    });
    expect(tx.studentConceptState.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'learner-1', conceptId: 'concept-new' },
        { userId: 'learner-2', conceptId: 'concept-new' },
      ],
      skipDuplicates: true,
    });
    expect(tx.studentSectionState.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'learner-1', courseId: 'course-1', sectionId: 'section-new', status: 'locked' },
        { userId: 'learner-2', courseId: 'course-1', sectionId: 'section-new', status: 'locked' },
      ],
      skipDuplicates: true,
    });
  });

  it('does no work when imported content adds no concepts or sections', async () => {
    const { tx, client } = setup();
    await seedStudentStateForNewConcepts(client, 'course-1', [], []);
    expect(tx.courseEnrollment.findMany).not.toHaveBeenCalled();
    expect(tx.studentConceptState.createMany).not.toHaveBeenCalled();
    expect(tx.studentSectionState.createMany).not.toHaveBeenCalled();
  });

  it('does not write learner state for a course with no enrollments', async () => {
    const { tx, client } = setup([]);
    await seedStudentStateForNewConcepts(client, 'course-1', ['concept-new'], ['section-new']);
    expect(tx.studentConceptState.createMany).not.toHaveBeenCalled();
    expect(tx.studentSectionState.createMany).not.toHaveBeenCalled();
  });

  it('does not reset concept progress when only sections are new', async () => {
    const { tx, client } = setup();
    await seedStudentStateForNewConcepts(client, 'course-1', [], ['section-new']);
    expect(tx.studentConceptState.createMany).not.toHaveBeenCalled();
    expect(tx.studentSectionState.createMany).toHaveBeenCalledTimes(1);
  });
});
