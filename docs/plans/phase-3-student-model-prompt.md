# Phase 3: Student Model & Diagnostic — Build Prompt

> Copy this entire prompt into a new Claude Code session to kick off the build.

---

## Prompt

```
I'm building a white-labeled adaptive learning platform for professional certification exams. Phases 1-2 are complete. I need you to execute Phase 3: Student Model & Diagnostic.

## Your workflow

1. Read the docs below to understand the project and what's already built
2. Use `/writing-plans` to create a detailed implementation plan for Phase 3
3. After I approve the plan, use `/subagent-driven-development` to execute it task-by-task

## Context — read these docs IN ORDER

1. `docs/PLAN.md` — Master plan. Read the "Agent-Driven Development" section, "Architecture Overview", "Monorepo Structure", and the "Phase 3: Student Model & Diagnostic" block carefully. Note that Phases 1-2 are marked Complete.

2. `docs/backend-plan.md` — Backend architecture. Skim sections 1-3 to understand the existing schema, auth system, and multi-tenancy pattern.

3. `docs/adaptive-learning-architecture.md` — **This is the primary input for Phase 3.** Read these sections carefully:
   - Section 5: Diagnostic Assessment (BKT mastery estimation, evidence propagation, MEPE question selection, response time discounting, stopping criteria, classification)
   - Section 6: Student Model & Mastery Tracking (per-student-concept state, speed parameter bootstrap/update/convergence)
   - Section 12: Data Model Additions (CourseEnrollment, StudentConceptState, StudentKPState, ProblemAttempt models + MasteryState, DiagnosticState enums)
   - Section 13: API Surface (Student Model endpoints)

4. `docs/plans/2026-03-09-phase-2-knowledge-graph.md` — Phase 2 implementation plan (for reference on code patterns used).

5. Browse `backend/src/knowledge-graph/` — The Phase 2 module. Understand the service patterns, controller structure, and how auth guards are applied.

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

### Key technical details the next agent needs to know

- **Auth guard uses ES256/JWKS**, not HS256. The guard imports from `jose` (not `jsonwebtoken`). Tests use a generated EC key pair and inject a mock JWKS via `guard.setJwks()`.
- **Jest config** is inline in `backend/package.json` with `transformIgnorePatterns: ["node_modules/(?!(\\.bun/.*/)?(jose)/)"]` to handle `jose` being ESM-only.
- **Package manager is `bun`**, not npm.
- **Prisma uses `@@map` for snake_case DB columns**, camelCase in TypeScript. All IDs are `@db.Uuid`, all timestamps are `@db.Timestamptz`.
- **`nest build` quirk:** The stale `tsconfig.build.tsbuildinfo` can silently prevent emission. If build produces no output, delete it and rebuild.
- **Seed data exists:** 1 org (firefighter-prep), 1 admin user, 1 exam (NFPA 1001), 1 topic, 1 section, 2 study items.
- **Graph query service** already has `getKnowledgeFrontier(courseId, masteredConceptIds)` — Phase 3 makes this student-aware by reading mastery state from StudentConceptState.
- **Graph query service** already has `getPrerequisiteChain(conceptId)` and `topologicalSort(courseId)` — Phase 3 uses these for evidence propagation during diagnostics.

## Phase 3 scope

Build the student model, course enrollment, and adaptive diagnostic assessment.

Specific deliverables:

1. **Prisma schema additions** — New models from adaptive-learning-architecture.md Section 12:
   - `CourseEnrollment` (userId, courseId, diagnosticCompleted, dailyXPTarget, totalXPEarned)
   - `StudentConceptState` (userId, conceptId, masteryState, repNum, memory, interval, speed, abilityTheta, speedRD, observationCount, implicitCreditRatio, failCount, diagnosticState)
   - `StudentKPState` (userId, knowledgePointId, passed, attempts, consecutiveCorrect)
   - `ProblemAttempt` (userId, problemId, answer, correct, responseTimeMs, xpAwarded)
   - Enums: `MasteryState` (unstarted, in_progress, mastered, needs_review), `DiagnosticState` (unknown, mastered, partially_known, conditionally_mastered)
   - Run migration.

2. **Student Model module** — NestJS module with:
   - Course enrollment service (enroll student, create initial StudentConceptState for every concept in the course)
   - Student state service (read/update concept states, KP states)
   - Knowledge profile service (get mastery breakdown, completion %, per-concept state overlay on graph)

3. **Diagnostic Assessment module** — The core adaptive diagnostic algorithm:
   - **BKT mastery estimation** — Bayesian Knowledge Tracing updates per concept (correct/incorrect with slip/guess params)
   - **Evidence propagation** — Correct answers propagate mastery UP to prerequisites (0.85^d discount). Incorrect propagates doubt DOWN to dependents.
   - **MEPE question selection** — Minimum Expected Posterior Entropy: select the concept whose assessment maximally reduces total uncertainty across the graph
   - **Response time discounting** — Correct answers with excessive response time get diminished evidence
   - **Stopping criteria** — Stop after 60 questions (hard cap), or when uncertain_count == 0, or after 20 questions with < 5 uncertain
   - **Classification** — After diagnostic: classify each concept as mastered (≥0.8), conditionally_mastered (0.5-0.8), partially_known (0.2-0.5), or unknown (<0.2)
   - **Diagnostic flow API** — Start diagnostic, submit answer (returns next question or completion), get results

4. **Speed parameter bootstrap** — After diagnostic completion:
   - MLE ability estimation (Newton-Raphson on diagnostic responses)
   - Per-concept speed initialization: `speed = exp(abilityTheta - difficultyTheta)`
   - SpeedRD reduction from 350 to 250

5. **Tests for everything** — TDD: test first, then implement

## API endpoints (from Section 13)

```
POST   /courses/:courseId/enroll                   # enroll student
GET    /courses/:courseId/profile                   # student's knowledge profile
GET    /courses/:courseId/diagnostic/start          # begin diagnostic assessment
POST   /courses/:courseId/diagnostic/answer         # submit diagnostic answer (returns next Q or completion)
GET    /courses/:courseId/diagnostic/result         # diagnostic report
GET    /courses/:courseId/mastery                   # per-concept mastery breakdown
```

## Constraints

- Use `bun` as package manager
- TDD: every piece of logic gets a test FIRST
- New Prisma models follow same conventions: UUIDs with @db.Uuid, `@@map` snake_case, `@db.Timestamptz`
- Don't build the task selector / learning engine (that's Phase 5)
- Don't build assessment/practice problem submission (that's Phase 4) — but DO add ProblemAttempt model since it's part of the student model
- Don't build the frontend
- Don't modify existing Phase 1 or Phase 2 models unless absolutely necessary for a foreign key
- The diagnostic algorithm is pure math — no external dependencies. Implement BKT updates, evidence propagation, and MEPE selection as pure functions with comprehensive unit tests.

## What "done" looks like

- New Prisma migration applied with all student model tables
- Course enrollment creates StudentConceptState for every concept
- Diagnostic assessment adaptively selects questions using MEPE
- Evidence propagation correctly updates mastery through the prerequisite graph
- Stopping criteria correctly terminate the diagnostic
- Classification correctly labels concepts based on final P(L)
- Speed parameter bootstrapped from diagnostic results
- Knowledge profile API returns per-concept mastery overlay
- All endpoints protected by auth guards (SupabaseAuthGuard + OrgMembershipGuard)
- All tests green, no lint errors
- `bun run test` passes from `backend/`
```
