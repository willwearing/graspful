import { Module } from '@nestjs/common';
import { SpacedRepetitionModule } from '@/spaced-repetition/spaced-repetition.module';
import { AssessmentController } from './assessment.controller';
import { ProblemSubmissionService } from './problem-submission.service';
import { ReviewService } from './review.service';
import { QuizService } from './quiz.service';

@Module({
  imports: [SpacedRepetitionModule],
  controllers: [AssessmentController],
  providers: [ProblemSubmissionService, ReviewService, QuizService],
  exports: [ProblemSubmissionService, ReviewService, QuizService],
})
export class AssessmentModule {}
