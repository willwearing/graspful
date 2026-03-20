import { Module } from '@nestjs/common';
import { AssessmentModule } from '@/assessment/assessment.module';
import { StudentModelController } from './student-model.controller';
import { AcademyStudentModelController } from './academy-student-model.controller';
import { EnrollmentService } from './enrollment.service';
import { StudentStateService } from './student-state.service';
import { CourseStateService } from './course-state.service';

@Module({
  imports: [AssessmentModule],
  controllers: [StudentModelController, AcademyStudentModelController],
  providers: [EnrollmentService, StudentStateService, CourseStateService],
  exports: [EnrollmentService, StudentStateService, CourseStateService],
})
export class StudentModelModule {}
