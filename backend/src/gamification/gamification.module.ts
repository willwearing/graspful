import { Module } from '@nestjs/common';
import { StudentModelCoreModule } from '@/student-model/application/student-model-core.module';
import { GamificationController } from './gamification.controller';
import { AcademyGamificationController } from './academy-gamification.controller';
import { XPService } from './xp.service';
import { StreakService } from './streak.service';
import { LeaderboardService } from './leaderboard.service';
import { CompletionEstimateService } from './completion-estimate.service';
import { CourseProgressReadService } from './course-progress-read.service';

@Module({
  imports: [StudentModelCoreModule],
  controllers: [GamificationController, AcademyGamificationController],
  providers: [
    XPService,
    StreakService,
    LeaderboardService,
    CompletionEstimateService,
    CourseProgressReadService,
  ],
  exports: [XPService, StreakService],
})
export class GamificationModule {}
