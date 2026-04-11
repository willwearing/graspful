import { Test, TestingModule } from '@nestjs/testing';
import { AcademyGraphController } from './academy-graph.controller';
import { AcademyImporterService } from './academy-importer.service';
import { CourseReadService } from './course-read.service';
import { JwtOrApiKeyGuard, OrgMembershipGuard } from '@/auth';

const mockGuard = { canActivate: () => true };

describe('AcademyGraphController', () => {
  let controller: AcademyGraphController;
  let mockCourseReads: any;
  let mockAcademyImporter: any;

  beforeEach(async () => {
    mockCourseReads = {
      listAcademies: jest.fn(),
      getAcademy: jest.fn(),
      getAcademyBySlug: jest.fn(),
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
      .overrideGuard(JwtOrApiKeyGuard)
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

  it('resolves an academy by slug within the org', async () => {
    const academy = { id: 'academy-1', slug: 'posthog-tam' };
    mockCourseReads.getAcademyBySlug.mockResolvedValue(academy);

    const orgCtx = {
      orgId: 'org-1',
      userId: 'u1',
      email: 'a@b.com',
      role: 'member',
    };

    await expect(
      controller.getAcademyBySlug('posthog-tam', orgCtx as any),
    ).resolves.toEqual(academy);
    expect(mockCourseReads.getAcademyBySlug).toHaveBeenCalledWith('org-1', 'posthog-tam');
  });
});
