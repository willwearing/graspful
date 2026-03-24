import { FireUpdateService } from './fire-update.service';

describe('FireUpdateService', () => {
  let service: FireUpdateService;
  let mockPrisma: any;

  let mockStudentState: any;

  beforeEach(() => {
    mockPrisma = {
      encompassingEdge: {
        findMany: jest.fn(),
      },
    };
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
});
