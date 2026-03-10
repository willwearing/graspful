import { Module } from '@nestjs/common';
import { SpacedRepetitionModule } from '@/spaced-repetition/spaced-repetition.module';
import { GamificationModule } from '@/gamification/gamification.module';
import { AssessmentController } from './assessment.controller';
import { ProblemSubmissionService } from './problem-submission.service';
import { ReviewService } from './review.service';
import { QuizService } from './quiz.service';

@Module({
  imports: [SpacedRepetitionModule, GamificationModule],
  controllers: [AssessmentController],
  providers: [ProblemSubmissionService, ReviewService, QuizService],
  exports: [ProblemSubmissionService, ReviewService, QuizService],
})
export class AssessmentModule {}
