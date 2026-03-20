# Academy Graph Engine Plan

## Status

- `work in progress`

### Progress Snapshot

- completed:
  - docs/vocabulary freeze for the academy model
  - Prisma academy foundation (`Academy`, `AcademyPart`, `AcademyEnrollment`, `StudentCourseState`)
  - full backend regression/test closure for the refactored contracts
  - qualified cross-course authoring refs and cross-course import resolution
  - academy-wide validation in the manifest/import pipeline
- work in progress:
  - academy read APIs and graph projections
  - academy enrollment and student-state ownership
  - academy-scoped diagnostics
  - academy-scoped learning-engine runtime, task selection, remediation, and XP accounting
  - academy manifest/per-course importer replacement
  - academy-level import/validate admin paths
- not started:
  - academy-first diagnostic UI and deeper nested academy course/task views
  - TAM pilot content split
  - Pre-Pilot Quality Gate verification
- verified locally:
  - backend Prisma client generation
  - backend TypeScript build
  - backend dev startup on a non-conflicting port with no app error logs
  - backend Jest suite (`61/61` suites passing)

## Purpose

This document translates the pedagogical claims we are borrowing from *The Math
Academy Way* into a full internal replacement of the current learning engine.

It is the primary implementation plan for the learning-engine refactor toward an
academy-scoped adaptive model.

The TAM course-tree plan defines the first real validation slice for that
refactor:

- PostHog TAM should become an academy with multiple real courses
- the adaptive engine must operate on a connected academy graph, not a single course graph

This document is engine-first.
The TAM pilot is how we prove the replacement on real content, not why the
replacement exists.

Primary companion docs:

- `docs/posthog-tam-academy-master-plan.md`
- `docs/posthog-tam-course-tree-plan.md`

## Problem Statement

The current engine treats `courseId` as the adaptive graph boundary.

That assumption appears across the stack:

- schema: `Course`, `CourseSection`, `Concept`, `CourseEnrollment`, `DiagnosticSession`, `XPEvent`, and `Remediation` are course-scoped in `backend/prisma/schema.prisma`
- importer: `CourseImporterService` imports one isolated course YAML at a time in `backend/src/knowledge-graph/course-importer.service.ts`
- YAML schema: `CourseYamlSchema` assumes one file defines one graph slice in `backend/src/knowledge-graph/schemas/course-yaml.schema.ts`
- graph reads: `CourseReadService` reads one course graph in `backend/src/knowledge-graph/course-read.service.ts`
- frontier logic: `GraphQueryService` is generic, but callers pass one course's concepts/edges in `backend/src/knowledge-graph/graph-query.service.ts`
- learning engine: `LearningEngineService` builds context from one course in `backend/src/learning-engine/learning-engine.service.ts`
- enrollment: `EnrollmentService` creates course enrollments and seeds section state per course in `backend/src/student-model/enrollment.service.ts`
- diagnostics: `DiagnosticSessionService` runs one diagnostic per course in `backend/src/diagnostic/diagnostic-session.service.ts`
- progress/gamification/controllers: routes and summaries are course-scoped across `backend/src/student-model`, `backend/src/gamification`, and `backend/src/learning-engine`

That is incompatible with the academy-scoped teaching model we want in the
engine and plan to validate first with TAM:

- multiple real courses
- one connected graph
- cross-course prerequisites
- cross-course implicit review
- frontier selection across multiple branches

## Codebase Audit Notes

The course-scoped assumption is not isolated to one service. It is wired through the current route model and mastery/update flows.

Examples from the current codebase:

- backend controllers are mounted at course routes such as:
  - `backend/src/learning-engine/learning-engine.controller.ts`
  - `backend/src/diagnostic/diagnostic.controller.ts`
  - `backend/src/assessment/assessment.controller.ts`
- web study, browse, and diagnostic entry points are keyed by `[courseId]`:
  - `apps/web/src/app/(app)/browse/[courseId]/page.tsx`
  - `apps/web/src/app/(app)/study/[courseId]/page.tsx`
  - `apps/web/src/app/(app)/diagnostic/[courseId]/page.tsx`
