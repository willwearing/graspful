import { Module } from '@nestjs/common';
import { StudentModelModule } from '@/student-model/student-model.module';
import { KnowledgeGraphModule } from '@/knowledge-graph/knowledge-graph.module';
import { LearningEngineController } from './learning-engine.controller';
import { LearningEngineService } from './learning-engine.service';
import { LessonService } from './lesson.service';
import { RemediationService } from './remediation.service';

@Module({
  imports: [StudentModelModule, KnowledgeGraphModule],
  controllers: [LearningEngineController],
  providers: [LearningEngineService, LessonService, RemediationService],
  exports: [LearningEngineService, LessonService, RemediationService],
})
export class LearningEngineModule {}
