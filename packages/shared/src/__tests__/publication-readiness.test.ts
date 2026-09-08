import { describe, expect, it } from 'bun:test';
import { CourseYamlSchema } from '../schemas/course-yaml.schema';
import { QUALITY_CHECK_METADATA, QUALITY_CHECKS, reviewCourseYaml, runQualityGate } from '../quality-gate';
import { fillConceptInRaw, scaffoldCourseObject } from '../scaffold';
import { validateParsedYaml } from '../validate';

function authoredCourse() {
  return {
    course: { id: 'fractions', name: 'Adding fractions', estimatedHours: 1, version: '1' },
    concepts: [{
      id: 'equal-denominators', name: 'Fractions with equal denominators', difficulty: 2, estimatedMinutes: 5,
      knowledgePoints: [{
        id: 'add-numerators',
        instruction: 'To add fractions with equal denominators, add the numerators and keep the denominator unchanged.',
        workedExample: 'For 1/5 + 2/5, add the numerators 1 + 2 to get 3. Keep the denominator 5. The sum is 3/5.',
        problems: [
          { id: 'sum', type: 'multiple_choice', question: 'What is the sum of the fractions 1/5 and 2/5?', options: ['3/5', '3/10', '2/5'], correct: 0, difficulty: 1 },
          { id: 'denominator', type: 'true_false', question: 'When adding fractions with equal denominators, keep the denominator unchanged.', correct: 'true', difficulty: 2 },
          { id: 'numerator', type: 'fill_blank', question: 'Add the numerators of 2/7 and 3/7. What is the numerator of their sum?', correct: '5', difficulty: 3 },
        ],
      }],
    }],
  };
}

function courseWithProblem(problem: Record<string, unknown>) {
  const raw = authoredCourse();
  return { ...raw, concepts: [{ ...raw.concepts[0], knowledgePoints: [{ ...raw.concepts[0].knowledgePoints[0], problems: [{ id: 'answer-contract', question: 'Apply the fractions rule to this example.', ...problem }] }] }] };
}

const hasReadinessFailure = (raw: unknown) => runQualityGate(raw).failures.some(({ check }) => check === 'publication_readiness');

