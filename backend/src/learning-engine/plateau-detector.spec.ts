import {
  detectPlateau,
  findWeakPrerequisites,
} from './plateau-detector';
import { ConceptSnapshot, SimpleEdge } from './types';

describe('detectPlateau', () => {
  it('should detect plateau when failCount >= 2', () => {
    const snapshot: ConceptSnapshot = {
      conceptId: 'c1',
      masteryState: 'in_progress',
      memory: 0.4,
      failCount: 2,
    };
    expect(detectPlateau(snapshot)).toBe(true);
  });

  it('should not detect plateau when failCount < 2', () => {
    const snapshot: ConceptSnapshot = {
      conceptId: 'c1',
      masteryState: 'in_progress',
      memory: 0.4,
      failCount: 1,
    };
    expect(detectPlateau(snapshot)).toBe(false);
  });

  it('should detect plateau when failCount is very high', () => {
    const snapshot: ConceptSnapshot = {
      conceptId: 'c1',
      masteryState: 'needs_review',
      memory: 0.1,
      failCount: 5,
    };
    expect(detectPlateau(snapshot)).toBe(true);
  });
});

describe('findWeakPrerequisites', () => {
  const edges: SimpleEdge[] = [
    { source: 'prereq-a', target: 'c1' },
    { source: 'prereq-b', target: 'c1' },
    { source: 'root', target: 'prereq-a' },
  ];

  it('should return direct prerequisites that are not mastered', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'prereq-a', masteryState: 'in_progress', memory: 0.5, failCount: 0 },
      { conceptId: 'prereq-b', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'root', masteryState: 'mastered', memory: 0.95, failCount: 0 },
    ];

    const weak = findWeakPrerequisites('c1', edges, snapshots);
    expect(weak).toEqual(['prereq-a']);
  });

  it('should return empty array when all prerequisites are mastered', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'prereq-a', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'prereq-b', masteryState: 'mastered', memory: 0.85, failCount: 0 },
    ];

    const weak = findWeakPrerequisites('c1', edges, snapshots);
    expect(weak).toEqual([]);
  });

  it('should include transitive weak prerequisites', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'prereq-a', masteryState: 'in_progress', memory: 0.5, failCount: 0 },
      { conceptId: 'prereq-b', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'root', masteryState: 'needs_review', memory: 0.2, failCount: 1 },
    ];

    const weak = findWeakPrerequisites('c1', edges, snapshots);
    // Both prereq-a and root are weak (not mastered)
    expect(weak).toContain('prereq-a');
    expect(weak).toContain('root');
    expect(weak).not.toContain('prereq-b');
  });

  it('should return empty when concept has no prerequisites', () => {
    const weak = findWeakPrerequisites('root', edges, []);
    expect(weak).toEqual([]);
  });
});
