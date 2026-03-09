# Phase 5: Learning Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the adaptive learning engine that decides what a student should study next, detects when they're stuck, manages remediations, and generates study sessions.

**Architecture:** Pure functions handle all decision logic (task selection, plateau detection, session generation) with zero side effects. Services orchestrate Prisma persistence and cross-module calls. A single controller exposes 4 endpoints. The engine reads from StudentModelModule and KnowledgeGraphModule but never mutates their data directly.

**Tech Stack:** NestJS, Prisma, Jest, TypeScript

---

### Task 1: Types and Constants

**Files:**
- Create: `backend/src/learning-engine/types.ts`

**Step 1: Create the types file**

```typescript
// backend/src/learning-engine/types.ts

export type TaskType = 'lesson' | 'review' | 'quiz' | 'remediation';

export interface TaskRecommendation {
  taskType: TaskType;
  conceptId?: string;
  reason: string;
}

export interface StudySession {
  tasks: TaskRecommendation[];
  estimatedXP: number;
}

/**
 * Snapshot of a single concept's state, used by pure functions.
 * Mirrors the relevant fields from StudentConceptState.
 */
export interface ConceptSnapshot {
  conceptId: string;
  masteryState: 'unstarted' | 'in_progress' | 'mastered' | 'needs_review';
  memory: number;
  failCount: number;
}

/**
 * A prerequisite edge simplified for pure function consumption.
 */
export interface SimpleEdge {
  source: string;
  target: string;
}

/**
 * An active remediation: a blocked concept and its weak prerequisites.
 */
export interface RemediationRecord {
  id: string;
  blockedConceptId: string;
  weakPrerequisiteId: string;
  resolved: boolean;
  createdAt: Date;
  resolvedAt: Date | null;
}

// XP thresholds and constants
export const QUIZ_XP_THRESHOLD = 150;
export const URGENT_REVIEW_MEMORY_THRESHOLD = 0.3;
export const STANDARD_REVIEW_MEMORY_THRESHOLD = 0.5;
export const PLATEAU_FAIL_COUNT_THRESHOLD = 2;
export const LESSON_XP_ESTIMATE = 15;
export const REVIEW_XP_ESTIMATE = 5;
export const QUIZ_XP_ESTIMATE = 20;
export const REMEDIATION_XP_ESTIMATE = 10;
```

**Step 2: Verify it compiles**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx tsc --noEmit src/learning-engine/types.ts`
Expected: No errors

**Step 3: Ask me for feedback before commit**

**Step 4: Commit**

```bash
git add backend/src/learning-engine/types.ts
git commit -m "feat(learning-engine): add Phase 5 types and constants"
```

---

### Task 2: Plateau Detector (Pure Function)

**Files:**
- Create: `backend/src/learning-engine/plateau-detector.ts`
- Create: `backend/src/learning-engine/plateau-detector.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/src/learning-engine/plateau-detector.spec.ts
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
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/plateau-detector.spec.ts`
Expected: FAIL - cannot find module './plateau-detector'

**Step 3: Write the implementation**

```typescript
// backend/src/learning-engine/plateau-detector.ts
import {
  ConceptSnapshot,
  SimpleEdge,
  PLATEAU_FAIL_COUNT_THRESHOLD,
} from './types';

/**
 * Detect if a student is stuck on a concept.
 * A student is "plateaued" when they've failed the same concept
 * PLATEAU_FAIL_COUNT_THRESHOLD or more times.
 */
export function detectPlateau(snapshot: ConceptSnapshot): boolean {
  return snapshot.failCount >= PLATEAU_FAIL_COUNT_THRESHOLD;
}

/**
 * Given a blocked concept, trace back through the prerequisite graph
 * and return all ancestor concept IDs that are NOT mastered.
 *
 * Uses BFS backwards through edges to find all prerequisites,
 * then filters to those whose masteryState !== 'mastered'.
 */
