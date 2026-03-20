import { BadRequestException } from '@nestjs/common';
import { AcademyImporterService } from './academy-importer.service';

describe('AcademyImporterService', () => {
  let service: AcademyImporterService;
  let mockPrisma: any;
  let mockCourseImporter: any;
  let mockGraphValidation: any;

  beforeEach(() => {
    mockPrisma = {
      academy: {
        upsert: jest.fn().mockResolvedValue({
          id: 'academy-1',
          slug: 'tam-academy',
        }),
      },
      academyPart: {
        upsert: jest.fn(async (args: any) => ({
          id: `part-${args.where.academyId_slug.slug}`,
          slug: args.where.academyId_slug.slug,
        })),
      },
      $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    };

    mockCourseImporter = {
      parseCourseYaml: jest.fn((yaml: string) => {
        const courseIdMatch = yaml.match(/id:\s*([a-z-]+)/);
        const courseId = courseIdMatch?.[1] ?? 'unknown-course';

        if (courseId === 'data-models') {
          return {
            course: {
              id: 'data-models',
              name: 'Data Models',
              estimatedHours: 2,
              version: '1.0',
            },
            sections: [],
            concepts: [
              {
                id: 'entities',
                name: 'Entities',
                difficulty: 1,
                estimatedMinutes: 5,
                tags: [],
                prerequisites: [],
                encompassing: [],
                knowledgePoints: [],
              },
            ],
          };
        }

        return {
          course: {
            id: 'pipelines',
            name: 'Pipelines',
            estimatedHours: 2,
            version: '1.0',
          },
          sections: [],
          concepts: [
            {
              id: 'etl',
              name: 'ETL',
              difficulty: 1,
              estimatedMinutes: 5,
              tags: [],
              prerequisites: ['data-models:entities'],
              encompassing: [],
              knowledgePoints: [],
            },
          ],
        };
      }),
      syncCourseStructure: jest.fn(async (_tx: any, data: any) => ({
        courseId: `${data.course.id}-id`,
        courseSlug: data.course.id,
        sectionCount: 0,
        conceptCount: data.concepts.length,
        knowledgePointCount: 0,
        problemCount: 0,
        warnings: [],
        conceptSlugToId: new Map(
          data.concepts.map((concept: any) => [
            concept.id,
            `${data.course.id}:${concept.id}:id`,
          ]),
        ),
        edgeOwnerConceptIds: data.concepts.map(
          (concept: any) => `${data.course.id}:${concept.id}:id`,
        ),
      })),
      syncCourseEdges: jest.fn().mockResolvedValue({
        prerequisiteEdgeCount: 1,
        encompassingEdgeCount: 0,
      }),
      buildImportResult: jest.fn((structure: any, edgeCounts: any) => ({
        courseId: structure.courseId,
        sectionCount: structure.sectionCount,
        conceptCount: structure.conceptCount,
        knowledgePointCount: structure.knowledgePointCount,
        problemCount: structure.problemCount,
        prerequisiteEdgeCount: edgeCounts.prerequisiteEdgeCount,
        encompassingEdgeCount: edgeCounts.encompassingEdgeCount,
        warnings: structure.warnings,
      })),
    };

    mockGraphValidation = {
      validateAcademy: jest.fn().mockReturnValue({
        isValid: true,
        errors: [],
        warnings: ['academy warning'],
      }),
    };

    service = new AcademyImporterService(
      mockPrisma,
      mockCourseImporter,
      mockGraphValidation,
    );
  });

  it('imports a manifest and resolves cross-course refs after syncing all course structures', async () => {
    const manifestYaml = `
academy:
  id: tam-academy
  name: PostHog TAM Academy
  version: "1.0"
parts:
  - id: foundations
    name: Foundations
courses:
  - id: data-models
    name: Data Models
    part: foundations
    file: courses/data-models.yaml
  - id: pipelines
    name: Data Pipelines
    file: courses/pipelines.yaml
`;

    const result = await service.importFromManifest(
      manifestYaml,
      {
        'courses/data-models.yaml': `
course:
  id: data-models
  name: Data Models
  estimatedHours: 2
  version: "1.0"
concepts: []
`,
        'courses/pipelines.yaml': `
course:
  id: pipelines
  name: Data Pipelines
  estimatedHours: 2
  version: "1.0"
concepts: []
`,
      },
      'org-1',
      { replace: true },
    );

    expect(result.academySlug).toBe('tam-academy');
    expect(result.partCount).toBe(1);
    expect(result.courseCount).toBe(2);
    expect(result.warnings).toContain('academy warning');
    expect(mockPrisma.academy.upsert).toHaveBeenCalled();
    expect(mockPrisma.academyPart.upsert).toHaveBeenCalledTimes(1);
    expect(mockCourseImporter.parseCourseYaml).toHaveBeenCalledTimes(2);
    expect(mockCourseImporter.syncCourseStructure).toHaveBeenCalledTimes(2);
    expect(mockCourseImporter.syncCourseEdges).toHaveBeenCalledTimes(2);

    const firstResolver = mockCourseImporter.syncCourseEdges.mock.calls[0][3];
    expect(firstResolver.get('data-models:entities')).toBe(
      'data-models:entities:id',
    );
    expect(firstResolver.get('pipelines:etl')).toBe('pipelines:etl:id');
  });

  it('rejects a manifest that references a missing course file', async () => {
    const manifestYaml = `
academy:
  id: tam-academy
  name: PostHog TAM Academy
  version: "1.0"
courses:
  - id: data-models
    name: Data Models
    file: courses/data-models.yaml
`;

    await expect(
      service.importFromManifest(manifestYaml, {}, 'org-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects academy imports with unresolved cross-course refs before persistence', async () => {
    mockCourseImporter.parseCourseYaml.mockReturnValueOnce({
      course: {
        id: 'data-models',
        name: 'Data Models',
        estimatedHours: 2,
        version: '1.0',
      },
      sections: [],
      concepts: [
        {
          id: 'entities',
          name: 'Entities',
          difficulty: 1,
          estimatedMinutes: 5,
          tags: [],
          prerequisites: ['pipelines:missing'],
          encompassing: [],
          knowledgePoints: [],
        },
      ],
    });

    const manifestYaml = `
academy:
  id: tam-academy
  name: PostHog TAM Academy
  version: "1.0"
courses:
  - id: data-models
    name: Data Models
    file: courses/data-models.yaml
`;

    await expect(
      service.importFromManifest(
        manifestYaml,
        {
          'courses/data-models.yaml': `
course:
  id: data-models
  name: Data Models
  estimatedHours: 2
  version: "1.0"
concepts: []
`,
        },
        'org-1',
      ),
    ).rejects.toThrow(/unknown prerequisite/i);

    expect(mockCourseImporter.syncCourseStructure).not.toHaveBeenCalled();
  });
});
