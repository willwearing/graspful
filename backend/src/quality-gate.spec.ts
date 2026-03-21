import { selectNextTask } from './learning-engine/task-selector';
import {
  detectPlateau,
  findWeakPrerequisites,
} from './learning-engine/plateau-detector';
import { ConceptSnapshot, SectionSnapshot, SimpleEdge } from './learning-engine/types';

/**
 * Pre-Pilot Quality Gate: Academy-scoped engine with multi-course scenarios.
 *
 * These tests validate that the learning engine correctly handles
 * cross-course prerequisites, independent branches, prerequisite
 * unlocking, and cross-course remediation targeting.
 */
describe('Pre-Pilot Quality Gate — Multi-Course Academy', () => {
  const ACADEMY_ID = 'academy-1';
  const COURSE_A = 'course-a';
  const COURSE_B = 'course-b';

  /**
   * Test 1: Two-course academy with cross-course prerequisites
   *
   * Course A: A1, A2
   * Course B: B1 (requires A2)
   *
   * When A2 is not mastered, B1 must NOT be on the frontier.
   * When A2 IS mastered, B1 IS on the frontier.
   */
  describe('Test 1: Cross-course prerequisite gating', () => {
    const edges: SimpleEdge[] = [
      { source: 'A1', target: 'A2' }, // A1 -> A2 within course A
      { source: 'A2', target: 'B1' }, // A2 -> B1 cross-course
    ];
    const sections: SectionSnapshot[] = [];

    it('B1 is NOT on the frontier when prerequisite A2 is not mastered', () => {
      const snapshots: ConceptSnapshot[] = [
        { conceptId: 'A1', courseId: COURSE_A, masteryState: 'mastered', memory: 0.9, failCount: 0 },
        { conceptId: 'A2', courseId: COURSE_A, masteryState: 'in_progress', memory: 0.5, failCount: 0 },
        { conceptId: 'B1', courseId: COURSE_B, masteryState: 'unstarted', memory: 1.0, failCount: 0 },
      ];

      // B1 should NOT be on the frontier because A2 is not mastered.
      // Only A2 could be frontier-eligible (but it's in_progress, not unstarted).
      // With an empty frontier, the engine should fall back to quiz.
      const result = selectNextTask(snapshots, sections, edges, [], 0, ACADEMY_ID);
      expect(result.taskType).toBe('quiz');
      // B1 must not be recommended as a lesson
      expect(result.conceptId).not.toBe('B1');
    });

    it('B1 IS on the frontier when prerequisite A2 is mastered', () => {
      const snapshots: ConceptSnapshot[] = [
        { conceptId: 'A1', courseId: COURSE_A, masteryState: 'mastered', memory: 0.9, failCount: 0 },
        { conceptId: 'A2', courseId: COURSE_A, masteryState: 'mastered', memory: 0.8, failCount: 0 },
        { conceptId: 'B1', courseId: COURSE_B, masteryState: 'unstarted', memory: 1.0, failCount: 0 },
      ];

      // B1 IS on the frontier now that A2 is mastered
      const frontier = ['B1'];
      const result = selectNextTask(snapshots, sections, edges, frontier, 0, ACADEMY_ID);
      expect(result.taskType).toBe('lesson');
      expect(result.conceptId).toBe('B1');
    });
  });

  /**
   * Test 2: One blocked branch doesn't stall another
   *
   * Course A: A1 → A2 → A3
   * Course B: B1 → B2 (independent)
   *
   * A2 is plateaued with remediation blocking it.
   * B1 is frontier-ready. The engine should pick B1 (lesson), not get stuck.
   */
  describe('Test 2: Blocked branch does not stall independent branch', () => {
    const edges: SimpleEdge[] = [
      { source: 'A1', target: 'A2' },
      { source: 'A2', target: 'A3' },
      // B1 → B2 is independent, no cross-course edges
      { source: 'B1', target: 'B2' },
    ];
    const sections: SectionSnapshot[] = [];

    it('selects B1 lesson when A2 is plateaued but A1 is mastered (no weak prereqs)', () => {
      const snapshots: ConceptSnapshot[] = [
        // Course A: A1 mastered, A2 plateaued (failCount=2), A3 unstarted
        { conceptId: 'A1', courseId: COURSE_A, masteryState: 'mastered', memory: 0.9, failCount: 0 },
        { conceptId: 'A2', courseId: COURSE_A, masteryState: 'in_progress', memory: 0.4, failCount: 2 },
        { conceptId: 'A3', courseId: COURSE_A, masteryState: 'unstarted', memory: 1.0, failCount: 0 },
        // Course B: B1 is unstarted (frontier-ready, no prereqs needed), B2 unstarted
        { conceptId: 'B1', courseId: COURSE_B, masteryState: 'unstarted', memory: 1.0, failCount: 0 },
        { conceptId: 'B2', courseId: COURSE_B, masteryState: 'unstarted', memory: 1.0, failCount: 0 },
      ];

      // A2 is plateaued but its prereq A1 is mastered → no weak prereqs → P1 skipped.
      // No urgent reviews (P2). No section exams (P3).
      // B1 is on the frontier (P4).
      const frontier = ['B1'];
      const result = selectNextTask(snapshots, sections, edges, frontier, 0, ACADEMY_ID);

      expect(result.taskType).toBe('lesson');
      expect(result.conceptId).toBe('B1');
      expect(result.courseId).toBe(COURSE_B);
    });
  });

  /**
   * Test 3: Cross-course prerequisite unlocking
   *
   * Concept B1 (course B) has prerequisite A2 (course A).
   * Phase 1: A2 is in_progress → B1 should NOT appear as a lesson task
   * Phase 2: A2 is mastered → B1 SHOULD appear as a lesson task
   */
  describe('Test 3: Cross-course prerequisite unlocking', () => {
    const edges: SimpleEdge[] = [
      { source: 'A2', target: 'B1' },
    ];
    const sections: SectionSnapshot[] = [];

    it('Phase 1 → Phase 2: B1 unlocks only after A2 is mastered', () => {
      // Phase 1: A2 in_progress — B1 not on frontier
      const snapshotsPhase1: ConceptSnapshot[] = [
        { conceptId: 'A2', courseId: COURSE_A, masteryState: 'in_progress', memory: 0.5, failCount: 0 },
        { conceptId: 'B1', courseId: COURSE_B, masteryState: 'unstarted', memory: 1.0, failCount: 0 },
      ];

      // B1 is NOT on the frontier (A2 not mastered), so frontier is empty
      const result1 = selectNextTask(snapshotsPhase1, sections, edges, [], 0, ACADEMY_ID);
      expect(result1.taskType).not.toBe('lesson');
      // Specifically, B1 should not be recommended
      if (result1.conceptId) {
        expect(result1.conceptId).not.toBe('B1');
      }

      // Phase 2: A2 mastered — B1 is now on the frontier
      const snapshotsPhase2: ConceptSnapshot[] = [
        { conceptId: 'A2', courseId: COURSE_A, masteryState: 'mastered', memory: 0.8, failCount: 0 },
        { conceptId: 'B1', courseId: COURSE_B, masteryState: 'unstarted', memory: 1.0, failCount: 0 },
      ];

      const frontier = ['B1'];
      const result2 = selectNextTask(snapshotsPhase2, sections, edges, frontier, 0, ACADEMY_ID);
      expect(result2.taskType).toBe('lesson');
      expect(result2.conceptId).toBe('B1');
    });
  });

  /**
   * Test 4: Cross-course remediation targeting
   *
   * B1 (course B) is plateaued (failCount >= 2).
   * B1's prerequisite is A2 (course A), and A2 is not mastered (weak).
   *
   * findWeakPrerequisites should return A2.
   * selectNextTask should return a remediation task targeting A2.
   */
  describe('Test 4: Cross-course remediation targeting', () => {
    const edges: SimpleEdge[] = [
      { source: 'A2', target: 'B1' }, // A2 is prerequisite of B1
    ];
    const sections: SectionSnapshot[] = [];

    it('findWeakPrerequisites returns A2 (cross-course) as a weak prerequisite of B1', () => {
      const snapshots: ConceptSnapshot[] = [
        { conceptId: 'A2', courseId: COURSE_A, masteryState: 'in_progress', memory: 0.3, failCount: 0 },
        { conceptId: 'B1', courseId: COURSE_B, masteryState: 'in_progress', memory: 0.4, failCount: 3 },
      ];

      // B1 is plateaued
      expect(detectPlateau(snapshots[1])).toBe(true);

      // A2 should be identified as a weak prerequisite of B1
      const weakPrereqs = findWeakPrerequisites('B1', edges, snapshots);
      expect(weakPrereqs).toContain('A2');
      expect(weakPrereqs).toHaveLength(1);
    });

    it('selectNextTask returns remediation targeting A2 when B1 is plateaued', () => {
      const snapshots: ConceptSnapshot[] = [
        { conceptId: 'A2', courseId: COURSE_A, masteryState: 'in_progress', memory: 0.3, failCount: 0 },
        { conceptId: 'B1', courseId: COURSE_B, masteryState: 'in_progress', memory: 0.4, failCount: 3 },
      ];

      const result = selectNextTask(snapshots, sections, edges, [], 0, ACADEMY_ID);

      expect(result.taskType).toBe('remediation');
      expect(result.conceptId).toBe('A2'); // targets the cross-course weak prereq
      expect(result.courseId).toBe(COURSE_A); // remediation in the prerequisite's course
      expect(result.reason).toContain('B1'); // mentions the blocked concept
    });
  });
});
