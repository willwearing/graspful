import { GraphQueryService } from './graph-query.service';

describe('GraphQueryService', () => {
  let service: GraphQueryService;

  beforeEach(() => {
    service = new GraphQueryService();
  });

  describe('topologicalSort', () => {
    it('should sort a linear chain', () => {
      const concepts = ['A', 'B', 'C'];
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
      ];
      const result = service.topologicalSort(concepts, edges);
      expect(result.indexOf('A')).toBeLessThan(result.indexOf('B'));
      expect(result.indexOf('B')).toBeLessThan(result.indexOf('C'));
    });

    it('should sort a diamond graph', () => {
      // A -> B, A -> C, B -> D, C -> D
      const concepts = ['A', 'B', 'C', 'D'];
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'C' },
        { source: 'B', target: 'D' },
        { source: 'C', target: 'D' },
      ];
      const result = service.topologicalSort(concepts, edges);
      expect(result.indexOf('A')).toBeLessThan(result.indexOf('B'));
      expect(result.indexOf('A')).toBeLessThan(result.indexOf('C'));
      expect(result.indexOf('B')).toBeLessThan(result.indexOf('D'));
      expect(result.indexOf('C')).toBeLessThan(result.indexOf('D'));
    });

    it('should handle disconnected nodes', () => {
      const concepts = ['A', 'B', 'C'];
      const edges = [{ source: 'A', target: 'B' }];
      const result = service.topologicalSort(concepts, edges);
      expect(result).toHaveLength(3);
      expect(result.indexOf('A')).toBeLessThan(result.indexOf('B'));
    });

    it('should throw on cyclic graph', () => {
      const concepts = ['A', 'B'];
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'A' },
      ];
      expect(() => service.topologicalSort(concepts, edges)).toThrow('cycle');
    });
  });

  describe('knowledgeFrontier', () => {
    it('should return root concepts when nothing is mastered', () => {
      const concepts = ['A', 'B', 'C'];
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
      ];
      const mastered = new Set<string>();
      const result = service.knowledgeFrontier(concepts, edges, mastered);
      expect(result).toEqual(['A']);
    });

    it('should return next concepts when prerequisites mastered', () => {
      const concepts = ['A', 'B', 'C'];
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
      ];
      const mastered = new Set(['A']);
      const result = service.knowledgeFrontier(concepts, edges, mastered);
      expect(result).toEqual(['B']);
    });

    it('should not include already-mastered concepts', () => {
      const concepts = ['A', 'B', 'C'];
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
      ];
      const mastered = new Set(['A', 'B']);
      const result = service.knowledgeFrontier(concepts, edges, mastered);
      expect(result).toEqual(['C']);
    });

    it('should require ALL prerequisites mastered for multi-prereq concepts', () => {
      // A -> C, B -> C
      const concepts = ['A', 'B', 'C'];
      const edges = [
        { source: 'A', target: 'C' },
        { source: 'B', target: 'C' },
      ];
      const mastered = new Set(['A']);
      const result = service.knowledgeFrontier(concepts, edges, mastered);
      // C requires both A and B, only A mastered -> B is on frontier, not C
      expect(result).toEqual(['B']);
    });

    it('should return empty when everything is mastered', () => {
      const concepts = ['A', 'B'];
      const edges = [{ source: 'A', target: 'B' }];
      const mastered = new Set(['A', 'B']);
      const result = service.knowledgeFrontier(concepts, edges, mastered);
      expect(result).toEqual([]);
    });
  });

  describe('prerequisiteChain', () => {
    it('should return all ancestors of a concept', () => {
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'A', target: 'C' },
      ];
      const result = service.prerequisiteChain('C', edges);
      expect(result.sort()).toEqual(['A', 'B']);
    });

    it('should return empty for a root concept', () => {
      const edges = [{ source: 'A', target: 'B' }];
      const result = service.prerequisiteChain('A', edges);
      expect(result).toEqual([]);
    });

    it('should handle deep chains', () => {
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'C', target: 'D' },
      ];
      const result = service.prerequisiteChain('D', edges);
      expect(result.sort()).toEqual(['A', 'B', 'C']);
    });
  });
});