export function findWeakPrerequisites(
  blockedConceptId: string,
  edges: SimpleEdge[],
  allSnapshots: ConceptSnapshot[],
): string[] {
  // Build reverse adjacency: target -> [sources]
  const reverseAdj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!reverseAdj.has(edge.target)) reverseAdj.set(edge.target, []);
    reverseAdj.get(edge.target)!.push(edge.source);
  }

  // BFS to find all ancestors
  const visited = new Set<string>();
  const queue = [...(reverseAdj.get(blockedConceptId) ?? [])];

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const parent of reverseAdj.get(node) ?? []) {
      if (!visited.has(parent)) queue.push(parent);
    }
  }

  // Build lookup for mastery state
  const snapshotMap = new Map<string, ConceptSnapshot>();
  for (const s of allSnapshots) {
    snapshotMap.set(s.conceptId, s);
  }

  // Filter to weak (not mastered) prerequisites
  return [...visited].filter((id) => {
    const snap = snapshotMap.get(id);
    return !snap || snap.masteryState !== 'mastered';
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/plateau-detector.spec.ts`
Expected: PASS (5 tests)

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add backend/src/learning-engine/plateau-detector.ts backend/src/learning-engine/plateau-detector.spec.ts
git commit -m "feat(learning-engine): add plateau detector pure function with tests"
```

---

### Task 3: Task Selector (Pure Function)

**Files:**
- Create: `backend/src/learning-engine/task-selector.ts`
- Create: `backend/src/learning-engine/task-selector.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/src/learning-engine/task-selector.spec.ts
import { selectNextTask } from './task-selector';
import { ConceptSnapshot, SimpleEdge, TaskRecommendation } from './types';

describe('selectNextTask', () => {
  // Helper to build a basic scenario
  const edges: SimpleEdge[] = [
    { source: 'c1', target: 'c2' },
    { source: 'c2', target: 'c3' },
  ];

  it('P1: should recommend remediation when a concept has failCount >= 2 and weak prereqs exist', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'c2', masteryState: 'in_progress', memory: 0.4, failCount: 2 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];
    // c2 is plateaued but c1 (its prereq) is mastered, so no weak prereqs
    // Need to set up a scenario where prereq IS weak
    const snapshotsWithWeakPrereq: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'in_progress', memory: 0.5, failCount: 0 },
      { conceptId: 'c2', masteryState: 'in_progress', memory: 0.4, failCount: 2 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];

    const result = selectNextTask(snapshotsWithWeakPrereq, edges, [], 0);
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

    const result = selectNextTask(snapshots, edges, [], 0);
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

    const result = selectNextTask(snapshots, edges, frontier, 0);
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

    const result = selectNextTask(snapshots, edges, [], 0);
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

    const result = selectNextTask(snapshots, edges, [], 160);
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

    const result = selectNextTask(snapshots, edges, [], 0);
    expect(result.taskType).toBe('remediation');
  });

  it('should return lesson fallback when nothing else applies', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'c2', masteryState: 'mastered', memory: 0.8, failCount: 0 },
      { conceptId: 'c3', masteryState: 'mastered', memory: 0.7, failCount: 0 },
    ];
    // Everything mastered, good memory, no XP threshold
    const result = selectNextTask(snapshots, edges, [], 0);
    // Nothing to do - should still return something reasonable
    expect(result.taskType).toBe('quiz');
    expect(result.reason).toContain('caught up');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/task-selector.spec.ts`
Expected: FAIL - cannot find module

**Step 3: Write the implementation**

```typescript
// backend/src/learning-engine/task-selector.ts
import { detectPlateau, findWeakPrerequisites } from './plateau-detector';
import {
  ConceptSnapshot,
  SimpleEdge,
  TaskRecommendation,
  QUIZ_XP_THRESHOLD,
  URGENT_REVIEW_MEMORY_THRESHOLD,
  STANDARD_REVIEW_MEMORY_THRESHOLD,
  PLATEAU_FAIL_COUNT_THRESHOLD,
} from './types';

/**
 * Priority-based task selector. Evaluates priorities P1-P5 in order
 * and returns the first matching task recommendation.
 *
 * @param snapshots - All concept states for the student in this course
 * @param edges - Prerequisite edges for the course graph
 * @param frontier - Concept IDs at the knowledge frontier (prereqs met, not started)
 * @param xpSinceLastQuiz - XP earned since the student's last quiz
 */
export function selectNextTask(
  snapshots: ConceptSnapshot[],
  edges: SimpleEdge[],
  frontier: string[],
  xpSinceLastQuiz: number,
): TaskRecommendation {
  // P1: Remediation — plateaued concepts with weak prerequisites
  for (const snap of snapshots) {
    if (detectPlateau(snap)) {
      const weakPrereqs = findWeakPrerequisites(snap.conceptId, edges, snapshots);
      if (weakPrereqs.length > 0) {
        // Pick the weak prerequisite with the lowest memory
        const sorted = weakPrereqs
          .map((id) => snapshots.find((s) => s.conceptId === id))
          .filter((s): s is ConceptSnapshot => s !== undefined)
          .sort((a, b) => a.memory - b.memory);

        const target = sorted.length > 0 ? sorted[0] : undefined;
        return {
          taskType: 'remediation',
          conceptId: target?.conceptId ?? weakPrereqs[0],
          reason: `Remediate weak prerequisite for blocked concept ${snap.conceptId} (failed ${snap.failCount} times)`,
        };
      }
    }
  }

  // P2: Urgent reviews — memory < 0.3 on mastered/needs_review concepts
  const urgentReviews = snapshots
    .filter(
      (s) =>
        (s.masteryState === 'mastered' || s.masteryState === 'needs_review') &&
        s.memory < URGENT_REVIEW_MEMORY_THRESHOLD,
    )
    .sort((a, b) => a.memory - b.memory);

  if (urgentReviews.length > 0) {
    return {
      taskType: 'review',
      conceptId: urgentReviews[0].conceptId,
      reason: `Urgent review: memory at ${urgentReviews[0].memory.toFixed(2)} (below ${URGENT_REVIEW_MEMORY_THRESHOLD})`,
    };
  }

  // P3: New lessons — concepts at the knowledge frontier
  if (frontier.length > 0) {
    return {
      taskType: 'lesson',
      conceptId: frontier[0],
      reason: `New lesson: next concept at knowledge frontier`,
    };
  }

  // P4: Standard reviews — memory < 0.5 on mastered/needs_review concepts
  const standardReviews = snapshots
    .filter(
      (s) =>
        (s.masteryState === 'mastered' || s.masteryState === 'needs_review') &&
        s.memory < STANDARD_REVIEW_MEMORY_THRESHOLD,
    )
    .sort((a, b) => a.memory - b.memory);

  if (standardReviews.length > 0) {
    return {
      taskType: 'review',
      conceptId: standardReviews[0].conceptId,
      reason: `Standard review: memory at ${standardReviews[0].memory.toFixed(2)} (below ${STANDARD_REVIEW_MEMORY_THRESHOLD})`,
    };
  }

  // P5: Quiz — when enough XP earned since last quiz
  if (xpSinceLastQuiz >= QUIZ_XP_THRESHOLD) {
    return {
      taskType: 'quiz',
      reason: `Quiz time: ${xpSinceLastQuiz} XP earned since last quiz (threshold: ${QUIZ_XP_THRESHOLD})`,
    };
  }

  // Fallback: suggest a quiz as a checkpoint (student is all caught up)
  return {
    taskType: 'quiz',
    reason: `All caught up! Take a quiz to test your knowledge`,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/task-selector.spec.ts`
Expected: PASS (7 tests)

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add backend/src/learning-engine/task-selector.ts backend/src/learning-engine/task-selector.spec.ts
git commit -m "feat(learning-engine): add priority-based task selector with tests"
```

---

### Task 4: Session Generator (Pure Function)

**Files:**
- Create: `backend/src/learning-engine/session-generator.ts`
- Create: `backend/src/learning-engine/session-generator.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/src/learning-engine/session-generator.spec.ts
import { generateStudySession } from './session-generator';
import { ConceptSnapshot, SimpleEdge } from './types';

describe('generateStudySession', () => {
  const edges: SimpleEdge[] = [
    { source: 'c1', target: 'c2' },
    { source: 'c2', target: 'c3' },
  ];

  it('should generate tasks up to the daily XP target', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.9, failCount: 0 },
      { conceptId: 'c2', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
      { conceptId: 'c3', masteryState: 'unstarted', memory: 1.0, failCount: 0 },
    ];
    const frontier = ['c2'];

    const session = generateStudySession(snapshots, edges, frontier, 40, 0);

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

    const session = generateStudySession(snapshots, edges, frontier, 40, 0);
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
    const session = generateStudySession(snapshots, edges, frontier, 200, 140);
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

    const session = generateStudySession(snapshots, [], [], 500, 0);
    expect(session.tasks.length).toBeLessThanOrEqual(20);
  });

  it('should return empty session when no tasks are needed', () => {
    const snapshots: ConceptSnapshot[] = [
      { conceptId: 'c1', masteryState: 'mastered', memory: 0.9, failCount: 0 },
    ];

    // Low XP target, everything is fine
    const session = generateStudySession(snapshots, edges, [], 0, 0);
    expect(session.tasks.length).toBe(0);
    expect(session.estimatedXP).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/session-generator.spec.ts`
Expected: FAIL - cannot find module

**Step 3: Write the implementation**

```typescript
// backend/src/learning-engine/session-generator.ts
import { selectNextTask } from './task-selector';
import {
  ConceptSnapshot,
  SimpleEdge,
  StudySession,
  TaskRecommendation,
  LESSON_XP_ESTIMATE,
  REVIEW_XP_ESTIMATE,
  QUIZ_XP_ESTIMATE,
  QUIZ_XP_THRESHOLD,
  REMEDIATION_XP_ESTIMATE,
} from './types';

const MAX_TASKS = 20;

function estimateTaskXP(taskType: string): number {
  switch (taskType) {
    case 'lesson':
      return LESSON_XP_ESTIMATE;
    case 'review':
      return REVIEW_XP_ESTIMATE;
    case 'remediation':
      return REMEDIATION_XP_ESTIMATE;
    case 'quiz':
      return QUIZ_XP_ESTIMATE;
    default:
      return 0;
  }
}

/**
 * Generate an ordered study session by repeatedly calling selectNextTask
 * until we hit the daily XP target or run out of things to do.
 *
 * @param snapshots - All concept states for the student
 * @param edges - Prerequisite edges for the course
 * @param frontier - Current knowledge frontier concept IDs
 * @param dailyXPTarget - How much XP the student wants to earn today
 * @param xpSinceLastQuiz - XP earned since the student's last quiz
 */
export function generateStudySession(
  snapshots: ConceptSnapshot[],
  edges: SimpleEdge[],
  frontier: string[],
  dailyXPTarget: number,
  xpSinceLastQuiz: number,
): StudySession {
  const tasks: TaskRecommendation[] = [];
  let accumulatedXP = 0;
  let runningXPSinceQuiz = xpSinceLastQuiz;
  const usedConceptIds = new Set<string>();
  const remainingFrontier = [...frontier];

  while (accumulatedXP < dailyXPTarget && tasks.length < MAX_TASKS) {
    // Build a filtered snapshot/frontier for this iteration
    // Remove concepts already assigned in this session
    const availableFrontier = remainingFrontier.filter(
      (id) => !usedConceptIds.has(id),
    );

    const task = selectNextTask(
      snapshots.filter((s) => !usedConceptIds.has(s.conceptId)),
      edges,
      availableFrontier,
      runningXPSinceQuiz,
    );

    // Guard against infinite loops: if the task selector returns
    // the same fallback quiz repeatedly, stop
    if (
      tasks.length > 0 &&
      task.taskType === 'quiz' &&
      task.reason.includes('caught up')
    ) {
      break;
    }

    tasks.push(task);

    const xp = estimateTaskXP(task.taskType);
    accumulatedXP += xp;
    runningXPSinceQuiz += xp;

    // Track used concepts to avoid duplicates
    if (task.conceptId) {
      usedConceptIds.add(task.conceptId);
    }

    // Reset XP counter after a quiz
    if (task.taskType === 'quiz') {
      runningXPSinceQuiz = 0;
    }
  }

  return {
    tasks,
    estimatedXP: accumulatedXP,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/session-generator.spec.ts`
Expected: PASS (5 tests)

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add backend/src/learning-engine/session-generator.ts backend/src/learning-engine/session-generator.spec.ts
git commit -m "feat(learning-engine): add study session generator with tests"
```

---

### Task 5: Prisma Migration for Remediation Model

**Files:**
- Modify: `backend/prisma/schema.prisma` (add Remediation model)

**Step 1: Add the Remediation model to the Prisma schema**

Add the following after the `ProblemAttempt` model at the bottom of `backend/prisma/schema.prisma`:

```prisma
// =============================================================================
// LEARNING ENGINE — REMEDIATIONS
// =============================================================================

model Remediation {
  id                  String    @id @default(uuid()) @db.Uuid
  userId              String    @map("user_id") @db.Uuid
  courseId             String    @map("course_id") @db.Uuid
  blockedConceptId    String    @map("blocked_concept_id") @db.Uuid
  weakPrerequisiteId  String    @map("weak_prerequisite_id") @db.Uuid
  resolved            Boolean   @default(false)
  createdAt           DateTime  @default(now()) @map("created_at") @db.Timestamptz
  resolvedAt          DateTime? @map("resolved_at") @db.Timestamptz

  @@unique([userId, blockedConceptId, weakPrerequisiteId])
  @@index([userId, courseId, resolved])
  @@map("remediations")
}
```

**Step 2: Generate and run the migration**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx prisma migrate dev --name add_remediation_model`
Expected: Migration created and applied successfully

**Step 3: Verify Prisma client is updated**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx prisma generate`
Expected: Prisma client generated

**Step 4: Ask me for feedback before commit**

**Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(learning-engine): add Remediation model to Prisma schema"
```

---

### Task 6: Remediation Service

**Files:**
- Create: `backend/src/learning-engine/remediation.service.ts`
- Create: `backend/src/learning-engine/remediation.service.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/src/learning-engine/remediation.service.spec.ts
import { RemediationService } from './remediation.service';

describe('RemediationService', () => {
  let service: RemediationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      remediation: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({
          id: 'rem-1',
          userId: 'u1',
          courseId: 'course-1',
          blockedConceptId: 'c2',
          weakPrerequisiteId: 'c1',
          resolved: false,
          createdAt: new Date(),
          resolvedAt: null,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    service = new RemediationService(mockPrisma);
  });

  describe('getActiveRemediations', () => {
    it('should return unresolved remediations for user/course', async () => {
      mockPrisma.remediation.findMany.mockResolvedValue([
        {
          id: 'rem-1',
          blockedConceptId: 'c2',
          weakPrerequisiteId: 'c1',
          resolved: false,
        },
      ]);

      const result = await service.getActiveRemediations('u1', 'course-1');
      expect(result).toHaveLength(1);
      expect(result[0].blockedConceptId).toBe('c2');
      expect(mockPrisma.remediation.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', courseId: 'course-1', resolved: false },
      });
    });
  });

  describe('createRemediation', () => {
    it('should upsert a remediation record', async () => {
      await service.createRemediation('u1', 'course-1', 'c2', 'c1');

      expect(mockPrisma.remediation.upsert).toHaveBeenCalledWith({
        where: {
          userId_blockedConceptId_weakPrerequisiteId: {
            userId: 'u1',
            blockedConceptId: 'c2',
            weakPrerequisiteId: 'c1',
          },
        },
        create: {
          userId: 'u1',
          courseId: 'course-1',
          blockedConceptId: 'c2',
          weakPrerequisiteId: 'c1',
        },
        update: {
          resolved: false,
          resolvedAt: null,
        },
      });
    });
  });

  describe('resolveRemediationsForPrerequisite', () => {
    it('should mark remediations as resolved when prereq is re-mastered', async () => {
      await service.resolveRemediationsForPrerequisite('u1', 'c1');

      expect(mockPrisma.remediation.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          weakPrerequisiteId: 'c1',
          resolved: false,
        },
        data: {
          resolved: true,
          resolvedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getBlockedConceptIds', () => {
    it('should return concept IDs blocked by unresolved remediations', async () => {
      mockPrisma.remediation.findMany.mockResolvedValue([
        { blockedConceptId: 'c2', weakPrerequisiteId: 'c1', resolved: false },
        { blockedConceptId: 'c3', weakPrerequisiteId: 'c1', resolved: false },
      ]);

      const result = await service.getBlockedConceptIds('u1', 'course-1');
      expect(result).toEqual(new Set(['c2', 'c3']));
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/remediation.service.spec.ts`
Expected: FAIL - cannot find module

**Step 3: Write the implementation**

```typescript
// backend/src/learning-engine/remediation.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RemediationService {
  constructor(private prisma: PrismaService) {}

  async getActiveRemediations(userId: string, courseId: string) {
    return this.prisma.remediation.findMany({
      where: { userId, courseId, resolved: false },
    });
  }

  async createRemediation(
    userId: string,
    courseId: string,
    blockedConceptId: string,
    weakPrerequisiteId: string,
  ) {
    return this.prisma.remediation.upsert({
      where: {
        userId_blockedConceptId_weakPrerequisiteId: {
          userId,
          blockedConceptId,
          weakPrerequisiteId,
        },
      },
      create: {
        userId,
        courseId,
        blockedConceptId,
        weakPrerequisiteId,
      },
      update: {
        resolved: false,
        resolvedAt: null,
      },
    });
  }

  async resolveRemediationsForPrerequisite(
    userId: string,
    weakPrerequisiteId: string,
  ) {
    return this.prisma.remediation.updateMany({
      where: {
        userId,
        weakPrerequisiteId,
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  async getBlockedConceptIds(
    userId: string,
    courseId: string,
  ): Promise<Set<string>> {
    const active = await this.getActiveRemediations(userId, courseId);
    return new Set(active.map((r) => r.blockedConceptId));
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/remediation.service.spec.ts`
Expected: PASS (4 tests)

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add backend/src/learning-engine/remediation.service.ts backend/src/learning-engine/remediation.service.spec.ts
git commit -m "feat(learning-engine): add remediation service with Prisma persistence"
```

---

### Task 7: Lesson Service

**Files:**
- Create: `backend/src/learning-engine/lesson.service.ts`
- Create: `backend/src/learning-engine/lesson.service.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/src/learning-engine/lesson.service.spec.ts
import { LessonService } from './lesson.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('LessonService', () => {
  let service: LessonService;
  let mockPrisma: any;
  let mockRemediationService: any;

  beforeEach(() => {
    mockPrisma = {
      concept: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'c2',
          courseId: 'course-1',
          orgId: 'org-1',
          name: 'Concept 2',
        }),
      },
      studentConceptState: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 'u1',
          conceptId: 'c2',
          masteryState: 'unstarted',
          failCount: 0,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      prerequisiteEdge: {
        findMany: jest.fn().mockResolvedValue([
          { sourceConceptId: 'c1', targetConceptId: 'c2' },
        ]),
      },
      knowledgePoint: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'kp1',
            conceptId: 'c2',
            slug: 'kp-1',
            instructionText: 'Learn this',
            workedExampleText: 'Example here',
          },
        ]),
      },
    };

    mockRemediationService = {
      getBlockedConceptIds: jest.fn().mockResolvedValue(new Set()),
    };

    service = new LessonService(mockPrisma, mockRemediationService);
  });

  describe('startLesson', () => {
    it('should start a lesson for a valid frontier concept', async () => {
      const result = await service.startLesson('u1', 'org-1', 'course-1', 'c2');

      expect(result.conceptId).toBe('c2');
      expect(result.knowledgePoints).toHaveLength(1);
      expect(result.knowledgePoints[0].instructionText).toBe('Learn this');
      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
        where: { userId_conceptId: { userId: 'u1', conceptId: 'c2' } },
        data: { masteryState: 'in_progress' },
      });
    });

    it('should throw when concept not found', async () => {
      mockPrisma.concept.findFirst.mockResolvedValue(null);

      await expect(
        service.startLesson('u1', 'org-1', 'course-1', 'c2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when concept is blocked by remediation', async () => {
      mockRemediationService.getBlockedConceptIds.mockResolvedValue(
        new Set(['c2']),
      );

      await expect(
        service.startLesson('u1', 'org-1', 'course-1', 'c2'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when concept is already mastered', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue({
        userId: 'u1',
        conceptId: 'c2',
        masteryState: 'mastered',
        failCount: 0,
      });

      await expect(
        service.startLesson('u1', 'org-1', 'course-1', 'c2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeLesson', () => {
    it('should mark concept as in_progress and record lastPracticedAt', async () => {
      await service.completeLesson('u1', 'course-1', 'c2');

      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
        where: { userId_conceptId: { userId: 'u1', conceptId: 'c2' } },
        data: {
          lastPracticedAt: expect.any(Date),
        },
      });
    });

    it('should throw when concept state not found', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue(null);

      await expect(
        service.completeLesson('u1', 'course-1', 'c2'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/lesson.service.spec.ts`
Expected: FAIL - cannot find module

**Step 3: Write the implementation**

```typescript
// backend/src/learning-engine/lesson.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RemediationService } from './remediation.service';

@Injectable()
export class LessonService {
  constructor(
    private prisma: PrismaService,
    private remediationService: RemediationService,
  ) {}

  async startLesson(
    userId: string,
    orgId: string,
    courseId: string,
    conceptId: string,
  ) {
    // Verify concept exists and belongs to org/course
    const concept = await this.prisma.concept.findFirst({
      where: { id: conceptId, courseId, orgId },
    });
    if (!concept) {
      throw new NotFoundException(`Concept ${conceptId} not found`);
    }

    // Check if concept is blocked by an active remediation
    const blockedIds = await this.remediationService.getBlockedConceptIds(
      userId,
      courseId,
    );
    if (blockedIds.has(conceptId)) {
      throw new BadRequestException(
        `Concept ${conceptId} is blocked by an active remediation. Complete prerequisite reviews first.`,
      );
    }

    // Check student's concept state
    const conceptState = await this.prisma.studentConceptState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });
    if (!conceptState) {
      throw new NotFoundException(
        `No enrollment state for concept ${conceptId}`,
      );
    }
    if (conceptState.masteryState === 'mastered') {
      throw new BadRequestException(
        `Concept ${conceptId} is already mastered. Use review instead.`,
      );
    }

    // Mark as in_progress
    await this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data: { masteryState: 'in_progress' },
    });

    // Fetch knowledge points with instruction content
    const knowledgePoints = await this.prisma.knowledgePoint.findMany({
      where: { conceptId },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        instructionText: true,
        workedExampleText: true,
        instructionAudioUrl: true,
        workedExampleAudioUrl: true,
      },
    });

    return {
      conceptId,
      conceptName: concept.name,
      knowledgePoints,
    };
  }

  async completeLesson(userId: string, courseId: string, conceptId: string) {
    const conceptState = await this.prisma.studentConceptState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });
    if (!conceptState) {
      throw new NotFoundException(
        `No enrollment state for concept ${conceptId}`,
      );
    }

    // Record that the lesson content was consumed.
    // Mastery promotion to 'mastered' happens via problem practice in
    // the Assessment module, not here.
    await this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data: {
        lastPracticedAt: new Date(),
      },
    });

    return { conceptId, status: 'lesson_complete' };
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/lesson.service.spec.ts`
Expected: PASS (5 tests)

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add backend/src/learning-engine/lesson.service.ts backend/src/learning-engine/lesson.service.spec.ts
git commit -m "feat(learning-engine): add lesson service for start/complete flow"
```

---

### Task 8: Learning Engine Service (Orchestrator)

**Files:**
- Create: `backend/src/learning-engine/learning-engine.service.ts`
- Create: `backend/src/learning-engine/learning-engine.service.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/src/learning-engine/learning-engine.service.spec.ts
import { LearningEngineService } from './learning-engine.service';

describe('LearningEngineService', () => {
  let service: LearningEngineService;
  let mockPrisma: any;
  let mockStudentState: any;
  let mockGraphQuery: any;
  let mockRemediationService: any;
  let mockEnrollmentService: any;

  const conceptStates = [
    {
      conceptId: 'c1',
      masteryState: 'mastered',
      memory: 0.9,
      failCount: 0,
      concept: { courseId: 'course-1' },
    },
    {
      conceptId: 'c2',
      masteryState: 'unstarted',
      memory: 1.0,
      failCount: 0,
      concept: { courseId: 'course-1' },
    },
  ];

  const edges = [{ sourceConceptId: 'c1', targetConceptId: 'c2' }];

  beforeEach(() => {
    mockPrisma = {
      concept: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'c1', courseId: 'course-1' },
          { id: 'c2', courseId: 'course-1' },
        ]),
      },
      prerequisiteEdge: {
        findMany: jest.fn().mockResolvedValue(edges),
      },
    };

    mockStudentState = {
      getConceptStates: jest.fn().mockResolvedValue(conceptStates),
    };

    mockGraphQuery = {
      knowledgeFrontier: jest.fn().mockReturnValue(['c2']),
    };

    mockRemediationService = {
      getActiveRemediations: jest.fn().mockResolvedValue([]),
      getBlockedConceptIds: jest.fn().mockResolvedValue(new Set()),
      createRemediation: jest.fn().mockResolvedValue({}),
    };

    mockEnrollmentService = {
      // Not used directly in getNextTask, but injected
    };

    service = new LearningEngineService(
      mockPrisma,
      mockStudentState,
      mockGraphQuery,
      mockRemediationService,
    );
  });

  describe('getNextTask', () => {
    it('should return a task recommendation', async () => {
      const result = await service.getNextTask('u1', 'course-1');

      expect(result).toBeDefined();
      expect(result.taskType).toBeDefined();
      expect(['lesson', 'review', 'quiz', 'remediation']).toContain(
        result.taskType,
      );
    });

    it('should recommend a lesson when frontier concept is available', async () => {
      const result = await service.getNextTask('u1', 'course-1');

      expect(result.taskType).toBe('lesson');
      expect(result.conceptId).toBe('c2');
    });

    it('should create remediations when plateau is detected', async () => {
      mockStudentState.getConceptStates.mockResolvedValue([
        {
          conceptId: 'c1',
          masteryState: 'in_progress',
          memory: 0.5,
          failCount: 0,
          concept: { courseId: 'course-1' },
        },
        {
          conceptId: 'c2',
          masteryState: 'in_progress',
          memory: 0.3,
          failCount: 3,
          concept: { courseId: 'course-1' },
        },
      ]);

      mockGraphQuery.knowledgeFrontier.mockReturnValue([]);

      const result = await service.getNextTask('u1', 'course-1');

      expect(result.taskType).toBe('remediation');
      expect(mockRemediationService.createRemediation).toHaveBeenCalled();
    });
  });

  describe('getStudySession', () => {
    it('should return a study session with tasks', async () => {
      const result = await service.getStudySession('u1', 'course-1', 40);

      expect(result.tasks).toBeDefined();
      expect(result.tasks.length).toBeGreaterThan(0);
      expect(result.estimatedXP).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/learning-engine.service.spec.ts`
Expected: FAIL - cannot find module

**Step 3: Write the implementation**

```typescript
// backend/src/learning-engine/learning-engine.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { StudentStateService } from '@/student-model/student-state.service';
import { GraphQueryService } from '@/knowledge-graph/graph-query.service';
import { RemediationService } from './remediation.service';
import { selectNextTask } from './task-selector';
import { generateStudySession } from './session-generator';
import { detectPlateau, findWeakPrerequisites } from './plateau-detector';
import {
  ConceptSnapshot,
  SimpleEdge,
  TaskRecommendation,
  StudySession,
} from './types';

@Injectable()
export class LearningEngineService {
  constructor(
    private prisma: PrismaService,
    private studentState: StudentStateService,
    private graphQuery: GraphQueryService,
    private remediationService: RemediationService,
  ) {}

  async getNextTask(
    userId: string,
    courseId: string,
  ): Promise<TaskRecommendation> {
    const { snapshots, edges, frontier } = await this.buildContext(
      userId,
      courseId,
    );

    // Detect plateaus and create remediations proactively
    await this.syncRemediations(userId, courseId, snapshots, edges);

    // Filter frontier to exclude blocked concepts
    const blockedIds = await this.remediationService.getBlockedConceptIds(
      userId,
      courseId,
    );
    const availableFrontier = frontier.filter((id) => !blockedIds.has(id));

    // TODO: Track XP since last quiz properly. For now, use 0.
    const xpSinceLastQuiz = 0;

    const task = selectNextTask(snapshots, edges, availableFrontier, xpSinceLastQuiz);

    return task;
  }

  async getStudySession(
    userId: string,
    courseId: string,
    dailyXPTarget: number,
  ): Promise<StudySession> {
    const { snapshots, edges, frontier } = await this.buildContext(
      userId,
      courseId,
    );

    const blockedIds = await this.remediationService.getBlockedConceptIds(
      userId,
      courseId,
    );
    const availableFrontier = frontier.filter((id) => !blockedIds.has(id));

    // TODO: Track XP since last quiz properly. For now, use 0.
    const xpSinceLastQuiz = 0;

    return generateStudySession(
      snapshots,
      edges,
      availableFrontier,
      dailyXPTarget,
      xpSinceLastQuiz,
    );
  }

  /**
   * Build the context needed by pure functions: snapshots, edges, frontier.
   */
  private async buildContext(userId: string, courseId: string) {
    // Fetch concept states and edges in parallel
    const [conceptStates, concepts, prereqEdges] = await Promise.all([
      this.studentState.getConceptStates(userId, courseId),
      this.prisma.concept.findMany({
        where: { courseId },
        select: { id: true },
      }),
      this.prisma.prerequisiteEdge.findMany({
        where: {
          sourceConcept: { courseId },
        },
        select: { sourceConceptId: true, targetConceptId: true },
      }),
    ]);

    const snapshots: ConceptSnapshot[] = conceptStates.map((s) => ({
      conceptId: s.conceptId,
      masteryState: s.masteryState as ConceptSnapshot['masteryState'],
      memory: s.memory,
      failCount: s.failCount,
    }));

    const edges: SimpleEdge[] = prereqEdges.map((e) => ({
      source: e.sourceConceptId,
      target: e.targetConceptId,
    }));

    const conceptIds = concepts.map((c) => c.id);
    const masteredIds = new Set(
      snapshots
        .filter((s) => s.masteryState === 'mastered')
        .map((s) => s.conceptId),
    );

    const frontier = this.graphQuery.knowledgeFrontier(
      conceptIds,
      edges,
      masteredIds,
    );

    return { snapshots, edges, frontier };
  }

  /**
   * Detect plateaued concepts and create remediation records
   * for any weak prerequisites found.
   */
  private async syncRemediations(
    userId: string,
    courseId: string,
    snapshots: ConceptSnapshot[],
    edges: SimpleEdge[],
  ) {
    for (const snap of snapshots) {
      if (detectPlateau(snap)) {
        const weakPrereqs = findWeakPrerequisites(
          snap.conceptId,
          edges,
          snapshots,
        );
        for (const prereqId of weakPrereqs) {
          await this.remediationService.createRemediation(
            userId,
            courseId,
            snap.conceptId,
            prereqId,
          );
        }
      }
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/learning-engine.service.spec.ts`
Expected: PASS (3 tests)

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add backend/src/learning-engine/learning-engine.service.ts backend/src/learning-engine/learning-engine.service.spec.ts
git commit -m "feat(learning-engine): add orchestrator service"
```

---

### Task 9: DTOs

**Files:**
- Create: `backend/src/learning-engine/dto/next-task-response.dto.ts`
- Create: `backend/src/learning-engine/dto/study-session-response.dto.ts`
- Create: `backend/src/learning-engine/dto/start-lesson.dto.ts`

**Step 1: Create the DTO files**

```typescript
// backend/src/learning-engine/dto/next-task-response.dto.ts
export class NextTaskResponseDto {
  taskType: 'lesson' | 'review' | 'quiz' | 'remediation';
  conceptId?: string;
  reason: string;
}
```

```typescript
// backend/src/learning-engine/dto/study-session-response.dto.ts
import { NextTaskResponseDto } from './next-task-response.dto';

export class StudySessionResponseDto {
  tasks: NextTaskResponseDto[];
  estimatedXP: number;
}
```

```typescript
// backend/src/learning-engine/dto/start-lesson.dto.ts
export class StartLessonResponseDto {
  conceptId: string;
  conceptName: string;
  knowledgePoints: Array<{
    id: string;
    slug: string;
    instructionText: string | null;
    workedExampleText: string | null;
    instructionAudioUrl: string | null;
    workedExampleAudioUrl: string | null;
  }>;
}
```

**Step 2: Verify they compile**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx tsc --noEmit`
Expected: No errors

**Step 3: Ask me for feedback before commit**

**Step 4: Commit**

```bash
git add backend/src/learning-engine/dto/
git commit -m "feat(learning-engine): add response DTOs"
```

---

### Task 10: Learning Engine Controller

**Files:**
- Create: `backend/src/learning-engine/learning-engine.controller.ts`
- Create: `backend/src/learning-engine/learning-engine.controller.spec.ts`

**Step 1: Write the failing tests**

```typescript
// backend/src/learning-engine/learning-engine.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { LearningEngineController } from './learning-engine.controller';
import { LearningEngineService } from './learning-engine.service';
import { LessonService } from './lesson.service';
import { SupabaseAuthGuard, OrgMembershipGuard } from '@/auth';
import { EnrollmentService } from '@/student-model/enrollment.service';

const mockGuard = { canActivate: () => true };

describe('LearningEngineController', () => {
  let controller: LearningEngineController;
  let mockEngine: any;
  let mockLesson: any;
  let mockEnrollment: any;

  const orgCtx = {
    orgId: 'org-1',
    userId: 'u1',
    email: 'a@b.com',
    role: 'member',
  };

  beforeEach(async () => {
    mockEngine = {
      getNextTask: jest.fn().mockResolvedValue({
        taskType: 'lesson',
        conceptId: 'c2',
        reason: 'New lesson at frontier',
      }),
      getStudySession: jest.fn().mockResolvedValue({
        tasks: [
          { taskType: 'lesson', conceptId: 'c2', reason: 'frontier' },
        ],
        estimatedXP: 15,
      }),
    };

    mockLesson = {
      startLesson: jest.fn().mockResolvedValue({
        conceptId: 'c2',
        conceptName: 'Concept 2',
        knowledgePoints: [],
      }),
      completeLesson: jest.fn().mockResolvedValue({
        conceptId: 'c2',
        status: 'lesson_complete',
      }),
    };

    mockEnrollment = {
      // getEnrollment not called directly in controller, but needed
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LearningEngineController],
      providers: [
        { provide: LearningEngineService, useValue: mockEngine },
        { provide: LessonService, useValue: mockLesson },
        { provide: EnrollmentService, useValue: mockEnrollment },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(OrgMembershipGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(LearningEngineController);
  });

  describe('GET /next-task', () => {
    it('should return next task recommendation', async () => {
      const result = await controller.getNextTask('course-1', orgCtx as any);

      expect(result.taskType).toBe('lesson');
      expect(result.conceptId).toBe('c2');
      expect(mockEngine.getNextTask).toHaveBeenCalledWith('u1', 'course-1');
    });
  });

  describe('GET /session', () => {
    it('should return a study session', async () => {
      const result = await controller.getStudySession('course-1', orgCtx as any);

      expect(result.tasks).toHaveLength(1);
      expect(result.estimatedXP).toBe(15);
    });
  });

  describe('POST /lessons/:conceptId/start', () => {
    it('should start a lesson', async () => {
      const result = await controller.startLesson(
        'course-1',
        'c2',
        orgCtx as any,
      );

      expect(result.conceptId).toBe('c2');
      expect(mockLesson.startLesson).toHaveBeenCalledWith(
        'u1',
        'org-1',
        'course-1',
        'c2',
      );
    });
  });

  describe('POST /lessons/:conceptId/complete', () => {
    it('should complete a lesson', async () => {
      const result = await controller.completeLesson(
        'course-1',
        'c2',
        orgCtx as any,
      );

      expect(result.status).toBe('lesson_complete');
      expect(mockLesson.completeLesson).toHaveBeenCalledWith(
        'u1',
        'course-1',
        'c2',
      );
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/learning-engine.controller.spec.ts`
Expected: FAIL - cannot find module

**Step 3: Write the implementation**

```typescript
// backend/src/learning-engine/learning-engine.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, OrgMembershipGuard, CurrentOrg } from '@/auth';
import { OrgContext } from '@/auth/guards/org-membership.guard';
import { LearningEngineService } from './learning-engine.service';
import { LessonService } from './lesson.service';

@Controller('orgs/:orgId/courses/:courseId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class LearningEngineController {
  constructor(
    private engine: LearningEngineService,
    private lessonService: LessonService,
  ) {}

  @Get('next-task')
  async getNextTask(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.engine.getNextTask(org.userId, courseId);
  }

  @Get('session')
  async getStudySession(
    @Param('courseId') courseId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    // Default daily XP target of 40; could be overridden by query param later
    const dailyXPTarget = 40;
    return this.engine.getStudySession(org.userId, courseId, dailyXPTarget);
  }

  @Post('lessons/:conceptId/start')
  async startLesson(
    @Param('courseId') courseId: string,
    @Param('conceptId') conceptId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.lessonService.startLesson(
      org.userId,
      org.orgId,
      courseId,
      conceptId,
    );
  }

  @Post('lessons/:conceptId/complete')
  async completeLesson(
    @Param('courseId') courseId: string,
    @Param('conceptId') conceptId: string,
    @CurrentOrg() org: OrgContext,
  ) {
    return this.lessonService.completeLesson(org.userId, courseId, conceptId);
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/learning-engine.controller.spec.ts`
Expected: PASS (4 tests)

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add backend/src/learning-engine/learning-engine.controller.ts backend/src/learning-engine/learning-engine.controller.spec.ts
git commit -m "feat(learning-engine): add controller with 4 endpoints"
```

---

### Task 11: Learning Engine Module + App Registration

**Files:**
- Create: `backend/src/learning-engine/learning-engine.module.ts`
- Modify: `backend/src/app.module.ts`

**Step 1: Create the module**

```typescript
// backend/src/learning-engine/learning-engine.module.ts
import { Module } from '@nestjs/common';
import { StudentModelModule } from '@/student-model/student-model.module';
import { KnowledgeGraphModule } from '@/knowledge-graph/knowledge-graph.module';
import { LearningEngineController } from './learning-engine.controller';
import { LearningEngineService } from './learning-engine.service';
import { LessonService } from './lesson.service';
import { RemediationService } from './remediation.service';

@Module({
  imports: [StudentModelModule, KnowledgeGraphModule],
  controllers: [LearningEngineController],
  providers: [LearningEngineService, LessonService, RemediationService],
  exports: [LearningEngineService, LessonService, RemediationService],
})
export class LearningEngineModule {}
```

**Step 2: Register in AppModule**

Add `LearningEngineModule` to the imports array in `backend/src/app.module.ts`:

```typescript
// Add import at top:
import { LearningEngineModule } from './learning-engine/learning-engine.module';

// Add to imports array:
imports: [
  // ... existing imports ...
  LearningEngineModule,
],
```

**Step 3: Verify the app compiles**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx tsc --noEmit`
Expected: No errors

**Step 4: Run all learning-engine tests**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest src/learning-engine/`
Expected: All tests pass

**Step 5: Ask me for feedback before commit**

**Step 6: Commit**

```bash
git add backend/src/learning-engine/learning-engine.module.ts backend/src/app.module.ts
git commit -m "feat(learning-engine): add module and register in AppModule"
```

---

### Task 12: Full Test Suite Verification

**Files:** None (verification only)

**Step 1: Run the entire backend test suite**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx jest`
Expected: All tests pass, no regressions in Phases 1-4

**Step 2: Run type checking**

Run: `cd /Users/will/github/niche-audio-prep/backend && npx tsc --noEmit`
Expected: No type errors

**Step 3: Run linting**

Run: `cd /Users/will/github/niche-audio-prep/backend && bun run lint`
Expected: No lint errors (fix any that appear)

**Step 4: Ask me for feedback before commit**

(No commit needed unless lint fixes were applied)