describe('publication readiness', () => {
  it('passes authored teaching and uses one ten-check documentation registry', () => {
    expect(runQualityGate(authoredCourse()).passed).toBe(true);
    expect(runQualityGate(authoredCourse()).score).toBe('10/10');
    expect(QUALITY_CHECKS).toHaveLength(10);
    expect(new Set(QUALITY_CHECKS).size).toBe(10);
    expect(QUALITY_CHECK_METADATA.map(({ name }) => name)).toEqual(QUALITY_CHECKS);
  });

  it('allows scaffold drafts to validate while preventing their publication', () => {
    const empty = scaffoldCourseObject('Fractions', {});
    expect(validateParsedYaml(empty).valid).toBe(true);
    expect(hasReadinessFailure(empty)).toBe(true);
    const filled = fillConceptInRaw(empty, 'fractions-intro', {});
    expect(validateParsedYaml(filled).valid).toBe(true);
    expect(hasReadinessFailure(filled)).toBe(true);
  });

  it('requires teaching on every concept and at least one concept', () => {
    const raw = authoredCourse();
    expect(hasReadinessFailure({ ...raw, concepts: [] })).toBe(true);
    raw.concepts.push({ ...raw.concepts[0], id: 'unfinished', knowledgePoints: [] });
    expect(hasReadinessFailure(raw)).toBe(true);
  });

  it.each(['', 'Stub instruction.', 'content/fractions.md', 'TODO: Teach the fractions addition rule'])('rejects unfinished instruction: %s', (instruction) => {
    const raw = authoredCourse();
    raw.concepts[0].knowledgePoints[0].instruction = instruction;
    expect(hasReadinessFailure(raw)).toBe(true);
  });

  it.each(['', '  ', 'TODO: Write the fractions addition question'])('rejects empty or placeholder questions: %s', (question) => {
    const raw = authoredCourse();
    raw.concepts[0].knowledgePoints[0].problems[0].question = question;
    expect(hasReadinessFailure(raw)).toBe(true);
  });

  it('rejects placeholder options, explanations, examples, and fill-blank answers', () => {
    for (const field of ['option', 'explanation', 'example', 'answer', 'example-file']) {
      const raw = authoredCourse();
      const kp = raw.concepts[0].knowledgePoints[0];
      if (field === 'option') kp.problems[0].options![0] = 'Option A';
      if (field === 'explanation') Object.assign(kp.problems[0], { explanation: 'TODO: Explain the correct answer' });
      if (field === 'example') kp.workedExample = 'TODO: Write a worked example';
      if (field === 'answer') kp.problems[2].correct = 'TBD';
      if (field === 'example-file') kp.workedExample = 'content/missing-example.md';
      expect(hasReadinessFailure(raw)).toBe(true);
    }
  });

  it('preserves authored media, callouts, and legitimate references to placeholders', () => {
    const raw = authoredCourse();
    Object.assign(raw.concepts[0].knowledgePoints[0], {
      instruction: undefined,
      instructionContent: [
        { type: 'callout', title: 'Fractions', body: 'Add the numerators of fractions with equal denominators. A placeholder variable can represent an unknown numerator.' },
        { type: 'image', url: 'https://example.com/fractions.png', alt: 'Three of five equal pieces are shaded.' },
        { type: 'video', url: 'https://example.com/fractions.mp4', title: 'Adding fractions' },
        { type: 'link', url: 'https://example.com/fractions', title: 'Fractions reference' },
      ],
      workedExample: undefined,
      workedExampleContent: [{ type: 'callout', title: 'Worked sum', body: 'Add 1/5 and 2/5 to get 3/5.' }],
    });
    expect(CourseYamlSchema.parse(raw).concepts[0].knowledgePoints[0].instructionContent).toHaveLength(4);
    expect(runQualityGate(raw).passed).toBe(true);
  });

  it('requires problem variants and difficulty diversity when defaults are omitted', () => {
    const raw = authoredCourse();
    const kp = raw.concepts[0].knowledgePoints[0];
    kp.problems.forEach((problem) => Object.assign(problem, { difficulty: undefined }));
    expect(runQualityGate(raw).failures.some(({ check }) => check === 'difficulty_staircase')).toBe(true);
    kp.problems = [];
    expect(runQualityGate(raw).failures.some(({ check }) => check === 'problem_variant_depth')).toBe(true);
  });

  it('retains prerequisite existence and cycle checks', () => {
    const raw = authoredCourse();
    Object.assign(raw.concepts[0], { prerequisites: ['missing'] });
    expect(runQualityGate(raw).failures.find(({ check }) => check === 'import_dry_run')?.details).toContain('Unknown prerequisite');
    Object.assign(raw.concepts[0], { prerequisites: [raw.concepts[0].id] });
    expect(runQualityGate(raw).failures.find(({ check }) => check === 'import_dry_run')?.details).toContain('Cycle detected');
  });

  it('revalidates direct typed service callers so invalid answers cannot bypass the schema', () => {
    const parsed = CourseYamlSchema.parse(authoredCourse());
    parsed.concepts[0].knowledgePoints[0].problems[0].correct = 999;
    const review = reviewCourseYaml(parsed);
    expect(review.passed).toBe(false);
    expect(review.failures[0].check).toBe('yaml_parses');
    expect(review.failures[0].details).toContain('correct');
  });
});

