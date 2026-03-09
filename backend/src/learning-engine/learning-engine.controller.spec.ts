import { Test, TestingModule } from '@nestjs/testing';
import { LearningEngineController } from './learning-engine.controller';
import { LearningEngineService } from './learning-engine.service';
import { LessonService } from './lesson.service';
import { SupabaseAuthGuard, OrgMembershipGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('LearningEngineController', () => {
  let controller: LearningEngineController;
  let mockEngine: any;
  let mockLesson: any;

  const orgCtx = {
    orgId: 'org-1',
    userId: 'u1',
    email: 'a@b.com',
    role: 'member',
  };

  beforeEach(async () => {
    mockEngine = {
      getNextTask: jest.fn().mockResolvedValue({
        taskType: 'lesson',
        conceptId: 'c2',
        reason: 'New lesson at frontier',
      }),
      getStudySession: jest.fn().mockResolvedValue({
        tasks: [
          { taskType: 'lesson', conceptId: 'c2', reason: 'frontier' },
        ],
        estimatedXP: 15,
      }),
    };

    mockLesson = {
      startLesson: jest.fn().mockResolvedValue({
        conceptId: 'c2',
        conceptName: 'Concept 2',
        knowledgePoints: [],
      }),
      completeLesson: jest.fn().mockResolvedValue({
        conceptId: 'c2',
        status: 'lesson_complete',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearningEngineController],
      providers: [
        { provide: LearningEngineService, useValue: mockEngine },
        { provide: LessonService, useValue: mockLesson },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(OrgMembershipGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(LearningEngineController);
  });

  describe('GET /next-task', () => {
    it('should return next task recommendation', async () => {
      const result = await controller.getNextTask('course-1', orgCtx as any);

      expect(result.taskType).toBe('lesson');
      expect(result.conceptId).toBe('c2');
      expect(mockEngine.getNextTask).toHaveBeenCalledWith('u1', 'course-1');
    });
  });

  describe('GET /session', () => {
    it('should return a study session', async () => {
      const result = await controller.getStudySession('course-1', orgCtx as any);

      expect(result.tasks).toHaveLength(1);
      expect(result.estimatedXP).toBe(15);
    });
  });

  describe('POST /lessons/:conceptId/start', () => {
    it('should start a lesson', async () => {
      const result = await controller.startLesson(
        'course-1',
        'c2',
        orgCtx as any,
      );

      expect(result.conceptId).toBe('c2');
      expect(mockLesson.startLesson).toHaveBeenCalledWith(
        'u1',
        'org-1',
        'course-1',
        'c2',
      );
    });
  });

  describe('POST /lessons/:conceptId/complete', () => {
    it('should complete a lesson', async () => {
      const result = await controller.completeLesson(
        'course-1',
        'c2',
        orgCtx as any,
      );

      expect(result.status).toBe('lesson_complete');
      expect(mockLesson.completeLesson).toHaveBeenCalledWith(
        'u1',
        'course-1',
        'c2',
      );
    });
  });
});
