import { CourseYamlSchema } from './course-yaml.schema';
import { CourseYamlSchema as SharedCourseYamlSchema } from '../../../../packages/shared/src/schemas/course-yaml.schema';

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
              instructionContent: [
                {
                  type: 'image',
                  url: 'https://example.com/entity-diagram.png',
                  alt: 'Entity diagram',
                  caption: 'A simple entity diagram',
                  width: 640,
                },
              ],
              workedExample: 'content/example.md',
              workedExampleContent: [
                {
                  type: 'link',
                  url: 'https://posthog.com/docs/new-to-posthog/understand-posthog',
                  title: 'PostHog data model overview',
                },
              ],
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

  it('should reject malformed content blocks', () => {
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
              instructionContent: [
                {
                  type: 'image',
                  url: 'https://example.com/entity-diagram.png',
                },
              ],
            },
          ],
        },
      ],
    };
    const result = CourseYamlSchema.safeParse(input);
    expect(result.success).toBe(false);
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

  it('should validate section exam config when blueprint concepts stay inside the section', () => {
    const input = {
      course: { id: 'c', name: 'C', estimatedHours: 1, version: '1.0' },
      sections: [
        {
          id: 'section-a',
          name: 'Section A',
          sectionExam: {
            enabled: true,
            questionCount: 2,
            blueprint: [
              { conceptId: 'a', minQuestions: 1 },
              { conceptId: 'b', minQuestions: 1 },
            ],
          },
        },
      ],
      concepts: [
        {
          id: 'a',
          name: 'A',
          section: 'section-a',
          difficulty: 3,
          estimatedMinutes: 5,
          tags: [],
          knowledgePoints: [{ id: 'kp-a', problems: [{ id: 'p1', type: 'true_false', question: 'Q1', correct: 'true' }] }],
        },
        {
          id: 'b',
          name: 'B',
          section: 'section-a',
          difficulty: 3,
          estimatedMinutes: 5,
          tags: [],
          knowledgePoints: [{ id: 'kp-b', problems: [{ id: 'p2', type: 'true_false', question: 'Q2', correct: 'false' }] }],
        },
      ],
    };
    const result = CourseYamlSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should coerce null/boolean option values to strings (shared schema)', () => {
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
              problems: [
                {
                  id: 'p-1',
                  type: 'multiple_choice',
                  question: 'Which values are falsy?',
                  options: [null, true, false, 'some string'],
                  correct: 0,
                },
              ],
            },
          ],
        },
      ],
    };

    const result = SharedCourseYamlSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      const options = result.data.concepts[0].knowledgePoints[0].problems[0].options;
      expect(options).toEqual(['null', 'true', 'false', 'some string']);
    }
  });

  it('should reject section exam blueprint concepts outside the section', () => {
    const input = {
      course: { id: 'c', name: 'C', estimatedHours: 1, version: '1.0' },
      sections: [
        {
          id: 'section-a',
          name: 'Section A',
          sectionExam: {
            enabled: true,
            questionCount: 2,
            blueprint: [{ conceptId: 'b', minQuestions: 1 }],
          },
        },
      ],
      concepts: [
        {
          id: 'a',
          name: 'A',
          section: 'section-a',
          difficulty: 3,
          estimatedMinutes: 5,
          tags: [],
          knowledgePoints: [{ id: 'kp-a', problems: [{ id: 'p1', type: 'true_false', question: 'Q1', correct: 'true' }] }],
        },
        {
          id: 'b',
          name: 'B',
          section: 'section-b',
          difficulty: 3,
          estimatedMinutes: 5,
          tags: [],
          knowledgePoints: [{ id: 'kp-b', problems: [{ id: 'p2', type: 'true_false', question: 'Q2', correct: 'false' }] }],
        },
      ],
    };
    const result = CourseYamlSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
