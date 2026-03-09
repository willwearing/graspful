import {
  BKT_DEFAULTS,
  updateMasteryAfterCorrect,
  updateMasteryAfterIncorrect,
  applyTimeDiscount,
  classifyDiagnosticState,
} from './bkt-engine';

describe('BKT Engine', () => {
  describe('BKT_DEFAULTS', () => {
    it('should have the correct default parameters', () => {
      expect(BKT_DEFAULTS.pL0).toBe(0.5);
      expect(BKT_DEFAULTS.pSlip).toBe(0.1);
      expect(BKT_DEFAULTS.pGuessMC).toBe(0.2);
      expect(BKT_DEFAULTS.pGuessFillBlank).toBe(0.05);
    });
  });

  describe('updateMasteryAfterCorrect', () => {
    it('should increase mastery for correct answer with MC guess rate', () => {
      const result = updateMasteryAfterCorrect(0.5, 0.2);
      // P(L|correct) = 0.5*(1-0.1) / [0.5*(1-0.1) + 0.5*0.2]
      // = 0.45 / (0.45 + 0.1) = 0.45 / 0.55 ~ 0.8182
      expect(result).toBeCloseTo(0.8182, 3);
    });

    it('should increase mastery for correct answer with fill-blank guess rate', () => {
      const result = updateMasteryAfterCorrect(0.5, 0.05);
      // P(L|correct) = 0.5*0.9 / (0.5*0.9 + 0.5*0.05)
      // = 0.45 / 0.475 ~ 0.9474
      expect(result).toBeCloseTo(0.9474, 3);
    });

    it('should handle already-high mastery', () => {
      const result = updateMasteryAfterCorrect(0.95, 0.2);
      expect(result).toBeGreaterThan(0.95);
      expect(result).toBeLessThanOrEqual(1.0);
    });

    it('should handle already-low mastery', () => {
      const result = updateMasteryAfterCorrect(0.1, 0.2);
      expect(result).toBeGreaterThan(0.1);
    });
  });

  describe('updateMasteryAfterIncorrect', () => {
    it('should decrease mastery for incorrect answer', () => {
      const result = updateMasteryAfterIncorrect(0.5);
      // P(L|incorrect) = 0.5*0.1 / (0.5*0.1 + 0.5*0.8)
      // = 0.05 / (0.05 + 0.4) = 0.05 / 0.45 ~ 0.1111
      expect(result).toBeCloseTo(0.1111, 3);
    });

    it('should decrease high mastery on incorrect', () => {
      const result = updateMasteryAfterIncorrect(0.9);
      expect(result).toBeLessThan(0.9);
    });

    it('should handle low mastery on incorrect (stays low)', () => {
      const result = updateMasteryAfterIncorrect(0.1);
      expect(result).toBeLessThan(0.1);
    });
  });

  describe('applyTimeDiscount', () => {
    it('should not discount when time ratio is <= 2.0', () => {
      const correctUpdate = 0.85;
      const priorMastery = 0.5;
      const result = applyTimeDiscount(correctUpdate, priorMastery, 1.5);
      expect(result).toBe(correctUpdate);
    });

    it('should discount when time ratio > 2.0', () => {
      const correctUpdate = 0.85;
      const priorMastery = 0.5;
      const result = applyTimeDiscount(correctUpdate, priorMastery, 3.0);
      // discount = max(0.3, 1.0 - (3.0 - 2.0) * 0.2) = max(0.3, 0.8) = 0.8
      // blended = priorMastery + discount * (correctUpdate - priorMastery)
      // = 0.5 + 0.8 * (0.85 - 0.5) = 0.5 + 0.28 = 0.78
      expect(result).toBeCloseTo(0.78, 3);
    });

    it('should clamp discount to minimum 0.3', () => {
      const correctUpdate = 0.85;
      const priorMastery = 0.5;
      const result = applyTimeDiscount(correctUpdate, priorMastery, 6.0);
      // discount = max(0.3, 1.0 - (6.0 - 2.0) * 0.2) = max(0.3, 0.2) = 0.3
      // blended = 0.5 + 0.3 * 0.35 = 0.605
      expect(result).toBeCloseTo(0.605, 3);
    });

    it('should return exact correctUpdate at time ratio 2.0', () => {
      const result = applyTimeDiscount(0.85, 0.5, 2.0);
      expect(result).toBe(0.85);
    });
  });

  describe('classifyDiagnosticState', () => {
    it('should classify >= 0.8 as mastered', () => {
      expect(classifyDiagnosticState(0.8)).toBe('mastered');
      expect(classifyDiagnosticState(0.95)).toBe('mastered');
    });

    it('should classify 0.5-0.8 as conditionally_mastered', () => {
      expect(classifyDiagnosticState(0.5)).toBe('conditionally_mastered');
      expect(classifyDiagnosticState(0.79)).toBe('conditionally_mastered');
    });

    it('should classify 0.2-0.5 as partially_known', () => {
      expect(classifyDiagnosticState(0.2)).toBe('partially_known');
      expect(classifyDiagnosticState(0.49)).toBe('partially_known');
    });

    it('should classify < 0.2 as unknown', () => {
      expect(classifyDiagnosticState(0.0)).toBe('unknown');
      expect(classifyDiagnosticState(0.19)).toBe('unknown');
    });
  });
});
