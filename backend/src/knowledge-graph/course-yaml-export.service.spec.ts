import { NotFoundException } from '@nestjs/common';
import { CourseYamlExportService } from './course-yaml-export.service';
import * as yaml from 'js-yaml';
import { runQualityGate } from '@graspful/shared';

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
                authoredId: 'problem-1',
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
    expect(parsed.concepts[0].knowledgePoints[0].problems[0].id).toBe('problem-1');
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

  function authoredLegacyConcept(estimatedMinutes: number | null) {
    return {
      id: 'concept-1', slug: 'fractions', name: 'Adding fractions',
      sectionId: null, difficulty: 2, estimatedMinutes, tags: [], sourceReference: null,
      knowledgePoints: [{
        slug: 'addition',
        instructionText: 'To add fractions with equal denominators, add their numerators and keep the denominator unchanged.',
        workedExampleText: 'For the fractions 1/5 plus 2/5, add the numerators 1 and 2 to get 3. The sum is 3/5.',
        instructionContent: null, workedExampleContent: null,
        problems: [
          { authoredId: 'sum-one', type: 'multiple_choice', questionText: 'What is the sum of the fractions 1/5 and 2/5?', options: ['3/5', '3/10'], correctAnswer: 0, difficulty: 1 },
          { authoredId: 'sum-two', type: 'multiple_choice', questionText: 'What is the denominator when adding the fractions 2/7 and 3/7?', options: ['7', '14'], correctAnswer: 0, difficulty: 2 },
          { authoredId: 'sum-three', type: 'multiple_choice', questionText: 'Which fractions addition changes only the numerator?', options: ['1/3 + 1/3 = 2/3', '1/3 + 1/3 = 2/6'], correctAnswer: 0, difficulty: 3 },
        ],
      }],
    };
  }

  function legacyCourse(estimatedHours: number | null, estimatedMinutes: number | null) {
    mockPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1', slug: 'legacy-fractions', name: 'Legacy fractions',
      description: null, version: '1', estimatedHours,
    });
    mockPrisma.courseSection.findMany.mockResolvedValue([]);
    mockPrisma.concept.findMany.mockResolvedValue([authoredLegacyConcept(estimatedMinutes)]);
    mockPrisma.prerequisiteEdge.findMany.mockResolvedValue([]);
    mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);
  }

  it('derives missing legacy course hours from authored active-concept estimates', async () => {
    legacyCourse(null, 15);

    const parsed = yaml.load(await service.exportCourse('org-1', 'course-1')) as any;

    expect(parsed.course.estimatedHours).toBe(0.25);
    expect(runQualityGate(parsed).passed).toBe(true);
    expect(runQualityGate(parsed).score).toBe('10/10');
  });

  it('preserves an explicit course total instead of replacing it with the concept sum', async () => {
    legacyCourse(8, 15);
    const parsed = yaml.load(await service.exportCourse('org-1', 'course-1')) as any;
    expect(parsed.course.estimatedHours).toBe(8);
  });

  it('does not invent a duration when legacy concept estimates are also missing', async () => {
    legacyCourse(null, null);
    const parsed = yaml.load(await service.exportCourse('org-1', 'course-1')) as any;
    expect(parsed.course).not.toHaveProperty('estimatedHours');
    expect(parsed.concepts[0]).not.toHaveProperty('estimatedMinutes');
    expect(runQualityGate(parsed).passed).toBe(false);
  });

  it('preserves invalid explicit estimates so validation can report them', async () => {
    legacyCourse(0, 0);
    const parsed = yaml.load(await service.exportCourse('org-1', 'course-1')) as any;
    expect(parsed.course.estimatedHours).toBe(0);
    expect(parsed.concepts[0].estimatedMinutes).toBe(0);
    expect(runQualityGate(parsed).passed).toBe(false);
  });

  it('keeps teaching readiness failures after deriving a legacy duration', async () => {
    legacyCourse(null, 15);
    const unfinished = authoredLegacyConcept(15);
    unfinished.knowledgePoints[0].instructionText = 'TODO: Write the fractions lesson';
    mockPrisma.concept.findMany.mockResolvedValue([unfinished]);

    const parsed = yaml.load(await service.exportCourse('org-1', 'course-1')) as any;
    const review = runQualityGate(parsed);
    expect(parsed.course.estimatedHours).toBe(0.25);
    expect(review.passed).toBe(false);
    expect(review.failures.some((failure) => failure.check === 'publication_readiness')).toBe(true);
  });
});
