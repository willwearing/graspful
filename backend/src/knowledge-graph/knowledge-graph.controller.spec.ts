import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { CourseImporterService } from './course-importer.service';
import { CourseReadService } from './course-read.service';
import { ReviewService } from './review.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseAuthGuard, OrgMembershipGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('KnowledgeGraphController', () => {
  let controller: KnowledgeGraphController;
  let mockCourseReads: any;
  let mockImporter: any;
  let mockReviewService: any;
  let mockPrisma: any;

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

    mockPrisma = {
      course: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeGraphController],
      providers: [
        { provide: CourseReadService, useValue: mockCourseReads },
        { provide: CourseImporterService, useValue: mockImporter },
        { provide: ReviewService, useValue: mockReviewService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(OrgMembershipGuard)
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
      const result = await controller.getKnowledgeFrontier('c1', 'u1', orgCtx as any);

      expect(result.frontier).toEqual(['con1']);
    });
  });
});