- implicit review propagation currently scopes by course:
  - `backend/src/assessment/review.service.ts`
  - `backend/src/spaced-repetition/fire-update.service.ts`
- routing helpers and CTA logic currently assume every next task belongs to the active course route:
  - `apps/web/src/components/app/study-router.tsx`
  - `apps/web/src/lib/course-section-entry.ts`

That is why the plan names changes across schema, importer, diagnostics, learning engine, review propagation, and web navigation. The current course boundary is cross-cutting.

## Pedagogical Invariants

These are the non-negotiable teaching rules we are extracting from *The Math Academy Way* and preserving in code.

### Invariant 1: The graph is the source of truth

From Ch. 4, the knowledge graph is the real curriculum and course graphs are compressed summaries for humans.

Engine implication:

- the adaptive boundary must be the academy graph
- courses and sections are projections over the graph, not the graph itself
- any course split that loses prerequisite semantics is structurally wrong

### Invariant 2: Teach at the knowledge frontier

From Ch. 13, the learner should only receive new material whose prerequisites are mastered, and one blocked branch should not stall all progress.

Engine implication:

- frontier calculation must run across the enrolled academy graph
- task selection must choose among ready concepts across courses
- blocked concepts and remediations must not freeze unrelated branches

### Invariant 3: Split large stairs into smaller stairs

From Ch. 14, oversized learning units should be split into smaller stairs to reduce cognitive load.

Engine implication:

- the system must support multiple real courses inside a domain instead of forcing giant mixed courses
- authoring/import validation should support academy-level structure and smaller course files
- course review workflows should explicitly check whether a branch deserves its own course

### Invariant 4: Preserve layering across the whole domain

From Ch. 16, later learning should exercise earlier learning in a hierarchical connected sequence.

Engine implication:

- cross-course prerequisite edges must be allowed
- cross-course encompassing edges must be allowed
- review compression and remediation must cross course boundaries where the graph says they should

## Design Goals

- Replace the current course-scoped engine outright with an academy-scoped
  runtime, not a compatibility wrapper
- Make `Academy` the adaptive graph boundary
- Keep `Course` as a real learner-facing subgraph with its own progress and completion semantics
- Preserve section-level checkpoints inside each course
- Support cross-course prerequisite and encompassing edges
- Keep the current concept/KP model intact where possible
- Minimize disruption to existing single-course content by migrating it into one-course academies

## Non-Goals

- Rebuilding the full learning engine from scratch
- Automatic pedagogical linting strong enough to replace human review
- Supporting concepts that belong to multiple academies
- Solving billing/catalog/marketing structure for every future niche in this first refactor

## Sequencing Rule

The order of work is intentionally strict:

1. freeze the architecture/docs
2. properly rework the engine around academy-scoped learning
3. only then split TAM into four real courses as the first pilot
4. only after that pilot is stable, expand the academy with parallel authoring/review agents

Important clarification:

- the TAM 4-course pilot is **not** where we discover that the engine is still course-scoped
- the pilot is where we validate that the fully reworked academy engine supports the intended pedagogy cleanly

That means:

- no fake "minimum viable" workaround that leaves frontier, diagnostics, or remediation course-scoped
- no content split used as a proxy for unfinished engine architecture
- no TAM course split until the academy boundary is real in code

## Recommended Target Model

### Domain Model

### New top-level entities

- `Academy`
  - adaptive graph boundary
  - org-owned
  - name, slug, description, version
- `AcademyPart`
  - optional learner-facing grouping of courses
  - ordered within academy
- `AcademyEnrollment`
  - primary adaptive enrollment boundary
  - owns academy-level diagnostic state, XP target, total XP, and academy-level progress settings

### Existing entities retained, but re-scoped

- `Course`
  - remains a learner-facing subgraph
  - now belongs to an `Academy`
  - may belong to an `AcademyPart`
- `CourseSection`
  - still belongs to a course
- `Concept`
  - still atomic graph node
  - still belongs to one course
  - cross-course edges connect concepts across course boundaries inside the same academy
- `KnowledgePoint`
  - unchanged as lesson staircase unit

