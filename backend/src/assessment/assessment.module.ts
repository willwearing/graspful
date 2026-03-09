import { Module } from '@nestjs/common';
import { AssessmentController } from './assessment.controller';
import { ProblemSubmissionService } from './problem-submission.service';
import { ReviewService } from './review.service';
import { QuizService } from './quiz.service';

@Module({
  controllers: [AssessmentController],
  providers: [ProblemSubmissionService, ReviewService, QuizService],
  exports: [ProblemSubmissionService, ReviewService, QuizService],
})
export class AssessmentModule {}
