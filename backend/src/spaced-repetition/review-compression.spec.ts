import { rankReviewsByCompression } from './review-compression';
import { EncompassingLink } from './types';

describe('rankReviewsByCompression', () => {
  it('should rank concepts by how many due reviews they implicitly cover', () => {
    // "big" encompasses "small1" and "small2" (both due for review)
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'small1', targetConceptId: 'big', weight: 0.5 },
      { sourceConceptId: 'small2', targetConceptId: 'big', weight: 0.5 },
    ];
    const speeds = new Map([
      ['small1', 1.2],
      ['small2', 1.1],
      ['big', 1.0],
    ]);

    const result = rankReviewsByCompression(
      ['big', 'small1', 'small2'],
      edges,
      speeds,
    );

    // "big" should come first because practicing it covers small1 + small2
    expect(result[0]).toBe('big');
    // small1 and small2 follow (covered by big)
    expect(result).toHaveLength(3);
    expect(result).toContain('small1');
    expect(result).toContain('small2');
  });

  it('should return original order when no encompassing edges exist', () => {
    const result = rankReviewsByCompression(['a', 'b', 'c'], [], new Map());
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should not count concepts whose speed is below 1.0', () => {
    // "big" encompasses "slow" (speed < 1.0) — should not count as coverage
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'slow', targetConceptId: 'big', weight: 0.5 },
    ];
    const speeds = new Map([
      ['slow', 0.5], // below threshold
      ['big', 1.0],
    ]);

    const result = rankReviewsByCompression(
      ['big', 'slow'],
      edges,
      speeds,
    );

    // "big" can't cover "slow" (speed < 1.0), so no compression benefit
    // Order preserved by original index tiebreaker
    expect(result).toEqual(['big', 'slow']);
  });

  it('should handle empty due list', () => {
    expect(rankReviewsByCompression([], [], new Map())).toEqual([]);
  });

  it('should count transitive coverage through chains', () => {
    // big -> mid -> small (all due)
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'mid', targetConceptId: 'big', weight: 0.6 },
      { sourceConceptId: 'small', targetConceptId: 'mid', weight: 0.5 },
    ];
    const speeds = new Map([
      ['mid', 1.0],
      ['small', 1.0],
      ['big', 1.0],
    ]);

    const result = rankReviewsByCompression(
      ['big', 'mid', 'small'],
      edges,
      speeds,
    );

    // "big" covers mid + small (2), so it's picked first
    // Then mid and small are covered → appended after
    expect(result[0]).toBe('big');
    expect(result).toHaveLength(3);
  });

  it('should use greedy set-cover: removing covered concepts between picks', () => {
    // Two independent clusters:
    // "a" encompasses "a1", "a2" (both due)
    // "b" encompasses "b1" (due)
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'a1', targetConceptId: 'a', weight: 0.5 },
      { sourceConceptId: 'a2', targetConceptId: 'a', weight: 0.5 },
      { sourceConceptId: 'b1', targetConceptId: 'b', weight: 0.5 },
    ];
    const speeds = new Map([
      ['a1', 1.0], ['a2', 1.0], ['a', 1.0],
      ['b1', 1.0], ['b', 1.0],
    ]);

    const result = rankReviewsByCompression(
      ['a', 'a1', 'a2', 'b', 'b1'],
      edges,
      speeds,
    );

    // "a" picked first (covers 2), then a1/a2 covered.
    // "b" picked next (covers 1), then b1 covered.
    expect(result[0]).toBe('a');
    expect(result).toHaveLength(5);
    // After "a" picks up a1/a2, "b" should appear before b1
    const bIndex = result.indexOf('b');
    const b1Index = result.indexOf('b1');
    expect(bIndex).toBeLessThan(b1Index);
  });
});
