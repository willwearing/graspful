import { CourseManagementService } from './course-management.service';

describe('CourseManagementService', () => {
  let service: CourseManagementService;
  let mockPrisma: any;
  let mockImporter: any;
  let mockReviewService: any;
  let mockCourseYamlExport: any;
  let mockBrandsService: any;
  let mockVercelDomainsService: any;

  beforeEach(() => {
    mockPrisma = {
      course: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
      brand: {
        findFirst: jest.fn(),
      },
    };

    mockImporter = {
      parseCourseYaml: jest.fn(),
      importFromYaml: jest.fn(),
    };

    mockReviewService = {
      review: jest.fn(),
    };

    mockCourseYamlExport = {
      exportCourse: jest.fn(),
    };

    mockBrandsService = {
      findBySlug: jest.fn(),
      create: jest.fn(),
    };

    mockVercelDomainsService = {
      addDomain: jest.fn(),
    };

    service = new CourseManagementService(
      mockPrisma,
      mockImporter,
      mockReviewService,
      mockCourseYamlExport,
      mockBrandsService,
      mockVercelDomainsService,
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
      conceptCount: 1,
      knowledgePointCount: 1,
      problemCount: 1,
      prerequisiteEdgeCount: 0,
      encompassingEdgeCount: 0,
      warnings: [],
    });
    mockPrisma.organization.findUnique
      .mockResolvedValueOnce({ slug: 'org-slug' })
      .mockResolvedValueOnce({ slug: 'org-slug' });
    mockPrisma.brand.findFirst.mockResolvedValue(null);
    mockBrandsService.findBySlug.mockResolvedValue(null);
    mockBrandsService.create.mockResolvedValue({ id: 'brand-1' });
    mockPrisma.brand.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ domain: 'test-course.graspful.ai' });
    mockVercelDomainsService.addDomain.mockResolvedValue({});

    const result = await service.importCourse(
      { orgId: 'org-1', userId: 'user-1', email: 'user@example.com', role: 'admin' } as any,
      { yaml: 'course: {}', publish: true } as any,
    );

    expect(result.published).toBe(true);
    expect(result.url).toBe('https://test-course.graspful.ai/browse/course-1');
    expect(mockBrandsService.create).toHaveBeenCalled();
  });

  it('publishes a course from the exported yaml', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
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
    expect(mockPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: { isPublished: true },
    });
  });
});
