import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { CourseReadService } from './course-read.service';
import { CourseYamlExportService } from './course-yaml-export.service';
import { CourseManagementService } from './application/course-management.service';
import { OrgMembershipGuard, JwtOrApiKeyGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('KnowledgeGraphController', () => {
  let controller: KnowledgeGraphController;
  let mockCourseReads: any;
  let mockCourseYamlExport: any;
  let mockCourseManagement: any;

  beforeEach(async () => {
    mockCourseReads = {
      listCourses: jest.fn(),
      getCourseGraph: jest.fn(),
      listConcepts: jest.fn(),
      getConceptDetail: jest.fn(),
      validateCourseGraph: jest.fn(),
      getKnowledgeFrontier: jest.fn(),
    };

    mockCourseYamlExport = {
      exportCourse: jest.fn(),
    };

    mockCourseManagement = {
      archiveCourse: jest.fn(),
      importCourse: jest.fn(),
      publishCourse: jest.fn(),
      reviewCourseYaml: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeGraphController],
      providers: [
        { provide: CourseReadService, useValue: mockCourseReads },
        { provide: CourseYamlExportService, useValue: mockCourseYamlExport },
        { provide: CourseManagementService, useValue: mockCourseManagement },
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
    it('returns courses for an org', async () => {
      const courses = [{ id: 'c1', name: 'Course 1' }];
      mockCourseReads.listCourses.mockResolvedValue(courses);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.listCourses(orgCtx as any);

      expect(result).toEqual(courses);
      expect(mockCourseReads.listCourses).toHaveBeenCalledWith('org-1');
    });
  });

  describe('getCourseGraph', () => {
    it('returns the full graph structure', async () => {
      const graph = {
        course: { id: 'c1', name: 'Course' },
        sections: [{ id: 's1' }],
        concepts: [{ id: 'con1' }],
        prerequisiteEdges: [],
        encompassingEdges: [],
      };
      mockCourseReads.getCourseGraph.mockResolvedValue(graph);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.getCourseGraph('c1', orgCtx as any);

      expect(result).toEqual(graph);
    });
  });

  describe('importCourse', () => {
    it('delegates import orchestration to the application service', async () => {
      const response = { courseId: 'c1', published: false, url: 'https://example.com', warnings: [] };
      mockCourseManagement.importCourse.mockResolvedValue(response);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const body = { yaml: 'course:\n  id: test', replace: true, archiveMissing: true };
      const result = await controller.importCourse(body as any, orgCtx as any);

      expect(result).toEqual(response);
      expect(mockCourseManagement.importCourse).toHaveBeenCalledWith(orgCtx, body);
    });
  });

  describe('reviewCourse', () => {
    it('delegates review to the application service', async () => {
      const reviewResult = {
        passed: true,
        score: '10/10',
        failures: [],
        warnings: [],
        stats: { concepts: 0, kps: 0, problems: 0 },
      };
      mockCourseManagement.reviewCourseYaml.mockResolvedValue(reviewResult);

      const result = await controller.reviewCourse({ yaml: 'course:\n  id: test' } as any);

      expect(result).toEqual(reviewResult);
    });
  });

  describe('archiveCourse', () => {
    it('delegates archive to the application service', async () => {
      mockCourseManagement.archiveCourse.mockResolvedValue({ id: 'c1', archivedAt: new Date() });

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      await controller.archiveCourse('c1', orgCtx as any);

      expect(mockCourseManagement.archiveCourse).toHaveBeenCalledWith('org-1', 'c1');
    });
  });

  describe('publishCourse', () => {
    it('delegates publish to the application service', async () => {
      const reviewResult = {
        passed: true,
        score: '10/10',
        failures: [],
        warnings: [],
        stats: { concepts: 1, kps: 0, problems: 0 },
      };
      const response = {
        courseId: 'c1',
        published: true,
        url: 'https://test.graspful.ai/browse/c1',
        review: reviewResult,
      };
      mockCourseManagement.publishCourse.mockResolvedValue(response);

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.publishCourse('c1', orgCtx as any);

      expect(result).toEqual(response);
    });
  });

  describe('validateCourseGraph', () => {
    it('returns validation results for a course', async () => {
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
    it('returns frontier concepts for a user', async () => {
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

  describe('exportCourseYaml', () => {
    it('returns YAML string from export service', async () => {
      mockCourseYamlExport.exportCourse.mockResolvedValue('course:\n  id: test');

      const orgCtx = { orgId: 'org-1', userId: 'u1', email: 'a@b.com', role: 'admin' };
      const result = await controller.exportCourseYaml('c1', orgCtx as any);

      expect(result).toEqual({ yaml: 'course:\n  id: test' });
      expect(mockCourseYamlExport.exportCourse).toHaveBeenCalledWith('org-1', 'c1');
    });
  });
});
