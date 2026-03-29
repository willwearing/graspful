import { EnrollmentService } from './enrollment.service';
import { NotFoundException } from '@nestjs/common';

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      course: { findFirst: jest.fn() },
      academy: { findFirst: jest.fn() },
      academyEnrollment: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      courseEnrollment: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
      },
      concept: { findMany: jest.fn() },
      courseSection: { findMany: jest.fn() },
      studentConceptState: { createMany: jest.fn() },
      studentSectionState: { createMany: jest.fn() },
      studentCourseState: { createMany: jest.fn() },
      $transaction: jest.fn((fn: any) => fn({ ...mockPrisma })),
    };

    service = new EnrollmentService(mockPrisma);
  });

  describe('enrollStudent', () => {
    const orgId = 'org-1';
    const userId = 'user-1';
    const courseId = 'course-1';

    it('should create enrollment and initial concept states', async () => {
      mockPrisma.course.findFirst.mockResolvedValue({
        id: courseId,
        orgId,
        academyId: 'academy-1',
      });
      mockPrisma.academy.findFirst.mockResolvedValue({
        id: 'academy-1',
        courses: [
          {
            id: courseId,
            sections: [{ id: 'section-1' }, { id: 'section-2' }],
            concepts: [{ id: 'concept-1' }, { id: 'concept-2' }],
          },
        ],
      });
      mockPrisma.academyEnrollment.findUnique.mockResolvedValue(null);
      mockPrisma.academyEnrollment.create.mockResolvedValue({
        id: 'academy-enrollment-1',
        userId,
        academyId: 'academy-1',
      });
      mockPrisma.courseEnrollment.upsert.mockResolvedValue({
        id: 'course-enrollment-1',
        userId,
        courseId,
      });
      mockPrisma.concept.findMany.mockResolvedValue([
        { id: 'concept-1' },
        { id: 'concept-2' },
      ]);
      mockPrisma.courseSection.findMany.mockResolvedValue([
        { id: 'section-1' },
        { id: 'section-2' },
      ]);
      mockPrisma.studentConceptState.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.studentSectionState.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.studentCourseState.createMany.mockResolvedValue({ count: 1 });

      const result = await service.enrollStudent(orgId, userId, courseId);

      expect(result.academyEnrollment.userId).toBe(userId);
      expect(result.academyEnrollment.academyId).toBe('academy-1');
      expect(result.courseEnrollment.courseId).toBe(courseId);
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
      expect(mockPrisma.studentCourseState.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId,
            courseId,
            academyEnrollmentId: 'academy-enrollment-1',
            status: 'active',
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

    it('should return the existing enrollment if already enrolled', async () => {
      mockPrisma.course.findFirst.mockResolvedValue({
        id: courseId,
        orgId,
        academyId: 'academy-1',
      });
      mockPrisma.academy.findFirst.mockResolvedValue({
        id: 'academy-1',
        courses: [
          {
            id: courseId,
            sections: [],
            concepts: [],
          },
        ],
      });
      mockPrisma.academyEnrollment.findUnique.mockResolvedValue({
        id: 'existing',
        userId,
        academyId: 'academy-1',
      });
      mockPrisma.courseEnrollment.upsert.mockResolvedValue({
        id: 'course-enrollment-1',
        userId,
        courseId,
      });
      mockPrisma.concept.findMany.mockResolvedValue([]);
      mockPrisma.courseSection.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.createMany.mockResolvedValue({ count: 0 });
      mockPrisma.studentSectionState.createMany.mockResolvedValue({ count: 0 });
      mockPrisma.studentCourseState.createMany.mockResolvedValue({ count: 1 });

      const result = await service.enrollStudent(orgId, userId, courseId);

      expect(result.academyEnrollment.id).toBe('existing');
      expect(result.courseEnrollment.courseId).toBe(courseId);
    });
  });
});
