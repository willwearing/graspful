import { FireUpdateService } from './fire-update.service';

describe('FireUpdateService', () => {
  let service: FireUpdateService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      studentConceptState: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      encompassingEdge: {
        findMany: jest.fn(),
      },
    };
    service = new FireUpdateService(mockPrisma);
  });

  describe('updateAfterReview', () => {
    it('should update repNum, memory, and interval on passed review', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue({
        userId: 'u1',
        conceptId: 'c1',
        repNum: 2,
        memory: 0.5,
        interval: 7,
        speed: 1.0,
        lastPracticedAt: new Date('2026-03-03'),
      });
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.update.mockResolvedValue({});

      await service.updateAfterReview('u1', 'c1', true, 0.8);

      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_conceptId: { userId: 'u1', conceptId: 'c1' } },
          data: expect.objectContaining({
            repNum: expect.any(Number),
            memory: expect.any(Number),
            interval: expect.any(Number),
            lastPracticedAt: expect.any(Date),
          }),
        }),
      );

      // repNum should increase
      const updateCall = mockPrisma.studentConceptState.update.mock.calls[0][0];
      expect(updateCall.data.repNum).toBeGreaterThan(2);
    });

    it('should decrease repNum on failed review', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue({
        userId: 'u1',
        conceptId: 'c1',
        repNum: 3,
        memory: 0.4,
        interval: 14,
        speed: 1.0,
        lastPracticedAt: new Date('2026-03-01'),
      });
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.update.mockResolvedValue({});

      await service.updateAfterReview('u1', 'c1', false, 0);

      const updateCall = mockPrisma.studentConceptState.update.mock.calls[0][0];
      expect(updateCall.data.repNum).toBeLessThan(3);
    });
  });

  describe('propagateImplicitRepetition', () => {
    it('should update encompassed concepts after practice', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue({
        userId: 'u1',
        conceptId: 'big',
        repNum: 3,
        memory: 0.6,
        interval: 14,
        speed: 1.0,
        lastPracticedAt: new Date(),
      });

      // big encompasses small
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([
        { sourceConceptId: 'small', targetConceptId: 'big', weight: 0.5 },
      ]);

      // Return concept states for speed lookup
      mockPrisma.studentConceptState.findMany.mockResolvedValue([
        { conceptId: 'small', speed: 1.2, repNum: 1, memory: 0.4 },
      ]);

      mockPrisma.studentConceptState.update.mockResolvedValue({});

      await service.propagateImplicitRepetition('u1', 'big', 0.3, 'academy1');

      // Should update small's repNum and memory
      const smallUpdate = mockPrisma.studentConceptState.update.mock.calls.find(
        (call: any[]) => call[0].where.userId_conceptId.conceptId === 'small',
      );
      expect(smallUpdate).toBeDefined();
    });

    it('should not crash when no encompassing edges exist', async () => {
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.findMany.mockResolvedValue([]);

      // Should complete without throwing
      await service.propagateImplicitRepetition('u1', 'c1', 0.3, 'academy1');

      // No updates should be made
      expect(mockPrisma.studentConceptState.update).not.toHaveBeenCalled();
    });

    it('should propagate across course boundaries within academy', async () => {
      // Concept in Course A encompasses concept in Course B — same academy
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([
        { sourceConceptId: 'course-b-concept', targetConceptId: 'course-a-concept', weight: 0.6 },
      ]);

      mockPrisma.studentConceptState.findMany.mockResolvedValue([
        { conceptId: 'course-b-concept', speed: 1.0, repNum: 2, memory: 0.5 },
      ]);

      mockPrisma.studentConceptState.update.mockResolvedValue({});

      // Practice course-a-concept — should propagate to course-b-concept
      await service.propagateImplicitRepetition('u1', 'course-a-concept', 0.4, 'academy1');

      const crossCourseUpdate = mockPrisma.studentConceptState.update.mock.calls.find(
        (call: any[]) => call[0].where.userId_conceptId.conceptId === 'course-b-concept',
      );
      expect(crossCourseUpdate).toBeDefined();
    });
  });
});
