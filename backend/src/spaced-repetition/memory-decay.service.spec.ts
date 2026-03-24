import { MemoryDecayService } from './memory-decay.service';

describe('MemoryDecayService', () => {
  let service: MemoryDecayService;
  let mockPrisma: any;
  let mockStudentState: any;

  beforeEach(() => {
    mockPrisma = {
      course: {
        findUnique: jest.fn(),
      },
    };
    mockStudentState = {
      getConceptStatesForDecay: jest.fn().mockResolvedValue([]),
      batchDecayMemory: jest.fn().mockResolvedValue(undefined),
    };
    service = new MemoryDecayService(mockPrisma, mockStudentState);
  });

  it('should decay memory for all concepts based on elapsed time', async () => {
    const now = new Date('2026-03-10T12:00:00Z');
    const sevenDaysAgo = new Date('2026-03-03T12:00:00Z');

    mockStudentState.getConceptStatesForDecay.mockResolvedValue([
      {
        userId: 'user1',
        conceptId: 'c1',
        memory: 0.8,
        interval: 7,
        lastPracticedAt: sevenDaysAgo,
        masteryState: 'mastered',
      },
    ]);

    await service.decayAllMemory('user1', 'course1', now);

    expect(mockStudentState.batchDecayMemory).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'user1',
        conceptId: 'c1',
        memory: expect.any(Number),
      }),
    ]);
  });

  it('should skip concepts with no lastPracticedAt (filtered by service query)', async () => {
    mockStudentState.getConceptStatesForDecay.mockResolvedValue([]);

    await service.decayAllMemory('user1', 'course1', new Date());

    expect(mockStudentState.batchDecayMemory).not.toHaveBeenCalled();
  });

  it('should skip unstarted concepts (filtered by service query)', async () => {
    mockStudentState.getConceptStatesForDecay.mockResolvedValue([]);

    await service.decayAllMemory('user1', 'course1', new Date());

    expect(mockStudentState.batchDecayMemory).not.toHaveBeenCalled();
  });

  it('should not update if decayed memory equals current memory (no change)', async () => {
    const now = new Date('2026-03-10T12:00:00Z');

    mockStudentState.getConceptStatesForDecay.mockResolvedValue([
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

    expect(mockStudentState.batchDecayMemory).not.toHaveBeenCalled();
  });
});
