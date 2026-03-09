import {
  propagateCorrectUpward,
  propagateIncorrectDownward,
  propagateEvidence,
} from './evidence-propagation';
import { SimpleEdge } from '@/knowledge-graph/graph-query.service';

describe('Evidence Propagation', () => {
  // Graph: A -> B -> C (A is prerequisite of B, B is prerequisite of C)
  const edges: SimpleEdge[] = [
    { source: 'A', target: 'B' },
    { source: 'B', target: 'C' },
  ];

  describe('propagateCorrectUpward', () => {
    it('should increase mastery of direct prerequisites', () => {
      const masteries = new Map([
        ['A', 0.5],
        ['B', 0.5],
        ['C', 0.5],
      ]);

      // Student got C correct with updated P(L) = 0.85
      const updated = propagateCorrectUpward('C', 0.85, masteries, edges);

      // B is direct prereq (distance 1): max(0.5, 0.85 * 0.85^1) = max(0.5, 0.7225) = 0.7225
      expect(updated.get('B')).toBeCloseTo(0.7225, 3);
      // A is distance 2: max(0.5, 0.85 * 0.85^2) = max(0.5, 0.6141) = 0.6141
      expect(updated.get('A')).toBeCloseTo(0.6141, 3);
      // C itself should not be changed
      expect(updated.get('C')).toBeUndefined();
    });

    it('should not decrease existing mastery (uses max)', () => {
      const masteries = new Map([
        ['A', 0.9],
        ['B', 0.8],
        ['C', 0.5],
      ]);

      const updated = propagateCorrectUpward('C', 0.85, masteries, edges);

      // A already 0.9, propagated would be 0.6141 -> stays 0.9
      expect(updated.has('A')).toBe(false);
      // B already 0.8, propagated would be 0.7225 -> stays 0.8
      expect(updated.has('B')).toBe(false);
    });

    it('should handle concept with no prerequisites', () => {
      const masteries = new Map([['A', 0.5]]);
      const updated = propagateCorrectUpward('A', 0.85, masteries, edges);
      expect(updated.size).toBe(0);
    });
  });

  describe('propagateIncorrectDownward', () => {
    it('should decrease mastery of direct dependents', () => {
      const masteries = new Map([
        ['A', 0.5],
        ['B', 0.8],
        ['C', 0.9],
      ]);

      // Student got A incorrect with updated P(L) = 0.15
      const updated = propagateIncorrectDownward('A', 0.15, masteries, edges);

      // B is direct dependent (distance 1):
      // min(0.8, 0.15 + (1 - 0.15) * (1 - 0.85^1))
      // = min(0.8, 0.15 + 0.85 * 0.15) = min(0.8, 0.2775) = 0.2775
      expect(updated.get('B')).toBeCloseTo(0.2775, 3);
      // C is distance 2:
      // min(0.9, 0.15 + 0.85 * (1 - 0.85^2))
      // = min(0.9, 0.15 + 0.85 * 0.2775) = min(0.9, 0.3859) = 0.3859
      expect(updated.get('C')).toBeCloseTo(0.3859, 3);
    });

    it('should not increase existing mastery (uses min)', () => {
      const masteries = new Map([
        ['A', 0.5],
        ['B', 0.1],
        ['C', 0.05],
      ]);

      const updated = propagateIncorrectDownward('A', 0.15, masteries, edges);

      // B already 0.1, propagated would be 0.2775 -> stays 0.1
      expect(updated.has('B')).toBe(false);
      // C already 0.05, propagated would be 0.3859 -> stays 0.05
      expect(updated.has('C')).toBe(false);
    });

    it('should handle concept with no dependents', () => {
      const masteries = new Map([['C', 0.5]]);
      const updated = propagateIncorrectDownward('C', 0.15, masteries, edges);
      expect(updated.size).toBe(0);
    });
  });

  describe('propagateEvidence', () => {
    it('should propagate correct upward only (not downward)', () => {
      const masteries = new Map([
        ['A', 0.5],
        ['B', 0.5],
        ['C', 0.5],
      ]);

      const updated = propagateEvidence('B', true, 0.85, masteries, edges);

      // A (prereq of B) should be updated
      expect(updated.get('A')).toBeCloseTo(0.7225, 3);
      // C (dependent of B) should NOT be updated on correct
      expect(updated.has('C')).toBe(false);
    });

    it('should propagate incorrect downward only (not upward)', () => {
      const masteries = new Map([
        ['A', 0.5],
        ['B', 0.5],
        ['C', 0.5],
      ]);

      const updated = propagateEvidence('B', false, 0.15, masteries, edges);

      // C (dependent of B) should be updated
      expect(updated.has('C')).toBe(true);
      // A (prereq of B) should NOT be updated on incorrect
      expect(updated.has('A')).toBe(false);
    });
  });
});
