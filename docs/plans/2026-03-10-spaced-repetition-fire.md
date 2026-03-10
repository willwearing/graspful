# Phase 6: Spaced Repetition (FIRe) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a FIRe-inspired spaced repetition system that tracks memory decay, updates repetition state after practice, propagates implicit credit through encompassing edges, and compresses reviews by selecting encompassing concepts first.

**Architecture:** Pure functions handle all FIRe math (equations, implicit repetition, review compression). Two NestJS services orchestrate Prisma reads/writes: MemoryDecayService runs before task selection to apply time-based forgetting, and FireUpdateService runs after practice to update repNum/memory/interval and propagate implicit credit. Integration is minimal: one call added before `buildContext` in LearningEngineService, one call after `completeReview` in ReviewService, one call after `submitAnswer` in ProblemSubmissionService, and review compression wired into session generation.

**Tech Stack:** NestJS, Prisma, Jest, TypeScript (pure functions + service layer)

---

## File Structure

All new files live under `backend/src/spaced-repetition/`:

```
backend/src/spaced-repetition/
  types.ts                          # Shared interfaces
  fire-equations.ts                 # Pure: all FIRe math
  fire-equations.spec.ts
  implicit-repetition.ts            # Pure: compute implicit credit via BFS
  implicit-repetition.spec.ts
  review-compression.ts             # Pure: rank reviews by coverage
  review-compression.spec.ts
  memory-decay.service.ts           # Service: bulk decay memory values
  memory-decay.service.spec.ts
  fire-update.service.ts            # Service: post-practice FIRe updates
  fire-update.service.spec.ts
  spaced-repetition.module.ts       # NestJS module
```

## Existing Files to Modify (integration only)

- `backend/src/learning-engine/learning-engine.service.ts` -- add memory decay call
- `backend/src/learning-engine/learning-engine.module.ts` -- import SpacedRepetitionModule
- `backend/src/assessment/review.service.ts` -- call FireUpdateService after review completion
- `backend/src/assessment/problem-submission.service.ts` -- call FireUpdateService after answer submission
- `backend/src/assessment/assessment.module.ts` -- import SpacedRepetitionModule

## Key Existing Types (for reference)

From `backend/prisma/schema.prisma`:
- `StudentConceptState`: fields `repNum` (Float), `memory` (Float, default 1.0), `interval` (Float, default 1.0), `speed` (Float), `lastPracticedAt` (DateTime?), `masteryState`, `failCount`, `implicitCreditRatio` (Float)
- `EncompassingEdge`: `sourceConceptId`, `targetConceptId`, `weight` (Float, default 0.5)

From `backend/src/learning-engine/types.ts`:
- `ConceptSnapshot`: `{ conceptId, masteryState, memory, failCount }`
- `SimpleEdge`: `{ source, target }`

---

### Task 1: Shared Types

**Files:**
- Create: `backend/src/spaced-repetition/types.ts`

**Step 1: Write the types file**

```typescript
/**
 * Types shared across the spaced-repetition module.
 * These decouple pure functions from Prisma models.
 */

/** An encompassing edge linking a source (encompassed) concept to a target (encompassing) concept. */
export interface EncompassingLink {
  sourceConceptId: string; // encompassed concept (receives implicit credit)
  targetConceptId: string; // encompassing concept (the one practiced)
  weight: number;          // fractional credit [0, 1]
}

/** Result of implicit repetition computation for a single concept. */
export interface ImplicitUpdate {
  conceptId: string;
  repNumDelta: number;
  memoryDelta: number;
}

/** Minimal concept state needed by FIRe pure functions. */
export interface FireConceptState {
  conceptId: string;
  repNum: number;
  memory: number;
  interval: number;
  speed: number;
  lastPracticedAt: Date | null;
}

/** The interval schedule (days). Index = floor(repNum). */
export const INTERVAL_SCHEDULE = [1, 3, 7, 14, 30, 60, 120, 240] as const;
```

**Step 2: Commit**

```bash
git add backend/src/spaced-repetition/types.ts
git commit -m "feat(fire): add shared types for spaced-repetition module"
```

---

### Task 2: FIRe Equations -- Tests

**Files:**
- Create: `backend/src/spaced-repetition/fire-equations.spec.ts`

**Step 1: Write the failing tests**

