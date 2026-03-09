# Phase 6: Spaced Repetition (FIRe) — Build Prompt

> Copy this entire prompt into a new Claude Code session to kick off the build.

---

## Prompt

```
I'm building a white-labeled adaptive learning platform for professional certification exams. Phases 1-5 are complete. I need you to execute Phase 6: Spaced Repetition (FIRe).

## Your workflow

1. Read the docs below to understand the project and what's already built
2. Use `/writing-plans` to create a detailed implementation plan for Phase 6
3. After I approve the plan, use `/subagent-driven-development` to execute it task-by-task

## Context — read these docs IN ORDER

1. `docs/PLAN.md` — Master plan. Read the "Agent-Driven Development" section, "Architecture Overview", "Monorepo Structure", and the "Phase 6: Spaced Repetition" block carefully. Note that Phases 1-5 are marked Complete.

2. `docs/adaptive-learning-architecture.md` — **This is the primary input for Phase 6.** Read these sections carefully:
   - Section 8: Spaced Repetition (FIRe-Inspired) — **the core spec**. All equations, implicit repetition, review compression, early repetition discounting
   - Section 6: Student Model & Mastery Tracking (repNum, memory, interval, speed fields on StudentConceptState)
   - Section 7: Task Selection Algorithm (review urgency thresholds: memory < 0.3 urgent, memory < 0.5 standard)
   - Section 9: Active Practice & Testing (review flow: 3-5 problems, pass/fail → mastery updates, repNum increment)
   - Section 11: DDD Bounded Contexts (Spaced Repetition context)

3. `docs/plans/2026-03-09-phase-5-learning-engine.md` — Phase 5 implementation plan (for reference on code patterns used).

4. Browse `backend/src/learning-engine/` — The Phase 5 learning engine module. The FIRe module will integrate with the task selector's review urgency checks and the session generator.

5. Browse `backend/src/student-model/` — StudentStateService manages StudentConceptState which has `repNum`, `memory`, `interval`, `speed`, `lastPracticedAt` fields that FIRe will update.

6. Browse `backend/src/assessment/` — ReviewService and ProblemSubmissionService. After a review pass/fail, FIRe needs to update repNum, memory, interval. After any problem submission, implicit repetition may propagate credit.

7. Browse `backend/src/knowledge-graph/` — GraphQueryService. You'll need to traverse encompassing edges for implicit repetition propagation.

8. Read `backend/prisma/schema.prisma` — Note the `EncompassingEdge` model (sourceConceptId, targetConceptId, weight) and `StudentConceptState` fields (repNum, memory, interval, speed, lastPracticedAt).

## What Phases 1-5 built (already working)

- **Phase 1:** NestJS backend, Prisma schema, auth guards, shared types
- **Phase 2:** Knowledge graph (course importer, graph validation, graph queries, prerequisite + encompassing edges)
- **Phase 3:** Student model (enrollment, concept state tracking, diagnostic with BKT)
- **Phase 4:** Assessment (answer evaluation, XP calculation, speed updates, problem submission, reviews, quizzes)
- **Phase 5:** Learning engine (task selector with P1-P5 priority, plateau detection, remediation, lesson service, session generator)
- **293 tests passing** across 33 spec files

### Key technical details the next agent needs to know

- **Auth guard uses ES256/JWKS**, not HS256. Tests use a generated EC key pair.
- **Jest config** is inline in `backend/package.json` with `transformIgnorePatterns` for `jose` ESM.
- **Package manager is `bun`**, not npm.
- **Prisma uses `@@map` for snake_case DB columns**, camelCase in TypeScript. All IDs are `@db.Uuid`, all timestamps are `@db.Timestamptz`.
- **StudentConceptState** tracks: masteryState, repNum (default 0), memory (default 1.0), interval (default 1.0), speed (default 1.0), abilityTheta, speedRD, observationCount, failCount, lastPracticedAt, diagnosticState.
- **EncompassingEdge** tracks: sourceConceptId, targetConceptId, weight (default 0.5), weightSource, retentionGap.
- **Controller pattern:** `@Controller('orgs/:orgId/courses')` with `@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)`. `@CurrentOrg()` provides OrgContext.
- **Pure function pattern:** Math-heavy logic goes in pure `.ts` files with dedicated `.spec.ts` tests. Services orchestrate Prisma + pure functions.
- **Task selector** reads `memory` values from StudentConceptState to determine review urgency (< 0.3 urgent, < 0.5 standard). FIRe must keep these values up to date.
- **ReviewService** uses in-memory `Map<string, ReviewSession>` and updates mastery on pass/fail.
- **ProblemSubmissionService.submitAnswer** updates StudentKPState and StudentConceptState (mastery transitions + speed).

## Phase 6 scope

Build the FIRe-inspired spaced repetition system that manages memory decay, review scheduling, and implicit repetition through encompassing edges.

Specific deliverables:

1. **FIRe core equations** — Pure functions implementing:
   - `updateRepNum(repNum, speed, decay, failed, rawDelta)` → new repNum
   - `calculateMemory(memory, rawDelta, daysSinceLastPractice, interval)` → new memory
   - `calculateRawDelta(passed, quality, memory)` → rawDelta (with early repetition discounting)
   - `calculateDecay(memory)` → decay multiplier for failed reviews
   - `calculateNextInterval(repNum)` → next interval in days (e.g., 1, 3, 7, 14, 30, 60)
   - All as pure functions with comprehensive tests

2. **Implicit repetition propagation** — When a student practices concept B:
   - Find all concepts A where B encompasses A (via EncompassingEdge)
   - For each encompassed concept A with weight W:
     - If student's speed on A >= 1.0: apply implicit credit (`A.repNum += W * rawDelta * speed_discount`, `A.memory += W * rawDelta`)
     - If student's speed on A < 1.0: skip (student struggles with A, can't assume implicit practice)
   - Credit flows backward (advanced → foundational)
   - Must handle chains: if B encompasses A, and A encompasses C, credit propagates through

3. **Review scheduler** — Determine which concepts need review and when:
   - Calculate memory decay for all mastered/needs_review concepts based on time since last practice
   - Rank by urgency (lowest memory first)
   - Apply review compression: when selecting a review, check if implicit repetition from that review would satisfy other due reviews
   - Integrate with the learning engine's task selector (P2/P4 already check memory thresholds)

4. **Memory decay updater** — Service that recalculates memory values:
   - On each "next-task" or "session" request, decay memory for all concepts based on elapsed time
   - Update StudentConceptState.memory via Prisma
   - This ensures the task selector always has fresh memory values

5. **Post-review/post-submission hooks** — After a review or problem submission:
   - Call FIRe equations to update repNum, memory, interval on the practiced concept
   - Propagate implicit repetition to encompassed concepts
   - Update StudentConceptState via Prisma

6. **Review compression in session generator** — Enhance the session generator to:
   - When selecting a review concept, prefer concepts whose implicit repetition knocks out the most other due reviews
   - Calculate "implicit coverage" for candidate reviews

7. **Tests for everything** — TDD: test first, then implement

## Key equations from the architecture doc

```
# RepNum update after review
repNum = max(0, repNum + speed * decay^failed * rawDelta)

