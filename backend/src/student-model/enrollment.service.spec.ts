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
      expect(mockPrisma.course.findFirst).toHaveBeenCalledWith({
        where: {
          id: courseId,
          orgId,
          isPublished: true,
          archivedAt: null,
          org: { isActive: true },
          academy: { orgId, archivedAt: null },
        },
        select: { id: true, academyId: true },
      });
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

    it('rejects courses outside the published active catalog before creating any enrollment', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null);

      await expect(
        service.enrollStudent(orgId, userId, courseId),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.course.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: courseId,
            orgId,
            isPublished: true,
            archivedAt: null,
            org: { isActive: true },
            academy: { orgId, archivedAt: null },
          }),
        }),
      );
      expect(mockPrisma.academy.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.courseEnrollment.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.academyEnrollment.create).not.toHaveBeenCalled();
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

  describe('enrollInAcademy', () => {
    const orgId = 'org-1';
    const userId = 'user-1';
    const academyId = 'academy-1';

    it.each([
      ['missing, archived, inactive, or outside the organization', null],
      ['without published active courses', { id: academyId, courses: [] }],
    ])('rejects an academy %s before creating learner state', async (_reason, academy) => {
      mockPrisma.academy.findFirst.mockResolvedValue(academy);

      await expect(service.enrollInAcademy(orgId, userId, academyId))
        .rejects.toThrow(NotFoundException);

      expect(mockPrisma.academy.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: academyId,
            orgId,
            archivedAt: null,
            org: { isActive: true },
          },
          include: expect.objectContaining({
            courses: expect.objectContaining({
              where: { orgId, archivedAt: null, isPublished: true },
            }),
          }),
        }),
      );
      expect(mockPrisma.academyEnrollment.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.academyEnrollment.create).not.toHaveBeenCalled();
      expect(mockPrisma.courseEnrollment.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.studentCourseState.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.studentConceptState.createMany).not.toHaveBeenCalled();
      expect(mockPrisma.studentSectionState.createMany).not.toHaveBeenCalled();
    });

    it('projects only published active courses when an academy also contains drafts and archives', async () => {
      const courses = [
        { id: 'draft', orgId, isPublished: false, archivedAt: null },
        { id: 'published', orgId, isPublished: true, archivedAt: null },
        { id: 'archived', orgId, isPublished: true, archivedAt: new Date() },
        { id: 'another-org', orgId: 'org-2', isPublished: true, archivedAt: null },
        { id: 'published-next', orgId, isPublished: true, archivedAt: null },
      ].map((course) => ({
        ...course,
        sections: [{ id: `${course.id}-section` }],
        concepts: [{ id: `${course.id}-concept` }],
      }));
      mockPrisma.academy.findFirst.mockImplementation(({ include }: any) => {
        const where = include.courses.where;
        return {
          id: academyId,
          courses: courses.filter((course) =>
            Object.entries(where).every(([key, value]) => course[key as keyof typeof course] === value),
          ),
        };
      });
      mockPrisma.academyEnrollment.findUnique.mockResolvedValue(null);
      mockPrisma.academyEnrollment.create.mockResolvedValue({
        id: 'academy-enrollment-1', userId, academyId,
      });

      const result = await service.enrollInAcademy(orgId, userId, academyId);

      expect(result.academyEnrollment.id).toBe('academy-enrollment-1');
      expect(mockPrisma.courseEnrollment.createMany).toHaveBeenCalledWith({
        data: [
          { userId, courseId: 'published' },
          { userId, courseId: 'published-next' },
        ],
        skipDuplicates: true,
      });
      expect(mockPrisma.studentCourseState.createMany).toHaveBeenCalledWith({
        data: [
          { userId, courseId: 'published', academyEnrollmentId: 'academy-enrollment-1', status: 'active' },
          { userId, courseId: 'published-next', academyEnrollmentId: 'academy-enrollment-1', status: 'unlocked' },
        ],
        skipDuplicates: true,
      });
      expect(mockPrisma.studentConceptState.createMany).toHaveBeenCalledWith({
        data: [
          { userId, conceptId: 'published-concept' },
          { userId, conceptId: 'published-next-concept' },
        ],
        skipDuplicates: true,
      });
      expect(mockPrisma.studentSectionState.createMany).toHaveBeenCalledWith({
        data: [
          { userId, courseId: 'published', sectionId: 'published-section', status: 'lesson_in_progress' },
          { userId, courseId: 'published-next', sectionId: 'published-next-section', status: 'lesson_in_progress' },
        ],
        skipDuplicates: true,
      });
    });
  });
});