### State model

- `StudentConceptState`
  - can remain keyed by `(userId, conceptId)`
  - this is already concept-global enough to survive the refactor
- `StudentSectionState`
  - can remain section-scoped, because sections still belong to courses
- new `StudentCourseState`
  - recommended for course-local progress, unlocked/active/completed state, and derived checkpoints
- `CourseEnrollment`
  - recommended path: deprecate as the primary adaptive boundary
  - short-term compatibility option: keep temporarily while introducing `AcademyEnrollment`

## Migration Strategy Recommendation

Use a strangler migration, not a hard break.

Recommended migration rule:

- every existing course becomes a one-course academy first

Why:

- it gives the engine one consistent adaptive boundary
- it avoids a special case where some flows are course-scoped and others academy-scoped
- it lets existing content keep working while TAM serves as the first
  multi-course academy pilot

## Data Model Changes

### Prisma changes

Add:

- `Academy`
- `AcademyPart`
- `AcademyEnrollment`
- `StudentCourseState`

Modify:

- `Course`
  - add `academyId`
  - add optional `partId`
  - add sort/order fields inside academy
- `DiagnosticSession`
  - add `academyId`
  - deprecate direct dependence on `courseId` as the session boundary
- `XPEvent`
  - add `academyId`
  - keep optional `courseId` and `conceptId` for attribution
- `Remediation`
  - add `academyId`
  - keep blocked/weak concept refs; `courseId` becomes optional attribution, not the main lookup key

Review whether to keep or deprecate:

- `CourseEnrollment`
  - if kept in phase 1, mark as compatibility/progress layer
  - if removed later, migrate all callers to `AcademyEnrollment` + `StudentCourseState`

### Suggested schema constraints

- `Academy`: unique `(orgId, slug)`
- `Course`: unique `(academyId, slug)` and optionally keep `(orgId, slug)` during transition
- `AcademyEnrollment`: unique `(userId, academyId)`
- all prerequisite/encompassing edges must connect concepts inside the same academy

## Content Model and Importer

### Authoring Format

Recommended structure:

```text
content/
  academies/
    posthog-tam/
      academy.yaml
      courses/
        data-models.yaml
        data-pipelines.yaml
        posthog-data-model.yaml
        posthog-ingestion-pipeline.yaml
```

### `academy.yaml`

Defines:

- academy metadata
- parts
- course registry
- optional authored course order for UI
- optional declared course-level dependency hints for browse UX

### per-course YAML

Defines:

- course metadata
- sections
- concepts
- KPs
- prerequisites
- encompassing

### Cross-course edge references

This is the most important schema choice.

Recommended rule:

- local references may use unqualified concept slugs for same-course edges
- cross-course edges must use qualified refs such as `course-slug:concept-slug`

Example:

```yaml
prerequisites:
  - entities
  - data-models:relationships
```

Why:

- preserves readable local authoring
- makes cross-course edges explicit
- avoids global concept-slug collisions

## Importer Refactor

Current importer:

- `CourseImporterService` parses one file, validates one course graph, and writes one course

Target importer:

- `AcademyImporterService`
  - loads academy manifest
  - loads all referenced course files
  - resolves qualified concept refs
  - validates the academy-wide graph
  - writes academy, parts, courses, sections, concepts, KPs, and edges in one transaction boundary where feasible

### Importer requirements

- support idempotent re-imports
- preserve stable slugs
- archive missing content safely
- seed new student concept/section/course rows for existing academy enrollments
- prevent destructive slug removals without archival mode

### Validation requirements

Extend graph validation from course-wide to academy-wide:

- detect cycles across all concepts in the academy
- validate cross-course references
- warn on orphan concepts and orphan courses
- validate that all edge endpoints belong to the same academy
- validate section exam blueprints within each course
- validate that course dependency projections derived from concept edges are acyclic

## Graph Query Layer

`GraphQueryService` itself is already mostly generic, but its callers are not.

### Required changes

- add academy-wide context loaders:
  - all active concepts in academy
  - all active prerequisite edges in academy
  - all active encompassing edges in academy