# Memory decay (exponential forgetting)
memory = max(0, memory + rawDelta) * (0.5)^(days / interval)

# Early repetition discounting
rawDelta *= (1 - memory)  // if memory is still high, reduce credit

# Implicit repetition
A.repNum += W * rawDelta * speed_discount
A.memory += W * rawDelta

# Speed discount for implicit repetition
speed_discount = 1.0 if student_speed_on_A >= 1.0, else 0.0

# Interval schedule (example progression)
intervals = [1, 3, 7, 14, 30, 60, 120, 240]  // days
nextInterval = intervals[min(repNum, intervals.length - 1)]
```

## API endpoints (new or modified)

No new HTTP endpoints needed. FIRe operates as internal services called by:
- Learning engine service (memory decay on next-task/session requests)
- Assessment module (post-review/post-submission hooks for repNum/memory updates + implicit propagation)

## Constraints

- Use `bun` as package manager
- TDD: every piece of logic gets a test FIRST
- FIRe equations MUST be pure functions — no Prisma, no side effects
- Don't modify existing Phase 1-4 code unless needed for hook integration (add FIRe calls after review/submission)
- Phase 5 learning engine reads memory values — FIRe keeps them up to date
- Don't build any frontend
- Implicit repetition should handle cycles gracefully (BFS with visited set)

## Schema additions (if needed)

You probably don't need new Prisma models. All FIRe state lives on existing `StudentConceptState` fields:
- `repNum` — accumulated review count
- `memory` — current retention estimate (0-1)
- `interval` — current spacing interval in days
- `speed` — student_ability / concept_difficulty
- `lastPracticedAt` — timestamp of last practice (for decay calculation)

If you need to track "XP at last quiz" for the quiz trigger threshold, you may add a field to `CourseEnrollment`:
```prisma
xpAtLastQuiz Int @default(0) @map("xp_at_last_quiz")
```

## File structure target

```
backend/src/spaced-repetition/
├── fire-equations.ts              # Pure functions: all FIRe math
├── fire-equations.spec.ts
├── implicit-repetition.ts         # Pure function: compute implicit credit propagation
├── implicit-repetition.spec.ts
├── review-compression.ts          # Pure function: rank reviews by implicit coverage
├── review-compression.spec.ts
├── memory-decay.service.ts        # Service: recalculate memory for all concepts
├── memory-decay.service.spec.ts
├── fire-update.service.ts         # Service: post-review/post-submission FIRe updates
├── fire-update.service.spec.ts
├── spaced-repetition.module.ts
└── types.ts                       # Phase 6 specific types
```

## What "done" looks like

- FIRe equations are pure functions with comprehensive unit tests covering edge cases
- Memory decays correctly based on elapsed time and interval
- repNum increases on review pass, decreases on fail (with decay penalty)
- Implicit repetition propagates credit through encompassing edges (only when speed >= 1.0)
- Memory values on StudentConceptState are kept fresh (decayed before task selection)
- Post-review and post-submission hooks update FIRe state
- Review compression helps session generator pick reviews that knock out the most due reviews
- All existing tests still pass (293+)
- `bun run test` passes from `backend/`
```
