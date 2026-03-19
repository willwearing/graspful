import { Module } from '@nestjs/common';
import { StudentModelModule } from '@/student-model/student-model.module';
import { KnowledgeGraphModule } from '@/knowledge-graph/knowledge-graph.module';
import { SpacedRepetitionModule } from '@/spaced-repetition/spaced-repetition.module';
import { AssessmentModule } from '@/assessment/assessment.module';
import { LearningEngineController } from './learning-engine.controller';
import { LearningEngineService } from './learning-engine.service';
import { LessonService } from './lesson.service';
import { RemediationService } from './remediation.service';

@Module({
  imports: [
    StudentModelModule,
    KnowledgeGraphModule,
    SpacedRepetitionModule,
    AssessmentModule,
  ],
  controllers: [LearningEngineController],
  providers: [LearningEngineService, LessonService, RemediationService],
  exports: [LearningEngineService, LessonService, RemediationService],
})
export class LearningEngineModule {}
