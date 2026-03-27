import { Module } from '@nestjs/common';
import { StudentModelCoreModule } from '@/student-model/application/student-model-core.module';
import { MemoryDecayService } from './memory-decay.service';
import { FireUpdateService } from './fire-update.service';

@Module({
  imports: [StudentModelCoreModule],
  providers: [MemoryDecayService, FireUpdateService],
  exports: [MemoryDecayService, FireUpdateService],
})
export class SpacedRepetitionModule {}
