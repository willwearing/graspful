import { GraphValidationService } from './graph-validation.service';

describe('GraphValidationService', () => {
  let service: GraphValidationService;

  beforeEach(() => {
    service = new GraphValidationService();
  });

  describe('detectCycles', () => {
    it('should return no errors for a valid DAG', () => {
      const concepts = ['A', 'B', 'C'];
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
      ];
      const result = service.detectCycles(concepts, edges);
      expect(result).toEqual([]);
    });

    it('should detect a simple cycle', () => {
      const concepts = ['A', 'B', 'C'];
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'C', target: 'A' },
      ];
      const result = service.detectCycles(concepts, edges);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain('Cycle detected');
    });

    it('should detect a self-loop', () => {
      const concepts = ['A'];
      const edges = [{ source: 'A', target: 'A' }];
      const result = service.detectCycles(concepts, edges);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('detectOrphans', () => {
    it('should return no orphans when all concepts have edges', () => {
      const concepts = ['A', 'B', 'C'];
      const prereqEdges = [{ source: 'A', target: 'B' }];
      const encompEdges = [{ source: 'B', target: 'C' }];
      const result = service.detectOrphans(concepts, prereqEdges, encompEdges);
      expect(result).toEqual([]);
    });

    it('should detect orphan concepts with no edges', () => {
      const concepts = ['A', 'B', 'C'];
      const prereqEdges = [{ source: 'A', target: 'B' }];
      const encompEdges: { source: string; target: string }[] = [];
      const result = service.detectOrphans(concepts, prereqEdges, encompEdges);
      expect(result).toEqual(['C']);
    });

    it('should not flag orphans in a single-concept course', () => {
      const concepts = ['A'];
      const result = service.detectOrphans(concepts, [], []);
      expect(result).toEqual([]);
    });
  });

  describe('validateEncompassingWeights', () => {
    it('should accept weights in range 0-1', () => {
      const edges = [
        { source: 'A', target: 'B', weight: 0.0 },
        { source: 'B', target: 'C', weight: 1.0 },
        { source: 'A', target: 'C', weight: 0.5 },
      ];
      const result = service.validateEncompassingWeights(edges);
      expect(result).toEqual([]);
    });

    it('should reject weights outside 0-1', () => {
      const edges = [
        { source: 'A', target: 'B', weight: 1.5 },
        { source: 'C', target: 'D', weight: -0.1 },
      ];
      const result = service.validateEncompassingWeights(edges);
      expect(result).toHaveLength(2);
    });
  });

  describe('validateReferences', () => {
    it('should pass when all edge references exist', () => {
      const conceptIds = new Set(['A', 'B', 'C']);
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
      ];
      const result = service.validateReferences(conceptIds, edges);
      expect(result).toEqual([]);
    });

    it('should detect missing concept references', () => {
      const conceptIds = new Set(['A', 'B']);
      const edges = [
        { source: 'A', target: 'C' },
      ];
      const result = service.validateReferences(conceptIds, edges);
      expect(result).toHaveLength(1);
      expect(result[0]).toContain('C');
    });
  });

  describe('validate (full)', () => {
    it('should return valid for a correct graph', () => {
      const concepts = ['A', 'B', 'C'];
      const prereqEdges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
      ];
      const encompEdges = [
        { source: 'A', target: 'C', weight: 0.5 },
      ];
      const result = service.validate(concepts, prereqEdges, encompEdges);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid with all error types', () => {
      const concepts = ['A', 'B', 'C', 'D'];
      const prereqEdges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'A' }, // cycle
        { source: 'A', target: 'X' }, // missing ref
      ];
      const encompEdges = [
        { source: 'A', target: 'B', weight: 1.5 }, // bad weight
      ];
      // D is orphan
      const result = service.validate(concepts, prereqEdges, encompEdges);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateAcademy', () => {
    it('warns about orphan courses without cross-course edges', () => {
      const result = service.validateAcademy(
        ['course-a', 'course-b'],
        [
          { id: 'course-a:a1', courseSlug: 'course-a' },
          { id: 'course-b:b1', courseSlug: 'course-b' },
        ],
        [],
        [],
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Orphan courses (no cross-course edges): course-a, course-b',
      );
    });

    it('rejects cyclic course dependency projections even when concept refs exist', () => {
      const result = service.validateAcademy(
        ['course-a', 'course-b'],
        [
          { id: 'course-a:a1', courseSlug: 'course-a' },
          { id: 'course-a:a2', courseSlug: 'course-a' },
          { id: 'course-b:b1', courseSlug: 'course-b' },
          { id: 'course-b:b2', courseSlug: 'course-b' },
        ],
        [
          { source: 'course-a:a1', target: 'course-b:b1' },
          { source: 'course-b:b2', target: 'course-a:a2' },
        ],
        [],
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Course dependency Cycle detected'),
        ]),
      );
    });
  });
});
