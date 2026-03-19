import { Module } from '@nestjs/common';
import { AssessmentModule } from '@/assessment/assessment.module';
import { StudentModelController } from './student-model.controller';
import { EnrollmentService } from './enrollment.service';
import { StudentStateService } from './student-state.service';

@Module({
  imports: [AssessmentModule],
  controllers: [StudentModelController],
  providers: [EnrollmentService, StudentStateService],
  exports: [EnrollmentService, StudentStateService],
})
export class StudentModelModule {}
