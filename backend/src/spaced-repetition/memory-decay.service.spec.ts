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
      $transaction: jest.fn().mockResolvedValue([]),
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

    expect(mockPrisma.$transaction).toHaveBeenCalledWith([
      expect.anything(), // the update call for c1
    ]);
  });

  it('should skip concepts with no lastPracticedAt (filtered by Prisma where)', async () => {
    // Prisma where clause excludes lastPracticedAt: null, so findMany returns empty
    mockPrisma.studentConceptState.findMany.mockResolvedValue([]);

    await service.decayAllMemory('user1', 'course1', new Date());

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('should skip unstarted concepts (filtered by Prisma where)', async () => {
    // Prisma where clause excludes masteryState: 'unstarted', so findMany returns empty
    mockPrisma.studentConceptState.findMany.mockResolvedValue([]);

    await service.decayAllMemory('user1', 'course1', new Date());

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
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

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
