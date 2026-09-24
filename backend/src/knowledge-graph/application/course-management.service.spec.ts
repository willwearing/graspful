import { CourseManagementService } from './course-management.service';
import { dump } from 'js-yaml';
import { ReviewService } from '../review.service';

describe('CourseManagementService', () => {
  let service: CourseManagementService;
  let mockPrisma: any;
  let mockImporter: any;
  let mockAcademyImporter: any;
  let mockReviewService: any;
  let mockCourseYamlExport: any;
  let mockBrandsService: any;

  beforeEach(() => {
    mockPrisma = {
      course: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      organization: {
        findUnique: jest.fn(),
      },
      brand: {
        findFirst: jest.fn(),
      },
    };

    mockImporter = {
      parseCourseYaml: jest.fn().mockReturnValue({ course: { id: 'test-course', name: 'Test Course' } }),
      importFromYaml: jest.fn(),
    };

    mockAcademyImporter = {
      parseManifest: jest.fn().mockReturnValue({
        academy: { id: 'test-academy', name: 'Test Academy', description: 'Academy description' },
      }),
      importFromManifest: jest.fn(),
    };

    mockReviewService = {
      review: jest.fn(),
    };

    mockCourseYamlExport = {
      exportCourse: jest.fn(),
    };

    mockBrandsService = {
      ensureDefaultForOrg: jest.fn().mockResolvedValue(undefined),
    };

    service = new CourseManagementService(
      mockPrisma,
      mockImporter,
      mockReviewService,
      mockCourseYamlExport,
      mockBrandsService,
      mockAcademyImporter,
    );
  });

  it('imports a course, provisions a brand, and returns the publication result', async () => {
    mockImporter.parseCourseYaml.mockReturnValue({
      course: { id: 'test-course', name: 'Test Course', description: 'Desc' },
    });
    mockReviewService.review.mockReturnValue({
      passed: true,
      score: '10/10',
      failures: [],
      warnings: [],
      stats: { concepts: 0, kps: 0, problems: 0 },
    });
    mockImporter.importFromYaml.mockResolvedValue({
      courseId: 'course-1',
      published: true,
      conceptCount: 1,
      knowledgePointCount: 1,
      problemCount: 1,
      prerequisiteEdgeCount: 0,
      encompassingEdgeCount: 0,
      warnings: [],
    });
    mockPrisma.organization.findUnique.mockResolvedValue({ slug: 'org-slug' });
    mockPrisma.brand.findFirst.mockResolvedValue({ domain: 'test-course.graspful.ai' });

    const result = await service.importCourse(
      { orgId: 'org-1', userId: 'user-1', email: 'user@example.com', role: 'admin' } as any,
      { yaml: 'course: {}', publish: true } as any,
    );

    expect(result.published).toBe(true);
    expect(result.url).toBe('https://test-course.graspful.ai/browse/course-1');
    expect(mockBrandsService.ensureDefaultForOrg).toHaveBeenCalledWith(
      { orgId: 'org-1', userId: 'user-1', email: 'user@example.com', role: 'admin' },
      { id: 'test-course', name: 'Test Course', description: 'Desc' },
    );
    expect(mockImporter.importFromYaml.mock.invocationCallOrder[0])
      .toBeLessThan(mockBrandsService.ensureDefaultForOrg.mock.invocationCallOrder[0]);
  });

  describe('academy import website setup', () => {
    const org = { orgId: 'org-1', userId: 'user-1', email: 'user@example.com', role: 'admin' } as any;
    const body = {
      manifestYaml: 'academy: {}',
      courseYamls: { 'course.yaml': 'course: {}' },
      replace: true,
      archiveMissing: true,
    };
    const importResult = {
      academyId: 'academy-1', academySlug: 'test-academy', courseCount: 1,
      partCount: 0, courseResults: [{ courseId: 'course-1' }], warnings: [],
    };

    beforeEach(() => {
      mockAcademyImporter.importFromManifest.mockResolvedValue(importResult);
      mockPrisma.organization.findUnique.mockResolvedValue({ slug: 'org-slug' });
      mockPrisma.brand.findFirst.mockResolvedValue(null);
    });

    it('creates one website from academy metadata after a fresh org imports successfully', async () => {
      await expect(service.importAcademy(org, body)).resolves.toEqual(importResult);

      expect(mockAcademyImporter.importFromManifest).toHaveBeenCalledWith(
        body.manifestYaml, body.courseYamls, org.orgId,
        { replace: true, archiveMissing: true },
      );
      expect(mockBrandsService.ensureDefaultForOrg).toHaveBeenCalledTimes(1);
      expect(mockBrandsService.ensureDefaultForOrg).toHaveBeenCalledWith(org, {
        id: 'test-academy', name: 'Test Academy', description: 'Academy description',
      });
      expect(mockAcademyImporter.importFromManifest.mock.invocationCallOrder[0])
        .toBeLessThan(mockBrandsService.ensureDefaultForOrg.mock.invocationCallOrder[0]);
    });

    it('creates no website when academy validation or import fails', async () => {
      mockAcademyImporter.importFromManifest.mockRejectedValue(new Error('Invalid academy graph'));

      await expect(service.importAcademy(org, body)).rejects.toThrow('Invalid academy graph');

      expect(mockPrisma.brand.findFirst).not.toHaveBeenCalled();
      expect(mockBrandsService.ensureDefaultForOrg).not.toHaveBeenCalled();
    });
  });

  it('does not provision a website when course import fails', async () => {
    mockImporter.importFromYaml.mockRejectedValue(new Error('Invalid course graph'));

    await expect(service.importCourse(
      { orgId: 'org-1', userId: 'user-1', email: 'user@example.com', role: 'admin' },
      { yaml: 'course: {}' },
    )).rejects.toThrow('Invalid course graph');

    expect(mockBrandsService.ensureDefaultForOrg).not.toHaveBeenCalled();
  });

  it('publishes a course from the exported yaml', async () => {
    const updatedAt = new Date('2026-09-08T10:00:00Z');
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-1', updatedAt });
    mockCourseYamlExport.exportCourse.mockResolvedValue('course:\n  id: exported');
    mockImporter.parseCourseYaml.mockReturnValue({
      course: { id: 'exported', name: 'Exported Course' },
    });
    mockReviewService.review.mockReturnValue({
      passed: true,
      score: '10/10',
      failures: [],
      warnings: [],
      stats: { concepts: 1, kps: 0, problems: 0 },
    });
    mockPrisma.organization.findUnique.mockResolvedValue({ slug: 'org-slug' });
    mockPrisma.brand.findFirst.mockResolvedValue({ domain: 'org-slug.graspful.ai' });

    const result = await service.publishCourse('org-1', 'course-1');

    expect(result.published).toBe(true);
    expect(mockCourseYamlExport.exportCourse).toHaveBeenCalledWith('org-1', 'course-1');
    expect(mockPrisma.course.updateMany).toHaveBeenCalledWith({
      where: { id: 'course-1', orgId: 'org-1', archivedAt: null, updatedAt },
      data: { isPublished: true },
    });
  });

  it('returns the persisted published state when replacing a live course without a publish flag', async () => {
    mockImporter.importFromYaml.mockResolvedValue({ courseId: 'course-1', published: true });
    mockPrisma.organization.findUnique.mockResolvedValue(null);

    const result = await service.importCourse(
      { orgId: 'org-1', userId: 'user-1', email: 'user@example.com', role: 'admin' } as any,
      { yaml: 'course: {}', replace: true } as any,
    );

    expect(result.published).toBe(true);
    expect(mockImporter.importFromYaml).toHaveBeenCalledWith('course: {}', 'org-1', {
      replace: true, archiveMissing: undefined,
    });
  });

  it('rejects publication when a concurrent edit changes the reviewed revision', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-1', updatedAt: new Date('2026-09-08T10:00:00Z') });
    mockCourseYamlExport.exportCourse.mockResolvedValue('course: {}');
    mockReviewService.review.mockReturnValue({ passed: true });
    mockPrisma.course.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.publishCourse('org-1', 'course-1')).rejects.toThrow('course changed during review');
    expect(mockPrisma.course.update).not.toHaveBeenCalled();
  });

  it('withdraws legacy published content when its publication review fails', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-1', isPublished: true, updatedAt: new Date('2026-09-08T10:00:00Z') });
    mockCourseYamlExport.exportCourse.mockResolvedValue('course: {}');
    mockReviewService.review.mockReturnValue({ passed: false, failures: [{ check: 'publication_readiness', passed: false }] });
    mockPrisma.organization.findUnique.mockResolvedValue(null);

    const result = await service.publishCourse('org-1', 'course-1');

    expect(result.published).toBe(false);
    expect(mockPrisma.course.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { isPublished: false } }));
  });

  it('withdraws a legacy published course whose stored answer fails schema validation', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-1', isPublished: true, updatedAt: new Date('2026-09-08T10:00:00Z') });
    mockCourseYamlExport.exportCourse.mockResolvedValue(dump({
      course: { id: 'legacy', name: 'Legacy course', estimatedHours: 1, version: '1' },
      concepts: [{
        id: 'concept', name: 'Concept', difficulty: 1, estimatedMinutes: 5,
        knowledgePoints: [{ id: 'kp', problems: [{
          id: 'question', type: 'multiple_choice', question: 'Which answer?', options: ['One', 'Two'], correct: 999,
        }] }],
      }],
    }));
    mockReviewService.review.mockImplementation((raw: unknown) => new ReviewService().review(raw));
    mockPrisma.organization.findUnique.mockResolvedValue(null);

    const result = await service.publishCourse('org-1', 'course-1');

    expect(result.published).toBe(false);
    expect(result.review.failures[0].check).toBe('yaml_parses');
    expect(result.review.failures[0].details).toContain('correct');
    expect(mockPrisma.course.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { isPublished: false } }));
  });
});
