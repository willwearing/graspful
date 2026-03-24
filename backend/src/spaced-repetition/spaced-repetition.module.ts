import { Module, forwardRef } from '@nestjs/common';
import { StudentModelModule } from '@/student-model/student-model.module';
import { MemoryDecayService } from './memory-decay.service';
import { FireUpdateService } from './fire-update.service';

@Module({
  imports: [forwardRef(() => StudentModelModule)],
  providers: [MemoryDecayService, FireUpdateService],
  exports: [MemoryDecayService, FireUpdateService],
})
export class SpacedRepetitionModule {}
