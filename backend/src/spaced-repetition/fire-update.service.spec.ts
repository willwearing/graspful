import { FireUpdateService } from './fire-update.service';

describe('FireUpdateService', () => {
  let service: FireUpdateService;
  let mockPrisma: any;
  let mockTx: any;

  let mockStudentState: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(),
      encompassingEdge: {
        findMany: jest.fn(),
      },
    };
    mockTx = { encompassingEdge: mockPrisma.encompassingEdge };
    mockPrisma.$transaction.mockImplementation((work: any) => work(mockTx));
    mockStudentState = {
      getConceptState: jest.fn(),
      updateConceptFIRe: jest.fn().mockResolvedValue({}),
      getConceptStatesForFIRe: jest.fn().mockResolvedValue([]),
    };
    service = new FireUpdateService(mockPrisma, mockStudentState);
  });

  describe('updateAfterReview', () => {
    it('should update repNum, memory, and interval on passed review', async () => {
      mockStudentState.getConceptState.mockResolvedValue({
        userId: 'u1',
        conceptId: 'c1',
        repNum: 2,
        memory: 0.5,
        interval: 7,
        speed: 1.0,
        lastPracticedAt: new Date('2026-03-03'),
      });
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);
      mockStudentState.getConceptStatesForFIRe.mockResolvedValue([]);

      await service.updateAfterReview('u1', 'c1', true, 0.8);

      expect(mockStudentState.updateConceptFIRe).toHaveBeenCalledWith(
        'u1',
        'c1',
        expect.objectContaining({
          repNum: expect.any(Number),
          memory: expect.any(Number),
          interval: expect.any(Number),
          lastPracticedAt: expect.any(Date),
        }),
        mockTx,
      );

      // repNum should increase
      const updateCall = mockStudentState.updateConceptFIRe.mock.calls[0][2];
      expect(updateCall.repNum).toBeGreaterThan(2);
    });

    it('should decrease repNum on failed review', async () => {
      mockStudentState.getConceptState.mockResolvedValue({
        userId: 'u1',
        conceptId: 'c1',
        repNum: 3,
        memory: 0.4,
        interval: 14,
        speed: 1.0,
        lastPracticedAt: new Date('2026-03-01'),
      });
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);
      mockStudentState.getConceptStatesForFIRe.mockResolvedValue([]);

      await service.updateAfterReview('u1', 'c1', false, 0);

      const updateCall = mockStudentState.updateConceptFIRe.mock.calls[0][2];
      expect(updateCall.repNum).toBeLessThan(3);
    });
  });

  describe('propagateImplicitRepetition', () => {
    it('should update encompassed concepts after practice', async () => {
      // big encompasses small
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([
        { sourceConceptId: 'small', targetConceptId: 'big', weight: 0.5 },
      ]);

      // Return concept states for speed lookup
      mockStudentState.getConceptStatesForFIRe.mockResolvedValue([
        { conceptId: 'small', speed: 1.2, repNum: 1, memory: 0.4 },
      ]);

      await service.propagateImplicitRepetition('u1', 'big', 0.3, 'academy1');

      // Should update small's repNum and memory
      const smallUpdate = mockStudentState.updateConceptFIRe.mock.calls.find(
        (call: any[]) => call[1] === 'small',
      );
      expect(smallUpdate).toBeDefined();
    });

    it('should not crash when no encompassing edges exist', async () => {
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);
      mockStudentState.getConceptStatesForFIRe.mockResolvedValue([]);

      // Should complete without throwing
      await service.propagateImplicitRepetition('u1', 'c1', 0.3, 'academy1');

      // No updates should be made
      expect(mockStudentState.updateConceptFIRe).not.toHaveBeenCalled();
    });

    it('should propagate across course boundaries within academy', async () => {
      // Concept in Course A encompasses concept in Course B — same academy
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([
        { sourceConceptId: 'course-b-concept', targetConceptId: 'course-a-concept', weight: 0.6 },
      ]);

      mockStudentState.getConceptStatesForFIRe.mockResolvedValue([
        { conceptId: 'course-b-concept', speed: 1.0, repNum: 2, memory: 0.5 },
      ]);

      // Practice course-a-concept — should propagate to course-b-concept
      await service.propagateImplicitRepetition('u1', 'course-a-concept', 0.4, 'academy1');

      const crossCourseUpdate = mockStudentState.updateConceptFIRe.mock.calls.find(
        (call: any[]) => call[1] === 'course-b-concept',
      );
      expect(crossCourseUpdate).toBeDefined();
    });
  });

  describe('transaction integrity', () => {
    const directState = {
      conceptId: 'big', repNum: 2, memory: 0.5, interval: 7, speed: 1,
    };

    it('uses one transaction for the direct review and all propagated updates', async () => {
      mockStudentState.getConceptState.mockResolvedValue(directState);
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([
        { sourceConceptId: 'small', targetConceptId: 'big', weight: 0.5 },
      ]);
      mockStudentState.getConceptStatesForFIRe.mockResolvedValue([
        { conceptId: 'small', repNum: 1, memory: 0.4, speed: 1 },
      ]);

      await service.updateAfterReview('u1', 'big', true, 1, 'academy1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function), { isolationLevel: 'Serializable' },
      );
      expect(mockStudentState.getConceptState).toHaveBeenCalledWith('u1', 'big', mockTx);
      expect(mockStudentState.getConceptStatesForFIRe).toHaveBeenCalledWith('u1', 'academy1', mockTx);
      expect(mockStudentState.updateConceptFIRe).toHaveBeenCalledTimes(2);
      for (const call of mockStudentState.updateConceptFIRe.mock.calls) {
        expect(call[3]).toBe(mockTx);
      }
    });

    it('uses a supplied transaction without opening a nested transaction', async () => {
      const tx = {
        encompassingEdge: { findMany: jest.fn().mockResolvedValue([]) },
      } as any;
      mockStudentState.getConceptState.mockResolvedValue(directState);

      await service.updateAfterReview('u1', 'big', true, 1, 'academy1', tx);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.encompassingEdge.findMany).not.toHaveBeenCalled();
      expect(tx.encompassingEdge.findMany).toHaveBeenCalledTimes(1);
      expect(mockStudentState.getConceptState).toHaveBeenCalledWith('u1', 'big', tx);
      expect(mockStudentState.updateConceptFIRe.mock.calls[0][3]).toBe(tx);
    });

    it('rolls back the direct concept and earlier targets when propagation fails', async () => {
      let committed = new Map([
        ['big', { ...directState }],
        ['small1', { conceptId: 'small1', repNum: 1, memory: 0.4, interval: 3, speed: 1 }],
        ['small2', { conceptId: 'small2', repNum: 1, memory: 0.4, interval: 3, speed: 1 }],
      ]);
      let failPropagation = true;
      mockPrisma.$transaction.mockImplementation(async (work: any) => {
        const pending = new Map([...committed].map(([id, state]) => [id, { ...state }]));
        await work({
          pending,
          encompassingEdge: {
            findMany: async () => [
              { sourceConceptId: 'small1', targetConceptId: 'big', weight: 0.5 },
              { sourceConceptId: 'small2', targetConceptId: 'big', weight: 0.5 },
            ],
          },
        });
        committed = pending;
      });
      mockStudentState.getConceptState.mockImplementation(
        async (_userId: string, conceptId: string, tx: any) => tx.pending.get(conceptId),
      );
      mockStudentState.getConceptStatesForFIRe.mockImplementation(
        async (_userId: string, _academyId: string, tx: any) => [...tx.pending.values()],
      );
      mockStudentState.updateConceptFIRe.mockImplementation(
        async (_userId: string, conceptId: string, data: any, tx: any) => {
          if (conceptId === 'small2' && failPropagation) throw new Error('propagation failed');
          tx.pending.set(conceptId, { ...tx.pending.get(conceptId), ...data });
        },
      );

      await expect(service.updateAfterReview('u1', 'big', true, 1, 'academy1'))
        .rejects.toThrow('propagation failed');
      expect(committed.get('big')).toEqual(directState);
      expect(committed.get('small1')?.repNum).toBe(1);
      expect(committed.get('small2')?.repNum).toBe(1);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      const firstDirectUpdate = mockStudentState.updateConceptFIRe.mock.calls[0][2];

      failPropagation = false;
      await service.updateAfterReview('u1', 'big', true, 1, 'academy1');
      expect(committed.get('big')?.repNum).toBe(firstDirectUpdate.repNum);
      expect(committed.get('small1')?.repNum).toBeGreaterThan(1);
      expect(committed.get('small2')?.repNum).toBeGreaterThan(1);
    });

    it('opens a transaction for standalone propagation', async () => {
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);

      await service.propagateImplicitRepetition('u1', 'big', 0.3, 'academy1');

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function), { isolationLevel: 'Serializable' },
      );
    });

    it('retries a serialization conflict from a fresh transaction', async () => {
      mockPrisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });
      mockStudentState.getConceptState.mockResolvedValue(directState);

      await service.updateAfterReview('u1', 'big', true, 1);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
      expect(mockStudentState.updateConceptFIRe).toHaveBeenCalledTimes(1);
    });

    it('stops after three serialization conflicts', async () => {
      const conflict = { code: 'P2034' };
      mockPrisma.$transaction.mockRejectedValue(conflict);

      await expect(service.updateAfterReview('u1', 'big', true, 1)).rejects.toBe(conflict);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
    });

    it('leaves retry decisions for a supplied transaction to its caller', async () => {
      const conflict = { code: 'P2034' };
      mockStudentState.getConceptState.mockRejectedValue(conflict);

      await expect(service.updateAfterReview('u1', 'big', true, 1, 'academy1', mockTx))
        .rejects.toBe(conflict);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockStudentState.getConceptState).toHaveBeenCalledTimes(1);
    });
  });

});