```typescript
import {
  calculateRawDelta,
  calculateDecay,
  updateRepNum,
  calculateMemory,
  calculateNextInterval,
  decayMemory,
} from './fire-equations';

describe('FIRe Equations', () => {
  describe('calculateRawDelta', () => {
    it('should return positive delta scaled by (1 - memory) when passed', () => {
      // quality=0.8, memory=0.5 -> rawDelta = 0.8 * (1 - 0.5) = 0.4
      expect(calculateRawDelta(true, 0.8, 0.5)).toBeCloseTo(0.4);
    });

    it('should return negative delta scaled by (1 - memory) when failed', () => {
      // failed -> rawDelta = -0.5 * (1 - 0.5) = -0.25
      expect(calculateRawDelta(false, 0, 0.5)).toBeCloseTo(-0.25);
    });

    it('should return near-zero delta when memory is already high (early repetition discounting)', () => {
      // memory=0.95 -> rawDelta = 0.8 * (1 - 0.95) = 0.04
      expect(calculateRawDelta(true, 0.8, 0.95)).toBeCloseTo(0.04);
    });

    it('should return full delta when memory is 0', () => {
      expect(calculateRawDelta(true, 1.0, 0)).toBeCloseTo(1.0);
    });

    it('should ignore quality parameter when failed', () => {
      // quality is irrelevant for failures
      const a = calculateRawDelta(false, 0.9, 0.3);
      const b = calculateRawDelta(false, 0.1, 0.3);
      expect(a).toEqual(b);
    });
  });

  describe('calculateDecay', () => {
    it('should return higher penalty when memory is very low', () => {
      const lowMemory = calculateDecay(0.1);
      const highMemory = calculateDecay(0.8);
      expect(lowMemory).toBeGreaterThan(highMemory);
    });

    it('should return value between 0 and 1', () => {
      expect(calculateDecay(0)).toBeGreaterThanOrEqual(0);
      expect(calculateDecay(0)).toBeLessThanOrEqual(1);
      expect(calculateDecay(1)).toBeGreaterThanOrEqual(0);
      expect(calculateDecay(1)).toBeLessThanOrEqual(1);
    });

    it('should return 1.0 when memory is 0 (maximum penalty)', () => {
      expect(calculateDecay(0)).toBeCloseTo(1.0);
    });
  });

  describe('updateRepNum', () => {
    it('should increase repNum on successful review', () => {
      // speed=1.0, not failed, rawDelta=0.5
      const result = updateRepNum(2, 1.0, 0.5, false, 0.5);
      expect(result).toBeGreaterThan(2);
    });

    it('should decrease repNum on failed review with decay penalty', () => {
      // speed=1.0, failed, decay=0.8, rawDelta=-0.5
      const result = updateRepNum(3, 1.0, 0.8, true, -0.5);
      expect(result).toBeLessThan(3);
    });

    it('should never go below 0', () => {
      const result = updateRepNum(0.5, 1.0, 0.9, true, -0.5);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should scale by speed', () => {
      const slow = updateRepNum(2, 0.5, 0, false, 0.5);
      const fast = updateRepNum(2, 2.0, 0, false, 0.5);
      expect(fast).toBeGreaterThan(slow);
    });
  });

  describe('calculateMemory', () => {
    it('should increase memory after positive rawDelta then apply forgetting', () => {
      // memory=0.5, rawDelta=0.3, 0 days elapsed -> (0.5+0.3) * 0.5^(0/1) = 0.8 * 1.0 = 0.8
      const result = calculateMemory(0.5, 0.3, 0, 1);
      expect(result).toBeCloseTo(0.8);
    });

    it('should decay memory over time with no new practice', () => {
      // memory=0.8, rawDelta=0, 7 days elapsed, interval=7
      // (0.8 + 0) * 0.5^(7/7) = 0.8 * 0.5 = 0.4
      const result = calculateMemory(0.8, 0, 7, 7);
      expect(result).toBeCloseTo(0.4);
    });

    it('should never go below 0', () => {
      const result = calculateMemory(0.1, -0.5, 30, 1);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should never exceed 1', () => {
      const result = calculateMemory(0.9, 0.5, 0, 1);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateNextInterval', () => {
    it('should return 1 day for repNum 0', () => {
      expect(calculateNextInterval(0)).toBe(1);
    });

    it('should return 3 days for repNum 1', () => {
      expect(calculateNextInterval(1)).toBe(3);
    });

    it('should return 7 days for repNum 2', () => {
      expect(calculateNextInterval(2)).toBe(7);
    });

    it('should cap at 240 days for very high repNum', () => {
      expect(calculateNextInterval(100)).toBe(240);
    });

    it('should handle fractional repNum by flooring', () => {
      expect(calculateNextInterval(1.7)).toBe(3);
      expect(calculateNextInterval(2.9)).toBe(7);
    });
  });

  describe('decayMemory', () => {
    it('should apply exponential forgetting based on elapsed time and interval', () => {
      // memory=1.0, 7 days, interval=7 -> 1.0 * 0.5^(7/7) = 0.5
      expect(decayMemory(1.0, 7, 7)).toBeCloseTo(0.5);
    });

    it('should not decay when 0 days elapsed', () => {
      expect(decayMemory(0.8, 0, 7)).toBeCloseTo(0.8);
    });

    it('should decay faster when interval is short', () => {
      const shortInterval = decayMemory(1.0, 7, 3);
      const longInterval = decayMemory(1.0, 7, 30);
      expect(shortInterval).toBeLessThan(longInterval);
    });

    it('should never go below 0', () => {
      expect(decayMemory(0.1, 365, 1)).toBeGreaterThanOrEqual(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && bun test -- --testPathPattern=fire-equations.spec`
Expected: FAIL with "Cannot find module './fire-equations'"

**Step 3: Commit**

```bash
git add backend/src/spaced-repetition/fire-equations.spec.ts
git commit -m "test(fire): add failing tests for FIRe equations"
```

---

### Task 3: FIRe Equations -- Implementation

**Files:**
- Create: `backend/src/spaced-repetition/fire-equations.ts`

**Step 1: Write the implementation**

```typescript
import { INTERVAL_SCHEDULE } from './types';

/**
 * Calculate the raw delta from a review outcome.
 * Applies early-repetition discounting: delta is scaled by (1 - memory)
 * so reviewing something you already remember well gives diminishing returns.
 *
 * @param passed - Whether the review was passed
 * @param quality - Accuracy score 0-1 (only used when passed)
 * @param memory - Current memory value 0-1
 */
export function calculateRawDelta(
  passed: boolean,
  quality: number,
  memory: number,
): number {
  const base = passed ? quality : -0.5;
  return base * (1 - memory);
}

/**
 * Calculate the decay multiplier applied to repNum on failed reviews.
 * Higher penalty when memory is very low (student has forgotten more).
 * Returns a value in [0, 1] where 1.0 = maximum penalty.
 *
 * @param memory - Current memory value 0-1
 */
export function calculateDecay(memory: number): number {
  // Linear: penalty is 1 - memory. Fully forgotten = full penalty.
  return 1 - memory;
}

/**
 * Update repNum after a review.
 *
 * repNum = max(0, repNum + speed * decay^failed * rawDelta)
 *
 * When passed (failed=false): decay^0 = 1, so repNum += speed * rawDelta
 * When failed (failed=true): repNum += speed * decay * rawDelta (rawDelta is negative)
 *
 * @param repNum - Current repetition number
 * @param speed - Student's speed for this concept (>= 0)
 * @param decay - Decay multiplier from calculateDecay
 * @param failed - Whether the review was failed
 * @param rawDelta - Raw delta from calculateRawDelta
 */
export function updateRepNum(
  repNum: number,
  speed: number,
  decay: number,
  failed: boolean,
  rawDelta: number,
): number {
  const multiplier = failed ? decay : 1;
  return Math.max(0, repNum + speed * multiplier * rawDelta);
}

/**
 * Calculate updated memory after a review + time-based forgetting.
 *
 * memory = max(0, memory + rawDelta) * 0.5^(days / interval)
 *
 * @param currentMemory - Current memory value
 * @param rawDelta - Raw delta from calculateRawDelta
 * @param daysSinceLastPractice - Days since last practice
 * @param interval - Current interval in days
 */
export function calculateMemory(
  currentMemory: number,
  rawDelta: number,
  daysSinceLastPractice: number,
  interval: number,
): number {
  const updated = Math.max(0, currentMemory + rawDelta);
  const safeInterval = Math.max(interval, 0.5); // avoid division by zero
  const decayed = updated * Math.pow(0.5, daysSinceLastPractice / safeInterval);
  return Math.min(1, Math.max(0, decayed));
}

/**
 * Calculate the next review interval based on repNum.
 * Uses a fixed schedule: [1, 3, 7, 14, 30, 60, 120, 240] days.
 *
 * @param repNum - Current repetition number (can be fractional)
 */
export function calculateNextInterval(repNum: number): number {
  const index = Math.min(
    Math.floor(repNum),
    INTERVAL_SCHEDULE.length - 1,
  );
  return INTERVAL_SCHEDULE[Math.max(0, index)];
}

/**
 * Apply time-based memory decay only (no rawDelta).
 * Used by MemoryDecayService to update memory before task selection.
 *
 * memory = memory * 0.5^(days / interval)
 *
 * @param memory - Current memory value
 * @param daysSinceLastPractice - Days since last practice
 * @param interval - Current interval in days
 */
export function decayMemory(
  memory: number,
  daysSinceLastPractice: number,
  interval: number,
): number {
  const safeInterval = Math.max(interval, 0.5);
  return Math.max(0, memory * Math.pow(0.5, daysSinceLastPractice / safeInterval));
}
```

