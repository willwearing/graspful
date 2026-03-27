import { Module } from '@nestjs/common';
import { StudentStateService } from '../student-state.service';
import { CourseStateService } from '../course-state.service';
import { AcademyProgressQueryService } from '../queries/academy-progress.query';

@Module({
  providers: [StudentStateService, CourseStateService, AcademyProgressQueryService],
  exports: [StudentStateService, CourseStateService, AcademyProgressQueryService],
})
export class StudentModelCoreModule {}
