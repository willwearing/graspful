import { LessonService } from './lesson.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('LessonService', () => {
  let service: LessonService;
  let mockPrisma: any;
  let mockRemediationService: any;

  beforeEach(() => {
    mockPrisma = {
      concept: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'c2',
          courseId: 'course-1',
          orgId: 'org-1',
          name: 'Concept 2',
        }),
      },
      studentConceptState: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'u1',
          conceptId: 'c2',
          masteryState: 'unstarted',
          failCount: 0,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      prerequisiteEdge: {
        findMany: jest.fn().mockResolvedValue([
          { sourceConceptId: 'c1', targetConceptId: 'c2' },
        ]),
      },
      knowledgePoint: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'kp1',
            conceptId: 'c2',
            slug: 'kp-1',
            instructionText: 'Learn this',
            instructionContent: [
              {
                type: 'image',
                url: 'https://example.com/entity.png',
                alt: 'Entity diagram',
              },
            ],
            workedExampleText: 'Example here',
            workedExampleContent: [],
            problems: [
              {
                id: 'p1',
                questionText: 'What is the entity here?',
                type: 'multiple_choice',
                options: ['Customer', 'Runs', 'Blue', 'Required'],
                difficulty: 3,
              },
            ],
          },
        ]),
      },
    };

    mockRemediationService = {
      getBlockedConceptIds: jest.fn().mockResolvedValue(new Set()),
      getBlockedConceptIdsForCourse: jest.fn().mockResolvedValue(new Set()),
    };

    service = new LessonService(mockPrisma, mockRemediationService);
  });

  describe('startLesson', () => {
    it('should start a lesson for a valid frontier concept', async () => {
      const result = await service.startLesson('u1', 'org-1', 'course-1', 'c2');

      expect(result.conceptId).toBe('c2');
      expect(result.knowledgePoints).toHaveLength(1);
      expect(result.knowledgePoints[0].instructionText).toBe('Learn this');
      expect(result.knowledgePoints[0].instructionContent).toEqual([
        {
          type: 'image',
          url: 'https://example.com/entity.png',
          alt: 'Entity diagram',
        },
      ]);
      expect(result.knowledgePoints[0].problems).toEqual([
        {
          id: 'p1',
          questionText: 'What is the entity here?',
          type: 'multiple_choice',
          options: [
            { id: '0', text: 'Customer' },
            { id: '1', text: 'Runs' },
            { id: '2', text: 'Blue' },
            { id: '3', text: 'Required' },
          ],
          difficulty: 3,
        },
      ]);
      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
        where: { userId_conceptId: { userId: 'u1', conceptId: 'c2' } },
        data: { masteryState: 'in_progress' },
      });
    });

    it('should throw when concept not found', async () => {
      mockPrisma.concept.findFirst.mockResolvedValue(null);

      await expect(
        service.startLesson('u1', 'org-1', 'course-1', 'c2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when concept is blocked by remediation', async () => {
      mockRemediationService.getBlockedConceptIdsForCourse.mockResolvedValue(
        new Set(['c2']),
      );

      await expect(
        service.startLesson('u1', 'org-1', 'course-1', 'c2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when concept is already mastered', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue({
        userId: 'u1',
        conceptId: 'c2',
        masteryState: 'mastered',
        failCount: 0,
      });

      await expect(
        service.startLesson('u1', 'org-1', 'course-1', 'c2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeLesson', () => {
    it('should record lastPracticedAt when concept is in_progress', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue({
        userId: 'u1',
        conceptId: 'c2',
        masteryState: 'in_progress',
        failCount: 0,
      });

      await service.completeLesson('u1', 'course-1', 'c2');

      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
        where: { userId_conceptId: { userId: 'u1', conceptId: 'c2' } },
        data: {
          lastPracticedAt: expect.any(Date),
        },
      });
    });

    it('should record lastPracticedAt when concept was mastered during lesson practice', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue({
        userId: 'u1',
        conceptId: 'c2',
        masteryState: 'mastered',
        failCount: 0,
      });

      await service.completeLesson('u1', 'course-1', 'c2');

      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
        where: { userId_conceptId: { userId: 'u1', conceptId: 'c2' } },
        data: {
          lastPracticedAt: expect.any(Date),
        },
      });
    });

    it('should throw when concept state not found', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue(null);

      await expect(
        service.completeLesson('u1', 'course-1', 'c2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when concept is not in_progress', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue({
        userId: 'u1',
        conceptId: 'c2',
        masteryState: 'unstarted',
        failCount: 0,
      });

      await expect(
        service.completeLesson('u1', 'course-1', 'c2'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