**Step 2: Run tests to verify they pass**

Run: `cd backend && bun test -- --testPathPattern=fire-equations.spec`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add backend/src/spaced-repetition/fire-equations.ts
git commit -m "feat(fire): implement FIRe equations as pure functions"
```

---

### Task 4: Implicit Repetition -- Tests

**Files:**
- Create: `backend/src/spaced-repetition/implicit-repetition.spec.ts`

**Step 1: Write the failing tests**

```typescript
import { computeImplicitRepetition } from './implicit-repetition';
import { EncompassingLink } from './types';

describe('computeImplicitRepetition', () => {
  it('should propagate credit to encompassed concepts', () => {
    // C_big encompasses C_small with weight 0.5
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'small', targetConceptId: 'big', weight: 0.5 },
    ];
    const speeds = new Map([
      ['small', 1.2],
      ['big', 1.0],
    ]);

    const result = computeImplicitRepetition('big', 0.4, edges, speeds);

    expect(result).toHaveLength(1);
    expect(result[0].conceptId).toBe('small');
    expect(result[0].memoryDelta).toBeCloseTo(0.5 * 0.4); // weight * rawDelta
    expect(result[0].repNumDelta).toBeCloseTo(0.5 * 0.4 * 1.2); // weight * rawDelta * speed
  });

  it('should NOT propagate to concepts with speed < 1.0', () => {
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'slow', targetConceptId: 'big', weight: 0.5 },
    ];
    const speeds = new Map([
      ['slow', 0.8], // below threshold
      ['big', 1.0],
    ]);

    const result = computeImplicitRepetition('big', 0.4, edges, speeds);
    expect(result).toHaveLength(0);
  });

  it('should propagate through chains via BFS', () => {
    // big encompasses mid (0.6), mid encompasses small (0.5)
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'mid', targetConceptId: 'big', weight: 0.6 },
      { sourceConceptId: 'small', targetConceptId: 'mid', weight: 0.5 },
    ];
    const speeds = new Map([
      ['mid', 1.5],
      ['small', 1.0],
      ['big', 1.0],
    ]);

    const result = computeImplicitRepetition('big', 1.0, edges, speeds);

    expect(result).toHaveLength(2);

    const mid = result.find((u) => u.conceptId === 'mid')!;
    expect(mid.memoryDelta).toBeCloseTo(0.6 * 1.0);

    // small gets chained credit: 0.6 * 0.5 * 1.0 = 0.3
    const small = result.find((u) => u.conceptId === 'small')!;
    expect(small.memoryDelta).toBeCloseTo(0.6 * 0.5 * 1.0);
  });

  it('should handle cycles gracefully (visited set)', () => {
    // Artificial cycle: A -> B -> A
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'B', targetConceptId: 'A', weight: 0.5 },
      { sourceConceptId: 'A', targetConceptId: 'B', weight: 0.5 },
    ];
    const speeds = new Map([
      ['A', 1.0],
      ['B', 1.0],
    ]);

    // Should not infinite loop
    const result = computeImplicitRepetition('A', 0.4, edges, speeds);
    // B is encompassed by A with weight 0.5
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('should return empty array when no encompassing edges exist', () => {
    const result = computeImplicitRepetition('A', 0.4, [], new Map());
    expect(result).toEqual([]);
  });

  it('should not include the practiced concept in results', () => {
    const edges: EncompassingLink[] = [
      { sourceConceptId: 'small', targetConceptId: 'big', weight: 0.5 },
    ];
    const speeds = new Map([
      ['small', 1.0],
      ['big', 1.0],
    ]);

    const result = computeImplicitRepetition('big', 0.4, edges, speeds);
    expect(result.find((u) => u.conceptId === 'big')).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && bun test -- --testPathPattern=implicit-repetition.spec`
Expected: FAIL with "Cannot find module './implicit-repetition'"

**Step 3: Commit**

```bash
git add backend/src/spaced-repetition/implicit-repetition.spec.ts
git commit -m "test(fire): add failing tests for implicit repetition"
```

---

### Task 5: Implicit Repetition -- Implementation

**Files:**
- Create: `backend/src/spaced-repetition/implicit-repetition.ts`

**Step 1: Write the implementation**

```typescript
import { EncompassingLink, ImplicitUpdate } from './types';

/**
 * Compute implicit repetition credit for encompassed concepts.
 *
 * When a student practices concept B, credit flows to concepts that B encompasses.
 * Uses BFS to handle transitive chains. Only propagates to concepts where
 * the student's speed >= 1.0 (they've demonstrated sufficient facility).
 *
 * @param practicedConceptId - The concept the student directly practiced
 * @param rawDelta - The raw delta from the practice (from calculateRawDelta)
 * @param encompassingEdges - All encompassing edges in the course
 * @param conceptSpeeds - Map of conceptId -> speed for this student
 * @returns Array of implicit updates to apply to encompassed concepts
 */
export function computeImplicitRepetition(
  practicedConceptId: string,
  rawDelta: number,
  encompassingEdges: EncompassingLink[],
  conceptSpeeds: Map<string, number>,
): ImplicitUpdate[] {
  // Build adjacency: targetConceptId -> array of { sourceConceptId, weight }
  // "target encompasses source" means practicing target gives credit to source
  const adj = new Map<string, Array<{ conceptId: string; weight: number }>>();
  for (const edge of encompassingEdges) {
    if (!adj.has(edge.targetConceptId)) {
      adj.set(edge.targetConceptId, []);
    }
    adj.get(edge.targetConceptId)!.push({
      conceptId: edge.sourceConceptId,
      weight: edge.weight,
    });
  }

  const updates: ImplicitUpdate[] = [];
  const visited = new Set<string>([practicedConceptId]);

  // BFS queue: [conceptId, accumulated weight product]
  const queue: Array<[string, number]> = [[practicedConceptId, 1.0]];

  while (queue.length > 0) {
    const [currentId, cumulativeWeight] = queue.shift()!;
    const children = adj.get(currentId) ?? [];

    for (const child of children) {
      if (visited.has(child.conceptId)) continue;
      visited.add(child.conceptId);

      const speed = conceptSpeeds.get(child.conceptId) ?? 0;
      if (speed < 1.0) continue; // only propagate to sufficiently fast concepts

      const effectiveWeight = cumulativeWeight * child.weight;
      const memoryDelta = effectiveWeight * rawDelta;
      const repNumDelta = effectiveWeight * rawDelta * speed;

      updates.push({
        conceptId: child.conceptId,
        repNumDelta,
        memoryDelta,
      });

      // Continue BFS to transitive children
      queue.push([child.conceptId, effectiveWeight]);
    }
  }

  return updates;
}
```

**Step 2: Run tests to verify they pass**

Run: `cd backend && bun test -- --testPathPattern=implicit-repetition.spec`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add backend/src/spaced-repetition/implicit-repetition.ts
git commit -m "feat(fire): implement implicit repetition with BFS propagation"
```

---

### Task 6: Review Compression -- Tests

**Files:**
- Create: `backend/src/spaced-repetition/review-compression.spec.ts`

**Step 1: Write the failing tests**

```typescript
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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && bun test -- --testPathPattern=review-compression.spec`
Expected: FAIL with "Cannot find module './review-compression'"

**Step 3: Commit**

```bash
git add backend/src/spaced-repetition/review-compression.spec.ts
git commit -m "test(fire): add failing tests for review compression"
```

---

### Task 7: Review Compression -- Implementation

**Files:**
- Create: `backend/src/spaced-repetition/review-compression.ts`

**Step 1: Write the implementation**

```typescript
import { EncompassingLink } from './types';

/**
 * Rank candidate review concepts by how many other due reviews they'd
 * implicitly satisfy. Concepts that cover the most due reviews come first.
 *
 * This is a greedy optimization: by reviewing an encompassing concept,
 * the student implicitly practices its encompassed concepts too,
 * potentially satisfying multiple review needs at once.
 *
 * @param dueReviewConceptIds - Concept IDs that are due for review
 * @param encompassingEdges - All encompassing edges in the course
 * @param conceptSpeeds - Map of conceptId -> speed for this student
 * @returns Sorted concept IDs (most coverage first)
 */
export function rankReviewsByCompression(
  dueReviewConceptIds: string[],
  encompassingEdges: EncompassingLink[],
  conceptSpeeds: Map<string, number>,
): string[] {
  if (dueReviewConceptIds.length === 0) return [];

  const dueSet = new Set(dueReviewConceptIds);

  // Build adjacency: targetConceptId -> array of { sourceConceptId }
  const adj = new Map<string, Array<{ conceptId: string; weight: number }>>();
  for (const edge of encompassingEdges) {
    if (!adj.has(edge.targetConceptId)) {
      adj.set(edge.targetConceptId, []);
    }
    adj.get(edge.targetConceptId)!.push({
      conceptId: edge.sourceConceptId,
      weight: edge.weight,
    });
  }

  // For each due concept, count how many OTHER due concepts it covers via BFS
  const coverageMap = new Map<string, number>();

  for (const conceptId of dueReviewConceptIds) {
    const covered = countCoverage(conceptId, adj, dueSet, conceptSpeeds);
    coverageMap.set(conceptId, covered);
  }

  // Sort by coverage descending, break ties by original order
  const indexed = dueReviewConceptIds.map((id, i) => ({ id, i }));
  indexed.sort((a, b) => {
    const coverageDiff = (coverageMap.get(b.id) ?? 0) - (coverageMap.get(a.id) ?? 0);
    if (coverageDiff !== 0) return coverageDiff;
    return a.i - b.i; // preserve original order as tiebreaker
  });

  return indexed.map((item) => item.id);
}

/**
 * BFS to count how many concepts in dueSet are reachable from startId
 * through encompassing edges (where the encompassed concept has speed >= 1.0).
 */
function countCoverage(
  startId: string,
  adj: Map<string, Array<{ conceptId: string; weight: number }>>,
  dueSet: Set<string>,
  conceptSpeeds: Map<string, number>,
): number {
  const visited = new Set<string>([startId]);
  const queue = [startId];
  let count = 0;

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = adj.get(currentId) ?? [];

    for (const child of children) {
      if (visited.has(child.conceptId)) continue;
      visited.add(child.conceptId);

      const speed = conceptSpeeds.get(child.conceptId) ?? 0;
      if (speed < 1.0) continue;

      if (dueSet.has(child.conceptId)) {
        count++;
      }

      queue.push(child.conceptId);
    }
  }

  return count;
}
```

**Step 2: Run tests to verify they pass**

Run: `cd backend && bun test -- --testPathPattern=review-compression.spec`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add backend/src/spaced-repetition/review-compression.ts
git commit -m "feat(fire): implement review compression ranking"
```

---

### Task 8: Memory Decay Service -- Tests

**Files:**
- Create: `backend/src/spaced-repetition/memory-decay.service.spec.ts`

This service has Prisma dependencies, so we mock them. Follow the pattern from existing service specs.

**Step 1: Write the failing tests**

```typescript
import { MemoryDecayService } from './memory-decay.service';

describe('MemoryDecayService', () => {
  let service: MemoryDecayService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      studentConceptState: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new MemoryDecayService(mockPrisma);
  });

  it('should decay memory for all concepts based on elapsed time', async () => {
    const now = new Date('2026-03-10T12:00:00Z');
    const sevenDaysAgo = new Date('2026-03-03T12:00:00Z');

    mockPrisma.studentConceptState.findMany.mockResolvedValue([
      {
        userId: 'user1',
        conceptId: 'c1',
        memory: 0.8,
        interval: 7,
        lastPracticedAt: sevenDaysAgo,
        masteryState: 'mastered',
      },
    ]);
    mockPrisma.studentConceptState.update.mockResolvedValue({});

    await service.decayAllMemory('user1', 'course1', now);

    expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith({
      where: { userId_conceptId: { userId: 'user1', conceptId: 'c1' } },
      data: { memory: expect.closeTo(0.4, 1) }, // 0.8 * 0.5^(7/7) = 0.4
    });
  });

  it('should skip concepts with no lastPracticedAt', async () => {
    mockPrisma.studentConceptState.findMany.mockResolvedValue([
      {
        userId: 'user1',
        conceptId: 'c1',
        memory: 0.8,
        interval: 7,
        lastPracticedAt: null,
        masteryState: 'mastered',
      },
    ]);

    await service.decayAllMemory('user1', 'course1', new Date());

    expect(mockPrisma.studentConceptState.update).not.toHaveBeenCalled();
  });

  it('should skip unstarted concepts', async () => {
    mockPrisma.studentConceptState.findMany.mockResolvedValue([
      {
        userId: 'user1',
        conceptId: 'c1',
        memory: 1.0,
        interval: 1,
        lastPracticedAt: new Date('2026-03-01'),
        masteryState: 'unstarted',
      },
    ]);

    await service.decayAllMemory('user1', 'course1', new Date());

    expect(mockPrisma.studentConceptState.update).not.toHaveBeenCalled();
  });

  it('should not update if decayed memory equals current memory (no change)', async () => {
    const now = new Date('2026-03-10T12:00:00Z');

    mockPrisma.studentConceptState.findMany.mockResolvedValue([
      {
        userId: 'user1',
        conceptId: 'c1',
        memory: 0.8,
        interval: 7,
        lastPracticedAt: now, // 0 days elapsed -> no decay
        masteryState: 'mastered',
      },
    ]);

    await service.decayAllMemory('user1', 'course1', now);

    expect(mockPrisma.studentConceptState.update).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && bun test -- --testPathPattern=memory-decay.service.spec`
Expected: FAIL with "Cannot find module './memory-decay.service'"

**Step 3: Commit**

```bash
git add backend/src/spaced-repetition/memory-decay.service.spec.ts
git commit -m "test(fire): add failing tests for memory decay service"
```

---

### Task 9: Memory Decay Service -- Implementation

**Files:**
- Create: `backend/src/spaced-repetition/memory-decay.service.ts`

**Step 1: Write the implementation**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { decayMemory } from './fire-equations';

const DECAY_EPSILON = 0.001; // skip updates smaller than this

@Injectable()
export class MemoryDecayService {
  constructor(private prisma: PrismaService) {}

  /**
   * Recalculate memory for all of a student's concept states in a course,
   * applying exponential forgetting based on time since last practice.
   *
   * Should be called before task selection to ensure memory values are current.
   *
   * @param userId - The student
   * @param courseId - The course
   * @param now - Current time (injectable for testing)
   */
  async decayAllMemory(
    userId: string,
    courseId: string,
    now: Date = new Date(),
  ): Promise<void> {
    const states = await this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: { courseId },
        masteryState: { not: 'unstarted' },
        lastPracticedAt: { not: null },
      },
      select: {
        userId: true,
        conceptId: true,
        memory: true,
        interval: true,
        lastPracticedAt: true,
      },
    });

    const updates = states
      .map((state) => {
        const daysSince =
          (now.getTime() - state.lastPracticedAt!.getTime()) / (1000 * 60 * 60 * 24);
        const decayed = decayMemory(state.memory, daysSince, state.interval);
        return { state, decayed };
      })
      .filter(({ state, decayed }) => Math.abs(state.memory - decayed) > DECAY_EPSILON);

    await Promise.all(
      updates.map(({ state, decayed }) =>
        this.prisma.studentConceptState.update({
          where: {
            userId_conceptId: { userId: state.userId, conceptId: state.conceptId },
          },
          data: { memory: decayed },
        }),
      ),
    );
  }
}
```

**Step 2: Run tests to verify they pass**

Run: `cd backend && bun test -- --testPathPattern=memory-decay.service.spec`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add backend/src/spaced-repetition/memory-decay.service.ts
git commit -m "feat(fire): implement memory decay service"
```

---

### Task 10: FIRe Update Service -- Tests

**Files:**
- Create: `backend/src/spaced-repetition/fire-update.service.spec.ts`

**Step 1: Write the failing tests**

```typescript
import { FireUpdateService } from './fire-update.service';

describe('FireUpdateService', () => {
  let service: FireUpdateService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      studentConceptState: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      encompassingEdge: {
        findMany: jest.fn(),
      },
    };
    service = new FireUpdateService(mockPrisma);
  });

  describe('updateAfterReview', () => {
    it('should update repNum, memory, and interval on passed review', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue({
        userId: 'u1',
        conceptId: 'c1',
        repNum: 2,
        memory: 0.5,
        interval: 7,
        speed: 1.0,
        lastPracticedAt: new Date('2026-03-03'),
      });
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.update.mockResolvedValue({});

      await service.updateAfterReview('u1', 'c1', true, 0.8);

      expect(mockPrisma.studentConceptState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_conceptId: { userId: 'u1', conceptId: 'c1' } },
          data: expect.objectContaining({
            repNum: expect.any(Number),
            memory: expect.any(Number),
            interval: expect.any(Number),
            lastPracticedAt: expect.any(Date),
          }),
        }),
      );

      // repNum should increase
      const updateCall = mockPrisma.studentConceptState.update.mock.calls[0][0];
      expect(updateCall.data.repNum).toBeGreaterThan(2);
    });

    it('should decrease repNum on failed review', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue({
        userId: 'u1',
        conceptId: 'c1',
        repNum: 3,
        memory: 0.4,
        interval: 14,
        speed: 1.0,
        lastPracticedAt: new Date('2026-03-01'),
      });
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.update.mockResolvedValue({});

      await service.updateAfterReview('u1', 'c1', false, 0);

      const updateCall = mockPrisma.studentConceptState.update.mock.calls[0][0];
      expect(updateCall.data.repNum).toBeLessThan(3);
    });
  });

  describe('propagateImplicitRepetition', () => {
    it('should update encompassed concepts after practice', async () => {
      mockPrisma.studentConceptState.findUnique.mockResolvedValue({
        userId: 'u1',
        conceptId: 'big',
        repNum: 3,
        memory: 0.6,
        interval: 14,
        speed: 1.0,
        lastPracticedAt: new Date(),
      });

      // big encompasses small
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([
        { sourceConceptId: 'small', targetConceptId: 'big', weight: 0.5 },
      ]);

      // Return concept states for speed lookup
      mockPrisma.studentConceptState.findMany.mockResolvedValue([
        { conceptId: 'small', speed: 1.2, repNum: 1, memory: 0.4 },
      ]);

      mockPrisma.studentConceptState.update.mockResolvedValue({});

      await service.propagateImplicitRepetition('u1', 'big', 0.3, 'course1');

      // Should update small's repNum and memory
      const smallUpdate = mockPrisma.studentConceptState.update.mock.calls.find(
        (call: any[]) => call[0].where.userId_conceptId.conceptId === 'small',
      );
      expect(smallUpdate).toBeDefined();
    });

    it('should not crash when no encompassing edges exist', async () => {
      mockPrisma.encompassingEdge.findMany.mockResolvedValue([]);
      mockPrisma.studentConceptState.findMany.mockResolvedValue([]);

      await expect(
        service.propagateImplicitRepetition('u1', 'c1', 0.3, 'course1'),
      ).resolves.not.toThrow();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && bun test -- --testPathPattern=fire-update.service.spec`
Expected: FAIL with "Cannot find module './fire-update.service'"

**Step 3: Commit**

```bash
git add backend/src/spaced-repetition/fire-update.service.spec.ts
git commit -m "test(fire): add failing tests for FIRe update service"
```

---

### Task 11: FIRe Update Service -- Implementation

**Files:**
- Create: `backend/src/spaced-repetition/fire-update.service.ts`

**Step 1: Write the implementation**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  calculateRawDelta,
  calculateDecay,
  updateRepNum,
  calculateMemory,
  calculateNextInterval,
} from './fire-equations';
import { computeImplicitRepetition } from './implicit-repetition';
import { EncompassingLink } from './types';

@Injectable()
export class FireUpdateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Update FIRe state after a review pass/fail on a specific concept.
   * Updates repNum, memory, interval, and lastPracticedAt.
   * Then propagates implicit repetition to encompassed concepts.
   *
   * @param userId - The student
   * @param conceptId - The reviewed concept
   * @param passed - Whether the review was passed
   * @param quality - Accuracy score 0-1
   * @param courseId - Optional, needed for implicit propagation. If omitted, propagation is skipped.
   */
  async updateAfterReview(
    userId: string,
    conceptId: string,
    passed: boolean,
    quality: number,
    courseId?: string,
  ): Promise<void> {
    const state = await this.prisma.studentConceptState.findUnique({
      where: { userId_conceptId: { userId, conceptId } },
    });

    if (!state) return;

    const rawDelta = calculateRawDelta(passed, quality, state.memory);
    const decay = calculateDecay(state.memory);
    const newRepNum = updateRepNum(state.repNum, state.speed, decay, !passed, rawDelta);

    const daysSince = state.lastPracticedAt
      ? (Date.now() - state.lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    const newMemory = calculateMemory(state.memory, rawDelta, daysSince, state.interval);
    const newInterval = calculateNextInterval(newRepNum);

    await this.prisma.studentConceptState.update({
      where: { userId_conceptId: { userId, conceptId } },
      data: {
        repNum: newRepNum,
        memory: newMemory,
        interval: newInterval,
        lastPracticedAt: new Date(),
      },
    });

    // Propagate implicit repetition if courseId is provided
    if (courseId) {
      await this.propagateImplicitRepetition(userId, conceptId, rawDelta, courseId);
    }
  }

  /**
   * Propagate implicit repetition credit to encompassed concepts.
   * Called after any practice (review or problem submission).
   *
   * @param userId - The student
   * @param practicedConceptId - The directly practiced concept
   * @param rawDelta - Raw delta from the practice
   * @param courseId - The course (to scope encompassing edge lookup)
   */
  async propagateImplicitRepetition(
    userId: string,
    practicedConceptId: string,
    rawDelta: number,
    courseId: string,
  ): Promise<void> {
    // Fetch encompassing edges for this course
    const edges = await this.prisma.encompassingEdge.findMany({
      where: {
        sourceConcept: { courseId },
      },
      select: {
        sourceConceptId: true,
        targetConceptId: true,
        weight: true,
      },
    });

    if (edges.length === 0) return;

    const encompassingLinks: EncompassingLink[] = edges;

    // Get all concept speeds for this student in this course
    const conceptStates = await this.prisma.studentConceptState.findMany({
      where: {
        userId,
        concept: { courseId },
      },
      select: {
        conceptId: true,
        speed: true,
        repNum: true,
        memory: true,
      },
    });

    const speedMap = new Map<string, number>(
      conceptStates.map((s) => [s.conceptId, s.speed]),
    );

    const updates = computeImplicitRepetition(
      practicedConceptId,
      rawDelta,
      encompassingLinks,
      speedMap,
    );

    if (updates.length === 0) return;

    // Build a map of current state for efficient lookup
    const stateMap = new Map(
      conceptStates.map((s) => [s.conceptId, s]),
    );

    await Promise.all(
      updates.map((update) => {
        const current = stateMap.get(update.conceptId);
        if (!current) return Promise.resolve();

        const newRepNum = Math.max(0, current.repNum + update.repNumDelta);
        const newMemory = Math.min(1, Math.max(0, current.memory + update.memoryDelta));

        return this.prisma.studentConceptState.update({
          where: {
            userId_conceptId: { userId, conceptId: update.conceptId },
          },
          data: {
            repNum: newRepNum,
            memory: newMemory,
            interval: calculateNextInterval(newRepNum),
          },
        });
      }),
    );
  }
}
```

**Step 2: Run tests to verify they pass**

Run: `cd backend && bun test -- --testPathPattern=fire-update.service.spec`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add backend/src/spaced-repetition/fire-update.service.ts
git commit -m "feat(fire): implement FIRe update service with implicit propagation"
```

---

### Task 12: NestJS Module

**Files:**
- Create: `backend/src/spaced-repetition/spaced-repetition.module.ts`

**Step 1: Write the module**

```typescript
import { Module } from '@nestjs/common';
import { MemoryDecayService } from './memory-decay.service';
import { FireUpdateService } from './fire-update.service';

@Module({
  providers: [MemoryDecayService, FireUpdateService],
  exports: [MemoryDecayService, FireUpdateService],
})
export class SpacedRepetitionModule {}
```

**Step 2: Verify the project compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors unrelated to this module)

**Step 3: Commit**

```bash
git add backend/src/spaced-repetition/spaced-repetition.module.ts
git commit -m "feat(fire): add SpacedRepetitionModule"
```

---

### Task 13: Integration -- Learning Engine (Memory Decay Before Task Selection)

**Files:**
- Modify: `backend/src/learning-engine/learning-engine.module.ts`
- Modify: `backend/src/learning-engine/learning-engine.service.ts`

**Step 1: Update the module to import SpacedRepetitionModule**

In `backend/src/learning-engine/learning-engine.module.ts`, add the import:

```typescript
import { Module } from '@nestjs/common';
import { StudentModelModule } from '@/student-model/student-model.module';
import { KnowledgeGraphModule } from '@/knowledge-graph/knowledge-graph.module';
import { SpacedRepetitionModule } from '@/spaced-repetition/spaced-repetition.module';
import { LearningEngineController } from './learning-engine.controller';
import { LearningEngineService } from './learning-engine.service';
import { LessonService } from './lesson.service';
import { RemediationService } from './remediation.service';

@Module({
  imports: [StudentModelModule, KnowledgeGraphModule, SpacedRepetitionModule],
  controllers: [LearningEngineController],
  providers: [LearningEngineService, LessonService, RemediationService],
  exports: [LearningEngineService, LessonService, RemediationService],
})
export class LearningEngineModule {}
```

**Step 2: Inject MemoryDecayService and call it in getNextTask and getStudySession**

In `backend/src/learning-engine/learning-engine.service.ts`:

Add import at top:
```typescript
import { MemoryDecayService } from '@/spaced-repetition/memory-decay.service';
```

Add to constructor:
```typescript
constructor(
  private prisma: PrismaService,
  private studentState: StudentStateService,
  private graphQuery: GraphQueryService,
  private remediationService: RemediationService,
  private memoryDecay: MemoryDecayService,
) {}
```

Add decay call as the FIRST line in both `getNextTask` and `getStudySession`:
```typescript
// Decay memory before building context so values are current
await this.memoryDecay.decayAllMemory(userId, courseId);
```

The full `getNextTask` method becomes:
```typescript
async getNextTask(
  userId: string,
  courseId: string,
): Promise<TaskRecommendation> {
  // Decay memory before building context so values are current
  await this.memoryDecay.decayAllMemory(userId, courseId);

  const { snapshots, edges, frontier } = await this.buildContext(
    userId,
    courseId,
  );
  // ... rest unchanged
```

Same pattern for `getStudySession`.

**Step 3: Run existing learning engine tests to verify no regressions**

Run: `cd backend && bun test -- --testPathPattern=learning-engine`
Expected: Existing tests may need mock updates for the new constructor parameter. If `learning-engine.service.spec.ts` instantiates the service directly, add a mock `MemoryDecayService` with `decayAllMemory: jest.fn().mockResolvedValue(undefined)`.

**Step 4: Commit**

```bash
git add backend/src/learning-engine/learning-engine.module.ts backend/src/learning-engine/learning-engine.service.ts
git commit -m "feat(fire): integrate memory decay into learning engine task selection"
```

---

### Task 14: Integration -- Assessment (FIRe Update After Review)

**Files:**
- Modify: `backend/src/assessment/assessment.module.ts`
- Modify: `backend/src/assessment/review.service.ts`

**Step 1: Update the assessment module to import SpacedRepetitionModule**

In `backend/src/assessment/assessment.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SpacedRepetitionModule } from '@/spaced-repetition/spaced-repetition.module';
import { AssessmentController } from './assessment.controller';
import { ProblemSubmissionService } from './problem-submission.service';
import { ReviewService } from './review.service';
import { QuizService } from './quiz.service';

@Module({
  imports: [SpacedRepetitionModule],
  controllers: [AssessmentController],
  providers: [ProblemSubmissionService, ReviewService, QuizService],
  exports: [ProblemSubmissionService, ReviewService, QuizService],
})
export class AssessmentModule {}
```

**Step 2: Inject FireUpdateService into ReviewService and call after completeReview**

In `backend/src/assessment/review.service.ts`:

Add import:
```typescript
import { FireUpdateService } from '@/spaced-repetition/fire-update.service';
```

Update constructor:
```typescript
constructor(
  private prisma: PrismaService,
  private problemSubmission: ProblemSubmissionService,
  private fireUpdate: FireUpdateService,
) {}
```

In `completeReview`, REPLACE the existing manual `repNum` increment / mastery update block (lines 161-193 in current file) with a FIRe update call. The new `completeReview` ending becomes:

```typescript
async completeReview(sessionId: string) {
  const session = this.sessions.get(sessionId);
  if (!session) {
    throw new NotFoundException(`Review session ${sessionId} not found`);
  }

  session.isComplete = true;

  const correctCount = session.answers.filter((a) => a.correct).length;
  const totalCount = session.answers.length;
  const score = totalCount > 0 ? correctCount / totalCount : 0;
  const passed = score >= 0.6;

  // Get the concept's courseId for implicit propagation
  const concept = await this.prisma.concept.findUnique({
    where: { id: session.conceptId },
    select: { courseId: true },
  });

  // Update mastery state
  const conceptState = await this.prisma.studentConceptState.findUnique({
    where: {
      userId_conceptId: {
        userId: session.userId,
        conceptId: session.conceptId,
      },
    },
  });

  if (conceptState) {
    await this.prisma.studentConceptState.update({
      where: {
        userId_conceptId: {
          userId: session.userId,
          conceptId: session.conceptId,
        },
      },
      data: {
        masteryState: passed ? 'mastered' : 'needs_review',
        failCount: passed ? 0 : { increment: 1 },
      },
    });
  }

  // FIRe update: update repNum, memory, interval + implicit propagation
  await this.fireUpdate.updateAfterReview(
    session.userId,
    session.conceptId,
    passed,
    score, // quality = accuracy ratio
    concept?.courseId,
  );

  // Clean up session
  this.sessions.delete(sessionId);

  return {
    conceptId: session.conceptId,
    passed,
    score,
    correctCount,
    totalCount,
    updatedMasteryState: passed ? 'mastered' : 'needs_review',
  };
}
```

Key change: removed the manual `repNum: { increment: 1 }` / `lastPracticedAt` logic from the Prisma update. FIRe now handles `repNum`, `memory`, `interval`, `lastPracticedAt` via `updateAfterReview`.

**Step 3: Run existing review service tests**

Run: `cd backend && bun test -- --testPathPattern=review.service.spec`
Expected: Tests may need mock updates for the new `fireUpdate` constructor parameter. Add `updateAfterReview: jest.fn().mockResolvedValue(undefined)` to the mock.

**Step 4: Commit**

```bash
git add backend/src/assessment/assessment.module.ts backend/src/assessment/review.service.ts
git commit -m "feat(fire): integrate FIRe updates into review completion"
```

---

### Task 15: Integration -- Assessment (Implicit Repetition After Problem Submission)

**Files:**
- Modify: `backend/src/assessment/problem-submission.service.ts`

**Step 1: Inject FireUpdateService and call propagateImplicitRepetition after submitAnswer**

In `backend/src/assessment/problem-submission.service.ts`:

Add import:
```typescript
import { FireUpdateService } from '@/spaced-repetition/fire-update.service';
```

Update constructor:
```typescript
constructor(
  private prisma: PrismaService,
  private fireUpdate: FireUpdateService,
) {}
```

Add implicit repetition call at the end of `submitAnswer`, after the XP award (after step 8, before the return):

```typescript
// 9. Propagate implicit repetition to encompassed concepts
const rawDelta = evaluation.correct ? 1.0 * (1 - (conceptState?.memory ?? 1)) : -0.5 * (1 - (conceptState?.memory ?? 1));
await this.fireUpdate.propagateImplicitRepetition(
  userId,
  concept.id,
  rawDelta,
  concept.courseId,
);
```

To get the conceptState for rawDelta calculation, the `conceptState` is already fetched on line 171 (inside `updateConceptState`). However, since `updateConceptState` is a private method, we need to fetch it in `submitAnswer`. Add before step 9:

```typescript
// 9. Compute rawDelta for implicit repetition using pre-update memory
const preUpdateState = await this.prisma.studentConceptState.findUnique({
  where: { userId_conceptId: { userId, conceptId: concept.id } },
  select: { memory: true },
});
const memoryForDelta = preUpdateState?.memory ?? 1;
const implicitRawDelta = evaluation.correct
  ? 1.0 * (1 - memoryForDelta)
  : -0.5 * (1 - memoryForDelta);

await this.fireUpdate.propagateImplicitRepetition(
  userId,
  concept.id,
  implicitRawDelta,
  concept.courseId,
);
```

Wait -- the memory was already updated in step 7. We need the PRE-update memory. Restructure: capture the memory BEFORE step 7.

Revised approach -- add one line before step 7 in `submitAnswer`:

```typescript
// Capture pre-update memory for implicit repetition delta
const preUpdateMemory = (await this.prisma.studentConceptState.findUnique({
  where: { userId_conceptId: { userId, conceptId: concept.id } },
  select: { memory: true },
}))?.memory ?? 1;
```

Then after step 8:

```typescript
// 9. Propagate implicit repetition to encompassed concepts
const implicitRawDelta = evaluation.correct
  ? 1.0 * (1 - preUpdateMemory)
  : -0.5 * (1 - preUpdateMemory);
await this.fireUpdate.propagateImplicitRepetition(
  userId,
  concept.id,
  implicitRawDelta,
  concept.courseId,
);
```

**Step 2: Run existing problem submission tests**

Run: `cd backend && bun test -- --testPathPattern=problem-submission.service.spec`
Expected: Tests may need mock updates for the new `fireUpdate` constructor parameter. Add `propagateImplicitRepetition: jest.fn().mockResolvedValue(undefined)` to the mock.

**Step 3: Commit**

```bash
git add backend/src/assessment/problem-submission.service.ts
git commit -m "feat(fire): propagate implicit repetition after problem submission"
```

---

### Task 16: Fix All Existing Tests

After integration, existing tests will break because constructors have new dependencies. This task fixes all broken mocks.

**Files:**
- Modify: `backend/src/learning-engine/learning-engine.service.spec.ts` -- add mock MemoryDecayService
- Modify: `backend/src/assessment/review.service.spec.ts` -- add mock FireUpdateService
- Modify: `backend/src/assessment/problem-submission.service.spec.ts` -- add mock FireUpdateService
- Possibly: `backend/src/learning-engine/learning-engine.controller.spec.ts`

**Step 1: Read each spec file to understand current mock patterns**

Read each file listed above.

**Step 2: Add mocks for new dependencies**

Pattern for each:

For `MemoryDecayService` mock:
```typescript
const mockMemoryDecay = {
  decayAllMemory: jest.fn().mockResolvedValue(undefined),
};
```

For `FireUpdateService` mock:
```typescript
const mockFireUpdate = {
  updateAfterReview: jest.fn().mockResolvedValue(undefined),
  propagateImplicitRepetition: jest.fn().mockResolvedValue(undefined),
};
```

Pass these mocks as the new constructor arguments wherever the service is instantiated.

**Step 3: Run the full test suite**

Run: `cd backend && bun test`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add -A backend/src
git commit -m "fix: update existing test mocks for new FIRe service dependencies"
```

---

### Task 17: Run Full Test Suite + Type Check

**Step 1: Type check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

**Step 2: Run all tests**

Run: `cd backend && bun test`
Expected: ALL PASS

**Step 3: If anything is broken, fix it and commit**

```bash
git add -A backend/src
git commit -m "fix: resolve any remaining type or test issues from FIRe integration"
```

---

## Summary of All Tasks

| # | Description | Type | Files |
|---|---|---|---|
| 1 | Shared types | Create | `types.ts` |
| 2 | FIRe equations tests | Test | `fire-equations.spec.ts` |
| 3 | FIRe equations implementation | Impl | `fire-equations.ts` |
| 4 | Implicit repetition tests | Test | `implicit-repetition.spec.ts` |
| 5 | Implicit repetition implementation | Impl | `implicit-repetition.ts` |
| 6 | Review compression tests | Test | `review-compression.spec.ts` |
| 7 | Review compression implementation | Impl | `review-compression.ts` |
| 8 | Memory decay service tests | Test | `memory-decay.service.spec.ts` |
| 9 | Memory decay service implementation | Impl | `memory-decay.service.ts` |
| 10 | FIRe update service tests | Test | `fire-update.service.spec.ts` |
| 11 | FIRe update service implementation | Impl | `fire-update.service.ts` |
| 12 | NestJS module | Create | `spaced-repetition.module.ts` |
| 13 | Integration: learning engine + memory decay | Modify | `learning-engine.module.ts`, `learning-engine.service.ts` |
| 14 | Integration: review service + FIRe update | Modify | `assessment.module.ts`, `review.service.ts` |
| 15 | Integration: problem submission + implicit repetition | Modify | `problem-submission.service.ts` |
| 16 | Fix all broken test mocks | Fix | Various `.spec.ts` files |
| 17 | Full suite verification | Verify | N/A |
