import { Module, forwardRef } from '@nestjs/common';
import { SpacedRepetitionModule } from '@/spaced-repetition/spaced-repetition.module';
import { GamificationModule } from '@/gamification/gamification.module';
import { StudentModelModule } from '@/student-model/student-model.module';
import { AssessmentController } from './assessment.controller';
import { ProblemSubmissionService } from './problem-submission.service';
import { ReviewService } from './review.service';
import { QuizService } from './quiz.service';
import { SectionExamService } from './section-exam.service';

@Module({
  imports: [
    SpacedRepetitionModule,
    GamificationModule,
    forwardRef(() => StudentModelModule),
  ],
  controllers: [AssessmentController],
  providers: [ProblemSubmissionService, ReviewService, QuizService, SectionExamService],
  exports: [ProblemSubmissionService, ReviewService, QuizService, SectionExamService],
})
export class AssessmentModule {}
