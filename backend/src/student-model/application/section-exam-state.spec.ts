import { BadRequestException } from '@nestjs/common';
import { SectionMasteryState } from '@prisma/client';
import { StudentStateService } from '../student-state.service';
import { syncSectionStates } from './section-exam-state';

function harness() {
  const tx = {
    studentSectionState: {
      update: jest.fn().mockResolvedValue({ status: SectionMasteryState.exam_ready, attempts: 2 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    studentConceptState: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    courseSection: { findFirst: jest.fn().mockResolvedValue({ id: 'next-section' }) },
  };
  // A transaction must remain authoritative even when a different root client exists.
  const root = { studentSectionState: { update: jest.fn() } };
  const service = new StudentStateService(root as any);
  const result = {
    userId: 'user-1', courseId: 'course-1', sectionId: 'section-1',
    sectionSortOrder: 3, passed: true, failedConcepts: [] as string[],
  };
  return { tx, root, service, result };
}

describe('StudentStateService section exam writes', () => {
  it('certifies the passed section and opens only the next locked active section in the same transaction', async () => {
    const { tx, root, service, result } = harness();
    await service.applySectionExamResult(tx as any, result);
    expect(tx.studentSectionState.update).toHaveBeenCalledWith({
      where: { userId_sectionId: { userId: result.userId, sectionId: result.sectionId } },
      data: { status: SectionMasteryState.certified, examPassedAt: expect.any(Date) },
    });
    expect(tx.courseSection.findFirst).toHaveBeenCalledWith({
      where: { AND: [{ courseId: result.courseId, sortOrder: { gt: 3 } }, { isArchived: false }] },
      orderBy: { sortOrder: 'asc' }, select: { id: true },
    });
    expect(tx.studentSectionState.updateMany).toHaveBeenCalledWith({
      where: { userId: result.userId, sectionId: 'next-section', status: SectionMasteryState.locked },
      data: { status: SectionMasteryState.lesson_in_progress },
    });
    expect(root.studentSectionState.update).not.toHaveBeenCalled();
    expect(tx.studentConceptState.updateMany).not.toHaveBeenCalled();
  });

  it('leaves other sections alone when the passed section is last', async () => {
    const { tx, service, result } = harness();
    tx.courseSection.findFirst.mockResolvedValue(null);
    await service.applySectionExamResult(tx as any, result);
    expect(tx.studentSectionState.updateMany).not.toHaveBeenCalled();
  });

  it('marks only failed concepts for review after a failed exam', async () => {
    const { tx, service, result } = harness();
    await service.applySectionExamResult(tx as any, { ...result, passed: false, failedConcepts: ['concept-1'] });
    expect(tx.studentSectionState.update).toHaveBeenCalledWith({
      where: { userId_sectionId: { userId: result.userId, sectionId: result.sectionId } },
      data: { status: SectionMasteryState.needs_review },
    });
    expect(tx.studentConceptState.updateMany).toHaveBeenCalledWith({
      where: { userId: result.userId, conceptId: { in: ['concept-1'] } },
      data: { masteryState: 'needs_review' },
    });
    expect(tx.courseSection.findFirst).not.toHaveBeenCalled();
    expect(tx.studentSectionState.updateMany).not.toHaveBeenCalled();
  });

  it('does not mutate concept state if no concepts failed the review threshold', async () => {
    const { tx, service, result } = harness();
    await service.applySectionExamResult(tx as any, { ...result, passed: false });
    expect(tx.studentConceptState.updateMany).not.toHaveBeenCalled();
  });

  it('holds the section row before returning the current attempt count', async () => {
    const { tx, service } = harness();
    await expect(service.lockSectionForExam(tx as any, 'user-1', 'section-1')).resolves.toMatchObject({ attempts: 2 });
    expect(tx.studentSectionState.update).toHaveBeenCalledWith({
      where: { userId_sectionId: { userId: 'user-1', sectionId: 'section-1' } },
      data: { updatedAt: expect.any(Date) },
    });
    await service.recordSectionExamAttempt(tx as any, 'user-1', 'section-1');
    expect(tx.studentSectionState.update).toHaveBeenLastCalledWith({
      where: { userId_sectionId: { userId: 'user-1', sectionId: 'section-1' } },
      data: { attempts: { increment: 1 }, lastExamAttemptAt: expect.any(Date) },
    });
  });

  it.each(['locked', 'certified', 'needs_review', 'lesson_in_progress'])(
    'rejects a section that changed to %s before its lock was acquired', async (status) => {
      const { tx, service } = harness();
      tx.studentSectionState.update.mockResolvedValue({ status: status as SectionMasteryState, attempts: 2 });
      await expect(service.lockSectionForExam(tx as any, 'user-1', 'section-1')).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});

describe('Section state synchronization', () => {
  it.each([
    [true, 'lesson_in_progress', 'mastered', 'exam_ready'],
    [true, 'needs_review', 'mastered', 'exam_ready'],
    [true, 'lesson_in_progress', 'needs_review', 'needs_review'],
    [true, 'needs_review', 'in_progress', 'lesson_in_progress'],
    [true, 'certified', 'needs_review', 'certified'],
    [false, 'lesson_in_progress', 'mastered', 'certified'],
    [false, 'lesson_in_progress', 'needs_review', 'needs_review'],
    [false, 'needs_review', 'unstarted', 'lesson_in_progress'],
  ])('exam enabled=%s moves %s with concepts %s to %s', async (enabled, status, masteryState, nextStatus) => {
    const state = { id: 'state-1', sectionId: 'section-1', status };
    const tx = {
      courseSection: { findMany: jest.fn().mockResolvedValue([
        { id: 'section-1', sectionExamConfig: { enabled }, concepts: [{ id: 'concept-1' }] },
      ]) },
      studentConceptState: { findMany: jest.fn().mockResolvedValue([{ conceptId: 'concept-1', masteryState }]) },
      studentSectionState: {
        findMany: jest.fn().mockResolvedValue([state]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    await syncSectionStates(tx as any, 'user-1', 'course-1');
    expect(state.status).toBe(nextStatus);
    if (status !== nextStatus) {
      expect(tx.studentSectionState.update).toHaveBeenCalledWith({ where: { id: 'state-1' }, data: { status: nextStatus } });
    } else {
      expect(tx.studentSectionState.update).not.toHaveBeenCalled();
    }
  });

  it('keeps later sections locked until their prerequisite section is certified', async () => {
    const states = [
      { id: 'state-1', sectionId: 'section-1', status: 'exam_ready' },
      { id: 'state-2', sectionId: 'section-2', status: 'lesson_in_progress' },
    ];
    const tx = {
      courseSection: { findMany: jest.fn().mockResolvedValue([1, 2].map((index) => ({
        id: `section-${index}`, sectionExamConfig: { enabled: true }, concepts: [{ id: `concept-${index}` }],
      }))) },
      studentConceptState: { findMany: jest.fn().mockResolvedValue([1, 2].map((index) => ({
        conceptId: `concept-${index}`, masteryState: 'mastered',
      }))) },
      studentSectionState: { findMany: jest.fn().mockResolvedValue(states), update: jest.fn().mockResolvedValue({}) },
    };
    await syncSectionStates(tx as any, 'user-1', 'course-1');
    expect(states.map((state) => state.status)).toEqual(['exam_ready', 'locked']);
    expect(tx.studentSectionState.update).toHaveBeenCalledTimes(1);
  });
});
