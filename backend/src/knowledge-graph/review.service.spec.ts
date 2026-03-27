import { reviewCourseYaml, type CourseYaml } from '@graspful/shared';
import { ReviewService } from './review.service';

describe('ReviewService', () => {
  it('delegates to the shared quality gate implementation', () => {
    const service = new ReviewService();
    const courseYaml: CourseYaml = {
      course: {
        id: 'test-course',
        name: 'Test Course',
        estimatedHours: 4,
          version: '1.0',
        },
        sections: [],
        concepts: [
        {
          id: 'concept-a',
          name: 'Concept A',
          difficulty: 3,
          estimatedMinutes: 10,
          tags: [],
          prerequisites: [],
          encompassing: [],
          knowledgePoints: [
            {
              id: 'kp-a',
              workedExample: 'Use this example',
              instructionContent: [],
              workedExampleContent: [],
              problems: [
                {
                  id: 'problem-a',
                  type: 'true_false',
                  question: 'Is A true?',
                  correct: 'true',
                },
              ],
            },
          ],
        },
        {
          id: 'concept-b',
          name: 'Concept B',
          difficulty: 4,
          estimatedMinutes: 10,
          tags: [],
          prerequisites: ['concept-a'],
          encompassing: [],
          knowledgePoints: [
            {
              id: 'kp-b',
              instructionContent: [],
              workedExampleContent: [],
              problems: [
                {
                  id: 'problem-b',
                  type: 'true_false',
                  question: 'Is B true?',
                  correct: 'false',
                },
              ],
            },
          ],
        },
      ],
    };

    expect(service.review(courseYaml)).toEqual(reviewCourseYaml(courseYaml));
  });
});
