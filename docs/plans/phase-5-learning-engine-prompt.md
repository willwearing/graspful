# Phase 5: Learning Engine — Build Prompt

> Copy this entire prompt into a new Claude Code session to kick off the build.

---

## Prompt

```
I'm building a white-labeled adaptive learning platform for professional certification exams. Phases 1-4 are complete. I need you to execute Phase 5: Learning Engine.

## Your workflow

1. Read the docs below to understand the project and what's already built
2. Use `/writing-plans` to create a detailed implementation plan for Phase 5
3. After I approve the plan, use `/subagent-driven-development` to execute it task-by-task

## Context — read these docs IN ORDER

1. `docs/PLAN.md` — Master plan. Read the "Agent-Driven Development" section, "Architecture Overview", "Monorepo Structure", and the "Phase 5: Learning Engine" block carefully. Note that Phases 1-4 are marked Complete.

2. `docs/adaptive-learning-architecture.md` — **This is the primary input for Phase 5.** Read these sections carefully:
   - Section 7: Task Selection Algorithm (task types, selection priority, knowledge frontier, plateau detection, remediation)
   - Section 6: Student Model & Mastery Tracking (mastery transitions, per-student-concept state, per-student-KP state)
   - Section 8: Spaced Repetition (FIRe-Inspired) — skim only; you'll need to know what "memory < 0.3" and "memory < 0.5" mean for review urgency, but don't implement FIRe itself (that's Phase 6)
   - Section 9: Active Practice & Testing (lesson flow, review flow, quiz flow — for understanding when tasks are triggered)
   - Section 10: XP System (quiz trigger threshold: every ~150 XP)
   - Section 11: DDD Bounded Contexts (Learning Engine context, domain events: TaskAssigned, LessonCompleted, RemediationTriggered)
   - Section 13: API Surface (Learning Engine endpoints)

3. `docs/plans/2026-03-09-phase-3-student-model.md` — Phase 3 implementation plan (for reference on code patterns used).

4. Browse `backend/src/assessment/` — The Phase 4 assessment module. Understand how answer evaluation, problem submission, reviews, and quizzes work. The learning engine will call into these services.

5. Browse `backend/src/student-model/` — The Phase 3 student model module. Understand enrollment, student state, and mastery tracking. The learning engine reads from these services.

6. Browse `backend/src/diagnostic/` — The Phase 3 diagnostic module. Understand BKT updates, evidence propagation. The learning engine uses mastery state and memory values from diagnostic results.

7. Browse `backend/src/knowledge-graph/` — The Phase 2 module. Understand graph queries: `getKnowledgeFrontier(courseId, masteredConceptIds)`, `getPrerequisiteChain(conceptId)`, `topologicalSort(courseId)`.

## What Phase 1 built (already working)

- **Monorepo:** Turborepo with `backend/`, `packages/shared/`, `apps/web/` (placeholder), `supabase/`, `content/`
- **NestJS backend:** Running on port 3000, health endpoint at `GET /api/v1/health`
- **Prisma schema:** 18+ core models + 6 enums
- **Auth guards:** SupabaseAuthGuard (ES256/JWKS via `jose`), OrgMembershipGuard, GlobalAdminGuard — all with tests
- **Decorators:** @CurrentUser(), @CurrentOrg(), @MinRole()
- **Shared types:** `@niche-audio-prep/shared` package

## What Phase 2 built (already working)

- **Knowledge Graph module** (`backend/src/knowledge-graph/`):
  - `course-importer.service.ts` — YAML parser + transactional import
  - `graph-validation.service.ts` — Cycle detection, orphan detection, weight validation
  - `graph-query.service.ts` — Topological sort, knowledge frontier calculation, prerequisite chain traversal
  - `knowledge-graph.controller.ts` — 7 auth-guarded endpoints

## What Phase 3 built (already working)

- **Student Model module** (`backend/src/student-model/`):
  - `enrollment.service.ts` — Transactional enrollment + concept state initialization
  - `student-state.service.ts` — Mastery map CRUD, diagnostic state updates, speed parameter updates
- **Diagnostic module** (`backend/src/diagnostic/`):
  - `bkt-engine.ts` — Bayesian Knowledge Tracing
  - `evidence-propagation.ts` — Correct-upward / incorrect-downward propagation
  - `mepe-selector.ts` — MEPE question selection
  - `stopping-criteria.ts` — Hard cap, full coverage, diminishing returns
  - `speed-bootstrap.ts` — Newton-Raphson MLE ability estimation
  - `diagnostic-session.service.ts` — Stateful orchestrator

## What Phase 4 built (already working)

- **Assessment module** (`backend/src/assessment/`):
  - `answer-evaluator.ts` — Pure functions for all 6 problem types (MC, T/F, fill-blank, ordering, matching, scenario)
  - `xp-calculator.ts` — XP calculation with anti-gaming checks (<2s rejection), lesson/review/quiz XP formulas
  - `speed-updater.ts` — Elo/IRT/Glicko speed update after each observation, cold-start blending
  - `problem-submission.service.ts` — Evaluates answers, creates ProblemAttempt, updates StudentKPState (2-consecutive-correct), updates StudentConceptState (mastery transitions + speed), awards XP
  - `review.service.ts` — Review sessions: 3-5 problems, pass/fail mastery updates, repNum increment
  - `quiz.service.ts` — Timed quizzes: generation, closed-book submission, per-concept breakdown, failed concepts → needs_review
  - `assessment.controller.ts` — 7 auth-guarded endpoints
- **249 tests passing** across 26 spec files

### Key technical details the next agent needs to know

- **Auth guard uses ES256/JWKS**, not HS256. Tests use a generated EC key pair. Guard imports from `jose`.
- **Jest config** is inline in `backend/package.json` with `transformIgnorePatterns` for `jose` ESM.
- **Package manager is `bun`**, not npm.
- **Prisma uses `@@map` for snake_case DB columns**, camelCase in TypeScript. All IDs are `@db.Uuid`, all timestamps are `@db.Timestamptz`.
- **Seed data exists:** 1 org (firefighter-prep), 1 admin user, 1 exam (NFPA 1001), 1 topic, 1 section, 2 study items.
- **Problem model** has types: multiple_choice, fill_blank, true_false, ordering, matching, scenario. Problems belong to KnowledgePoints.
- **ProblemAttempt model** tracks: userId, problemId, answer (Json), correct (Boolean), responseTimeMs, xpAwarded.
- **StudentConceptState** tracks: masteryState (unstarted/in_progress/mastered/needs_review), repNum, memory, interval, speed, abilityTheta, speedRD, observationCount, implicitCreditRatio, failCount, diagnosticState.
- **StudentKPState** tracks: passed, attempts, consecutiveCorrect, lastAttemptAt.
- **CourseEnrollment** tracks: diagnosticCompleted, dailyXPTarget, totalXPEarned.
- **GraphQueryService** has `getKnowledgeFrontier(courseId, masteredConceptIds)`, `getPrerequisiteChain(conceptId)`, `topologicalSort(courseId)`.
- **Controller pattern:** `@Controller('orgs/:orgId/courses')` with `@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)`. `@CurrentOrg()` provides OrgContext.
- **In-memory session pattern:** Review and Quiz services use `Map<string, Session>` for in-progress sessions (same as diagnostic module).
- **Pure function pattern:** Math-heavy logic goes in pure `.ts` files with dedicated `.spec.ts` tests. Services orchestrate Prisma + pure functions.
- **Mastery transitions implemented:**
  - `unstarted → in_progress` (first answer submitted)
  - `in_progress → mastered` (all KPs passed — 2 consecutive correct each)
  - `mastered → needs_review` (incorrect answer on mastered concept, or quiz failure)
  - `needs_review → mastered` (successful review — 60% pass threshold)

## Phase 5 scope

Build the learning engine: the "brain" that decides what the student should do next.

Specific deliverables:

1. **Task selector** — The core algorithm. Given a student's current state, determine the optimal next task:
   - Priority 1: Remediation tasks (if plateau detected) — blocks progress
   - Priority 2: Urgent reviews (memory < 0.3) — prevent forgetting
   - Priority 3: New lessons (at the knowledge frontier) — primary learning
   - Priority 4: Standard reviews (memory < 0.5) — maintenance
   - Priority 5: Quizzes (when XP since last quiz >= 150) — periodic assessment
   - Return: `{ taskType: 'lesson'|'review'|'quiz'|'remediation', conceptId?, quizId?, reason }`

2. **Knowledge frontier service** — Compute which concepts the student can learn next:
   - A concept is at the frontier if: all prerequisites mastered AND concept is not mastered
   - GraphQueryService already has `getKnowledgeFrontier` — use it, but add filtering for remediation blocks
   - From frontier, select using heuristics: variety (different tags), difficulty balancing, review compression (prefer concepts whose encompassing edges knock out due reviews)

3. **Plateau detection** — Detect when a student is stuck:
   - Trigger: `failCount >= 2` on a concept (2 consecutive failures)
   - Identify weak prerequisites: trace back through the graph, check mastery signals
   - Create remediation: mark specific prerequisites for targeted review
   - Block: while remediation is pending, exclude dependent concepts from frontier

4. **Remediation service** — Manage remediation state:
   - Track active remediations: which prerequisites need re-review
   - Clear remediation when prerequisites are re-mastered
   - Route student to parallel frontier concepts that don't depend on weak prerequisites

5. **Study session generator** — Build a batch of tasks for a study session:
   - Given a daily XP target, generate a sequence of tasks
   - Mix lessons and reviews to prevent monotony
   - Include quiz when XP threshold reached
   - Return ordered task list

6. **"Next task" endpoint + study session endpoint** — API layer

7. **Tests for everything** — TDD: test first, then implement

## API endpoints (from Section 13)

```
GET    /orgs/:orgId/courses/:courseId/next-task          # what should I do next?
GET    /orgs/:orgId/courses/:courseId/session             # get a batch of tasks for a study session
POST   /orgs/:orgId/courses/:courseId/lessons/:conceptId/start    # begin a lesson
POST   /orgs/:orgId/courses/:courseId/lessons/:conceptId/complete # mark lesson done
```

Note: The `/lessons/:conceptId/answer` endpoint already exists in the Assessment module.

## Constraints

- Use `bun` as package manager
- TDD: every piece of logic gets a test FIRST
- Don't implement FIRe spaced repetition (Phase 6) — but DO read memory values for review urgency checks
- Don't implement memory decay curves — just read `memory` from StudentConceptState
- Don't build the frontend
- Don't modify existing Phase 1-4 code unless absolutely necessary for a foreign key or service export
- Task selection is pure math/logic — implement as pure functions with comprehensive unit tests
- The learning engine module should import StudentModelModule and KnowledgeGraphModule (and optionally AssessmentModule)

## Schema additions (if needed)

You may need a new Prisma model for tracking remediations:

```prisma
model Remediation {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  courseId           String   @map("course_id") @db.Uuid
  blockedConceptId  String   @map("blocked_concept_id") @db.Uuid
  prerequisiteId    String   @map("prerequisite_id") @db.Uuid
  isResolved        Boolean  @default(false) @map("is_resolved")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz
  resolvedAt        DateTime? @map("resolved_at") @db.Timestamptz

  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  // Add relations as needed

  @@index([userId, courseId, isResolved])
  @@map("remediations")
}
```

Only add this if you need persistent remediation tracking. In-memory tracking is also acceptable for this phase.

## What "done" looks like

- Task selector correctly prioritizes: remediation > urgent review > lesson > standard review > quiz
- Knowledge frontier respects prerequisites and remediation blocks
- Plateau detection fires after 2 consecutive failures, identifies weak prerequisites
- Remediation tracks prerequisites needing re-review, clears when re-mastered
- Study session generates a mixed sequence of tasks for a daily target
- "Next task" endpoint returns the optimal task with full context
- All endpoints protected by auth guards (SupabaseAuthGuard + OrgMembershipGuard)
- All tests green, no lint errors
- `bun run test` passes from `backend/`
```