- add projection helpers:
  - academy graph
  - course graph
  - section graph
- add derived course dependency graph from concept edges
- add helpers for filtering frontier/results by course when the UI asks for course-local views

### File impacts

- `backend/src/knowledge-graph/graph-query.service.ts`
- `backend/src/knowledge-graph/course-read.service.ts`
- `backend/src/knowledge-graph/active-course-content.ts`

`active-course-content.ts` should likely become something like `active-graph-content.ts` with helpers for:

- active academy
- active course
- active section
- active academy edges
- active course projections

## Learning Engine

### Current problem

`LearningEngineService` currently:

- verifies `CourseEnrollment`
- builds context from one course
- filters frontier by section state inside that course
- creates remediations tied to `courseId`

That is incompatible with academy-wide frontier selection.

### Target behavior

`LearningEngineService` should operate on `academyId`.

### Academy-wide `getNextTask`

Inputs:

- `userId`
- `academyId`

Process:

1. decay memory across the academy
2. load academy-wide concept states and edges
3. load section and course state projections
4. sync remediations at academy scope
5. compute academy frontier
6. filter out blocked concepts
7. score candidate concepts across courses
8. return next task including `academyId`, `courseId`, `sectionId`, and `conceptId`

### Task-selection scoring changes

The current selector is ordered but naive. Academy scope needs additional ranking factors:

- prerequisite readiness
- remediation block status
- course unlock/course checkpoint state
- review compression value from encompassing edges
- branch diversity to avoid over-deepening a single path
- local course continuity so learners are not whipped across the map unnecessarily

Recommended rule:

- keep the current priority tiers
- replace "first frontier concept wins" with scored selection among academy frontier concepts

### Section exam interaction

Section exams remain course-local.

Recommended behavior:

- if a section exam is ready, it competes within the academy task selector as a high-priority task
- passing a course-local section exam should not wall off other frontier-ready concepts elsewhere in the academy

### Remediation interaction

Remediation records should be academy-scoped because the weak prerequisite may sit in a different course from the blocked concept.

File impacts:

- `backend/src/learning-engine/learning-engine.service.ts`
- `backend/src/learning-engine/task-selector.ts`
- `backend/src/learning-engine/remediation.service.ts`
- `backend/src/learning-engine/types.ts`
- `backend/src/learning-engine/session-generator.ts`

## Diagnostic Engine

### Current problem

`DiagnosticSessionService` runs per course and writes `diagnosticCompleted` onto `CourseEnrollment`.

That is wrong once the adaptive boundary is the academy.

### Target behavior

Diagnostics should run at academy scope.

### Academy diagnostic

- session belongs to `academyId`
- concept pool spans the enrolled academy
- evidence propagation and selection operate on academy-wide edges
- completion marks `AcademyEnrollment.diagnosticCompleted`

### Course-local placement semantics

The diagnostic result should still support course-local views:

- course unlocked / partially known / blocked
- likely starting section per course

But those are derived projections from academy concept states, not separate diagnostics.

### Controller/API changes

Add:

- `POST /orgs/:orgId/academies/:academyId/diagnostic/start`
- `POST /orgs/:orgId/academies/:academyId/diagnostic/answer`
- `GET /orgs/:orgId/academies/:academyId/diagnostic/:sessionId`

Keep course-level endpoints temporarily only as migration shims where possible.

File impacts:

- `backend/src/diagnostic/diagnostic.controller.ts`
- `backend/src/diagnostic/diagnostic-session.service.ts`
- `backend/prisma/schema.prisma`

## Student Model and Enrollment

### Enrollment model

### New primary flow

- learner enrolls in an academy
- enrollment seeds:
  - academy enrollment row
  - concept state for all active academy concepts
  - section state for all sections in academy courses
  - course state for all courses in academy

### Compatibility rule

During migration:

- course enroll endpoint may create or look up academy enrollment behind the scenes
- course pages should still be accessible, but the adaptive session is academy-scoped

### State services

`StudentStateService` should stop requiring `courseId` for core state access.

Recommended API shape:

