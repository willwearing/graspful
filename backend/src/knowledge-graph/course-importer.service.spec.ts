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
  const createdStudentConceptStates: any[] = [];
  const createdStudentSectionStates: any[] = [];
  const enrollments: any[] = [];
  const deletedCourses: any[] = [];
  let courseCounter = 0;
  let conceptCounter = 0;
  let sectionCounter = 0;
  let kpCounter = 0;

  const selectFields = (record: any, select?: Record<string, boolean>) => {
    if (!select) {
      return record;
    }

    return Object.fromEntries(
      Object.entries(select)
        .filter(([, enabled]) => enabled)
        .map(([key]) => [key, record[key]]),
    );
  };

  const findCourseById = (courseId: string) =>
    createdCourses.find((course) => course.id === courseId) ?? null;

  const findConceptById = (conceptId: string) =>
    createdConcepts.find((concept) => concept.id === conceptId) ?? null;

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
          update: jest.fn(async (args: any) => {
            const course = findCourseById(args.where.id);
            Object.assign(course, args.data);
            return course;
          }),
          delete: jest.fn(async (args: any) => {
            deletedCourses.push(args.where);
            return {};
          }),
        },
        concept: {
          findMany: jest.fn(async (args: any) => {
            const courseId = args.where.courseId;
            const results = createdConcepts.filter((concept) => concept.courseId === courseId);
            return results.map((concept) => selectFields(concept, args.select));
          }),
          create: jest.fn(async (args: any) => {
            conceptCounter++;
            const concept = {
              id: `concept-uuid-${conceptCounter}`,
              ...args.data,
            };
            createdConcepts.push(concept);
            return concept;
          }),
          update: jest.fn(async (args: any) => {
            const concept = findConceptById(args.where.id);
            Object.assign(concept, args.data);
            return concept;
          }),
          deleteMany: jest.fn(async (args: any) => {
            const ids = new Set(args.where.id.in);
            for (let i = createdConcepts.length - 1; i >= 0; i--) {
              if (ids.has(createdConcepts[i].id)) {
                createdConcepts.splice(i, 1);
              }
            }
            return { count: ids.size };
          }),
        },
        courseSection: {
          findMany: jest.fn(async (args: any) => {
            const courseId = args.where.courseId;
            const results = createdSections.filter((section) => section.courseId === courseId);
            return results.map((section) => selectFields(section, args.select));
          }),
          create: jest.fn(async (args: any) => {
            sectionCounter++;
            const section = {
              id: `section-uuid-${sectionCounter}`,
              ...args.data,
            };
            createdSections.push(section);
            return section;
          }),
          update: jest.fn(async (args: any) => {
            const section = createdSections.find((entry) => entry.id === args.where.id);
            Object.assign(section, args.data);
            return section;
          }),
          deleteMany: jest.fn(async (args: any) => {
            const ids = new Set(args.where.id.in);
            for (let i = createdSections.length - 1; i >= 0; i--) {
              if (ids.has(createdSections[i].id)) {
                createdSections.splice(i, 1);
              }
            }
            return { count: ids.size };
          }),
        },
        knowledgePoint: {
          findMany: jest.fn(async (args: any) => {
            const courseId = args.where.concept.courseId;
            const results = createdKPs.filter((kp) => {
              const concept = findConceptById(kp.conceptId);
              return concept?.courseId === courseId;
            });
            return results.map((kp) => selectFields(kp, args.select));
          }),
          create: jest.fn(async (args: any) => {
            kpCounter++;
            const kp = {
              id: `kp-uuid-${kpCounter}`,
              ...args.data,
            };
            createdKPs.push(kp);
            return kp;
          }),
          update: jest.fn(async (args: any) => {
            const kp = createdKPs.find((entry) => entry.id === args.where.id);
            Object.assign(kp, args.data);
            return kp;
          }),
          deleteMany: jest.fn(async (args: any) => {
            const ids = new Set(args.where.id.in);
            for (let i = createdKPs.length - 1; i >= 0; i--) {
              if (ids.has(createdKPs[i].id)) {
                createdKPs.splice(i, 1);
              }
            }
            return { count: ids.size };
          }),
        },
        problem: {
          deleteMany: jest.fn(async (args: any) => {
            const { knowledgePointId } = args.where;
            for (let i = createdProblems.length - 1; i >= 0; i--) {
              if (createdProblems[i].knowledgePointId === knowledgePointId) {
                createdProblems.splice(i, 1);
              }
            }
            return { count: 0 };
          }),
          create: jest.fn(async (args: any) => {
            const problem = { id: `problem-${createdProblems.length}`, ...args.data };
            createdProblems.push(problem);
            return problem;
          }),
        },
        prerequisiteEdge: {
          deleteMany: jest.fn(async (args: any) => {
            const ids = new Set(
              args.where.OR.flatMap((entry: any) =>
                entry.sourceConceptId?.in ?? entry.targetConceptId?.in ?? [],
              ),
            );
            for (let i = createdPrereqEdges.length - 1; i >= 0; i--) {
              if (
                ids.has(createdPrereqEdges[i].sourceConceptId) ||
                ids.has(createdPrereqEdges[i].targetConceptId)
              ) {
                createdPrereqEdges.splice(i, 1);
              }
            }
            return { count: 0 };
          }),
          create: jest.fn(async (args: any) => {
            createdPrereqEdges.push(args.data);
            return args.data;
          }),
        },
        encompassingEdge: {
          deleteMany: jest.fn(async (args: any) => {
            const ids = new Set(
              args.where.OR.flatMap((entry: any) =>
                entry.sourceConceptId?.in ?? entry.targetConceptId?.in ?? [],
              ),
            );
            for (let i = createdEncompEdges.length - 1; i >= 0; i--) {
              if (
                ids.has(createdEncompEdges[i].sourceConceptId) ||
                ids.has(createdEncompEdges[i].targetConceptId)
              ) {
                createdEncompEdges.splice(i, 1);
              }
            }
            return { count: 0 };
          }),
          create: jest.fn(async (args: any) => {
            createdEncompEdges.push(args.data);
            return args.data;
          }),
        },
        courseEnrollment: {
          findMany: jest.fn(async (args: any) => {
            const results = enrollments.filter((entry) => entry.courseId === args.where.courseId);
            return results.map((entry) => selectFields(entry, args.select));
          }),
        },
        studentConceptState: {
          createMany: jest.fn(async (args: any) => {
            createdStudentConceptStates.push(...args.data);
            return { count: args.data.length };
          }),
        },
        studentSectionState: {
          createMany: jest.fn(async (args: any) => {
            createdStudentSectionStates.push(...args.data);
            return { count: args.data.length };
          }),
        },
      };
      return fn(tx);
    }),
    _created: {
      createdCourses,
      createdSections,
      createdConcepts,
      createdKPs,
      createdProblems,
      createdPrereqEdges,
      createdEncompEdges,
      createdStudentConceptStates,
      createdStudentSectionStates,
      deletedCourses,
      enrollments,
    },
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
    const sourceConcept = mockPrisma._created.createdConcepts.find((c: any) => c.slug === 'concept-a');
    const targetConcept = mockPrisma._created.createdConcepts.find((c: any) => c.slug === 'concept-b');
    expect(mockPrisma._created.createdPrereqEdges).toHaveLength(1);
    expect(mockPrisma._created.createdPrereqEdges[0].sourceConceptId).toBe(sourceConcept.id);
    expect(mockPrisma._created.createdPrereqEdges[0].targetConceptId).toBe(targetConcept.id);
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
    it('should update an existing course in place when reimporting same slug', async () => {
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
      const originalCourseId = result1.courseId;
      const originalConceptId = mockPrisma._created.createdConcepts[0].id;

      // Second import with replace: true should preserve the existing UUID-backed graph.
      const result2 = await service.importFromYaml(yaml, 'org-123', { replace: true });
      expect(result2.courseId).toBe(originalCourseId);
      expect(result2.conceptCount).toBe(1);
      expect(mockPrisma._created.createdConcepts[0].id).toBe(originalConceptId);
      expect(mockPrisma._created.deletedCourses).toHaveLength(0);
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

    it('should seed new concept states for existing enrollments when a new leaf is added', async () => {
      const mockPrisma = createMockPrisma();
      const validationService = new GraphValidationService();
      const service = new CourseImporterService(mockPrisma as any, validationService);

      mockPrisma._created.enrollments.push({
        userId: 'user-1',
        courseId: 'course-uuid-1',
      });

      const baseYaml = `
course:
  id: test-leaf-addition
  name: Test Leaf Addition
  estimatedHours: 5
  version: "1.0"

sections:
  - id: foundations
    name: Foundations

concepts:
  - id: root
    name: Root
    section: foundations
    difficulty: 1
    estimatedMinutes: 5
    knowledgePoints: []
`;

      const updatedYaml = `
course:
  id: test-leaf-addition
  name: Test Leaf Addition
  estimatedHours: 5
  version: "1.1"

sections:
  - id: foundations
    name: Foundations

concepts:
  - id: root
    name: Root
    section: foundations
    difficulty: 1
    estimatedMinutes: 5
    knowledgePoints: []
  - id: new-leaf
    name: New Leaf
    section: foundations
    difficulty: 2
    estimatedMinutes: 10
    prerequisites: [root]
    knowledgePoints: []
`;

      await service.importFromYaml(baseYaml, 'org-123');
      await service.importFromYaml(updatedYaml, 'org-123', { replace: true });

      const newLeafConcept = mockPrisma._created.createdConcepts.find((c: any) => c.slug === 'new-leaf');
      expect(newLeafConcept).toBeDefined();
      expect(mockPrisma._created.createdStudentConceptStates).toContainEqual({
        userId: 'user-1',
        conceptId: newLeafConcept.id,
      });
    });
  });
});
