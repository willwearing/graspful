import { Module } from '@nestjs/common';
import { MemoryDecayService } from './memory-decay.service';
import { FireUpdateService } from './fire-update.service';

@Module({
  providers: [MemoryDecayService, FireUpdateService],
  exports: [MemoryDecayService, FireUpdateService],
})
export class SpacedRepetitionModule {}