- `getConceptStatesForAcademy(userId, academyId)`
- `getMasteryMapForAcademy(userId, academyId)`
- `isDiagnosticCompleted(userId, academyId)`
- `markDiagnosticComplete(userId, academyId)`

Course-local profile methods can be derived by filtering academy states.

File impacts:

- `backend/src/student-model/enrollment.service.ts`
- `backend/src/student-model/student-state.service.ts`
- `backend/src/student-model/student-model.controller.ts`

## Assessments, Progress, and Gamification

### Section exams

Keep section exams course-local.

Changes needed:

- section readiness sync must work when academy enrollment is primary
- course-local exam progress should roll up into course completion and academy progress

### Quizzes

Current `QuizService` is course-scoped and in-memory.

Recommended change:

- academy quizzes become the default review/compression instrument
- course-only quizzes remain optional projections
- persist quiz sessions properly instead of in-memory only

This is not strictly required to unlock academy graphs, but the route shape and XP accounting should move with the refactor so we do not deepen the course-scoped assumption.

### XP, streaks, leaderboard, completion estimates

Current services are keyed to `courseId`.

Recommended transition:

- add academy-level XP summaries and streaks
- keep optional course attribution for reporting
- completion estimate should exist at both academy and course levels

File impacts:

- `backend/src/assessment/section-exam.service.ts`
- `backend/src/assessment/quiz.service.ts`
- `backend/src/gamification/xp.service.ts`
- `backend/src/gamification/streak.service.ts`
- `backend/src/gamification/course-progress-read.service.ts`
- `backend/src/gamification/completion-estimate.service.ts`
- `backend/src/gamification/gamification.controller.ts`

## API Surface

### New academy-first endpoints

Recommended additions:

- `GET /orgs/:orgId/academies`
- `GET /orgs/:orgId/academies/:academyId`
- `GET /orgs/:orgId/academies/:academyId/graph`
- `GET /orgs/:orgId/academies/:academyId/courses`
- `POST /orgs/:orgId/academies/:academyId/enroll`
- `GET /orgs/:orgId/academies/:academyId/profile`
- `GET /orgs/:orgId/academies/:academyId/next-task`
- `GET /orgs/:orgId/academies/:academyId/study-session`
- `POST /orgs/:orgId/academies/import`

### Course endpoints that remain

Courses still need endpoints for:

- course metadata
- course graph projection
- section states and section exams
- course detail pages in the UI

But they should stop being the main adaptive boundary.

## Planned Updates By Module

This section names the concrete code surfaces expected to change before the TAM pilot is allowed to begin.

### Backend schema and persistence

- `backend/prisma/schema.prisma`
  - add `Academy`, `AcademyPart`, `AcademyEnrollment`, `StudentCourseState`
  - add `academyId` to `Course`
  - add `academyId` to `DiagnosticSession`, `XPEvent`, and `Remediation`
  - add compatibility fields/indexes needed for transition from `CourseEnrollment`
- `backend/prisma/migrations/*`
  - create academy tables
  - backfill existing courses into one-course academies
  - backfill academy enrollments for existing course enrollments

### Backend content import and graph validation

- `backend/src/knowledge-graph/schemas/course-yaml.schema.ts`
  - split into academy-manifest and per-course schemas, or add sibling schemas that support that format
  - add qualified cross-course concept references
- `backend/src/knowledge-graph/course-importer.service.ts`
  - either replace with `AcademyImporterService` or reduce it to a course-slice importer under an academy-aware coordinator
  - support academy-wide validation and idempotent multi-file imports
- `backend/src/knowledge-graph/graph-validation.service.ts`
  - validate academy-wide cycles, same-academy edge endpoints, orphan courses, and cross-course refs
- `backend/src/knowledge-graph/active-course-content.ts`
  - refactor into academy-aware filters/helpers instead of assuming `courseId` is the graph boundary

### Backend graph reads and controllers

- `backend/src/knowledge-graph/course-read.service.ts`
  - add academy reads and projections
  - keep course reads as projections inside academy scope
- `backend/src/knowledge-graph/knowledge-graph.controller.ts`
  - add academy-first routes
  - keep course routes as compatibility/read-model routes
