import { selectNextTask } from './task-selector';
import { ConceptSnapshot, SectionSnapshot, SimpleEdge } from './types';

describe('selectNextTask', () => {
  // Helper to build a basic scenario
  const edges: SimpleEdge[] = [
    { source: 'c1', target: 'c2' },
    { source: 'c2', target: 'c3' },
  ];
  const sections: SectionSnapshot[] = [
    { sectionId: 'section-1', status: 'lesson_in_progress' },
  ];

  it('P1: should recommend remediation when a concept has failCount >= 2 and weak prereqs exist', () => {
    const snapshotsWithWeakPrereq: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'in_progress', memory: 0.5, failCount: 0 },
      { conceptId: 'c2', masteryState: 'in_progress', memory: 0.4, failCount: 2 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];

    const result = selectNextTask(snapshotsWithWeakPrereq, sections, edges, [], 0);
    expect(result.taskType).toBe('remediation');
    expect(result.conceptId).toBe('c1'); // the weak prereq to remediate
    expect(result.reason).toContain('c2'); // mentions the blocked concept
  });

  it('P2: should recommend urgent review when memory < 0.3 on mastered/needs_review concept', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.2, failCount: 0 },
      { conceptId: 'c2', masteryState: 'mastered', memory: 0.8, failCount: 0 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];

    const result = selectNextTask(snapshots, sections, edges, [], 0);
    expect(result.taskType).toBe('review');
    expect(result.conceptId).toBe('c1');
    expect(result.reason).toContain('urgent');
  });

  it('P3: should recommend lesson for frontier concepts', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'c2', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];
    // c2 is at the frontier (c1 mastered, c2 unstarted, prereq satisfied)
    const frontier = ['c2'];

    const result = selectNextTask(snapshots, sections, edges, frontier, 0);
    expect(result.taskType).toBe('lesson');
    expect(result.conceptId).toBe('c2');
  });

  it('P4: should recommend standard review when memory < 0.5 on mastered/needs_review', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.45, failCount: 0 },
      { conceptId: 'c2', masteryState: 'mastered', memory: 0.8, failCount: 0 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];
    // No urgent (memory >= 0.3), no frontier (c2 is mastered already, c3 needs c2)
    // c1 has memory < 0.5 -> standard review

    const result = selectNextTask(snapshots, sections, edges, [], 0);
    expect(result.taskType).toBe('review');
    expect(result.conceptId).toBe('c1');
    expect(result.reason).toContain('review');
  });

  it('P5: should recommend quiz when XP since last quiz >= 150', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'c2', masteryState: 'mastered', memory: 0.8, failCount: 0 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];

    const result = selectNextTask(snapshots, sections, edges, [], 160);
    expect(result.taskType).toBe('quiz');
    expect(result.conceptId).toBeUndefined();
  });

  it('should prioritize remediation over urgent review', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'needs_review', memory: 0.2, failCount: 0 },
      { conceptId: 'c2', masteryState: 'in_progress', memory: 0.3, failCount: 3 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];
    // c2 is plateaued, c1 is its prereq and not mastered -> remediation on c1
    // c1 also qualifies for urgent review (memory 0.2)
    // Remediation should win (P1 > P2)

    const result = selectNextTask(snapshots, sections, edges, [], 0);
    expect(result.taskType).toBe('remediation');
  });

  it('should return quiz fallback when nothing else applies', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'c2', masteryState: 'mastered', memory: 0.8, failCount: 0 },
      { conceptId: 'c3', masteryState: 'mastered', memory: 0.7, failCount: 0 },
    ];
    // Everything mastered, good memory, no XP threshold
    const result = selectNextTask(snapshots, sections, edges, [], 0);
    // Nothing to do - should still return something reasonable
    expect(result.taskType).toBe('quiz');
    expect(result.reason).toContain('caught up');
  });

  it('should return quiz fallback for empty snapshots', () => {
    const result = selectNextTask([], [], [], [], 0);
    expect(result.taskType).toBe('quiz');
    expect(result.reason).toContain('caught up');
  });

  it('should NOT trigger remediation on mastered concepts with high failCount', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'in_progress', memory: 0.5, failCount: 0 },
      { conceptId: 'c2', masteryState: 'mastered', memory: 0.8, failCount: 3 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];
    const result = selectNextTask(snapshots, sections, edges, ['c3'], 0);
    // c2 is mastered with failCount 3 — should NOT trigger remediation
    expect(result.taskType).toBe('lesson');
    expect(result.conceptId).toBe('c3');
  });

  it('should not trigger remediation when plateau has no weak prereqs', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'c2', masteryState: 'in_progress', memory: 0.4, failCount: 3 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];
    // c2 is plateaued but its prereq (c1) is mastered — no weak prereqs
    const result = selectNextTask(snapshots, sections, edges, ['c3'], 0);
    // Should skip P1, go to P3 (lesson)
    expect(result.taskType).toBe('lesson');
    expect(result.conceptId).toBe('c3');
  });

  it('P4: should only match memory between 0.3 and 0.5 (not overlap with P2)', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.35, failCount: 0 },
      { conceptId: 'c2', masteryState: 'mastered', memory: 0.8, failCount: 0 },
    ];
    // c1 has memory 0.35 — between urgent (0.3) and standard (0.5)
    const result = selectNextTask(snapshots, sections, [], [], 0);
    expect(result.taskType).toBe('review');
    expect(result.conceptId).toBe('c1');
    expect(result.reason).toContain('review');
  });

  it('P3: should prioritize a ready section exam over new lessons', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'c2', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];
    const result = selectNextTask(
      snapshots,
      [{ sectionId: 'section-1', status: 'exam_ready' }],
      edges,
      ['c2'],
      0,
    );
    expect(result.taskType).toBe('section_exam');
    expect(result.sectionId).toBe('section-1');
  });
});
