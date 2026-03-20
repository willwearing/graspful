import { Test, TestingModule } from '@nestjs/testing';
import { AcademyGraphController } from './academy-graph.controller';
import { AcademyImporterService } from './academy-importer.service';
import { CourseReadService } from './course-read.service';
import { OrgMembershipGuard, SupabaseAuthGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('AcademyGraphController', () => {
  let controller: AcademyGraphController;
  let mockCourseReads: any;
  let mockAcademyImporter: any;

  beforeEach(async () => {
    mockCourseReads = {
      listAcademies: jest.fn(),
      getAcademy: jest.fn(),
      getAcademyGraph: jest.fn(),
      validateAcademyGraph: jest.fn(),
      listAcademyCourses: jest.fn(),
      getAcademyKnowledgeFrontier: jest.fn(),
    };

    mockAcademyImporter = {
      importFromManifest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcademyGraphController],
      providers: [
        { provide: CourseReadService, useValue: mockCourseReads },
        { provide: AcademyImporterService, useValue: mockAcademyImporter },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(OrgMembershipGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(AcademyGraphController);
  });

  it('imports an academy manifest through the academy importer', async () => {
    const importResult = {
      academyId: 'academy-1',
      academySlug: 'tam-academy',
      partCount: 1,
      courseCount: 1,
      courseResults: [],
      warnings: [],
    };
    mockAcademyImporter.importFromManifest.mockResolvedValue(importResult);

    const orgCtx = {
      orgId: 'org-1',
      userId: 'u1',
      email: 'a@b.com',
      role: 'admin',
    };
    const body = {
      manifestYaml: 'academy:\n  id: tam-academy',
      courseYamls: { 'courses/data-models.yaml': 'course:\n  id: data-models' },
      replace: true,
    };

    await expect(controller.importAcademy(body, orgCtx as any)).resolves.toEqual(
      importResult,
    );
    expect(mockAcademyImporter.importFromManifest).toHaveBeenCalledWith(
      body.manifestYaml,
      body.courseYamls,
      'org-1',
      { replace: true, archiveMissing: undefined },
    );
  });

  it('validates an academy graph', async () => {
    mockCourseReads.validateAcademyGraph.mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
    });

    const orgCtx = {
      orgId: 'org-1',
      userId: 'u1',
      email: 'a@b.com',
      role: 'admin',
    };

    await expect(
      controller.validateAcademyGraph('academy-1', orgCtx as any),
    ).resolves.toEqual({
      isValid: true,
      errors: [],
      warnings: [],
    });
    expect(mockCourseReads.validateAcademyGraph).toHaveBeenCalledWith(
      'org-1',
      'academy-1',
    );
  });
});
