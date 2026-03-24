import { NotFoundException } from '@nestjs/common';
import { CourseYamlExportService } from './course-yaml-export.service';
import * as yaml from 'js-yaml';

describe('CourseYamlExportService', () => {
  let service: CourseYamlExportService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      course: {
        findFirst: jest.fn(),
      },
      courseSection: {
        findMany: jest.fn(),
      },
      concept: {
        findMany: jest.fn(),
      },
      prerequisiteEdge: {
        findMany: jest.fn(),
      },
      encompassingEdge: {
        findMany: jest.fn(),
      },
    };

    service = new CourseYamlExportService(mockPrisma);
  });

  it('throws NotFoundException when course not found', async () => {
    mockPrisma.course.findFirst.mockResolvedValue(null);

    await expect(service.exportCourse('org-1', 'bad-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('exports a course with sections and concepts as YAML', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({
      id: 'c1',
      slug: 'intro-algebra',
      name: 'Intro to Algebra',
      description: 'Beginner algebra',
      version: '1.0',
      estimatedHours: 10,
    });

    mockPrisma.courseSection.findMany.mockResolvedValue([
      { id: 's1', slug: 'basics', name: 'Basics', description: null, sectionExamConfig: null },
    ]);

    mockPrisma.concept.findMany.mockResolvedValue([
      {
        id: 'con1',
        slug: 'variables',
        name: 'Variables',
        sectionId: 's1',
        difficulty: 3,
        estimatedMinutes: 15,
        tags: ['algebra'],
        sourceReference: null,
        knowledgePoints: [
          {
            slug: 'kp1',
            instructionText: 'Learn about variables',
            instructionContent: [],
            workedExampleText: null,
            workedExampleContent: [],
            problems: [
              {
                id: 'p1',
                type: 'multiple_choice',
                questionText: 'What is x?',
                options: ['1', '2', '3'],
                correctAnswer: 0,
                explanation: 'x = 1',
                difficulty: 3,
              },
            ],
          },
        ],
      },
    ]);

    mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);
    mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);

    const result = await service.exportCourse('org-1', 'c1');
    const parsed = yaml.load(result) as any;

    expect(parsed.course.id).toBe('intro-algebra');
    expect(parsed.course.name).toBe('Intro to Algebra');
    expect(parsed.course.version).toBe('1.0');
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0].id).toBe('basics');
    expect(parsed.concepts).toHaveLength(1);
    expect(parsed.concepts[0].id).toBe('variables');
    expect(parsed.concepts[0].section).toBe('basics');
    expect(parsed.concepts[0].difficulty).toBe(3);
    expect(parsed.concepts[0].knowledgePoints).toHaveLength(1);
    expect(parsed.concepts[0].knowledgePoints[0].problems).toHaveLength(1);
  });

  it('exports prerequisite and encompassing edges', async () => {
    mockPrisma.course.findFirst.mockResolvedValue({
      id: 'c1',
      slug: 'test',
      name: 'Test',
      description: null,
      version: '1.0',
      estimatedHours: 5,
    });

    mockPrisma.courseSection.findMany.mockResolvedValue([]);

    mockPrisma.concept.findMany.mockResolvedValue([
      {
        id: 'con1',
        slug: 'a',
        name: 'A',
        sectionId: null,
        difficulty: 5,
        estimatedMinutes: 10,
        tags: [],
        sourceReference: null,
        knowledgePoints: [],
      },
      {
        id: 'con2',
        slug: 'b',
        name: 'B',
        sectionId: null,
        difficulty: 5,
        estimatedMinutes: 10,
        tags: [],
        sourceReference: null,
        knowledgePoints: [],
      },
    ]);

    mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([
      { sourceConceptId: 'con1', targetConceptId: 'con2' },
    ]);

    mockPrisma.encompassingEdge.findMany.mockResolvedValue([
      { sourceConceptId: 'con1', targetConceptId: 'con2', weight: 0.7 },
    ]);

    const result = await service.exportCourse('org-1', 'c1');
    const parsed = yaml.load(result) as any;

    // con2 has con1 (slug 'a') as prerequisite
    expect(parsed.concepts[1].prerequisites).toEqual(['a']);

    // con1 encompasses con2 (slug 'b') with weight 0.7
    expect(parsed.concepts[0].encompassing).toEqual([
      { concept: 'b', weight: 0.7 },
    ]);
  });
});
