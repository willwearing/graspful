import { KnowledgeGraphQueriesModule } from '@/knowledge-graph/knowledge-graph-queries.module';
import { Module } from '@nestjs/common';
import { StudentModelCoreModule } from '@/student-model/application/student-model-core.module';
import { MemoryDecayService } from './memory-decay.service';
import { FireUpdateService } from './fire-update.service';

@Module({
  imports: [StudentModelCoreModule, KnowledgeGraphQueriesModule],
  providers: [MemoryDecayService, FireUpdateService],
  exports: [MemoryDecayService, FireUpdateService],
})
export class SpacedRepetitionModule {}
