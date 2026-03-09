# Phase 4: Assessment & Practice — Build Prompt

> Copy this entire prompt into a new Claude Code session to kick off the build.

---

## Prompt

```
I'm building a white-labeled adaptive learning platform for professional certification exams. Phases 1-3 are complete. I need you to execute Phase 4: Assessment & Practice.

## Your workflow

1. Read the docs below to understand the project and what's already built
2. Use `/writing-plans` to create a detailed implementation plan for Phase 4
3. After I approve the plan, use `/subagent-driven-development` to execute it task-by-task

## Context — read these docs IN ORDER

1. `docs/PLAN.md` — Master plan. Read the "Agent-Driven Development" section, "Architecture Overview", "Monorepo Structure", and the "Phase 4: Assessment & Practice" block carefully. Note that Phases 1-3 are marked Complete.

2. `docs/backend-plan.md` — Backend architecture. Skim sections 1-3 to understand the existing schema, auth system, and multi-tenancy pattern.

3. `docs/adaptive-learning-architecture.md` — **This is the primary input for Phase 4.** Read these sections carefully:
   - Section 9: Active Practice & Testing (problem types, lesson flow, review flow, quiz flow)
   - Section 10: XP System & Gamification (XP awards per activity, anti-gaming rules)
   - Section 11: DDD Bounded Contexts (Assessment context, domain events: ProblemAnswered, ReviewCompleted, QuizCompleted)
   - Section 12: Data Model Additions (ProblemAttempt model — already created in Phase 3)
   - Section 13: API Surface (Assessment endpoints)

4. `docs/plans/2026-03-09-phase-3-student-model.md` — Phase 3 implementation plan (for reference on code patterns used).

5. Browse `backend/src/student-model/` — The Phase 3 student model module. Understand enrollment, student state, and mastery tracking patterns.

6. Browse `backend/src/diagnostic/` — The Phase 3 diagnostic module. Understand how BKT updates, evidence propagation, and the diagnostic session service work. Phase 4's answer submission flow will update student state similarly.

7. Browse `backend/src/knowledge-graph/` — The Phase 2 module. Understand the service patterns, controller structure, and how auth guards are applied.

## What Phase 1 built (already working)

- **Monorepo:** Turborepo with `backend/`, `packages/shared/`, `apps/web/` (placeholder), `supabase/`, `content/`
- **NestJS backend:** Running on port 3000, health endpoint at `GET /api/v1/health`
- **Prisma schema:** 14 core models + 4 enums (Organization, User, OrgMembership, Exam, Topic, Section, StudyItem, AudioFile, UserProgress, UserStreak, UserBookmark, Subscription, InviteToken, AudioGenerationJob)
- **Auth guards:** SupabaseAuthGuard (ES256/JWKS via `jose`), OrgMembershipGuard, GlobalAdminGuard — all with tests
- **Decorators:** @CurrentUser(), @CurrentOrg(), @MinRole()
- **Shared types:** `@niche-audio-prep/shared` package

## What Phase 2 built (already working)

- **Prisma schema additions:** Course, Concept, KnowledgePoint, PrerequisiteEdge, EncompassingEdge, Problem + ProblemType enum
- **Knowledge Graph module** (`backend/src/knowledge-graph/`):
  - `course-importer.service.ts` — YAML parser + transactional import
  - `graph-validation.service.ts` — Cycle detection, orphan detection, weight validation, reference checks
  - `graph-query.service.ts` — Topological sort, knowledge frontier calculation, prerequisite chain traversal
  - `knowledge-graph.controller.ts` — 7 auth-guarded endpoints (list courses, graph, concepts, concept detail, import, validate, frontier)
  - `schemas/course-yaml.schema.ts` — Zod validation for YAML course files
- **66 tests passing** across 7 spec files
- **Two sample courses imported:** NY Real Estate (~85 concepts), Alberta Firefighter (~50 concepts)

## What Phase 3 built (already working)

- **Prisma schema additions:** CourseEnrollment, StudentConceptState, StudentKPState, ProblemAttempt + MasteryState/DiagnosticState enums
- **Student Model module** (`backend/src/student-model/`):
  - `enrollment.service.ts` — Transactional enrollment + concept state initialization for every concept in a course
  - `student-state.service.ts` — Mastery map CRUD, diagnostic state updates, speed parameter updates, bulk mastery updates
  - `student-model.controller.ts` — Enroll, mastery breakdown, knowledge profile endpoints
- **Diagnostic module** (`backend/src/diagnostic/`):
  - `bkt-engine.ts` — Bayesian Knowledge Tracing: mastery updates after correct/incorrect, time discounting, classification
  - `evidence-propagation.ts` — Correct-upward / incorrect-downward propagation through prerequisite graph
  - `mepe-selector.ts` — Minimum Expected Posterior Entropy question selection
  - `stopping-criteria.ts` — Hard cap (60), full coverage, diminishing returns
  - `speed-bootstrap.ts` — Newton-Raphson MLE ability estimation + per-concept speed initialization
  - `diagnostic-session.service.ts` — Stateful orchestrator wiring all pure-math pieces into the diagnostic flow
  - `diagnostic.controller.ts` — Start/answer/result endpoints
- **143 tests passing** across 19 spec files

### Key technical details the next agent needs to know

- **Auth guard uses ES256/JWKS**, not HS256. The guard imports from `jose` (not `jsonwebtoken`). Tests use a generated EC key pair and inject a mock JWKS via `guard.setJwks()`.
- **Jest config** is inline in `backend/package.json` with `transformIgnorePatterns: ["node_modules/(?!(\\.bun/.*/)?(jose)/)"]` to handle `jose` being ESM-only.
- **Package manager is `bun`**, not npm.
- **Prisma uses `@@map` for snake_case DB columns**, camelCase in TypeScript. All IDs are `@db.Uuid`, all timestamps are `@db.Timestamptz`.
- **`nest build` quirk:** The stale `tsconfig.build.tsbuildinfo` can silently prevent emission. If build produces no output, delete it and rebuild.
- **Seed data exists:** 1 org (firefighter-prep), 1 admin user, 1 exam (NFPA 1001), 1 topic, 1 section, 2 study items.
- **Problem model already exists** in Prisma schema (from Phase 2) with types: multiple_choice, fill_blank, true_false, ordering, matching, scenario. Problems belong to KnowledgePoints.
- **ProblemAttempt model already exists** in Prisma schema (from Phase 3) with: userId, problemId, answer (Json), correct (Boolean), responseTimeMs, xpAwarded.
- **StudentConceptState** already tracks: masteryState, repNum, memory, interval, speed, abilityTheta, speedRD, observationCount, implicitCreditRatio, failCount, diagnosticState.
- **StudentKPState** already tracks: passed, attempts, consecutiveCorrect, lastAttemptAt.
- **student-state.service.ts** has methods: getConceptStates, getMasteryMap, updateConceptDiagnosticState, bulkUpdateMasteries, updateSpeedParameters, markDiagnosticComplete.
- **Graph query service** has `getKnowledgeFrontier(courseId, masteredConceptIds)`, `getPrerequisiteChain(conceptId)`, and `topologicalSort(courseId)`.
- **Controller pattern:** Controllers use `@Controller('orgs/:orgId/courses')` with `@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)`. `@CurrentOrg()` provides OrgContext.

## Phase 4 scope

Build the assessment system: answer evaluation, scoring, student state updates on answer submission, review flows, and quiz flows.

Specific deliverables:

1. **Answer evaluation engine** — Pure functions (no external deps) for evaluating each problem type:
   - Multiple choice: compare selected option ID to correct answer
   - True/false: compare boolean
   - Fill in the blank: case-insensitive string match (with optional accepted alternatives from `correctAnswer` JSON)
   - Ordering: compare ordered array of IDs
   - Matching: compare pairs
   - Scenario: evaluate based on correctAnswer structure
   - Return: `{ correct: boolean, feedback: string }`

2. **Problem submission service** — When a student answers a problem:
   - Evaluate the answer using the evaluation engine
   - Create a ProblemAttempt record
   - Update StudentKPState (increment attempts, update consecutiveCorrect, mark passed if 2 consecutive correct)
   - Update StudentConceptState (update masteryState transitions, update speed via the Elo/IRT update rule from Section 6)
   - Calculate and award XP (based on activity type, difficulty, attempt number)
   - Return: result with feedback, updated state, XP awarded

3. **Review service** — When a concept is due for review:
   - Select 3-5 review problems across the concept's KPs (use `isReviewVariant: true` problems)
   - Track review session progress
   - On completion: update repNum (increase on pass), transition mastery state (pass → stays mastered, fail → needs_review)
   - Return: review session with problems, results

4. **Quiz service** — Timed broad-coverage quizzes:
   - Generate a quiz: 10-15 questions across concepts from recent learning (~150 XP window)
   - Target ~80% expected score by selecting from concepts near the student's ability level
   - Track quiz progress (timed, 15 min)
   - On completion: per-concept breakdown, failed concepts scheduled for review
   - No immediate feedback during quiz (closed-book)
   - Return: quiz with problems, results after submission

5. **XP calculation** — Pure functions for XP awards:
   - Lesson completion: 10-20 XP (scales with difficulty), +25% first attempt, -50% third+ attempt
   - Review completion: 3-5 XP, +10% if fast + accurate
   - Quiz completion: 15-25 XP, score-dependent multiplier
   - Anti-gaming: 0 XP for rapid incorrect answers (<2s), 0 XP for skipping instruction
   - Update CourseEnrollment.totalXPEarned

6. **Speed parameter update** — After each practice observation, update speed using the Elo/IRT/Glicko update rule from adaptive-learning-architecture.md Section 6 (the `updateSpeed` function). This was spec'd in Phase 3 but the actual per-observation update belongs here since Phase 4 handles answer submission.

7. **Tests for everything** — TDD: test first, then implement

## API endpoints (from Section 13)

```
POST   /orgs/:orgId/courses/:courseId/lessons/:conceptId/answer     # submit KP practice answer
POST   /orgs/:orgId/courses/:courseId/lessons/:conceptId/complete    # mark lesson done
POST   /orgs/:orgId/courses/:courseId/reviews/:conceptId/start      # begin a review session
POST   /orgs/:orgId/courses/:courseId/reviews/:conceptId/answer     # submit review answer
POST   /orgs/:orgId/courses/:courseId/reviews/:conceptId/complete   # complete review
POST   /orgs/:orgId/courses/:courseId/quizzes/generate              # generate a quiz
POST   /orgs/:orgId/courses/:courseId/quizzes/:quizId/answer        # submit quiz answer
POST   /orgs/:orgId/courses/:courseId/quizzes/:quizId/complete      # complete quiz
```

## Constraints

- Use `bun` as package manager
- TDD: every piece of logic gets a test FIRST
- Don't build the task selector / learning engine (that's Phase 5)
- Don't build the FIRe spaced repetition algorithm (that's Phase 6) — but DO update repNum on review pass
- Don't build the frontend
- Don't modify existing Phase 1-3 models unless absolutely necessary for a foreign key
- Answer evaluation is pure math — no external dependencies. Implement as pure functions with comprehensive unit tests.
- The quiz service may need a new Prisma model for quiz sessions (quiz ID, timing, question list). Add it if needed.

## What "done" looks like

- Answer evaluation correctly handles all 6 problem types
- Problem submission creates ProblemAttempt, updates StudentKPState (consecutiveCorrect, passed), updates StudentConceptState (masteryState transitions)
- Speed parameter updates after each observation using the Elo/IRT/Glicko update rule
- XP correctly calculated with anti-gaming checks
- Review flow: select review problems, track session, update mastery on completion
- Quiz flow: generate quiz, enforce timing, score on completion, schedule failed concepts for review
- All endpoints protected by auth guards (SupabaseAuthGuard + OrgMembershipGuard)
- All tests green, no lint errors
- `bun run test` passes from `backend/`
```
