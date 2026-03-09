import {
  estimateAbilityTheta,
  computeConceptSpeed,
  bootstrapSpeedParameters,
  DiagnosticResponse,
} from './speed-bootstrap';

describe('Speed Bootstrap', () => {
  describe('estimateAbilityTheta', () => {
    it('should return positive theta for mostly correct responses', () => {
      const responses: DiagnosticResponse[] = [
        { conceptId: 'A', correct: true, difficultyTheta: 0 },
        { conceptId: 'B', correct: true, difficultyTheta: 0.5 },
        { conceptId: 'C', correct: true, difficultyTheta: 1.0 },
        { conceptId: 'D', correct: false, difficultyTheta: 1.5 },
      ];
      const theta = estimateAbilityTheta(responses);
      expect(theta).toBeGreaterThan(0);
    });

    it('should return negative theta for mostly incorrect responses', () => {
      const responses: DiagnosticResponse[] = [
        { conceptId: 'A', correct: false, difficultyTheta: 0 },
        { conceptId: 'B', correct: false, difficultyTheta: -0.5 },
        { conceptId: 'C', correct: true, difficultyTheta: -1.0 },
        { conceptId: 'D', correct: false, difficultyTheta: 0.5 },
      ];
      const theta = estimateAbilityTheta(responses);
      expect(theta).toBeLessThan(0);
    });

    it('should return 0 for empty responses', () => {
      expect(estimateAbilityTheta([])).toBe(0);
    });

    it('should return clamped value for all correct', () => {
      const responses: DiagnosticResponse[] = [
        { conceptId: 'A', correct: true, difficultyTheta: 0 },
        { conceptId: 'B', correct: true, difficultyTheta: 0 },
      ];
      const theta = estimateAbilityTheta(responses);
      expect(theta).toBeLessThanOrEqual(4);
    });

    it('should return clamped value for all incorrect', () => {
      const responses: DiagnosticResponse[] = [
        { conceptId: 'A', correct: false, difficultyTheta: 0 },
        { conceptId: 'B', correct: false, difficultyTheta: 0 },
      ];
      const theta = estimateAbilityTheta(responses);
      expect(theta).toBeGreaterThanOrEqual(-4);
    });
  });

  describe('computeConceptSpeed', () => {
    it('should return speed > 1 when ability exceeds difficulty', () => {
      expect(computeConceptSpeed(2.0, 1.0)).toBeCloseTo(Math.E, 1);
    });

    it('should return speed < 1 when difficulty exceeds ability', () => {
      expect(computeConceptSpeed(1.0, 2.0)).toBeCloseTo(1 / Math.E, 1);
    });

    it('should return speed = 1 when ability equals difficulty', () => {
      expect(computeConceptSpeed(1.0, 1.0)).toBeCloseTo(1.0, 5);
    });
  });

  describe('bootstrapSpeedParameters', () => {
    it('should compute ability theta and per-concept speeds', () => {
      const responses: DiagnosticResponse[] = [
        { conceptId: 'A', correct: true, difficultyTheta: 0 },
        { conceptId: 'B', correct: true, difficultyTheta: 0.5 },
        { conceptId: 'C', correct: false, difficultyTheta: 1.0 },
      ];

      const concepts = [
        { id: 'A', difficultyTheta: 0 },
        { id: 'B', difficultyTheta: 0.5 },
        { id: 'C', difficultyTheta: 1.0 },
        { id: 'D', difficultyTheta: 2.0 },
      ];

      const result = bootstrapSpeedParameters(responses, concepts);

      expect(result.abilityTheta).toBeGreaterThan(0);
      expect(result.speedRD).toBe(250);
      expect(result.conceptSpeeds.size).toBe(4);

      // Concept A (easy) should have higher speed than Concept D (hard)
      expect(result.conceptSpeeds.get('A')!).toBeGreaterThan(result.conceptSpeeds.get('D')!);
    });

    it('should return defaults for empty responses', () => {
      const result = bootstrapSpeedParameters([], [{ id: 'A', difficultyTheta: 0 }]);
      expect(result.abilityTheta).toBe(0);
      expect(result.conceptSpeeds.get('A')).toBeCloseTo(1.0);
    });
  });
});
