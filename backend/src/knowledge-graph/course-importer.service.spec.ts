import { CourseImporterService } from './course-importer.service';
import { GraphValidationService } from './graph-validation.service';

// Collect all Prisma calls for assertions
function createMockPrisma() {
  const createdCourses: any[] = [];
  const createdConcepts: any[] = [];
  const createdKPs: any[] = [];
  const createdProblems: any[] = [];
  const createdSections: any[] = [];
  const createdPrereqEdges: any[] = [];
  const createdEncompEdges: any[] = [];
  const deletedCourses: any[] = [];
  let courseCounter = 0;

  return {
    $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        course: {
          create: jest.fn(async (args: any) => {
            courseCounter++;
            const course = { id: `course-uuid-${courseCounter}`, ...args.data };
            createdCourses.push(course);
            return course;
          }),
          findUnique: jest.fn(async (args: any) => {
            const where = args.where.orgId_slug;
            if (!where) return null;
            return createdCourses.find(
              (c) => c.orgId === where.orgId && c.slug === where.slug,
            ) || null;
          }),
          delete: jest.fn(async (args: any) => {
            deletedCourses.push(args.where);
            return {};
          }),
        },
        concept: {
          create: jest.fn(async (args: any) => {
            const concept = { id: `concept-${args.data.slug}`, ...args.data };
            createdConcepts.push(concept);
            return concept;
          }),
        },
        courseSection: {
          create: jest.fn(async (args: any) => {
            const section = { id: `section-${args.data.slug}`, ...args.data };
            createdSections.push(section);
            return section;
          }),
        },
        knowledgePoint: {
          create: jest.fn(async (args: any) => {
            const kp = { id: `kp-${args.data.slug}`, ...args.data };
            createdKPs.push(kp);
            return kp;
          }),
        },
        problem: {
          create: jest.fn(async (args: any) => {
            const problem = { id: `problem-${createdProblems.length}`, ...args.data };
            createdProblems.push(problem);
            return problem;
          }),
        },
        prerequisiteEdge: {
          create: jest.fn(async (args: any) => {
            createdPrereqEdges.push(args.data);
            return args.data;
          }),
        },
        encompassingEdge: {
          create: jest.fn(async (args: any) => {
            createdEncompEdges.push(args.data);
            return args.data;
          }),
        },
      };
      return fn(tx);
    }),
    _created: { createdCourses, createdSections, createdConcepts, createdKPs, createdProblems, createdPrereqEdges, createdEncompEdges, deletedCourses },
  };
}

