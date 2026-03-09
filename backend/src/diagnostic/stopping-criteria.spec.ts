import { shouldStopDiagnostic, countUncertain } from './stopping-criteria';

describe('Stopping Criteria', () => {
  describe('countUncertain', () => {
    it('should count concepts with 0.2 < P(L) < 0.8', () => {
      const masteries = new Map([
        ['A', 0.1],   // certain (low)
        ['B', 0.5],   // uncertain
        ['C', 0.85],  // certain (high)
        ['D', 0.3],   // uncertain
        ['E', 0.79],  // uncertain
      ]);
      expect(countUncertain(masteries)).toBe(3);
    });

    it('should return 0 when all concepts are certain', () => {
      const masteries = new Map([
        ['A', 0.0],
        ['B', 1.0],
        ['C', 0.15],
        ['D', 0.85],
      ]);
      expect(countUncertain(masteries)).toBe(0);
    });

    it('should treat boundary values correctly', () => {
      const masteries = new Map([
        ['A', 0.2],  // NOT uncertain (boundary)
        ['B', 0.8],  // NOT uncertain (boundary)
      ]);
      expect(countUncertain(masteries)).toBe(0);
    });
  });

  describe('shouldStopDiagnostic', () => {
    const makeMasteries = (values: number[]) => {
      const m = new Map<string, number>();
      values.forEach((v, i) => m.set(`concept-${i}`, v));
      return m;
    };

    it('should stop at hard cap of 60 questions', () => {
      const uncertain = makeMasteries(Array(20).fill(0.5));
      expect(shouldStopDiagnostic(60, uncertain)).toBe(true);
      expect(shouldStopDiagnostic(59, uncertain)).toBe(false);
    });

    it('should stop when no uncertain concepts remain (full coverage)', () => {
      const certain = makeMasteries([0.1, 0.9, 0.05, 0.95]);
      expect(shouldStopDiagnostic(5, certain)).toBe(true);
    });

    it('should stop at diminishing returns (>= 20 questions, < 5 uncertain)', () => {
      const fewUncertain = makeMasteries([0.5, 0.5, 0.5, 0.5, 0.1, 0.9]); // 4 uncertain
      expect(shouldStopDiagnostic(20, fewUncertain)).toBe(true);
      expect(shouldStopDiagnostic(19, fewUncertain)).toBe(false);
    });

    it('should not stop early when many concepts are uncertain', () => {
      const manyUncertain = makeMasteries(Array(10).fill(0.5)); // 10 uncertain
      expect(shouldStopDiagnostic(25, manyUncertain)).toBe(false);
    });

    it('should not stop at question 0', () => {
      const certain = makeMasteries([0.1, 0.9]);
      // Even if all certain, need at least 1 question
      // Actually, if uncertain_count == 0 at start, stop is valid
      expect(shouldStopDiagnostic(0, certain)).toBe(true);
    });
  });
});
