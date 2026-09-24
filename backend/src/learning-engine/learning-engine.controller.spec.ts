import { LearningEngineController } from './learning-engine.controller';
import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { SupabaseAuthGuard, OrgMembershipGuard, CourseScopeGuard } from '@/auth';
import { REQUIRE_ENROLLMENT_KEY } from '@/auth/decorators/require-enrollment.decorator';

describe('LearningEngineController', () => {
  let controller: LearningEngineController;
  let mockEngine: any;
  let mockLesson: any;
  let mockPosthog: any;

  const orgCtx = {
    orgId: 'org-1',
    userId: 'u1',
    email: 'a@b.com',
    role: 'member',
  };

  beforeEach(() => {
    mockEngine = {
      getNextTask: jest.fn().mockResolvedValue({
        taskType: 'lesson',
        conceptId: 'c2',
        reason: 'New lesson at frontier',
      }),
      getNextTaskForCourse: jest.fn().mockResolvedValue({
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
      getStudySessionForCourse: jest.fn().mockResolvedValue({
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

    mockPosthog = { capture: jest.fn() };
    controller = new LearningEngineController(mockEngine, mockLesson, mockPosthog);
  });

  describe('GET /next-task', () => {
    it('should return next task recommendation', async () => {
      const result = await controller.getNextTask('course-1', orgCtx as any);

      expect(result.taskType).toBe('lesson');
      expect(result.conceptId).toBe('c2');
      expect(mockEngine.getNextTaskForCourse).toHaveBeenCalledWith('u1', 'course-1');
    });
  });

  describe('GET /session', () => {
    it('should return a study session from the learning engine', async () => {
      const result = await controller.getStudySession('course-1', orgCtx as any);

      expect(result.tasks).toHaveLength(1);
      expect(result.estimatedXP).toBe(15);
      expect(mockEngine.getStudySessionForCourse).toHaveBeenCalledWith('u1', 'course-1');
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
        'org-1',
        'course-1',
        'c2',
      );
    });
  });

  it('checks authentication, membership, and course scope in order', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, LearningEngineController)).toEqual([
      SupabaseAuthGuard, OrgMembershipGuard, CourseScopeGuard,
    ]);
  });

  it.each(['getNextTask', 'getStudySession', 'startLesson', 'completeLesson'] as const)(
    'requires enrollment for %s',
    (method) => {
      expect(new Reflector().getAllAndOverride(REQUIRE_ENROLLMENT_KEY, [
        LearningEngineController.prototype[method], LearningEngineController,
      ])).toBe(true);
    },
  );

  it('does not report lesson completion when the scoped service rejects it', async () => {
    mockLesson.completeLesson.mockRejectedValue(new NotFoundException('Access denied'));
    await expect(controller.completeLesson('foreign-course', 'c2', orgCtx as any)).rejects.toThrow(NotFoundException);
    expect(mockLesson.completeLesson).toHaveBeenCalledWith('u1', 'org-1', 'foreign-course', 'c2');
    expect(mockPosthog.capture).not.toHaveBeenCalled();
  });
});
