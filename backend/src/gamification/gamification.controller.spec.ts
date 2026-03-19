import { Test, TestingModule } from '@nestjs/testing';
import { GamificationController } from './gamification.controller';
import { XPService } from './xp.service';
import { StreakService } from './streak.service';
import { LeaderboardService } from './leaderboard.service';
import { CompletionEstimateService } from './completion-estimate.service';
import { CourseProgressReadService } from './course-progress-read.service';
import { SupabaseAuthGuard, OrgMembershipGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('GamificationController', () => {
  let controller: GamificationController;
  const mockXPService = {
    getXPSummary: jest.fn(),
    getWeeklyXPBreakdown: jest.fn(),
  };
  const mockStreakService = {
    getStreakStatus: jest.fn(),
  };
  const mockLeaderboardService = {
    getWeeklyLeaderboard: jest.fn(),
  };
  const mockCompletionEstimateService = {
    getEstimate: jest.fn(),
  };
  const mockCourseProgressReadService = {
    getGraph: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamificationController],
      providers: [
        { provide: XPService, useValue: mockXPService },
        { provide: StreakService, useValue: mockStreakService },
        { provide: LeaderboardService, useValue: mockLeaderboardService },
        { provide: CompletionEstimateService, useValue: mockCompletionEstimateService },
        { provide: CourseProgressReadService, useValue: mockCourseProgressReadService },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(OrgMembershipGuard)
      .useValue(mockGuard)
      .compile();
    controller = module.get(GamificationController);
  });

  it('should return XP summary', async () => {
    const summary = { today: 25, thisWeek: 120, total: 500, dailyTarget: 40, dailyCap: 500 };
    mockXPService.getXPSummary.mockResolvedValue(summary);

    const result = await controller.getXPSummary('course-1', {
      userId: 'user-1',
      orgId: 'org-1',
      role: 'member',
    } as any);

    expect(result).toEqual(summary);
  });

  it('should return weekly XP breakdown', async () => {
    const breakdown = [{ date: '2026-03-10', xp: 30 }];
    mockXPService.getWeeklyXPBreakdown.mockResolvedValue(breakdown);

    const result = await controller.getWeeklyXP('course-1', {
      userId: 'user-1',
      orgId: 'org-1',
      role: 'member',
    } as any);

    expect(result).toEqual(breakdown);
  });

  it('should return streak status', async () => {
    const streak = {
      currentStreak: 5,
      longestStreak: 10,
      todayComplete: true,
      todayXP: 45,
      dailyTarget: 40,
      freezeTokensRemaining: 1,
    };
    mockStreakService.getStreakStatus.mockResolvedValue(streak);

    const result = await controller.getStreak('course-1', {
      userId: 'user-1',
      orgId: 'org-1',
      role: 'member',
    } as any);

    expect(result).toEqual(streak);
  });

  it('should return leaderboard', async () => {
    const board = [{ rank: 1, userId: 'u1', displayName: 'Alice', avatarUrl: null, weeklyXP: 200 }];
    mockLeaderboardService.getWeeklyLeaderboard.mockResolvedValue(board);

    const result = await controller.getLeaderboard('org-1', 'course-1');

    expect(result).toEqual(board);
  });

  it('should return completion estimate', async () => {
    const estimate = {
      completionPercent: 40,
      totalConcepts: 100,
      masteredConcepts: 40,
      remainingConcepts: 60,
      averageDailyXP: 35.7,
      estimatedWeeksRemaining: 4.5,
      dailyXPTarget: 40,
    };
    mockCompletionEstimateService.getEstimate.mockResolvedValue(estimate);

    const result = await controller.getStats('course-1', {
      userId: 'user-1',
      orgId: 'org-1',
      role: 'member',
    } as any);

    expect(result).toEqual(estimate);
  });

  it('returns the learner graph projection', async () => {
    const graph = {
      concepts: [{ id: 'concept-1', name: 'Grounding', masteryState: 'mastered' }],
      edges: [],
    };
    mockCourseProgressReadService.getGraph.mockResolvedValue(graph);

    const result = await controller.getGraph('course-1', {
      userId: 'user-1',
      orgId: 'org-1',
      role: 'member',
    } as any);

    expect(result).toEqual(graph);
    expect(mockCourseProgressReadService.getGraph).toHaveBeenCalledWith(
      'user-1',
      'course-1',
    );
  });
});
