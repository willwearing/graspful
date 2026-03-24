import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { CourseImporterService } from './course-importer.service';
import { CourseReadService } from './course-read.service';
import { ReviewService } from './review.service';
import { CourseYamlExportService } from './course-yaml-export.service';
import { PrismaService } from '@/prisma/prisma.service';
import { BrandsService } from '@/brands/brands.service';
import { VercelDomainsService } from '@/brands/vercel-domains.service';
import { OrgMembershipGuard, JwtOrApiKeyGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('KnowledgeGraphController', () => {
  let controller: KnowledgeGraphController;
  let mockCourseReads: any;
  let mockImporter: any;
  let mockReviewService: any;
  let mockCourseYamlExport: any;
  let mockPrisma: any;
  let mockBrandsService: any;
  let mockVercelDomainsService: any;

  beforeEach(async () => {
    mockCourseReads = {
      listCourses: jest.fn(),
      getCourseGraph: jest.fn(),
      listConcepts: jest.fn(),
      getConceptDetail: jest.fn(),
      validateCourseGraph: jest.fn(),
      getKnowledgeFrontier: jest.fn(),
    };

    mockImporter = {
      importFromYaml: jest.fn(),
      parseCourseYaml: jest.fn(),
    };

    mockReviewService = {
      review: jest.fn(),
    };

    mockCourseYamlExport = {
      exportCourse: jest.fn(),
    };

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

    mockBrandsService = {
      findBySlug: jest.fn(),
      create: jest.fn(),
    };

    mockVercelDomainsService = {
      addDomain: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeGraphController],
      providers: [
        { provide: CourseReadService, useValue: mockCourseReads },
        { provide: CourseImporterService, useValue: mockImporter },
        { provide: ReviewService, useValue: mockReviewService },
        { provide: CourseYamlExportService, useValue: mockCourseYamlExport },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BrandsService, useValue: mockBrandsService },
        { provide: VercelDomainsService, useValue: mockVercelDomainsService },
      ],
    })
      .overrideGuard(OrgMembershipGuard)
      .useValue(mockGuard)
      .overrideGuard(JwtOrApiKeyGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(KnowledgeGraphController);
  });

  describe('listCourses', () => {
    it('should return courses for an org', async () => {
      const courses = [{ id: 'c1', name: 'Course 1' }];
      mockCourseReads.listCourses.mockResolvedValue(courses);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.listCourses(orgCtx as any);

      expect(result).toEqual(courses);
      expect(mockCourseReads.listCourses).toHaveBeenCalledWith('org-1');
    });
  });

  describe('getCourseGraph', () => {
    it('should return the full graph structure', async () => {
      const course = { id: 'c1', name: 'Course' };
      const sections = [{ id: 's1', courseId: 'c1', sortOrder: 0 }];
      const concepts = [
        { id: 'con1', slug: 'a', name: 'A' },
        { id: 'con2', slug: 'b', name: 'B' },
      ];
      const prereqs = [{ sourceConceptId: 'con1', targetConceptId: 'con2' }];
      const encompassing = [{ sourceConceptId: 'con1', targetConceptId: 'con2', weight: 0.5 }];

      mockCourseReads.getCourseGraph.mockResolvedValue({
        course,
        sections,
        concepts,
        prerequisiteEdges: prereqs,
        encompassingEdges: encompassing,
      });

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.getCourseGraph('c1', orgCtx as any);

      expect(result.course).toEqual(course);
      expect(result.sections).toEqual(sections);
      expect(result.concepts).toEqual(concepts);
      expect(result.prerequisiteEdges).toEqual(prereqs);
      expect(result.encompassingEdges).toEqual(encompassing);
    });
  });

  describe('importCourse', () => {
    beforeEach(() => {
      // Default: no brand exists for org
      mockPrisma.organization.findUnique.mockResolvedValue({ slug: 'test-org' });
      mockPrisma.brand.findFirst.mockResolvedValue(null);
      mockBrandsService.findBySlug.mockResolvedValue(null);
      mockBrandsService.create.mockResolvedValue({ id: 'brand-1' });
      mockVercelDomainsService.addDomain.mockResolvedValue({});
    });

    it('should call the importer with yaml content', async () => {
      const importResult = {
        courseId: 'c1',
        conceptCount: 5,
        knowledgePointCount: 3,
        problemCount: 10,
        prerequisiteEdgeCount: 4,
        encompassingEdgeCount: 2,
        warnings: [],
      };
      mockImporter.importFromYaml.mockResolvedValue(importResult);
      mockImporter.parseCourseYaml.mockReturnValue({ course: { id: 'test', name: 'Test' } });

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const body = {
        yaml: 'course:\n  id: test\n  name: Test',
        replace: true,
        archiveMissing: true,
      };
      const result = await controller.importCourse(body, orgCtx as any);

      expect(result).toEqual(importResult);
      expect(mockImporter.importFromYaml).toHaveBeenCalledWith(body.yaml, 'org-1', {
        replace: true,
        archiveMissing: true,
      });
    });

    it('should run review gate when publish=true', async () => {
      const parsedYaml = { concepts: [], sections: [], course: { id: 'test' } };
      const reviewResult = {
        passed: true,
        score: '10/10',
        failures: [],
        warnings: [],
        stats: { concepts: 0, kps: 0, problems: 0 },
      };
      const importResult = {
        courseId: 'c1',
        conceptCount: 0,
        knowledgePointCount: 0,
        problemCount: 0,
        prerequisiteEdgeCount: 0,
        encompassingEdgeCount: 0,
        warnings: [],
      };

      mockImporter.parseCourseYaml.mockReturnValue(parsedYaml);
      mockReviewService.review.mockReturnValue(reviewResult);
      mockImporter.importFromYaml.mockResolvedValue(importResult);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const body = { yaml: 'course:\n  id: test', publish: true };
      const result = await controller.importCourse(body, orgCtx as any);

      expect(result.review).toEqual(reviewResult);
      expect(mockImporter.importFromYaml).toHaveBeenCalledWith(
        body.yaml,
        'org-1',
        { replace: undefined, archiveMissing: undefined, isPublished: true },
      );
    });
  });

  describe('reviewCourse', () => {
    it('should return review result for yaml', async () => {
      const parsedYaml = { concepts: [], sections: [], course: { id: 'test' } };
      const reviewResult = {
        passed: true,
        score: '10/10',
        failures: [],
        warnings: [],
        stats: { concepts: 0, kps: 0, problems: 0 },
      };

      mockImporter.parseCourseYaml.mockReturnValue(parsedYaml);
      mockReviewService.review.mockReturnValue(reviewResult);

      const result = await controller.reviewCourse({ yaml: 'course:\n  id: test' });

      expect(result).toEqual(reviewResult);
    });
  });

  describe('validateCourseGraph', () => {
    it('should return validation results for a course', async () => {
      mockCourseReads.validateCourseGraph.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.validateCourseGraph('c1', orgCtx as any);

      expect(result.isValid).toBe(true);
    });
  });

  describe('getKnowledgeFrontier', () => {
    it('should return frontier concepts for a user', async () => {
      mockCourseReads.getKnowledgeFrontier.mockResolvedValue({
        courseId: 'c1',
        userId: 'u1',
        frontier: ['con1'],
        totalConcepts: 2,
        masteredCount: 0,
      });

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'member' };
      const result = await controller.getKnowledgeFrontier('c1', orgCtx as any);

      expect(result.frontier).toEqual(['con1']);
    });
  });

  describe('archiveCourse', () => {
    it('should soft-delete a course by setting archivedAt', async () => {
      const now = new Date();
      mockPrisma.course.findFirst.mockResolvedValue({ id: 'c1', archivedAt: null });
      mockPrisma.course.update.mockResolvedValue({ id: 'c1', archivedAt: now });

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.archiveCourse('c1', orgCtx as any);

      expect(result.archivedAt).toEqual(now);
      expect(mockPrisma.course.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { archivedAt: expect.any(Date) },
      });
    });
  });

  describe('exportCourseYaml', () => {
    it('should return YAML string from export service', async () => {
      mockCourseYamlExport.exportCourse.mockResolvedValue('course:\n  id: test');

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.exportCourseYaml('c1', orgCtx as any);

      expect(result).toEqual({ yaml: 'course:\n  id: test' });
      expect(mockCourseYamlExport.exportCourse).toHaveBeenCalledWith('org-1', 'c1');
    });
  });
});
