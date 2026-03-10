import { MemoryDecayService } from './memory-decay.service';

describe('MemoryDecayService', () => {
  let service: MemoryDecayService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      studentConceptState: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new MemoryDecayService(mockPrisma);
  });

  it('should decay memory for all concepts based on elapsed time', async () => {
    const now = new Date('2026-03-10T12:00:00Z');
    const sevenDaysAgo = new Date('2026-03-03T12:00:00Z');

    mockPrisma.studentConceptState.findMany.mockResolvedValue([
      {
        userId: 'user1',
        conceptId: 'c1',
        memory: 0.8,
        interval: 7,
        lastPracticedAt: sevenDaysAgo,
        masteryState: 'mastered',
      },
    ]);
    mockPrisma.studentConceptState.update.mockResolvedValue({});

    await service.decayAllMemory('user1', 'course1', now);

    expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
      where: { userId_conceptId: { userId: 'user1', conceptId: 'c1' } },
      data: { memory: expect.closeTo(0.4, 1) }, // 0.8 * 0.5^(7/7) = 0.4
    });
  });

  it('should skip concepts with no lastPracticedAt', async () => {
    mockPrisma.studentConceptState.findMany.mockResolvedValue([
      {
        userId: 'user1',
        conceptId: 'c1',
        memory: 0.8,
        interval: 7,
        lastPracticedAt: null,
        masteryState: 'mastered',
      },
    ]);

    await service.decayAllMemory('user1', 'course1', new Date());

    expect(mockPrisma.studentConceptState.update).not.toHaveBeenCalled();
  });

  it('should skip unstarted concepts', async () => {
    mockPrisma.studentConceptState.findMany.mockResolvedValue([
      {
        userId: 'user1',
        conceptId: 'c1',
        memory: 1.0,
        interval: 1,
        lastPracticedAt: new Date('2026-03-01'),
        masteryState: 'unstarted',
      },
    ]);

    await service.decayAllMemory('user1', 'course1', new Date());

    expect(mockPrisma.studentConceptState.update).not.toHaveBeenCalled();
  });

  it('should not update if decayed memory equals current memory (no change)', async () => {
    const now = new Date('2026-03-10T12:00:00Z');

    mockPrisma.studentConceptState.findMany.mockResolvedValue([
      {
        userId: 'user1',
        conceptId: 'c1',
        memory: 0.8,
        interval: 7,
        lastPracticedAt: now, // 0 days elapsed -> no decay
        masteryState: 'mastered',
      },
    ]);

    await service.decayAllMemory('user1', 'course1', now);

    expect(mockPrisma.studentConceptState.update).not.toHaveBeenCalled();
  });
});