- `backend/src/knowledge-graph/graph-query.service.ts`
  - keep generic algorithms, add academy projection helpers and derived course-dependency graph helpers

### Backend enrollment and student state

- `backend/src/student-model/enrollment.service.ts`
  - create academy enrollment flow
  - seed concept/section/course state across the academy
  - keep course enroll endpoint only as a migration shim if needed
- `backend/src/student-model/student-state.service.ts`
  - move core methods from `courseId` to `academyId`
  - derive course-local views by filtering academy states
- `backend/src/student-model/student-model.controller.ts`
  - expose academy-first mastery/profile endpoints
  - preserve course profile endpoints as projections

### Backend diagnostic engine

- `backend/src/diagnostic/diagnostic.controller.ts`
  - add academy-scoped routes
- `backend/src/diagnostic/diagnostic-session.service.ts`
  - switch session boundary from course to academy
  - load academy-wide concepts/edges
  - complete against `AcademyEnrollment`
- `backend/src/diagnostic/mepe-selector.ts`
  - verify academy-scale selection behavior and tie-breaking across courses
- `backend/src/diagnostic/evidence-propagation.ts`
  - verify propagation works across cross-course edges

### Backend learning engine

- `backend/src/learning-engine/learning-engine.controller.ts`
  - move `next-task` and `session` to academy-first routes
- `backend/src/learning-engine/learning-engine.service.ts`
  - build academy-wide context
  - compute academy frontier
  - return task payloads that include `academyId`, `courseId`, `sectionId`, `conceptId`
- `backend/src/learning-engine/task-selector.ts`
  - replace naive frontier ordering with academy-aware scoring
- `backend/src/learning-engine/remediation.service.ts`
  - move remediation lookup from `(userId, courseId)` to academy scope
- `backend/src/learning-engine/session-generator.ts`
  - ensure session assembly works when tasks span multiple courses inside one academy
- `backend/src/learning-engine/lesson.service.ts`
  - keep lesson start/complete course-local, but verify it cooperates with academy enrollment/state

### Backend assessment, review, and spaced repetition

- `backend/src/assessment/assessment.controller.ts`
  - stop making course-scoped assessment routes the only entry point
- `backend/src/assessment/problem-submission.service.ts`
  - verify post-answer progress sync works when academy enrollment is authoritative
- `backend/src/assessment/review.service.ts`
  - remove course-scoped assumptions from implicit propagation and review selection
- `backend/src/spaced-repetition/fire-update.service.ts`
  - stop scoping encompassing-edge propagation by `courseId` alone
  - allow implicit review propagation across course boundaries inside the same academy
- `backend/src/assessment/section-exam.service.ts`
  - keep section exams course-local while reading learner state from academy-owned progress
- `backend/src/assessment/quiz.service.ts`
  - stop deepening the course-only assumption
  - either introduce academy quizzes now or explicitly keep a compatibility layer with a follow-up plan
- `backend/src/gamification/xp.service.ts`
  - add academy-level XP accounting
  - keep optional course attribution
- `backend/src/gamification/course-progress-read.service.ts`
  - add academy graph progress overlays
- `backend/src/gamification/streak.service.ts`
- `backend/src/gamification/completion-estimate.service.ts`
- `backend/src/gamification/gamification.controller.ts`
  - add academy-first summaries while preserving course views as projections

### Web app routes and UI

Current web flows are strongly course-routed and will need explicit updates before the TAM pilot:

- `apps/web/src/app/(app)/browse/[courseId]/page.tsx`
  - change from top-level course detail page to a course view nested within academy context
- `apps/web/src/app/(app)/study/[courseId]/page.tsx`
  - stop asking course-scoped `next-task` as the main entry point
- `apps/web/src/app/(app)/diagnostic/[courseId]/page.tsx`
  - move diagnostic entry to academy scope
- `apps/web/src/components/app/knowledge-graph-section.tsx`
  - load academy/course/section graph projections rather than a single course-only graph
- `apps/web/src/components/app/study-router.tsx`
  - support academy-first task routing
