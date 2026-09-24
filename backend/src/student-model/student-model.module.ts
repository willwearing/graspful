import { Module } from '@nestjs/common';
import { AssessmentModule } from '@/assessment/assessment.module';
import { SharedApplicationModule } from '@/shared/application/shared-application.module';
import { StudentModelController } from './student-model.controller';
import { AcademyStudentModelController } from './academy-student-model.controller';
import { StudentModelCoreModule } from './application/student-model-core.module';

@Module({
  imports: [StudentModelCoreModule, AssessmentModule, SharedApplicationModule],
  controllers: [StudentModelController, AcademyStudentModelController],
  exports: [StudentModelCoreModule],
})
export class StudentModelModule {}
