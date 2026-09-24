import { NotFoundException } from '@nestjs/common';
import { getSectionExamProgress, getSectionExamStatus } from './queries';

function harness() {
  const state = { sectionId: 'section-1', status: 'exam_ready', attempts: 2, examPassedAt: null };
  const latestAttempt = { id: 'attempt-1', passed: false, score: 0.5 };
  const prisma = { sectionExamSession: { findFirst: jest.fn().mockResolvedValue(latestAttempt) } };
  const studentState = {
    getSectionExamState: jest.fn().mockResolvedValue(state),
    getSectionExamProgress: jest.fn().mockResolvedValue([{ ...state, section: { concepts: [{ id: 'concept-1' }] } }]),
    getConceptMasteryForIds: jest.fn().mockResolvedValue(new Map([['concept-1', 'mastered']])),
  };
  return { state, latestAttempt, prisma, studentState };
}

describe('Section exam query composition', () => {
  it('reads mastery through the student model and scopes historical attempts to this course, user and section', async () => {
    const { prisma, studentState, latestAttempt } = harness();
    const result = await getSectionExamProgress(prisma as any, studentState as any, 'user-1', 'course-1');
    expect(studentState.getSectionExamProgress).toHaveBeenCalledWith('user-1', 'course-1');
    expect(studentState.getConceptMasteryForIds).toHaveBeenCalledWith('user-1', ['concept-1']);
    expect(prisma.sectionExamSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1', courseId: 'course-1', sectionId: 'section-1', status: { in: ['completed', 'expired'] } },
      orderBy: { startedAt: 'desc' },
    }));
    expect(result[0]).toMatchObject({ conceptStates: [{ conceptId: 'concept-1', masteryState: 'mastered' }], latestAttempt });
  });

  it('summarizes resume progress without returning recorded answers', async () => {
    const { prisma, studentState, latestAttempt } = harness();
    prisma.sectionExamSession.findFirst.mockResolvedValueOnce({
      id: 'session-1', startedAt: new Date(), timeLimitMs: 60_000,
      questions: [{ response: false }, { response: null }],
    });
    const result = await getSectionExamStatus(prisma as any, studentState as any, 'user-1', 'course-1', 'section-1');
    expect(result).toMatchObject({ attempts: 2, latestSession: latestAttempt,
      activeSession: { sessionId: 'session-1', answeredCount: 1, totalProblems: 2 },
    });
    expect(result.activeSession).not.toHaveProperty('questions');
  });

  it('returns a missing state as 404', async () => {
    const { prisma, studentState } = harness();
    studentState.getSectionExamState.mockResolvedValue(null);
    prisma.sectionExamSession.findFirst.mockResolvedValue(null);
    await expect(getSectionExamStatus(prisma as any, studentState as any, 'user-1', 'course-1', 'missing'))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
