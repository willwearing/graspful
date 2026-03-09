import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { CourseImporterService } from './course-importer.service';
import { GraphValidationService } from './graph-validation.service';
import { GraphQueryService } from './graph-query.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseAuthGuard, OrgMembershipGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('KnowledgeGraphController', () => {
  let controller: KnowledgeGraphController;
  let mockPrisma: any;
  let mockImporter: any;

  beforeEach(async () => {
    mockPrisma = {
      course: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      concept: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      prerequisiteEdge: {
        findMany: jest.fn(),
      },
      encompassingEdge: {
        findMany: jest.fn(),
      },
    };

    mockImporter = {
      importFromYaml: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeGraphController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CourseImporterService, useValue: mockImporter },
        GraphValidationService,
        GraphQueryService,
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
      mockPrisma.course.findMany.mockResolvedValue(courses);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.listCourses(orgCtx as any);

      expect(result).toEqual(courses);
      expect(mockPrisma.course.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getCourseGraph', () => {
    it('should return the full graph structure', async () => {
      const course = { id: 'c1', name: 'Course' };
      const concepts = [
        { id: 'con1', slug: 'a', name: 'A' },
        { id: 'con2', slug: 'b', name: 'B' },
      ];
      const prereqs = [{ sourceConceptId: 'con1', targetConceptId: 'con2' }];
      const encompassing = [{ sourceConceptId: 'con1', targetConceptId: 'con2', weight: 0.5 }];

      mockPrisma.course.findFirst.mockResolvedValue(course);
      mockPrisma.concept.findMany.mockResolvedValue(concepts);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue(prereqs);
      mockPrisma.encompassingEdge.findMany.mockResolvedValue(encompassing);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.getCourseGraph('c1', orgCtx as any);

      expect(result.course).toEqual(course);
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
      const body = { yaml: 'course:\n  id: test\n  name: Test' };
      const result = await controller.importCourse(body, orgCtx as any);

      expect(result).toEqual(importResult);
      expect(mockImporter.importFromYaml).toHaveBeenCalledWith(body.yaml, 'org-1');
    });
  });

  describe('validateCourseGraph', () => {
    it('should return validation results for a course', async () => {
      const course = { id: 'c1' };
      const concepts = [
        { id: 'con1', slug: 'a' },
        { id: 'con2', slug: 'b' },
      ];
      const prereqs = [{ sourceConceptId: 'con1', targetConceptId: 'con2' }];
      const encompassing: any[] = [];

      mockPrisma.course.findFirst.mockResolvedValue(course);
      mockPrisma.concept.findMany.mockResolvedValue(concepts);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue(prereqs);
      mockPrisma.encompassingEdge.findMany.mockResolvedValue(encompassing);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.validateCourseGraph('c1', orgCtx as any);

      expect(result.isValid).toBe(true);
    });
  });

  describe('getKnowledgeFrontier', () => {
    it('should return frontier concepts for a user', async () => {
      const course = { id: 'c1' };
      const concepts = [
        { id: 'con1', slug: 'a' },
        { id: 'con2', slug: 'b' },
      ];
      const prereqs = [{ sourceConceptId: 'con1', targetConceptId: 'con2' }];

      mockPrisma.course.findFirst.mockResolvedValue(course);
      mockPrisma.concept.findMany.mockResolvedValue(concepts);
      mockPrisma.prerequisiteEdge.findMany.mockResolvedValue(prereqs);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'member' };
      // No mastery data yet, so frontier = root concepts
      const result = await controller.getKnowledgeFrontier('c1', 'u1', orgCtx as any);

      expect(result.frontier).toEqual(['con1']);
    });
  });
});