- `apps/web/src/components/app/diagnostic-flow.tsx`
  - switch API calls and redirect behavior to academy-first routes
- `apps/web/src/components/app/quiz-flow.tsx`
  - verify academy/course attribution and return paths stay coherent
- `apps/web/src/components/app/concept-list.tsx`
  - stop assuming concept navigation always stays inside a top-level course-only session
- `apps/web/src/lib/course-section-entry.ts`
  - update CTA logic to work from academy-aware tasks
- `apps/web/src/components/app/course-card.tsx`
- `apps/web/src/components/app/continue-studying.tsx`
  - likely need academy-aware linking and progress summaries

If we want the pilot to feel coherent, these web changes are not optional polish. They are part of making the academy model real.

## UI and Read Models

The UI needs projections at four levels:

- academy
- course
- section
- concept

Required read models:

- academy summary with course states
- course summary with section states
- section summary with concept states
- concept detail

Recommended route model:

- academy shell route owns active learning session context
- course pages are nested views inside academy context

## Migration Plan

### Phase A: introduce academies without behavior change

1. add `Academy` and attach every existing course to a one-course academy
2. keep current course routes and course enrollment flows working
3. add academy reads/import paths behind feature flags

### Phase B: shift adaptive boundary

1. add `AcademyEnrollment`
2. switch diagnostics to academy scope
3. switch frontier/task selection to academy scope
4. keep course endpoints as projections

### Phase C: validate with TAM split

1. create `PostHog TAM Academy`
2. import four foundation courses
3. migrate existing TAM learner state from monolithic course concepts to new concept slugs using an explicit mapping script
4. validate frontier and remediation behavior across course boundaries

### Migration risks

- concept slug churn can wipe progress unless mapped explicitly
- dual enrollment models can cause drift if both remain authoritative too long
- course-local routes can accidentally keep calling course-scoped services after academy services exist

## Pre-Pilot Quality Gate

The TAM 4-course pilot is blocked until this gate is satisfied.

This gate exists because the TAM pilot is meant to validate the refactor, not
discover that the refactor is still incomplete.

### Required code-complete conditions

- academy tables and enrollments exist in production-ready schema
- every existing course can be represented as a one-course academy
- academy importer and validation are working end-to-end
- academy diagnostic is working end-to-end
- academy frontier and task selection are working end-to-end
- cross-course prerequisite edges are respected by the engine
- cross-course remediation works
- cross-course encompassing edges are supported by the data model and query layer
- course-local section exams still work correctly inside academy scope
- academy and course read models exist for the web app
- web navigation can enter an academy, open a course, start diagnostic, get next task, and move through lessons without falling back to course-only assumptions

### Required verification conditions

- automated test fixture for a tiny two-course academy passes
- automated test fixture proves one branch can remain blocked while another branch progresses
- automated test fixture proves cross-course prerequisite unlocking
- automated test fixture proves cross-course remediation targeting
- migration/backfill scripts are tested on existing single-course data
- the TAM pilot content authors do not need to invent workaround semantics in YAML to compensate for missing engine behavior

### Explicit non-acceptance conditions

Do **not** begin the TAM split if any of these are still true:

- diagnostic still runs per course
- next-task still assumes one course is the adaptive boundary
- remediation still filters by `courseId`
- academy routes exist only as thin wrappers over unchanged course-scoped behavior, which is a hard blocker
- the web app still makes the learner choose the "right course" before the engine can compute their real frontier

## Implementation Phases

### Phase 0: finalize docs and invariants

Deliverables:

- this plan approved
- TAM course-tree plan approved
- authoring docs aligned

Exit criteria:

- vocabulary frozen
- academy becomes the official adaptive boundary

### Phase 1: schema and compatibility groundwork

Tasks:

1. add `Academy`, `AcademyPart`, `AcademyEnrollment`, and `StudentCourseState`
2. add `academyId` and optional `partId` to `Course`
3. add `academyId` to `DiagnosticSession`, `XPEvent`, and `Remediation`
4. backfill existing courses into one-course academies
5. ship migrations with compatibility reads

Tests:

- Prisma migration tests
- backfill script test on fixture data
- existing course endpoints still work unchanged

