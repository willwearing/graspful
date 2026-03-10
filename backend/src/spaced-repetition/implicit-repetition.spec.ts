import { computeImplicitRepetition } from './implicit-repetition';
import { EncompassingLink } from './types';

describe('computeImplicitRepetition', () => {
  it('should propagate credit to encompassed concepts', () => {
    // C_big encompasses C_small with weight 0.5
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'small', targetConceptId: 'big', weight: 0.5 },
    ];
    const speeds = new Map([
      ['small', 1.2],
      ['big', 1.0],
    ]);

    const result = computeImplicitRepetition('big', 0.4, edges, speeds);

    expect(result).toHaveLength(1);
    expect(result[0].conceptId).toBe('small');
    expect(result[0].memoryDelta).toBeCloseTo(0.5 * 0.4); // weight * rawDelta
    expect(result[0].repNumDelta).toBeCloseTo(0.5 * 0.4); // weight * rawDelta (speed_discount = 1.0 per spec)
  });

  it('should NOT propagate to concepts with speed < 1.0', () => {
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'slow', targetConceptId: 'big', weight: 0.5 },
    ];
    const speeds = new Map([
      ['slow', 0.8], // below threshold
      ['big', 1.0],
    ]);

    const result = computeImplicitRepetition('big', 0.4, edges, speeds);
    expect(result).toHaveLength(0);
  });

  it('should propagate through chains via BFS', () => {
    // big encompasses mid (0.6), mid encompasses small (0.5)
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'mid', targetConceptId: 'big', weight: 0.6 },
      { sourceConceptId: 'small', targetConceptId: 'mid', weight: 0.5 },
    ];
    const speeds = new Map([
      ['mid', 1.5],
      ['small', 1.0],
      ['big', 1.0],
    ]);

    const result = computeImplicitRepetition('big', 1.0, edges, speeds);

    expect(result).toHaveLength(2);

    const mid = result.find((u) => u.conceptId === 'mid')!;
    expect(mid.memoryDelta).toBeCloseTo(0.6 * 1.0);
    expect(mid.repNumDelta).toBeCloseTo(0.6 * 1.0); // speed_discount = 1.0

    // small gets chained credit: 0.6 * 0.5 * 1.0 = 0.3
    const small = result.find((u) => u.conceptId === 'small')!;
    expect(small.memoryDelta).toBeCloseTo(0.6 * 0.5 * 1.0);
    expect(small.repNumDelta).toBeCloseTo(0.6 * 0.5 * 1.0);
  });

  it('should handle cycles gracefully (visited set)', () => {
    // Artificial cycle: A -> B -> A
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'B', targetConceptId: 'A', weight: 0.5 },
      { sourceConceptId: 'A', targetConceptId: 'B', weight: 0.5 },
    ];
    const speeds = new Map([
      ['A', 1.0],
      ['B', 1.0],
    ]);

    // Should not infinite loop
    const result = computeImplicitRepetition('A', 0.4, edges, speeds);
    // B is encompassed by A with weight 0.5
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('should return empty array when no encompassing edges exist', () => {
    const result = computeImplicitRepetition('A', 0.4, [], new Map());
    expect(result).toEqual([]);
  });

  it('should propagate negative credit on failed practice', () => {
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'small', targetConceptId: 'big', weight: 0.5 },
    ];
    const speeds = new Map([
      ['small', 1.2],
      ['big', 1.0],
    ]);

    const result = computeImplicitRepetition('big', -0.3, edges, speeds);

    expect(result).toHaveLength(1);
    expect(result[0].conceptId).toBe('small');
    expect(result[0].memoryDelta).toBeCloseTo(0.5 * -0.3);
    expect(result[0].repNumDelta).toBeCloseTo(0.5 * -0.3);
  });

  it('should not include the practiced concept in results', () => {
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'small', targetConceptId: 'big', weight: 0.5 },
    ];
    const speeds = new Map([
      ['small', 1.0],
      ['big', 1.0],
    ]);

    const result = computeImplicitRepetition('big', 0.4, edges, speeds);
    expect(result.find((u) => u.conceptId === 'big')).toBeUndefined();
  });
});
