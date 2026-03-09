import {
  binaryEntropy,
  totalEntropy,
  expectedInformationGain,
  selectNextConcept,
} from './mepe-selector';
import { SimpleEdge } from '@/knowledge-graph/graph-query.service';

describe('MEPE Question Selector', () => {
  describe('binaryEntropy', () => {
    it('should return 1.0 for p = 0.5 (maximum uncertainty)', () => {
      expect(binaryEntropy(0.5)).toBeCloseTo(1.0, 5);
    });

    it('should return 0 for p = 0 (certain not-learned)', () => {
      expect(binaryEntropy(0.0)).toBe(0);
    });

    it('should return 0 for p = 1 (certain learned)', () => {
      expect(binaryEntropy(1.0)).toBe(0);
    });

    it('should be symmetric: H(p) = H(1-p)', () => {
      expect(binaryEntropy(0.3)).toBeCloseTo(binaryEntropy(0.7), 10);
    });
  });

  describe('totalEntropy', () => {
    it('should sum entropy across all concepts', () => {
      const masteries = new Map([
        ['A', 0.5],  // entropy = 1.0
        ['B', 0.0],  // entropy = 0.0
        ['C', 1.0],  // entropy = 0.0
      ]);
      expect(totalEntropy(masteries)).toBeCloseTo(1.0, 5);
    });

    it('should return 0 for all certain states', () => {
      const masteries = new Map([
        ['A', 0.0],
        ['B', 1.0],
      ]);
      expect(totalEntropy(masteries)).toBe(0);
    });
  });

  describe('expectedInformationGain', () => {
    it('should return positive gain for uncertain concept', () => {
      const masteries = new Map([
        ['A', 0.5],
        ['B', 0.5],
      ]);
      const edges: SimpleEdge[] = [{ source: 'A', target: 'B' }];
      const gain = expectedInformationGain('A', masteries, edges, 0.2);
      expect(gain).toBeGreaterThan(0);
    });

    it('should return 0 gain for fully certain concept', () => {
      const masteries = new Map([
        ['A', 1.0],
        ['B', 0.5],
      ]);
      const edges: SimpleEdge[] = [];
      // Testing a known concept gives no info
      const gain = expectedInformationGain('A', masteries, edges, 0.2);
      expect(gain).toBeCloseTo(0, 3);
    });
  });

  describe('selectNextConcept', () => {
    it('should select the concept with highest expected information gain', () => {
      const masteries = new Map([
        ['A', 0.5],  // maximum uncertainty
        ['B', 0.9],  // mostly certain
        ['C', 0.1],  // mostly certain
      ]);
      const edges: SimpleEdge[] = [];
      const testedIds = new Set<string>();

      const result = selectNextConcept(masteries, edges, testedIds, 0.2);
      expect(result).toBe('A');
    });

    it('should skip already-tested concepts', () => {
      const masteries = new Map([
        ['A', 0.5],
        ['B', 0.5],
      ]);
      const edges: SimpleEdge[] = [];
      const testedIds = new Set(['A']);

      const result = selectNextConcept(masteries, edges, testedIds, 0.2);
      expect(result).toBe('B');
    });

    it('should return null when all concepts tested', () => {
      const masteries = new Map([['A', 0.5]]);
      const edges: SimpleEdge[] = [];
      const testedIds = new Set(['A']);

      const result = selectNextConcept(masteries, edges, testedIds, 0.2);
      expect(result).toBeNull();
    });

    it('should prefer concepts with graph connectivity (more propagation)', () => {
      // A has no edges, D is a hub with prereqs and dependents
      const masteries = new Map([
        ['A', 0.5],
        ['B', 0.5],
        ['C', 0.5],
        ['D', 0.5],
      ]);
      const edges: SimpleEdge[] = [
        { source: 'B', target: 'D' },
        { source: 'C', target: 'D' },
        { source: 'D', target: 'A' },
      ];
      const testedIds = new Set<string>();

      const result = selectNextConcept(masteries, edges, testedIds, 0.2);
      // D should be selected because testing it propagates to more concepts
      expect(result).toBe('D');
    });
  });
});
