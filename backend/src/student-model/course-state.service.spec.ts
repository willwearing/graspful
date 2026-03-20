import { Test, TestingModule } from '@nestjs/testing';
import { CourseStateService } from './course-state.service';
import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CourseProgressState, SectionMasteryState } from '@prisma/client';

describe('CourseStateService', () => {
  let service: CourseStateService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      studentCourseState: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      course: {
        findUnique: jest.fn(),
      },
      courseSection: {
        count: jest.fn(),
      },
      studentSectionState: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CourseStateService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CourseStateService);
  });

  describe('getCourseStatesForAcademy', () => {
    it('should return course states ordered by sort order', async () => {
      const expected = [
        { id: '1', userId: 'u1', courseId: 'c1', status: 'active' },
        { id: '2', userId: 'u1', courseId: 'c2', status: 'unlocked' },
      ];
      mockPrisma.studentCourseState.findMany.mockResolvedValue(expected);

      const result = await service.getCourseStatesForAcademy('u1', 'academy-1');

      expect(result).toEqual(expected);
      expect(mockPrisma.studentCourseState.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          course: { academyId: 'academy-1' },
        },
        orderBy: { course: { sortOrder: 'asc' } },
      });
    });
  });

  describe('transitionCourseState', () => {
    it('should transition locked -> unlocked', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.locked,
      });
      const updated = {
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.unlocked,
      };
      mockPrisma.studentCourseState.update.mockResolvedValue(updated);

      const result = await service.transitionCourseState(
        'u1',
        'c1',
        CourseProgressState.unlocked,
      );

      expect(result.status).toBe(CourseProgressState.unlocked);
    });

    it('should transition unlocked -> active', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.unlocked,
      });
      const updated = {
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.active,
      };
      mockPrisma.studentCourseState.update.mockResolvedValue(updated);

      const result = await service.transitionCourseState(
        'u1',
        'c1',
        CourseProgressState.active,
      );

      expect(result.status).toBe(CourseProgressState.active);
    });

    it('should transition active -> completed', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.active,
      });
      const updated = {
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.completed,
      };
      mockPrisma.studentCourseState.update.mockResolvedValue(updated);

      const result = await service.transitionCourseState(
        'u1',
        'c1',
        CourseProgressState.completed,
      );

      expect(result.status).toBe(CourseProgressState.completed);
    });

    it('should reject locked -> completed (skip transition)', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.locked,
      });

      await expect(
        service.transitionCourseState(
          'u1',
          'c1',
          CourseProgressState.completed,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject locked -> active (skip transition)', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.locked,
      });

      await expect(
        service.transitionCourseState(
          'u1',
          'c1',
          CourseProgressState.active,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject completed -> any (terminal state)', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.completed,
      });

      await expect(
        service.transitionCourseState(
          'u1',
          'c1',
          CourseProgressState.active,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when no course state exists', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue(null);

      await expect(
        service.transitionCourseState(
          'u1',
          'c1',
          CourseProgressState.unlocked,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkAndCompleteCourse', () => {
    it('should mark course completed when all sections are certified', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.active,
      });
      mockPrisma.courseSection.count.mockResolvedValue(3);
      mockPrisma.studentSectionState.count.mockResolvedValue(3);
      mockPrisma.studentCourseState.update.mockResolvedValue({
        id: '1',
        status: CourseProgressState.completed,
      });

      const result = await service.checkAndCompleteCourse('u1', 'c1');

      expect(result).toBe(true);
      expect(mockPrisma.studentCourseState.update).toHaveBeenCalledWith({
        where: { userId_courseId: { userId: 'u1', courseId: 'c1' } },
        data: { status: CourseProgressState.completed },
      });
    });

    it('should not complete when some sections are not certified', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.active,
      });
      mockPrisma.courseSection.count.mockResolvedValue(3);
      mockPrisma.studentSectionState.count.mockResolvedValue(2);

      const result = await service.checkAndCompleteCourse('u1', 'c1');

      expect(result).toBe(false);
      expect(mockPrisma.studentCourseState.update).not.toHaveBeenCalled();
    });

    it('should return false if course is not active', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.unlocked,
      });

      const result = await service.checkAndCompleteCourse('u1', 'c1');

      expect(result).toBe(false);
    });

    it('should return false if no course state exists', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue(null);

      const result = await service.checkAndCompleteCourse('u1', 'c1');

      expect(result).toBe(false);
    });

    it('should return false if course has no active sections', async () => {
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.active,
      });
      mockPrisma.courseSection.count.mockResolvedValue(0);

      const result = await service.checkAndCompleteCourse('u1', 'c1');

      expect(result).toBe(false);
    });
  });

  describe('activateNextCourse', () => {
    it('should activate the next unlocked course', async () => {
      const nextCourse = {
        id: 'state-2',
        userId: 'u1',
        courseId: 'c2',
        status: CourseProgressState.unlocked,
      };
      mockPrisma.studentCourseState.findFirst.mockResolvedValue(nextCourse);
      mockPrisma.studentCourseState.update.mockResolvedValue({
        ...nextCourse,
        status: CourseProgressState.active,
      });

      await service.activateNextCourse('u1', 'academy-1');

      expect(mockPrisma.studentCourseState.update).toHaveBeenCalledWith({
        where: { id: 'state-2' },
        data: { status: CourseProgressState.active },
      });
    });

    it('should do nothing if no unlocked courses remain', async () => {
      mockPrisma.studentCourseState.findFirst.mockResolvedValue(null);

      await service.activateNextCourse('u1', 'academy-1');

      expect(mockPrisma.studentCourseState.update).not.toHaveBeenCalled();
    });
  });

  describe('canActivateCourse', () => {
    it('should return true for the first course when unlocked', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ sortOrder: 0 });
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.unlocked,
      });

      const result = await service.canActivateCourse('u1', 'c1', 'academy-1');

      expect(result).toBe(true);
    });

    it('should return false when course is locked', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ sortOrder: 0 });
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c1',
        status: CourseProgressState.locked,
      });

      const result = await service.canActivateCourse('u1', 'c1', 'academy-1');

      expect(result).toBe(false);
    });

    it('should return true when all prior courses are completed', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ sortOrder: 2 });
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c3',
        status: CourseProgressState.unlocked,
      });
      mockPrisma.studentCourseState.count.mockResolvedValue(0);

      const result = await service.canActivateCourse('u1', 'c3', 'academy-1');

      expect(result).toBe(true);
    });

    it('should return false when prior courses are not all completed', async () => {
      mockPrisma.course.findUnique.mockResolvedValue({ sortOrder: 2 });
      mockPrisma.studentCourseState.findUnique.mockResolvedValue({
        id: '1',
        userId: 'u1',
        courseId: 'c3',
        status: CourseProgressState.unlocked,
      });
      mockPrisma.studentCourseState.count.mockResolvedValue(1);

      const result = await service.canActivateCourse('u1', 'c3', 'academy-1');

      expect(result).toBe(false);
    });

    it('should return false when course does not exist', async () => {
      mockPrisma.course.findUnique.mockResolvedValue(null);

      const result = await service.canActivateCourse('u1', 'c1', 'academy-1');

      expect(result).toBe(false);
    });
  });
});
