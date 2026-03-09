import { updateSpeed, deriveSpeed, blendSpeed } from './speed-updater';
import type { SpeedState, ConceptParams } from './speed-updater';

describe('Speed Updater', () => {
  const defaultConcept: ConceptParams = {
    difficultyTheta: 0,
    timeIntensity: Math.log(10), // expect 10s response
    timeIntensitySD: 0.8,
  };

  describe('updateSpeed', () => {
    it('should increase abilityTheta after correct answer', () => {
      const state: SpeedState = { abilityTheta: 0, speedRD: 350, observationCount: 0 };
      const result = updateSpeed(state, { correct: true, responseTimeMs: 10000 }, defaultConcept);
      expect(result.abilityTheta).toBeGreaterThan(0);
    });

    it('should decrease abilityTheta after incorrect answer', () => {
      const state: SpeedState = { abilityTheta: 0, speedRD: 350, observationCount: 0 };
      const result = updateSpeed(state, { correct: false, responseTimeMs: 10000 }, defaultConcept);
      expect(result.abilityTheta).toBeLessThan(0);
    });

    it('should reduce speedRD after each observation', () => {
      const state: SpeedState = { abilityTheta: 0, speedRD: 350, observationCount: 0 };
      const result = updateSpeed(state, { correct: true, responseTimeMs: 10000 }, defaultConcept);
      expect(result.speedRD).toBeLessThan(350);
    });

    it('should increment observationCount', () => {
      const state: SpeedState = { abilityTheta: 0, speedRD: 350, observationCount: 0 };
      const result = updateSpeed(state, { correct: true, responseTimeMs: 10000 }, defaultConcept);
      expect(result.observationCount).toBe(1);
    });

    it('should have larger updates with high uncertainty (K-factor)', () => {
      const newStudent: SpeedState = { abilityTheta: 0, speedRD: 350, observationCount: 0 };
      const experienced: SpeedState = { abilityTheta: 0, speedRD: 100, observationCount: 20 };

      const newResult = updateSpeed(newStudent, { correct: true, responseTimeMs: 10000 }, defaultConcept);
      const expResult = updateSpeed(experienced, { correct: true, responseTimeMs: 10000 }, defaultConcept);

      // New student should have bigger ability shift
      expect(Math.abs(newResult.abilityTheta)).toBeGreaterThan(Math.abs(expResult.abilityTheta));
    });

    it('should give fast+correct a stronger signal than slow+correct', () => {
      const state: SpeedState = { abilityTheta: 0, speedRD: 250, observationCount: 5 };

      const fast = updateSpeed(state, { correct: true, responseTimeMs: 3000 }, defaultConcept);
      const slow = updateSpeed(state, { correct: true, responseTimeMs: 30000 }, defaultConcept);

      expect(fast.abilityTheta).toBeGreaterThan(slow.abilityTheta);
    });

    it('should discount fast+incorrect as guessing', () => {
      const state: SpeedState = { abilityTheta: 0, speedRD: 250, observationCount: 5 };

      const fastWrong = updateSpeed(state, { correct: false, responseTimeMs: 2000 }, defaultConcept);
      const slowWrong = updateSpeed(state, { correct: false, responseTimeMs: 30000 }, defaultConcept);

      // Fast+wrong should have less negative impact (guessing discount)
      expect(fastWrong.abilityTheta).toBeGreaterThan(slowWrong.abilityTheta);
    });

    it('should converge to stable estimates with many observations', () => {
      let state: SpeedState = { abilityTheta: 0, speedRD: 350, observationCount: 0 };

      // Simulate 20 correct answers from a student with ability ~ +1
      for (let i = 0; i < 20; i++) {
        state = updateSpeed(state, { correct: true, responseTimeMs: 5000 }, defaultConcept);
      }

      expect(state.speedRD).toBeLessThan(150);
      expect(state.abilityTheta).toBeGreaterThan(0.3);
      expect(state.observationCount).toBe(20);
    });
  });

  describe('deriveSpeed', () => {
    it('should return 1.0 when ability equals difficulty', () => {
      expect(deriveSpeed(0, 0)).toBeCloseTo(1.0);
    });

    it('should return > 1.0 when ability > difficulty', () => {
      expect(deriveSpeed(1, 0)).toBeGreaterThan(1.0);
    });

    it('should return < 1.0 when ability < difficulty', () => {
      expect(deriveSpeed(-1, 0)).toBeLessThan(1.0);
    });

    it('should equal exp(abilityTheta - difficultyTheta)', () => {
      expect(deriveSpeed(1.5, 0.5)).toBeCloseTo(Math.exp(1.0));
    });
  });

  describe('blendSpeed', () => {
    it('should return 1.0 with 0 observations', () => {
      expect(blendSpeed(2.0, 0)).toBe(1.0);
    });

    it('should return raw speed with 15+ observations', () => {
      expect(blendSpeed(2.0, 15)).toBeCloseTo(2.0);
      expect(blendSpeed(2.0, 20)).toBeCloseTo(2.0);
    });

    it('should blend at intermediate observations', () => {
      const blended = blendSpeed(2.0, 8);
      // confidence = 8/15 ~ 0.533
      // blended = 1.0 * 0.467 + 2.0 * 0.533 = 1.533
      expect(blended).toBeGreaterThan(1.0);
      expect(blended).toBeLessThan(2.0);
    });
  });
});
