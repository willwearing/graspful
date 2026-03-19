import { generateStudySession } from './session-generator';
import { ConceptSnapshot, SectionSnapshot, SimpleEdge } from './types';

describe('generateStudySession', () => {
  const edges: SimpleEdge[] = [
    { source: 'c1', target: 'c2' },
    { source: 'c2', target: 'c3' },
  ];
  const sections: SectionSnapshot[] = [
    { sectionId: 'section-1', status: 'lesson_in_progress' },
  ];

  it('should generate tasks up to the daily XP target', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.3, failCount: 0 },
      { conceptId: 'c2', masteryState: 'mastered', memory: 0.25, failCount: 0 },
      { conceptId: 'c3', masteryState: 'mastered', memory: 0.4, failCount: 0 },
      { conceptId: 'c4', masteryState: 'mastered', memory: 0.35, failCount: 0 },
      { conceptId: 'c5', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];
    const frontier = ['c5'];

    const session = generateStudySession(snapshots, sections, [], frontier, 40, 0);

    expect(session.tasks.length).toBeGreaterThan(0);
    expect(session.estimatedXP).toBeGreaterThanOrEqual(40);
  });

  it('should include a mix of task types when applicable', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.4, failCount: 0 },
      { conceptId: 'c2', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];
    const frontier = ['c2'];

    const session = generateStudySession(snapshots, sections, edges, frontier, 40, 0);
    const types = new Set(session.tasks.map((t) => t.taskType));

    // Should have at least review (c1 memory < 0.5) and lesson (c2 at frontier)
    expect(types.has('review')).toBe(true);
    expect(types.has('lesson')).toBe(true);
  });

  it('should include quiz when XP threshold is reached mid-session', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'c2', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];
    const frontier = ['c2'];

    // Start with 140 XP already earned - quiz should trigger soon
    const session = generateStudySession(snapshots, sections, edges, frontier, 200, 140);
    const hasQuiz = session.tasks.some((t) => t.taskType === 'quiz');
    expect(hasQuiz).toBe(true);
  });

  it('should not generate more than 20 tasks (safety cap)', () => {
    const snapshots: ConceptSnapshot[] = Array.from({ length: 30 }, (_, i) => ({
      conceptId: `c${i}`,
      masteryState: 'mastered' as const,
      memory: 0.3, // All need review
      failCount: 0,
    }));

    const session = generateStudySession(snapshots, sections, [], [], 500, 0);
    expect(session.tasks.length).toBeLessThanOrEqual(20);
  });

  it('should return empty session when no tasks are needed', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.9, failCount: 0 },
    ];

    // Low XP target, everything is fine
    const session = generateStudySession(snapshots, sections, edges, [], 0, 0);
    expect(session.tasks.length).toBe(0);
    expect(session.estimatedXP).toBe(0);
  });
});
