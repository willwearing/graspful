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
  });

  it('should return original order when no encompassing edges exist', () => {
    const result = rankReviewsByCompression(['a', 'b', 'c'], [], new Map());
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should not count concepts whose speed is below 1.0', () => {
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'slow', targetConceptId: 'big', weight: 0.5 },
      { sourceConceptId: 'fast', targetConceptId: 'small', weight: 0.5 },
    ];
    const speeds = new Map([
      ['slow', 0.5], // below threshold
      ['fast', 1.5],
      ['big', 1.0],
      ['small', 1.0],
    ]);

    const result = rankReviewsByCompression(
      ['big', 'small'],
      edges,
      speeds,
    );

    // "small" covers "fast" (speed >= 1.0), "big" covers "slow" (speed < 1.0, doesn't count)
    // But "slow" and "fast" aren't in the due list, so only due-list members count
    // Both "big" and "small" have 0 coverage of due-list items -> original order
    expect(result).toEqual(['big', 'small']);
  });

  it('should only count coverage of concepts in the due review list', () => {
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'small', targetConceptId: 'big', weight: 0.5 },
    ];
    const speeds = new Map([
      ['small', 1.2],
      ['big', 1.0],
    ]);

    // Only "big" is due, "small" is NOT due
    const result = rankReviewsByCompression(['big'], edges, speeds);
    // "big" has 0 coverage of other due items (small isn't due)
    expect(result).toEqual(['big']);
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

    // "big" covers mid + small (2), "mid" covers small (1), "small" covers 0
    expect(result[0]).toBe('big');
    expect(result[1]).toBe('mid');
    expect(result[2]).toBe('small');
  });
});