describe('answer contracts', () => {
  it.each([999, -1, 1.5, '999', '1.0', '0x0', true, '', 'A'])('rejects an impossible choice index: %s', (correct) => {
    const raw = courseWithProblem({ type: 'multiple_choice', options: ['3/5', '3/10'], correct });
    expect(validateParsedYaml(raw).valid).toBe(false);
    expect(runQualityGate(raw).passed).toBe(false);
  });

  it.each(['multiple_choice', 'scenario', 'ordering', 'matching'])('requires selectable options for %s', (type) => {
    expect(validateParsedYaml(courseWithProblem({ type, correct: 0 })).valid).toBe(false);
  });

  it.each(['yes', '1', 1, 0, 'true ', null])('rejects invalid true/false values: %s', (correct) => {
    expect(validateParsedYaml(courseWithProblem({ type: 'true_false', correct })).valid).toBe(false);
  });

  it.each(['0,0', '0,2', '0', '0,1,2', '0junk,1', '0.5,1'])('rejects incomplete ordering permutations: %s', (correct) => {
    expect(validateParsedYaml(courseWithProblem({ type: 'ordering', options: ['First', 'Second'], correct })).valid).toBe(false);
  });

  it('normalizes choice, boolean, ordering, and legacy matching for the evaluator', () => {
    const cases = [
      { type: 'multiple_choice', options: ['3/5', '3/10'], correct: '0', expected: 0 },
      { type: 'true_false', correct: 'FALSE', expected: false },
      { type: 'ordering', options: [' First ', ' Second '], correct: '1,0', expected: '1,0' },
      { type: 'matching', options: ['Alpha|One', 'Beta|Two', 'Gamma|Two'], correct: '1,0,2', expected: { Alpha: 'Two', Beta: 'One', Gamma: 'Two' } },
    ];
    for (const { expected, ...problem } of cases) {
      const parsed = CourseYamlSchema.parse(courseWithProblem(problem));
      expect(parsed.concepts[0].knowledgePoints[0].problems[0].correct).toEqual(expected);
    }
  });

  it('supports evaluator-native fill-blank, ordering, and matching answers', () => {
    const cases = [
      { type: 'fill_blank', correct: { answer: 'five', alternatives: ['5'] } },
      { type: 'ordering', options: ['First', 'Second'], correct: ['Second', 'First'] },
      { type: 'matching', options: ['Alpha|One', 'Beta|Two'], correct: { Alpha: 'Two', Beta: 'One' } },
      { type: 'matching', options: ['Alpha|One', 'Beta|Two'], correct: [['Alpha', 'Two'], ['Beta', 'One']] },
      { type: 'matching', options: ['answer|One', 'Beta|Two'], correct: { answer: 'Two', Beta: 'One' } },
    ];
    for (const problem of cases) expect(validateParsedYaml(courseWithProblem(problem)).valid).toBe(true);
  });

  it('rejects empty fill answers and malformed matching maps', () => {
    const cases = [
      { type: 'fill_blank', correct: ' ' },
      { type: 'fill_blank', correct: { answer: 'five', alternatives: '5' } },
      { type: 'fill_blank', correct: { answer: 'five', alternatives: [''] } },
      { type: 'matching', options: ['Alpha|One', 'Beta|Two'], correct: { Alpha: 'Three', Beta: 'Two' } },
      { type: 'matching', options: ['Alpha|One', 'Beta|Two'], correct: { Alpha: 'One' } },
      { type: 'matching', options: ['Alpha|One', 'Alpha|Two'], correct: '0,1' },
      { type: 'matching', options: ['Alpha', 'Beta'], correct: '0,1' },
    ];
    for (const problem of cases) expect(validateParsedYaml(courseWithProblem(problem)).valid).toBe(false);
  });

  it('requires distinct choice labels while preserving case-sensitive code options', () => {
    for (const type of ['multiple_choice', 'scenario']) {
      expect(validateParsedYaml(courseWithProblem({ type, options: ['value', ' value '], correct: 0 })).valid).toBe(false);
      expect(validateParsedYaml(courseWithProblem({ type, options: ['value', 'Value'], correct: 0 })).valid).toBe(true);
    }
  });
});
