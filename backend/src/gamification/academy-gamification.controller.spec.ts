import { Test, TestingModule } from '@nestjs/testing';
import { AcademyGamificationController } from './academy-gamification.controller';
import { XPService } from './xp.service';
import { StreakService } from './streak.service';
import { LeaderboardService } from './leaderboard.service';
import { CompletionEstimateService } from './completion-estimate.service';
import { CourseProgressReadService } from './course-progress-read.service';
import { SupabaseAuthGuard, OrgMembershipGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('AcademyGamificationController', () => {
  let controller: AcademyGamificationController;
  const mockXPService = {
    getAcademyXPSummary: jest.fn(),
    getAcademyWeeklyXPBreakdown: jest.fn(),
  };
  const mockStreakService = {
    getAcademyStreakStatus: jest.fn(),
  };
  const mockLeaderboardService = {
    getAcademyWeeklyLeaderboard: jest.fn(),
  };
  const mockCompletionEstimateService = {
    getAcademyEstimate: jest.fn(),
  };
  const mockCourseProgressReadService = {
    getAcademyGraph: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcademyGamificationController],
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
    controller = module.get(AcademyGamificationController);
  });

  it('should return academy XP summary', async () => {
    const summary = { today: 25, thisWeek: 120, total: 500, dailyTarget: 40, dailyCap: 500 };
    mockXPService.getAcademyXPSummary.mockResolvedValue(summary);

    const result = await controller.getXPSummary('academy-1', {
      userId: 'user-1',
      orgId: 'org-1',
      role: 'member',
    } as any);

    expect(result).toEqual(summary);
    expect(mockXPService.getAcademyXPSummary).toHaveBeenCalledWith('user-1', 'academy-1');
  });

  it('should return academy weekly XP breakdown', async () => {
    const breakdown = [{ date: '2026-03-10', xp: 30 }];
    mockXPService.getAcademyWeeklyXPBreakdown.mockResolvedValue(breakdown);

    const result = await controller.getWeeklyXP('academy-1', {
      userId: 'user-1',
      orgId: 'org-1',
      role: 'member',
    } as any);

    expect(result).toEqual(breakdown);
  });

  it('should return academy streak status', async () => {
    const streak = {
      currentStreak: 5,
      longestStreak: 10,
      todayComplete: true,
      todayXP: 45,
      dailyTarget: 40,
      freezeTokensRemaining: 1,
    };
    mockStreakService.getAcademyStreakStatus.mockResolvedValue(streak);

    const result = await controller.getStreak('academy-1', {
      userId: 'user-1',
      orgId: 'org-1',
      role: 'member',
    } as any);

    expect(result).toEqual(streak);
  });

  it('should return academy leaderboard', async () => {
    const board = [{ rank: 1, userId: 'u1', displayName: 'Alice', avatarUrl: null, weeklyXP: 200 }];
    mockLeaderboardService.getAcademyWeeklyLeaderboard.mockResolvedValue(board);

    const result = await controller.getLeaderboard('org-1', 'academy-1');

    expect(result).toEqual(board);
    expect(mockLeaderboardService.getAcademyWeeklyLeaderboard).toHaveBeenCalledWith('org-1', 'academy-1');
  });

  it('should return academy completion estimate', async () => {
    const estimate = {
      completionPercent: 40,
      totalConcepts: 200,
      masteredConcepts: 80,
      remainingConcepts: 120,
      averageDailyXP: 35.7,
      estimatedWeeksRemaining: 8.5,
      dailyXPTarget: 40,
    };
    mockCompletionEstimateService.getAcademyEstimate.mockResolvedValue(estimate);

    const result = await controller.getStats('academy-1', {
      userId: 'user-1',
      orgId: 'org-1',
      role: 'member',
    } as any);

    expect(result).toEqual(estimate);
  });

  it('returns the academy graph projection', async () => {
    const graph = {
      concepts: [
        { id: 'concept-1', name: 'Grounding', courseId: 'course-a', masteryState: 'mastered' },
      ],
      edges: [],
    };
    mockCourseProgressReadService.getAcademyGraph.mockResolvedValue(graph);

    const result = await controller.getGraph('academy-1', {
      userId: 'user-1',
      orgId: 'org-1',
      role: 'member',
    } as any);

    expect(result).toEqual(graph);
    expect(mockCourseProgressReadService.getAcademyGraph).toHaveBeenCalledWith(
      'user-1',
      'academy-1',
    );
  });
});
