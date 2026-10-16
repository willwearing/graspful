import { describe, expect, test } from 'bun:test';
import type { ExamItem } from './exam';
import { decide, gradeItem, normalize, parseChoice, type Report, summarize } from './grade';
import { affectedConcepts, buildLessons } from './lesson';
import { studentPrompt } from './prompt';

const item: ExamItem = {
  id: 'q1',
  conceptId: 'b',
  split: 'dev',
  objective: 'Pick the buyer for release engineering',
  question: 'Who buys release engineering?',
  options: ['PMs', 'Engineering managers', 'SREs', 'Marketers'],
  correct: 1,
  sourceFile: 'x.md',
  sourceQuote: 'Release Engineering sells to engineering managers.',
};

const reading = 'Each use case has a **different** core buyer. Release Engineering sells to engineering managers and their teams.';

const course = {
  course: { id: 'c' },
  concepts: [
    { id: 'a', name: 'Alpha', knowledgePoints: [{ instruction: 'Alpha idea.', problems: [{ question: 'Q?', options: ['x', 'y'], correct: 1, explanation: 'Because y.' }] }] },
    { id: 'b', name: 'Beta', prerequisites: ['a'], knowledgePoints: [{ instruction: 'Beta idea.', workedExample: 'Beta example.', problems: [{ question: 'Exam only?', options: ['p', 'q'], correct: 0, purpose: 'exam' }] }] },
    { id: 'c', name: 'Gamma', knowledgePoints: [] },
  ],
};

describe('gradeItem', () => {
  test('counts a correct choice with a verbatim quote', () => {
    expect(gradeItem('taught', item, { id: 'q1', choice: 'B', quote: 'Release Engineering sells to engineering managers' }, reading)).toBe('correct');
  });

  test('ignores markdown and smart quotes when matching the quote', () => {
    expect(gradeItem('taught', item, { id: 'q1', choice: 'B', quote: '“Each use case has a different core buyer.”' }, reading)).toBe('correct');
  });

  test('rejects a right answer the reading does not back up', () => {
    expect(gradeItem('taught', item, { id: 'q1', choice: 'B', quote: 'Engineering managers own the release process end to end' }, reading)).toBe('unsupported');
  });

  test('rejects quotes too short to prove anything', () => {
    expect(gradeItem('taught', item, { id: 'q1', choice: 'B', quote: 'engineering managers' }, reading)).toBe('unsupported');
  });

  test('marks null choices as abstain and wrong supported choices as wrong', () => {
    expect(gradeItem('taught', item, { id: 'q1', choice: null, quote: '' }, reading)).toBe('abstain');
    expect(gradeItem('taught', item, { id: 'q1', choice: 'C', quote: 'Release Engineering sells to engineering managers' }, reading)).toBe('wrong');
  });

  test('guess mode needs no quote', () => {
    expect(gradeItem('guess', item, { id: 'q1', choice: 1 }, null)).toBe('correct');
    expect(gradeItem('guess', item, undefined, null)).toBe('abstain');
  });
});

test('parseChoice and normalize', () => {
  expect(parseChoice('c')).toBe(2);
  expect(parseChoice('B.')).toBe(1);
  expect(parseChoice('null')).toBeNull();
  expect(parseChoice(4)).toBeNull();
  expect(normalize('  **Bold**\n  text ')).toBe('bold text');
});

describe('lessons', () => {
  test('include prerequisites, worked examples and practice feedback, but not exam problems', () => {
    const lesson = buildLessons(course).get('b')!;
    expect(lesson).toContain('Alpha idea.');
    expect(lesson).toContain('Answer: y');
    expect(lesson).toContain('Explanation: Because y.');
    expect(lesson).toContain('Worked example:\nBeta example.');
    expect(lesson).not.toContain('Exam only?');
    expect(lesson.indexOf('Alpha idea.')).toBeLessThan(lesson.indexOf('Beta idea.'));
  });

  test('a change to a concept also re-scores the concepts that include it', () => {
    expect(affectedConcepts(course, 'a')).toEqual(['a', 'b']);
    expect(affectedConcepts(course, 'c')).toEqual(['c']);
  });
});

test('the student prompt never contains the answer key or objectives', () => {
  const prompt = studentPrompt('taught', reading, [item], '/tmp/a.json');
  expect(prompt).toContain('[q1] Who buys release engineering?');
  expect(prompt).not.toContain(item.objective);
  expect(prompt).not.toContain(item.sourceQuote);
  expect(prompt).not.toContain('"correct"');
});

describe('summarize and decide', () => {
  const results = [
    { id: 'q1', conceptId: 'b', split: 'dev' as const, objective: 'one', outcomes: ['correct', 'correct', 'wrong'] as const },
    { id: 'q2', conceptId: 'b', split: 'dev' as const, objective: 'two', outcomes: ['abstain', 'abstain', 'correct'] as const },
    { id: 'q3', conceptId: 'b', split: 'test' as const, objective: 'hidden', outcomes: ['correct'] as const },
  ].map((r) => ({ ...r, outcomes: [...r.outcomes] }));

  test('scores by majority vote and keeps test items out of the per-concept detail', () => {
    const report = summarize('taught', 3, results);
    expect(report.dev).toEqual({ correct: 1, total: 2, score: 0.5 });
    expect(report.test.correct).toBe(1);
    expect(report.concepts.b.failed).toEqual([{ objective: 'two', outcome: 'abstain' }]);
    expect(JSON.stringify(report)).not.toContain('hidden');
  });

  const at = (b: number, d: number): Report => ({
    mode: 'taught',
    samples: 3,
    dev: { correct: 0, total: 0, score: 0 },
    test: { correct: 0, total: 0, score: 0 },
    concepts: { b: { correct: b, total: 5, failed: [] }, d: { correct: d, total: 5, failed: [] } },
  });

  test('keeps a strict gain on the target with no regressions', () => {
    expect(decide(at(2, 3), at(3, 3), 'b').keep).toBe(true);
  });

  test('reverts ties and any regression elsewhere', () => {
    expect(decide(at(2, 3), at(2, 3), 'b').keep).toBe(false);
    expect(decide(at(2, 3), at(4, 2), 'b')).toEqual({ keep: false, reason: 'regressed: d' });
  });
});
