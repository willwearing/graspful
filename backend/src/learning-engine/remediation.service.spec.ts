import { RemediationService } from './remediation.service';

describe('RemediationService', () => {
  let service: RemediationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      remediation: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({
          id: 'rem-1',
          userId: 'u1',
          academyId: 'academy-1',
          courseId: 'course-1',
          blockedConceptId: 'c2',
          weakPrerequisiteId: 'c1',
          resolved: false,
          createdAt: new Date(),
          resolvedAt: null,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    service = new RemediationService(mockPrisma);
  });

  describe('getActiveRemediations', () => {
    it('should return unresolved remediations for user/course', async () => {
      mockPrisma.remediation.findMany.mockResolvedValue([
        {
          id: 'rem-1',
          blockedConceptId: 'c2',
          weakPrerequisiteId: 'c1',
          resolved: false,
        },
      ]);

      const result = await service.getActiveRemediations('u1', 'academy-1');
      expect(result).toHaveLength(1);
      expect(result[0].blockedConceptId).toBe('c2');
      expect(mockPrisma.remediation.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', academyId: 'academy-1', resolved: false },
      });
    });
  });

  describe('createRemediation', () => {
    it('should upsert a remediation record', async () => {
      await service.createRemediation('u1', 'academy-1', 'c2', 'c1', 'course-1');

      expect(mockPrisma.remediation.upsert).toHaveBeenCalledWith({
        where: {
          userId_blockedConceptId_weakPrerequisiteId: {
            userId: 'u1',
            blockedConceptId: 'c2',
            weakPrerequisiteId: 'c1',
          },
        },
        create: {
          userId: 'u1',
          academyId: 'academy-1',
          courseId: 'course-1',
          blockedConceptId: 'c2',
          weakPrerequisiteId: 'c1',
        },
        update: {
          academyId: 'academy-1',
          courseId: 'course-1',
          resolved: false,
          resolvedAt: null,
        },
      });
    });
  });

  describe('resolveRemediationsForPrerequisite', () => {
    it('should mark remediations as resolved when prereq is re-mastered', async () => {
      await service.resolveRemediationsForPrerequisite('u1', 'c1');

      expect(mockPrisma.remediation.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          weakPrerequisiteId: 'c1',
          resolved: false,
        },
        data: {
          resolved: true,
          resolvedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getBlockedConceptIds', () => {
    it('should return concept IDs blocked by unresolved remediations', async () => {
      mockPrisma.remediation.findMany.mockResolvedValue([
        { blockedConceptId: 'c2', weakPrerequisiteId: 'c1', resolved: false },
        { blockedConceptId: 'c3', weakPrerequisiteId: 'c1', resolved: false },
      ]);

      const result = await service.getBlockedConceptIds('u1', 'academy-1');
      expect(result).toEqual(new Set(['c2', 'c3']));
    });
  });
});