describe('CourseImporterService', () => {
  it('should import a minimal course with one concept', async () => {
    const mockPrisma = createMockPrisma();
    const validationService = new GraphValidationService();
    const service = new CourseImporterService(mockPrisma as any, validationService);

    const yaml = `
course:
  id: test-course
  name: Test Course
  estimatedHours: 10
  version: "1.0"

concepts:
  - id: concept-a
    name: Concept A
    difficulty: 3
    estimatedMinutes: 15
    tags: [tag1]
    knowledgePoints: []
`;

    const result = await service.importFromYaml(yaml, 'org-123');
    expect(result.courseId).toBe('course-uuid-1');
    expect(mockPrisma._created.createdConcepts).toHaveLength(1);
    expect(mockPrisma._created.createdConcepts[0].slug).toBe('concept-a');
  });

  it('should create prerequisite edges', async () => {
    const mockPrisma = createMockPrisma();
    const validationService = new GraphValidationService();
    const service = new CourseImporterService(mockPrisma as any, validationService);

    const yaml = `
course:
  id: test-course
  name: Test Course
  estimatedHours: 10
  version: "1.0"

concepts:
  - id: concept-a
    name: Concept A
    difficulty: 2
    estimatedMinutes: 10
    tags: []
    knowledgePoints: []
  - id: concept-b
    name: Concept B
    difficulty: 4
    estimatedMinutes: 20
    tags: []
    prerequisites:
      - concept-a
    knowledgePoints: []
`;

    await service.importFromYaml(yaml, 'org-123');
    expect(mockPrisma._created.createdPrereqEdges).toHaveLength(1);
    expect(mockPrisma._created.createdPrereqEdges[0].sourceConceptId).toBe('concept-concept-a');
    expect(mockPrisma._created.createdPrereqEdges[0].targetConceptId).toBe('concept-concept-b');
  });

  it('should create encompassing edges with weights', async () => {
    const mockPrisma = createMockPrisma();
    const validationService = new GraphValidationService();
    const service = new CourseImporterService(mockPrisma as any, validationService);

    const yaml = `
course:
  id: test-course
  name: Test Course
  estimatedHours: 10
  version: "1.0"

concepts:
  - id: concept-a
    name: Concept A
    difficulty: 2
    estimatedMinutes: 10
    tags: []
    knowledgePoints: []
  - id: concept-b
    name: Concept B
    difficulty: 4
    estimatedMinutes: 20
    tags: []
    encompassing:
      - concept: concept-a
        weight: 0.5
    knowledgePoints: []
`;

    await service.importFromYaml(yaml, 'org-123');
    expect(mockPrisma._created.createdEncompEdges).toHaveLength(1);
    expect(mockPrisma._created.createdEncompEdges[0].weight).toBe(0.5);
  });

  it('should create knowledge points and problems', async () => {
    const mockPrisma = createMockPrisma();
    const validationService = new GraphValidationService();
    const service = new CourseImporterService(mockPrisma as any, validationService);

    const yaml = `
course:
  id: test-course
  name: Test Course
  estimatedHours: 10
  version: "1.0"

concepts:
  - id: concept-1
    name: Concept 1
    difficulty: 3
    estimatedMinutes: 15
    tags: []
    knowledgePoints:
      - id: kp-1
        instruction: "content/test.md"
        instructionContent:
          - type: image
            url: "https://example.com/entity.png"
            alt: "Entity diagram"
            caption: "A simple entity diagram"
            width: 640
        problems:
          - id: p-1
            type: multiple_choice
            question: "What is 2+2?"
            options: ["3", "4", "5"]
            correct: 1
            explanation: "Basic math"
`;

    await service.importFromYaml(yaml, 'org-123');
    expect(mockPrisma._created.createdKPs).toHaveLength(1);
    expect(mockPrisma._created.createdKPs[0].instructionContent).toEqual([
      {
        type: 'image',
        url: 'https://example.com/entity.png',
        alt: 'Entity diagram',
        caption: 'A simple entity diagram',
        width: 640,
      },
    ]);
    expect(mockPrisma._created.createdProblems).toHaveLength(1);
    expect(mockPrisma._created.createdProblems[0].type).toBe('multiple_choice');
    expect(mockPrisma._created.createdProblems[0].correctAnswer).toEqual(1);
  });

  it('should persist section exam config on sections', async () => {
    const mockPrisma = createMockPrisma();
    const validationService = new GraphValidationService();
    const service = new CourseImporterService(mockPrisma as any, validationService);

    const yaml = `
course:
  id: test-course
  name: Test Course
  estimatedHours: 10
  version: "1.0"

sections:
  - id: section-a
    name: Section A
    sectionExam:
      enabled: true
      passingScore: 0.8
      questionCount: 2
      blueprint:
        - conceptId: concept-a
          minQuestions: 1
        - conceptId: concept-b
          minQuestions: 1

concepts:
  - id: concept-a
    name: Concept A
    section: section-a
    difficulty: 2
    estimatedMinutes: 10
    tags: []
    knowledgePoints:
      - id: kp-1
        problems:
          - id: p-1
            type: multiple_choice
            question: "A?"
            options: ["A", "B"]
            correct: 0
  - id: concept-b
    name: Concept B
    section: section-a
    difficulty: 2
    estimatedMinutes: 10
    tags: []
    knowledgePoints:
      - id: kp-2
        problems:
          - id: p-2
            type: true_false
            question: "B?"
            correct: "true"
`;

    await service.importFromYaml(yaml, 'org-123');
    expect(mockPrisma._created.createdSections[0].sectionExamConfig).toEqual({
      enabled: true,
      passingScore: 0.8,
      questionCount: 2,
      blueprint: [
        { conceptId: 'concept-a', minQuestions: 1 },
        { conceptId: 'concept-b', minQuestions: 1 },
      ],
    });
  });

  it('should reject invalid YAML structure', async () => {
    const mockPrisma = createMockPrisma();
    const validationService = new GraphValidationService();
    const service = new CourseImporterService(mockPrisma as any, validationService);

    const yaml = `
course:
  name: Missing ID
  estimatedHours: 10
  version: "1.0"
concepts: []
`;

    await expect(service.importFromYaml(yaml, 'org-123')).rejects.toThrow();
  });

  it('should reject a course with cycles', async () => {
    const mockPrisma = createMockPrisma();
    const validationService = new GraphValidationService();
    const service = new CourseImporterService(mockPrisma as any, validationService);

    const yaml = `
course:
  id: cyclic-course
  name: Cyclic Course
  estimatedHours: 5
  version: "1.0"

concepts:
  - id: a
    name: A
    difficulty: 1
    estimatedMinutes: 5
    tags: []
    prerequisites: [b]
    knowledgePoints: []
  - id: b
    name: B
    difficulty: 1
    estimatedMinutes: 5
    tags: []
    prerequisites: [a]
    knowledgePoints: []
`;

    await expect(service.importFromYaml(yaml, 'org-123')).rejects.toThrow(/cycle|invalid/i);
  });

  describe('importFromYaml - idempotent mode', () => {
    it('should replace existing course when reimporting same slug', async () => {
      const mockPrisma = createMockPrisma();
      const validationService = new GraphValidationService();
      const service = new CourseImporterService(mockPrisma as any, validationService);

      const yaml = `
course:
  id: test-idempotent
  name: Test Idempotent Course
  description: A test
  estimatedHours: 10
  version: "1.0"
concepts:
  - id: concept-1
    name: Concept One
    difficulty: 3
    estimatedMinutes: 15
    knowledgePoints:
      - id: kp-1
        instruction: "Learn this"
        problems:
          - id: p-1
            type: multiple_choice
            question: "What is 1+1?"
            options: ["1", "2", "3"]
            correct: 1
            explanation: "Basic math"
`;
      // First import
      const result1 = await service.importFromYaml(yaml, 'org-123');
      expect(result1.courseId).toBeDefined();
      expect(result1.conceptCount).toBe(1);

      // Second import with replace: true should succeed (not throw duplicate key error)
      const result2 = await service.importFromYaml(yaml, 'org-123', { replace: true });
      expect(result2.courseId).toBeDefined();
      expect(result2.conceptCount).toBe(1);
      // Should have deleted the old course
      expect(mockPrisma._created.deletedCourses).toHaveLength(1);
    });

    it('should not delete existing course when replace is false', async () => {
      const mockPrisma = createMockPrisma();
      const validationService = new GraphValidationService();
      const service = new CourseImporterService(mockPrisma as any, validationService);

      const yaml = `
course:
  id: test-no-replace
  name: Test No Replace
  estimatedHours: 5
  version: "1.0"
concepts:
  - id: c1
    name: C1
    difficulty: 1
    estimatedMinutes: 5
    knowledgePoints: []
`;
      await service.importFromYaml(yaml, 'org-123');
      expect(mockPrisma._created.deletedCourses).toHaveLength(0);
    });
  });
});
