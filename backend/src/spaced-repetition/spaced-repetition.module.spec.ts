import { Test } from '@nestjs/testing';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { EncompassingQueryService } from '@/knowledge-graph/encompassing-query.service';
import { FireUpdateService } from './fire-update.service';
import { SpacedRepetitionModule } from './spaced-repetition.module';

describe('SpacedRepetitionModule', () => {
  it('resolves the owning graph query service through the module import', async () => {
    const module = await Test.createTestingModule({ imports: [PrismaModule, SpacedRepetitionModule] })
      .overrideProvider(PrismaService).useValue({}).compile();
    expect(module.get(FireUpdateService)).toBeInstanceOf(FireUpdateService);
    expect(module.get(EncompassingQueryService)).toBeInstanceOf(EncompassingQueryService);
    await module.close();
  });
});
