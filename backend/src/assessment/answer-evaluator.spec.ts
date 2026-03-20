import {
  evaluateMultipleChoice,
  evaluateTrueFalse,
  evaluateFillBlank,
  evaluateOrdering,
  evaluateMatching,
  evaluateScenario,
  evaluateAnswer,
} from './answer-evaluator';

describe('Answer Evaluator', () => {
  describe('evaluateMultipleChoice', () => {
    it('should return correct for matching option ID', () => {
      const result = evaluateMultipleChoice('opt-b', 'opt-b');
      expect(result.correct).toBe(true);
      expect(result.feedback).toBe('Correct!');
    });

    it('should return incorrect for non-matching option ID', () => {
      const result = evaluateMultipleChoice('opt-a', 'opt-b', 'Heat transfers by conduction.');
      expect(result.correct).toBe(false);
      expect(result.feedback).toContain('opt-b');
      expect(result.feedback).toContain('Heat transfers by conduction.');
    });

    it('should handle numeric IDs by comparing as strings', () => {
      const result = evaluateMultipleChoice(2, 2);
      expect(result.correct).toBe(true);
    });
  });

  describe('evaluateTrueFalse', () => {
    it('should return correct for matching boolean', () => {
      expect(evaluateTrueFalse(true, true).correct).toBe(true);
      expect(evaluateTrueFalse(false, false).correct).toBe(true);
    });

    it('should return incorrect for non-matching boolean', () => {
      expect(evaluateTrueFalse(true, false).correct).toBe(false);
      expect(evaluateTrueFalse(false, true).correct).toBe(false);
    });

    it('should handle string "true"/"false"', () => {
      expect(evaluateTrueFalse('true', true).correct).toBe(true);
      expect(evaluateTrueFalse('false', false).correct).toBe(true);
      expect(evaluateTrueFalse('True', true).correct).toBe(true);
    });
  });

  describe('evaluateFillBlank', () => {
    it('should match case-insensitively', () => {
      const result = evaluateFillBlank('CONDUCTION', 'conduction');
      expect(result.correct).toBe(true);
    });

    it('should trim whitespace', () => {
      const result = evaluateFillBlank('  conduction  ', 'conduction');
      expect(result.correct).toBe(true);
    });

    it('should accept alternative answers', () => {
      const correctAnswer = { answer: '150', alternatives: ['150 GPM', 'one hundred fifty'] };
      expect(evaluateFillBlank('150', correctAnswer).correct).toBe(true);
      expect(evaluateFillBlank('150 GPM', correctAnswer).correct).toBe(true);
      expect(evaluateFillBlank('one hundred fifty', correctAnswer).correct).toBe(true);
    });

    it('should reject wrong answers', () => {
      const result = evaluateFillBlank('radiation', 'conduction', 'Heat transfers by direct contact.');
      expect(result.correct).toBe(false);
      expect(result.feedback).toContain('conduction');
    });

    it('should handle object correctAnswer without alternatives', () => {
      const correctAnswer = { answer: '42' };
      expect(evaluateFillBlank('42', correctAnswer).correct).toBe(true);
      expect(evaluateFillBlank('43', correctAnswer).correct).toBe(false);
    });
  });

  describe('evaluateOrdering', () => {
    it('should return correct for matching order (array correctAnswer)', () => {
      const result = evaluateOrdering(['a', 'b', 'c'], ['a', 'b', 'c']);
      expect(result.correct).toBe(true);
    });

    it('should return incorrect for wrong order (array correctAnswer)', () => {
      const result = evaluateOrdering(['b', 'a', 'c'], ['a', 'b', 'c']);
      expect(result.correct).toBe(false);
    });

    it('should return incorrect for different lengths', () => {
      const result = evaluateOrdering(['a', 'b'], ['a', 'b', 'c']);
      expect(result.correct).toBe(false);
    });

    it('should return incorrect for non-array student answer', () => {
      const result = evaluateOrdering('not-array', ['a', 'b']);
      expect(result.correct).toBe(false);
      expect(result.feedback).toBe('Invalid answer format.');
    });

    it('should resolve index-based correctAnswer string against options', () => {
      // Options in shuffled order as stored in DB
      const options = ['Cardinality', 'Entities', 'Join tables', 'Attributes', 'Relationships'];
      // Correct order: Entities(1), Attributes(3), Relationships(4), Cardinality(0), Join tables(2)
      const correctAnswer = '1,3,4,0,2';
      const studentAnswer = ['Entities', 'Attributes', 'Relationships', 'Cardinality', 'Join tables'];

      const result = evaluateOrdering(studentAnswer, correctAnswer, undefined, options);
      expect(result.correct).toBe(true);
    });

    it('should reject wrong order with index-based correctAnswer', () => {
      const options = ['Cardinality', 'Entities', 'Join tables', 'Attributes', 'Relationships'];
      const correctAnswer = '1,3,4,0,2';
      const studentAnswer = ['Cardinality', 'Entities', 'Join tables', 'Attributes', 'Relationships'];

      const result = evaluateOrdering(studentAnswer, correctAnswer, undefined, options);
      expect(result.correct).toBe(false);
    });

    it('should return invalid when index-based but no options provided', () => {
      const result = evaluateOrdering(['a', 'b'], '1,0');
      expect(result.correct).toBe(false);
      expect(result.feedback).toBe('Invalid answer format.');
    });
  });

  describe('evaluateMatching', () => {
    it('should return correct for matching pairs as arrays', () => {
      const answer = [['a', '1'], ['b', '2']];
      const correct = [['a', '1'], ['b', '2']];
      expect(evaluateMatching(answer, correct).correct).toBe(true);
    });

    it('should return correct for matching pairs as objects', () => {
      const answer = { a: '1', b: '2' };
      const correct = { a: '1', b: '2' };
      expect(evaluateMatching(answer, correct).correct).toBe(true);
    });

    it('should return incorrect for wrong pairs', () => {
      const answer = { a: '2', b: '1' };
      const correct = { a: '1', b: '2' };
      expect(evaluateMatching(answer, correct).correct).toBe(false);
    });

    it('should return incorrect for missing pairs', () => {
      const answer = { a: '1' };
      const correct = { a: '1', b: '2' };
      expect(evaluateMatching(answer, correct).correct).toBe(false);
    });

    it('should return incorrect for null input', () => {
      const result = evaluateMatching(null, { a: '1' });
      expect(result.correct).toBe(false);
    });
  });

  describe('evaluateScenario', () => {
    it('should evaluate as multiple choice', () => {
      const result = evaluateScenario('opt-a', 'opt-a');
      expect(result.correct).toBe(true);
    });

    it('should return incorrect for wrong answer', () => {
      const result = evaluateScenario('opt-b', 'opt-a');
      expect(result.correct).toBe(false);
    });
  });

  describe('evaluateAnswer (dispatcher)', () => {
    it('should dispatch to correct evaluator for each type', () => {
      expect(evaluateAnswer('multiple_choice', 'A', 'A').correct).toBe(true);
      expect(evaluateAnswer('true_false', true, true).correct).toBe(true);
      expect(evaluateAnswer('fill_blank', 'hello', 'hello').correct).toBe(true);
      expect(evaluateAnswer('ordering', ['a', 'b'], ['a', 'b']).correct).toBe(true);
      expect(evaluateAnswer('matching', { a: '1' }, { a: '1' }).correct).toBe(true);
      expect(evaluateAnswer('scenario', 'A', 'A').correct).toBe(true);
    });

    it('should return incorrect for unknown type', () => {
      const result = evaluateAnswer('unknown_type', 'A', 'A');
      expect(result.correct).toBe(false);
      expect(result.feedback).toContain('Unknown problem type');
    });

    it('should pass explanation through', () => {
      const result = evaluateAnswer('multiple_choice', 'A', 'B', 'Because reasons.');
      expect(result.feedback).toContain('Because reasons.');
    });
  });
});
