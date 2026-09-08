import * as yaml from 'js-yaml';
import { scaffoldCourseObject } from '@graspful/shared';
import { PrismaService } from '@/prisma/prisma.service';
import { evaluateAnswer } from '@/assessment/answer-evaluator';
import { serializeProblemForClient } from '@/shared/utils/problem-presentation';
import { CourseImporterService } from './course-importer.service';
import { GraphValidationService } from './graph-validation.service';
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

// Exercise the import representation against the actual learner presentation
// and evaluator, so a schema-valid answer is also reachable by a learner.
describe('Imported answer contracts', () => {
  const importer = new CourseImporterService({} as PrismaService, new GraphValidationService());
  const rawCourse = (problem: Record<string, unknown>) => ({
    course: { id: 'fractions', name: 'Fractions', estimatedHours: 1, version: '1' },
    concepts: [{
      id: 'addition', name: 'Adding fractions', difficulty: 2, estimatedMinutes: 5,
      knowledgePoints: [{ id: 'sum', problems: [{ id: 'example', question: 'Which fractions rule applies?', ...problem }] }],
    }],
  });

  it.each([
    { type: 'multiple_choice', options: ['One', 'Two'], correct: '1', answer: '1' },
    { type: 'scenario', options: ['One', 'Two'], correct: 0, answer: '0' },
    { type: 'true_false', correct: 'FALSE', answer: false },
    { type: 'fill_blank', correct: { answer: 'five', alternatives: ['5'] }, answer: '5' },
    { type: 'ordering', options: [' First ', ' Second '], correct: '1,0', answer: ['Second', 'First'] },
    { type: 'ordering', options: ['First', 'Second'], correct: ['Second', 'First'], answer: ['Second', 'First'] },
    { type: 'matching', options: ['Alpha|One', 'Beta|Two', 'Gamma|Two'], correct: '1,0,2', answer: { Alpha: 'Two', Beta: 'One', Gamma: 'Two' } },
    { type: 'matching', options: ['Alpha|One', 'Beta|Two'], correct: { Alpha: 'Two', Beta: 'One' }, answer: { Alpha: 'Two', Beta: 'One' } },
  ])('can grade imported $type answers correctly', ({ answer, ...rawProblem }) => {
    const parsed = importer.parseCourseYaml(yaml.dump(rawCourse(rawProblem)));
    const problem = parsed.concepts[0].knowledgePoints[0].problems[0];
    const result = evaluateAnswer(problem.type, answer, problem.correct, problem.explanation, problem.options);
    expect(result.correct).toBe(true);

    const presented = serializeProblemForClient({
      id: problem.id, type: problem.type, questionText: problem.question, difficulty: 3, options: problem.options,
    });
    if (problem.type === 'multiple_choice' || problem.type === 'scenario') {
      expect(presented.options?.some((option) => option.id === String(problem.correct))).toBe(true);
    }
    if (problem.type === 'ordering') expect(presented.items?.slice().sort()).toEqual((answer as string[]).slice().sort());
    if (problem.type === 'matching') expect(presented.pairs?.map((pair) => pair.left).sort()).toEqual(Object.keys(answer as Record<string, string>).sort());
  });

  it('rejects the out-of-range answer from the audit before persistence', () => {
    expect(() => importer.parseCourseYaml(yaml.dump(rawCourse({
      type: 'multiple_choice', options: ['A', 'B', 'C', 'D'], correct: 999,
    })))).toThrow('zero-based integer index within the options');
  });

  it('keeps a scaffold importable as a draft while rejecting publication', () => {
    const draft = importer.parseCourseYaml(yaml.dump(scaffoldCourseObject('Fractions', {})));
    const review = new ReviewService().review(draft);
    expect(review.passed).toBe(false);
    expect(review.failures.some((failure) => failure.check === 'publication_readiness')).toBe(true);
  });
});