### Phase 2: academy authoring and importer

Tasks:

1. create academy manifest schema
2. create qualified concept-ref syntax
3. build `AcademyImporterService`
4. extend graph validation to academy-wide graphs
5. preserve archival/idempotent import behavior

Tests:

- import one-course academy fixture
- import multi-course academy fixture with cross-course edges
- reject cross-academy or unresolved refs
- reject academy-wide cycles

### Phase 3: academy read model and graph projections

Tasks:

1. add academy read service
2. add academy/course/section graph projections
3. add derived course dependency graph
4. refactor active-content filters to academy-aware helpers

Tests:

- academy graph projection returns correct course nodes/edges
- course graph projection returns correct sections
- section graph projection returns correct concepts

### Phase 4: enrollment, student state, and diagnostics

Tasks:

1. add academy enrollment flow
2. seed concept/section/course state across the academy
3. refactor `StudentStateService` to academy-first methods
4. refactor diagnostics to academy scope

Tests:

- enrolling in academy seeds all expected states
- diagnostic covers cross-course concepts
- diagnostic completion sets academy enrollment complete
- course-local profile pages render from academy-derived state

### Phase 5: learning engine and remediation

Tasks:

1. refactor `LearningEngineService` to accept `academyId`
2. compute frontier across academy graph
3. update task selection scoring across multiple courses
4. make remediation academy-scoped
5. preserve section exam priority without breaking branch diversity

Tests:

- blocked concept in course A does not block ready concept in course B
- cross-course prerequisite prevents frontier unlock until satisfied
- cross-course remediation targets the actual weak prerequisite

Exit criteria:

- the academy boundary is the real runtime boundary for diagnostics, frontier, task selection, and remediation
- no core adaptive flow depends on `courseId` as the authoritative graph boundary

### Phase 6: progress, quizzes, and gamification

Tasks:

1. add academy-level progress summaries
2. add academy graph progress overlay
3. refactor XP/streak/completion estimate to academy scope
4. decide whether quiz becomes academy-wide in this phase or the next

Tests:

- XP attribution works at academy and course views
- completion estimate works at both levels
- existing progress views still render for one-course academies

Exit criteria:

- academy summaries are first-class
- course summaries are projections, not the primary adaptive state container

### Phase 7: UI and TAM pilot rollout

Tasks:

1. ship academy browse and academy graph views
2. ship nested course pages inside academy context
3. import the four TAM foundations courses
4. run graph review and migration dry run
5. launch TAM academy behind a feature flag

Tests:

- academy graph navigation works end-to-end
- next task links into the right course/concept
- migrated TAM users preserve meaningful progress

Entry criteria:

- the Pre-Pilot Quality Gate is fully satisfied
- no unresolved engine blockers remain for cross-course adaptive behavior

## TDD Task List

Implementation should proceed in small vertical slices. Recommended order:

1. schema: create `Academy` and attach current courses to one-course academies
2. read path: list academies and academy graph with existing single-course data
3. importer: import a tiny two-course academy fixture
4. enrollment: add academy enrollment and seed states
5. diagnostic: run academy-scope diagnostic on the tiny fixture
6. learning engine: compute academy frontier on the tiny fixture
7. remediation: prove cross-course weak prerequisite routing
8. UI read model: academy graph projection
9. TAM pilot content split after all previous steps are green

## Open Questions

- Should course unlocks be purely derived from concept edges, or can academy manifests author explicit course dependencies for UX ordering?
- Should `CourseEnrollment` survive long-term as a learner-facing artifact, or should `StudentCourseState` fully replace it?
- Do we want academy-wide quizzes in the first rollout, or only after the core graph refactor is stable?
- Should section exams remain mandatory for course completion in all academies, or be configurable per course?

## Recommendation

Do not start splitting TAM content files until the engine rework is actually complete enough to satisfy the Pre-Pilot Quality Gate.

The correct sequence is:

- define academy boundary
- make the engine academy-aware
- then use the TAM split to validate that engine on real courses

Anything else risks recreating the original mistake in a more complicated shape.
