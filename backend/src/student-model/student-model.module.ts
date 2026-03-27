import { Module } from '@nestjs/common';
import { AssessmentModule } from '@/assessment/assessment.module';
import { StudentModelController } from './student-model.controller';
import { AcademyStudentModelController } from './academy-student-model.controller';
import { EnrollmentService } from './enrollment.service';
import { StudentModelCoreModule } from './application/student-model-core.module';

@Module({
  imports: [StudentModelCoreModule, AssessmentModule],
  controllers: [StudentModelController, AcademyStudentModelController],
  providers: [EnrollmentService],
  exports: [StudentModelCoreModule, EnrollmentService],
})
export class StudentModelModule {}
