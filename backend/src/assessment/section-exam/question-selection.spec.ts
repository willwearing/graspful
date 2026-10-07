import { parseSectionExamConfig } from './config';
import { serializeSectionExamSession } from './presentation';
import { selectSectionExamQuestions } from './question-selection';

const concepts = [
  { id: 'concept-1', slug: 'entities', knowledgePoints: [{ problems: [
    { id: 'practice-1', isReviewVariant: false },
    { id: 'review-1', isReviewVariant: true },
  ] }] },
  { id: 'concept-2', slug: 'relationships', knowledgePoints: [{ problems: [
    { id: 'practice-2', isReviewVariant: false },
    { id: 'review-2', isReviewVariant: true },
  ] }] },
];

describe('Section exam question selection', () => {
  const examConcepts = [{ id: 'c1', slug: 'one', knowledgePoints: [{ problems: [
    { id: 'practice', purpose: 'practice', isReviewVariant: false, isTransfer: true },
    { id: 'exam-a', purpose: 'exam', isReviewVariant: false, isTransfer: true },
    { id: 'exam-b', purpose: 'exam', isReviewVariant: false, isTransfer: true },
    { id: 'exam-c', purpose: 'exam', isReviewVariant: false, isTransfer: false },
  ] }] }];

  it('uses separate exam cases and prefers unseen transfer cases on retakes', () => {
    const selected = selectSectionExamQuestions(examConcepts,
      parseSectionExamConfig({ questionCount: 1, minTransferQuestions: 1 }),
      { seed: 'retake', exposedProblemIds: new Set(['exam-a']) });
    expect(selected).toEqual([{ problemId: 'exam-b', conceptId: 'c1' }]);
  });

  it('keeps seeded selection reproducible without exposing practice cases', () => {
    const config = parseSectionExamConfig({ questionCount: 2, minTransferQuestions: 2 });
    const first = selectSectionExamQuestions(examConcepts, config, { seed: 'saved-session' });
    expect(selectSectionExamQuestions(examConcepts, config, { seed: 'saved-session' })).toEqual(first);
    expect(first.map((p) => p.problemId).sort()).toEqual(['exam-a', 'exam-b']);
  });

  it('rejects an exam transfer quota that only practice cases can satisfy', () => {
    expect(() => selectSectionExamQuestions(examConcepts,
      parseSectionExamConfig({ questionCount: 3, minTransferQuestions: 3 })))
      .toThrow('Not enough transfer problems');
  });

  it.each(['entities', 'concept-1'])('resolves blueprint %s and fills from review variants without duplicates', (conceptId) => {
    const config = parseSectionExamConfig({ questionCount: 3, blueprint: [{ conceptId, minQuestions: 1 }] });
    expect(selectSectionExamQuestions(concepts, config)).toEqual([
      { problemId: 'review-1', conceptId: 'concept-1' },
      { problemId: 'review-2', conceptId: 'concept-2' },
      { problemId: 'practice-1', conceptId: 'concept-1' },
    ]);
    // Selection must not reorder the source content.
    expect(concepts[0].knowledgePoints[0].problems[0].id).toBe('practice-1');
  });

  it('rejects an unknown blueprint concept', () => {
    const config = parseSectionExamConfig({ questionCount: 1, blueprint: [{ conceptId: 'missing', minQuestions: 1 }] });
    expect(() => selectSectionExamQuestions(concepts, config)).toThrow('unknown concept missing');
  });

  it('rejects a blueprint when one concept has too few questions even if the full pool is large enough', () => {
    const config = parseSectionExamConfig({ questionCount: 3, blueprint: [{ conceptId: 'entities', minQuestions: 3 }] });
    expect(() => selectSectionExamQuestions(concepts, config)).toThrow('Not enough problems to satisfy blueprint');
  });

  it('rejects a question count larger than the full pool', () => {
    expect(() => selectSectionExamQuestions(concepts, parseSectionExamConfig({ questionCount: 5 })))
      .toThrow('Not enough problems available');
  });
});

describe('Section exam presentation', () => {
  it('preserves resume timing and submitted false answers while removing private grading fields', () => {
    const startedAt = new Date('2026-09-24T12:00:00Z');
    const result = serializeSectionExamSession({
      id: 'session-1', startedAt, timeLimitMs: 60_000,
      questions: [{
        problemId: 'problem-1', response: false,
        problem: Object.assign({
          id: 'problem-1', type: 'true_false', questionText: 'Question',
          options: ['True', 'False'], difficulty: 1,
        }, { correctAnswer: true, explanation: 'Private explanation' }),
      }],
    }, parseSectionExamConfig({ passingScore: 0.8, instructions: 'Read carefully' }));
    expect(result).toMatchObject({
      startedAt, expiresAt: '2026-09-24T12:01:00.000Z', answeredProblemIds: ['problem-1'],
      passingScore: 0.8, instructions: 'Read carefully',
    });
    expect(result.problems[0]).not.toHaveProperty('correctAnswer');
    expect(result.problems[0]).not.toHaveProperty('explanation');
  });
});
