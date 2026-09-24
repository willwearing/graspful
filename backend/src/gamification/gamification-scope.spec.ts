import { ForbiddenException } from '@nestjs/common';
import { CompletionEstimateService } from './completion-estimate.service';
import { LeaderboardService } from './leaderboard.service';
import { StreakService } from './streak.service';
import { XPService } from './xp.service';

describe('gamification academy scope', () => {
  const enrollment = {
    totalXPEarned: 180,
    dailyXPTarget: 60,
    streakFreezeTokens: 1,
    academy: { orgId: 'org-1' },
    createdAt: new Date('2026-03-01T00:00:00.000Z'),
  };
  let prisma: any;
  let enrollments: any;
  let studentState: any;
  let xp: XPService;
  let streak: StreakService;
  let leaderboard: LeaderboardService;
  let completion: CompletionEstimateService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-08T00:30:00.000Z'));
    prisma = {
      courseEnrollment: { findUnique: jest.fn().mockResolvedValue(enrollment) },
      academyEnrollment: { findUnique: jest.fn().mockResolvedValue(enrollment) },
      xPEvent: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 20 } }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      userStreak: { findMany: jest.fn().mockResolvedValue([]) },
      concept: { count: jest.fn().mockResolvedValue(10) },
    };
    enrollments = {
      getAcademyIdForCourse: jest.fn().mockResolvedValue('academy-1'),
      requireAcademyEnrollment: jest.fn().mockResolvedValue(enrollment),
    };
    studentState = { countMasteredConcepts: jest.fn().mockResolvedValue(2) };
    xp = new XPService(prisma, enrollments);
    streak = new StreakService(prisma, enrollments);
    leaderboard = new LeaderboardService(prisma, enrollments);
    completion = new CompletionEstimateService(prisma, studentState, enrollments);
  });

  afterEach(() => jest.useRealTimers());

  it('returns academy XP totals and the academy daily target from a course URL', async () => {
    expect(await xp.getXPSummary('user-1', 'course-1')).toEqual({
      today: 20, thisWeek: 20, total: 180, dailyTarget: 60, dailyCap: 500,
    });
    expect(enrollments.getAcademyIdForCourse).toHaveBeenCalledWith('course-1');
    expect(enrollments.requireAcademyEnrollment).toHaveBeenCalledWith('user-1', 'academy-1');
    expect(prisma.xPEvent.aggregate).toHaveBeenCalledWith({
      where: {
        userId: 'user-1', academyId: 'academy-1',
        createdAt: { gte: new Date('2026-03-08T00:00:00.000Z') },
      },
      _sum: { amount: true },
    });
    expect(prisma.courseEnrollment.findUnique).not.toHaveBeenCalled();
  });

  it('includes XP from every course in UTC daily buckets at the DST boundary', async () => {
    prisma.xPEvent.findMany.mockResolvedValue([
      { createdAt: new Date('2026-03-02T00:01:00.000Z'), amount: 15 },
      { createdAt: new Date('2026-03-07T23:59:00.000Z'), amount: 20 },
      { createdAt: new Date('2026-03-08T00:01:00.000Z'), amount: 10 },
    ]);
    expect(await xp.getWeeklyXPBreakdown('user-1', 'course-1')).toEqual([
      { date: '2026-03-02', xp: 15 },
      { date: '2026-03-03', xp: 0 },
      { date: '2026-03-04', xp: 0 },
      { date: '2026-03-05', xp: 0 },
      { date: '2026-03-06', xp: 0 },
      { date: '2026-03-07', xp: 20 },
      { date: '2026-03-08', xp: 10 },
    ]);
    expect(prisma.xPEvent.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1', academyId: 'academy-1',
        createdAt: { gte: new Date('2026-03-02T00:00:00.000Z') },
      },
      select: { createdAt: true, amount: true },
    });
  });

  it('delegates course streak status and longest streak to the academy', async () => {
    const status = { currentStreak: 3, longestStreak: 5, todayComplete: true, todayXP: 60, dailyTarget: 60, freezeTokensRemaining: 1 };
    const statusSpy = jest.spyOn(streak, 'getAcademyStreakStatus').mockResolvedValue(status);
    const longestSpy = jest.spyOn(streak, 'getLongestAcademyStreak').mockResolvedValue(5);
    expect(await streak.getStreakStatus('user-1', 'course-1')).toBe(status);
    expect(await streak.getLongestStreak('user-1', 'course-1')).toBe(5);
    expect(statusSpy).toHaveBeenCalledWith('user-1', 'academy-1');
    expect(longestSpy).toHaveBeenCalledWith('user-1', 'academy-1');
  });

  it('counts UTC streak days when the server is still on the previous local day', async () => {
    prisma.userStreak.findMany
      .mockResolvedValueOnce([
        { date: new Date('2026-03-08T00:00:00.000Z'), xpEarned: 60 },
        { date: new Date('2026-03-07T00:00:00.000Z'), xpEarned: 70 },
      ])
      .mockResolvedValueOnce([
        { date: new Date('2026-03-07T00:00:00.000Z'), xpEarned: 70 },
        { date: new Date('2026-03-08T00:00:00.000Z'), xpEarned: 60 },
      ]);
    expect(await streak.getAcademyStreakStatus('user-1', 'academy-1')).toEqual({
      currentStreak: 2,
      longestStreak: 2,
      todayComplete: true,
      todayXP: 60,
      dailyTarget: 60,
      freezeTokensRemaining: 1,
    });
    expect(prisma.userStreak.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        userId: 'user-1', orgId: 'org-1',
        date: { gte: new Date('2025-12-08T00:00:00.000Z') },
      },
      orderBy: { date: 'desc' },
    });
    expect(enrollments.requireAcademyEnrollment).toHaveBeenCalledTimes(1);
  });

  it('keeps leaderboard aggregation inside the requested org and resolved academy', async () => {
    await leaderboard.getWeeklyLeaderboard('org-1', 'course-1', 'learner-1');
    expect(prisma.xPEvent.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        academyId: 'academy-1', academy: { orgId: 'org-1' },
        createdAt: { gte: new Date('2026-03-08T00:00:00.000Z') },
      },
    }));
  });

  it('estimates academy completion from a course URL', async () => {
    const estimate = await completion.getEstimate('user-1', 'course-1');
    expect(estimate.completionPercent).toBe(20);
    expect(estimate.dailyXPTarget).toBe(60);
    expect(studentState.countMasteredConcepts).toHaveBeenCalledWith('user-1', { academyId: 'academy-1' });
    expect(prisma.concept.count).toHaveBeenCalledWith({
      where: {
        AND: [
          { course: { academyId: 'academy-1' } },
          { isArchived: false, OR: [{ sectionId: null }, { section: { isArchived: false } }] },
        ],
      },
    });
  });

  it.each(['summary', 'breakdown', 'quizXP', 'streak', 'longestStreak', 'completion'])('rejects missing academy enrollment before reading %s data', async (query) => {
    const error = new ForbiddenException('Not enrolled');
    enrollments.requireAcademyEnrollment.mockRejectedValue(error);
    const reads = {
      summary: () => xp.getAcademyXPSummary('user-1', 'academy-1'),
      breakdown: () => xp.getAcademyWeeklyXPBreakdown('user-1', 'academy-1'),
      quizXP: () => xp.getXPSinceLastQuiz('user-1', 'academy-1'),
      streak: () => streak.getAcademyStreakStatus('user-1', 'academy-1'),
      longestStreak: () => streak.getLongestAcademyStreak('user-1', 'academy-1'),
      completion: () => completion.getAcademyEstimate('user-1', 'academy-1'),
    };
    await expect(reads[query as keyof typeof reads]()).rejects.toBe(error);
    expect(prisma.xPEvent.aggregate).not.toHaveBeenCalled();
    expect(prisma.xPEvent.findMany).not.toHaveBeenCalled();
    expect(prisma.xPEvent.findFirst).not.toHaveBeenCalled();
    expect(prisma.userStreak.findMany).not.toHaveBeenCalled();
    expect(prisma.concept.count).not.toHaveBeenCalled();
  });
});
