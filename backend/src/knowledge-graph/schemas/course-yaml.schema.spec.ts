import { CourseYamlSchema } from './course-yaml.schema';

describe('CourseYamlSchema', () => {
  it('should validate a minimal valid course', () => {
    const input = {
      course: {
        id: 'test-course',
        name: 'Test Course',
        estimatedHours: 10,
        version: '1.0',
      },
      concepts: [
        {
          id: 'concept-1',
          name: 'First Concept',
          difficulty: 3,
          estimatedMinutes: 15,
          tags: ['tag1'],
          knowledgePoints: [],
        },
      ],
    };
    const result = CourseYamlSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should validate a concept with prerequisites and encompassing edges', () => {
    const input = {
      course: {
        id: 'test-course',
        name: 'Test Course',
        estimatedHours: 10,
        version: '1.0',
      },
      concepts: [
        {
          id: 'concept-a',
          name: 'Concept A',
          difficulty: 2,
          estimatedMinutes: 10,
          tags: [],
          knowledgePoints: [],
        },
        {
          id: 'concept-b',
          name: 'Concept B',
          difficulty: 4,
          estimatedMinutes: 20,
          tags: [],
          prerequisites: ['concept-a'],
          encompassing: [{ concept: 'concept-a', weight: 0.5 }],
          knowledgePoints: [],
        },
      ],
    };
    const result = CourseYamlSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should validate a concept with knowledge points and problems', () => {
    const input = {
      course: {
        id: 'test-course',
        name: 'Test Course',
        estimatedHours: 10,
        version: '1.0',
      },
      concepts: [
        {
          id: 'concept-1',
          name: 'Concept 1',
          difficulty: 3,
          estimatedMinutes: 15,
          tags: ['tag1'],
          knowledgePoints: [
            {
              id: 'kp-1',
              instruction: 'content/instruction.md',
              workedExample: 'content/example.md',
              problems: [
                {
                  id: 'p-1',
                  type: 'multiple_choice',
                  question: 'What is 2+2?',
                  options: ['3', '4', '5', '6'],
                  correct: 1,
                  explanation: 'Basic math.',
                },
              ],
            },
          ],
        },
      ],
    };
    const result = CourseYamlSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject difficulty outside 1-10', () => {
    const input = {
      course: { id: 'c', name: 'C', estimatedHours: 1, version: '1.0' },
      concepts: [
        { id: 'x', name: 'X', difficulty: 11, estimatedMinutes: 5, tags: [], knowledgePoints: [] },
      ],
    };
    const result = CourseYamlSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject encompassing weight outside 0-1', () => {
    const input = {
      course: { id: 'c', name: 'C', estimatedHours: 1, version: '1.0' },
      concepts: [
        {
          id: 'a', name: 'A', difficulty: 3, estimatedMinutes: 5, tags: [],
          encompassing: [{ concept: 'b', weight: 1.5 }],
          knowledgePoints: [],
        },
      ],
    };
    const result = CourseYamlSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject missing course id', () => {
    const input = {
      course: { name: 'C', estimatedHours: 1, version: '1.0' },
      concepts: [],
    };
    const result = CourseYamlSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
