import { Test } from '@nestjs/testing';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { RemediationCoreModule } from '@/learning-engine/remediation-core.module';
import { RemediationService } from '@/learning-engine/remediation.service';
import { SpacedRepetitionModule } from '@/spaced-repetition/spaced-repetition.module';
import { MemoryDecayService } from '@/spaced-repetition/memory-decay.service';
import { StudentStateService } from '../student-state.service';
import { EnrollmentService } from '../enrollment.service';
import { StudentModelCoreModule } from './student-model-core.module';

describe('Student model core module', () => {
  it('exports one enrollment service for student state, remediation and memory decay', async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, StudentModelCoreModule, RemediationCoreModule, SpacedRepetitionModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    try {
      const enrollment = module.get(EnrollmentService);
      expect(enrollment).toBeInstanceOf(EnrollmentService);
      expect(module.get(StudentStateService)).toBeInstanceOf(StudentStateService);
      expect(module.get(RemediationService)).toBeInstanceOf(RemediationService);
      expect(module.get(MemoryDecayService)).toBeInstanceOf(MemoryDecayService);
    } finally {
      await module.close();
    }
  });
});
