import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { XPService } from './xp.service';
import { StreakService } from './streak.service';
import { LeaderboardService } from './leaderboard.service';
import { CompletionEstimateService } from './completion-estimate.service';

@Module({
  controllers: [GamificationController],
  providers: [XPService, StreakService, LeaderboardService, CompletionEstimateService],
  exports: [XPService, StreakService],
})
export class GamificationModule {}
