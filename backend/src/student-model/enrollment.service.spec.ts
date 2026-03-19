import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentService } from './enrollment.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      course: { findFirst: jest.fn() },
      courseEnrollment: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      concept: { findMany: jest.fn() },
      courseSection: { findMany: jest.fn() },
      studentConceptState: { createMany: jest.fn() },
      studentSectionState: { createMany: jest.fn() },
      $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(EnrollmentService);
  });

  describe('enrollStudent', () => {
    const orgId = 'org-1';
    const userId = 'user-1';
    const courseId = 'course-1';

    it('should create enrollment and initial concept states', async () => {
      mockPrisma.course.findFirst.mockResolvedValue({ id: courseId, orgId });
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'concept-1' },
        { id: 'concept-2' },
      ]);
      mockPrisma.courseSection.findMany.mockResolvedValue([
        { id: 'section-1' },
        { id: 'section-2' },
      ]);
      mockPrisma.courseEnrollment.create.mockResolvedValue({
        id: 'enrollment-1',
        userId,
        courseId,
      });
      mockPrisma.studentConceptState.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.studentSectionState.createMany.mockResolvedValue({ count: 2 });

      const result = await service.enrollStudent(orgId, userId, courseId);

      expect(result.userId).toBe(userId);
      expect(result.courseId).toBe(courseId);
      expect(mockPrisma.studentConceptState.createMany).toHaveBeenCalledWith({
        data: [
          { userId, conceptId: 'concept-1' },
          { userId, conceptId: 'concept-2' },
        ],
        skipDuplicates: true,
      });
      expect(mockPrisma.studentSectionState.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId,
            courseId,
            sectionId: 'section-1',
            status: 'lesson_in_progress',
          },
          {
            userId,
            courseId,
            sectionId: 'section-2',
            status: 'locked',
          },
        ],
        skipDuplicates: true,
      });
    });

    it('should throw NotFoundException if course not found', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null);

      await expect(
        service.enrollStudent(orgId, userId, courseId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if already enrolled', async () => {
      mockPrisma.course.findFirst.mockResolvedValue({ id: courseId, orgId });
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.enrollStudent(orgId, userId, courseId),
      ).rejects.toThrow(ConflictException);
    });
  });
});
