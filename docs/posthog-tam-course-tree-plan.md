# PostHog TAM Course Tree Plan

## Status Legend

- `not started`: planned, but no implementation work has begun
- `work in progress`: actively being authored, reviewed, or validated
- `completed`: implemented and validated for the current increment

## Current State

- Source file today: `content/courses/posthog-tam-onboarding.yaml`
- Current shape: 1 course, 10 sections, 37 concepts
- Current structure mixes foundations, identity, groups, CDP, and querying into one course graph
- Current engine shape is still mostly `course -> sections -> concepts`, with frontier, graph reads, and task selection operating per course
- Current implementation status:
  - docs/vocabulary freeze: `completed`
  - academy schema/runtime refactor: `work in progress`
  - TAM content split: `not started`
- Desired near-term shape: split foundations into 4 real courses:
  - `Data Models`
  - `Data Pipelines`
  - `PostHog Data Model`
  - `PostHog Ingestion Pipeline`
- Desired longer-term shape: grow this into a `PostHog TAM Academy` using the Parts 1-7 / Courses 1-20 outline
- The core initiative is a full internal replacement of the current learning
  engine with the academy-scoped model implied by *The Math Academy Way*
- This plan defines the TAM-side proving ground for that replacement, not an
  academy wrapper layer or a minor update
- Master plan: `docs/posthog-tam-academy-master-plan.md`
- Detailed engine plan: `docs/academy-graph-engine-plan.md`

## What The Math Academy Sources Actually Imply

- Ch. 4, pp. 72-73: a course graph is a compressed summary of the underlying knowledge graph. The graph is the source of truth; course boundaries are a human-facing compression
- Ch. 13, pp. 210-214: mastery learning works when students move only to topics whose prerequisites are mastered, and when stalled branches do not block all progress
- Ch. 14, pp. 217-220: overly large learning stairs should be split into smaller stairs to reduce cognitive overload
- Ch. 16, pp. 241-245: the best structure is a hierarchical, highly connected sequence of learning units, not broad mixed buckets and not disconnected islands

Those chapters describe the operating model we are trying to emulate: a connected academy graph with real courses, frontier-based progression, cross-course review, and smaller pedagogically coherent units.

These points together imply the following:

- PostHog TAM should not remain one monolithic course
- The four foundations branches should become real courses, not just renamed sections
- Those courses should still live inside one connected academy-level knowledge graph so cross-course prerequisites, remediation, and implicit review remain intact

## Language We Should Use

The phrase "multiple courses within one course" is the wrong mental model.

Use this instead:

- `Academy` or `Track`: the connected graph for a domain
- `Part`: a high-level grouping of related courses
- `Course`: a real learner-facing subgraph with its own goal, checkpoints, and completion boundary
- `Section`: a human-readable grouping inside a course
- `Concept`
- `Knowledge Point`

For PostHog, the target is:

- `PostHog TAM Academy`
  - `Part 1: Foundations`
    - `Course 1: Data Models`
    - `Course 2: Data Pipelines`
    - `Course 3: PostHog Data Model`
    - `Course 4: PostHog Ingestion Pipeline`

## Required Engine Refactor

The current engine limitation is not a reason to avoid the split. It is the
reason to replace the engine, and the split exists to validate that replacement
on real content.

Today:

- `backend/src/knowledge-graph/course-read.service.ts` is course-scoped
- `backend/src/learning-engine/task-selector.ts` is course-scoped
- The current YAML and importer assume one course file defines one isolated graph slice

To match *The Math Academy Way* more tightly, the engine needs to support:

- An academy-scoped knowledge graph rather than a course-scoped graph
- Real courses as named subgraphs inside that academy
- Cross-course prerequisite edges
- Cross-course encompassing edges
- Diagnostics that can place a learner anywhere in the academy graph
- Frontier calculation across the active academy graph
- Remediation and review compression across course boundaries
- Course-local checkpoints and section exams without breaking the larger graph
- Browse and graph views that zoom `academy -> course -> section -> concept`

## Sequencing Rule

The order of work is intentionally strict:

1. freeze the architecture/docs
2. properly rework the engine around academy-scoped learning
3. only then split TAM into four real courses as the first pilot
4. only after that pilot is stable, expand the academy with parallel authoring/review agents

Important clarification:

- the TAM 4-course pilot is not where we discover that the engine is still course-scoped
- the pilot is where we validate that the fully reworked academy engine supports the intended pedagogy cleanly
- no foundations split should begin until the Pre-Pilot Quality Gate in `docs/academy-graph-engine-plan.md` is satisfied

## Researched Engine Workstreams Before The TAM Pilot

The engine rework is not abstract. The current course boundary is wired through real code that must change before the TAM split.

The main audited workstreams are:

- knowledge graph and import path:
  - `backend/prisma/schema.prisma`
  - `backend/src/knowledge-graph/course-importer.service.ts`
  - `backend/src/knowledge-graph/schemas/course-yaml.schema.ts`
  - `backend/src/knowledge-graph/graph-validation.service.ts`
  - `backend/src/knowledge-graph/course-read.service.ts`
  - `backend/src/knowledge-graph/graph-query.service.ts`
  - `backend/src/knowledge-graph/active-course-content.ts`
- academy enrollment, diagnostics, and frontier:
  - `backend/src/student-model/enrollment.service.ts`
  - `backend/src/student-model/student-state.service.ts`
  - `backend/src/diagnostic/diagnostic.controller.ts`
  - `backend/src/diagnostic/diagnostic-session.service.ts`
  - `backend/src/diagnostic/mepe-selector.ts`
  - `backend/src/diagnostic/evidence-propagation.ts`
  - `backend/src/learning-engine/learning-engine.controller.ts`
  - `backend/src/learning-engine/learning-engine.service.ts`
  - `backend/src/learning-engine/task-selector.ts`
  - `backend/src/learning-engine/remediation.service.ts`
  - `backend/src/learning-engine/session-generator.ts`
- assessment, implicit review, and progress propagation:
  - `backend/src/assessment/assessment.controller.ts`
  - `backend/src/assessment/problem-submission.service.ts`
  - `backend/src/assessment/review.service.ts`
  - `backend/src/assessment/section-exam.service.ts`
  - `backend/src/assessment/quiz.service.ts`
  - `backend/src/spaced-repetition/fire-update.service.ts`
  - `backend/src/gamification/course-progress-read.service.ts`
  - `backend/src/gamification/xp.service.ts`
  - `backend/src/gamification/streak.service.ts`
  - `backend/src/gamification/completion-estimate.service.ts`
- web routing and browse/study UX:
  - `apps/web/src/app/(app)/browse/[courseId]/page.tsx`
  - `apps/web/src/app/(app)/study/[courseId]/page.tsx`
  - `apps/web/src/app/(app)/diagnostic/[courseId]/page.tsx`
  - `apps/web/src/components/app/study-router.tsx`
  - `apps/web/src/components/app/knowledge-graph-section.tsx`
  - `apps/web/src/components/app/diagnostic-flow.tsx`
  - `apps/web/src/components/app/quiz-flow.tsx`
  - `apps/web/src/lib/course-section-entry.ts`

The detailed module-by-module change plan lives in `docs/academy-graph-engine-plan.md`.

## Recommended Target Model

### Core graph model

- `Academy` is the primary graph boundary for adaptive learning
- `Course` is a named subgraph inside an academy
- `Section` compresses part of a course graph for humans
- `Concept` is still the atomic graph node for prerequisite logic
- `Knowledge Point` is still the atomic lesson staircase step

### Delivery model

- A learner should be able to enroll in the TAM academy as a whole
- The system should still expose course-level progress, completion, and checkpoints
- A learner blocked in one course branch should still be able to advance on other frontier-ready branches elsewhere in the academy
- Later courses should strengthen earlier courses through cross-course prerequisites and encompassings instead of pretending those earlier courses do not exist

### Authoring model

Recommended direction:

- one academy manifest defining:
  - academy metadata
  - parts
  - course list
  - high-level course dependencies
- one course file per real course defining:
  - sections
  - concepts
  - knowledge points
  - course-local and cross-course edges

This is better than one giant file because it:

- matches the real pedagogy more closely
- allows multiple authoring agents to work safely in parallel
- avoids the false simplicity of a monolith
- keeps each course graph reviewable

## Why This Is Better For Teaching

- It makes the high-level structure visible, which matches Ch. 4's course-graph idea
- It reduces foundational overload by splitting large mixed buckets into smaller stairs, which matches Ch. 14
- It preserves layering across courses instead of creating disconnected silos, which matches Ch. 16
- It allows the engine to keep teaching at the learner's frontier across multiple branches, which matches Ch. 13

In short:

- one giant course is too flat
- disconnected standalone courses are too fragmented
- one connected academy graph with multiple real courses is the right structure

## Step 1 Must Happen First

**Step 1 is a docs-and-architecture change, not a YAML rewrite.**

We should first update the architecture and authoring docs so they explicitly say:

- large multi-branch domains should be modeled as academies/tracks, not forced into one course
- courses are real learner-facing subgraphs, not fake section labels
- course boundaries must not break prerequisite, remediation, or implicit-review logic
- lesson quality matters more than a fixed KP count
- PostHog TAM is the canonical example of when a monolithic course is the wrong abstraction

Docs to update first:

- `docs/adaptive-learning-architecture.md`
- `docs/future-plans/zoomable-course-graph.md`
- `docs/adding-a-course.md`
- `content/README.md`

References to cite in that docs update:

- Ch. 4, pp. 72-73: course graph as compressed knowledge graph
- Ch. 13, pp. 210-214: frontier-based advancement across ready topics
- Ch. 14, pp. 217-220: split large stairs into smaller stairs
- Ch. 16, pp. 241-245: hierarchical connected sequences beat disconnected arrays of courses

## Proposed Academy Tree

### Near-term foundations split

- `PostHog TAM Academy`
  - `Part 1: Foundations`
    - `Course 1: Data Models`
    - `Course 2: Data Pipelines`
    - `Course 3: PostHog Data Model`
    - `Course 4: PostHog Ingestion Pipeline`

### Longer-term academy tree

- `Part 1: Foundations`
  - `Course 1: Data modelling fundamentals`
  - `Course 2: Data pipelines fundamentals`
  - `Course 3: PostHog data model`
  - `Course 4: PostHog ingestion pipeline`
- `Part 2: Identity resolution`
  - `Course 5: Anonymous events`
  - `Course 6: Identified events`
  - `Course 7: Groups`
- `Part 3: Products (analysis)`
  - `Course 8: Web analytics`
  - `Course 9: Product analytics`
  - `Course 10: Session replay`
- `Part 4: Products (shipping & reliability)`
  - `Course 11: Feature flags`
  - `Course 12: Experiments`
  - `Course 13: Error tracking`
- `Part 5: Products (feedback & AI)`
  - `Course 14: Surveys`
  - `Course 15: LLM analytics`
- `Part 6: Data platform`
  - `Course 16: Data warehouse`
  - `Course 17: Data pipelines (CDP)`
  - `Course 18: Workflows`
- `Part 7: Platform & commercial`
  - `Course 19: SDKs & implementation`
  - `Course 20: Pricing, billing & contracts`

## Mapping The Current Course Into The New Shape

### Part 1: Foundations

- `Course 1: Data Models`
  - Reuse current concepts from `data-modeling-basics`
  - Reuse current concepts from `data-modeling-design`
  - Add fundamentals around event-based vs session-based vs entity-based models, schema-on-read vs schema-on-write, and properties as metadata
- `Course 2: Data Pipelines`
  - Reuse current concepts from `pipeline-basics`
  - Reuse current concepts from `pipeline-architecture`
  - Add real-time vs batch, queues/Kafka, columnar vs row-based storage, and CDP framing
- `Course 3: PostHog Data Model`
  - Reuse the current `posthog-data-model` concepts
  - Pull `cohorts` into this course because they are part of the model vocabulary
  - Pull the conceptual part of `groups` into this course where it belongs structurally
  - Keep deeper implementation, billing, and pitfalls for groups in Part 2
- `Course 4: PostHog Ingestion Pipeline`
  - Reuse the current `posthog-ingestion` concepts
  - Add destination timing, replay ingestion, reverse proxies, and common failure modes

### Later parts

- `Part 2: Identity resolution`
  - Mostly sourced from the current `identification` concepts
  - Takes advanced group implementation and billing topics from `group-analytics`
- `Parts 3-7`
  - Mostly new content authoring work
  - Reuse `posthog-cdp` and `querying` where they fit, rather than preserving the current monolithic course boundary

## Execution Strategy

### Increment 0: DDD architecture pass

- Write and approve this plan
- Freeze the vocabulary for:
  - `academy`
  - `part`
  - `course`
  - `section`
  - `concept`
  - `KP`
- Update architecture and authoring docs before code:
  - `docs/adaptive-learning-architecture.md`
  - `docs/future-plans/zoomable-course-graph.md`
  - `docs/adding-a-course.md`
  - `content/README.md`
- Freeze the target invariant:
  - one connected academy graph
  - multiple real courses inside it
  - cross-course prerequisite and encompassing logic
  - frontier, remediation, and review compression at academy scope

### Increment 1: academy-graph engine design

- Define the academy-scoped graph model in the knowledge-graph bounded context
- Decide the authoring format:
  - academy manifest + per-course files
  - or another structure that still preserves first-class courses
- Design how course-local and cross-course edges are stored and validated
- Design academy enrollment, course progress, and course completion semantics
- Update browse, graph, and diagnostic flows in design docs before code

### Increment 2: academy-graph engine implementation

- Extend schema/models for academy, course membership, and cross-course edges
- Refactor importer and validators for academy-aware content
- Refactor graph reads to serve academy, course, and section projections
- Refactor frontier calculation, remediation, and task selection to work at academy scope
- Refactor diagnostics and progress tracking to operate on the academy graph

### Increment 3: academy UI implementation

- Add academy browse views
- Add zoomable `academy -> course -> section -> concept` graph views
- Add course-local progress and checkpoint UX within the academy experience

### Increment 4: foundations course split

Entry gate:

- do not start this increment until the Pre-Pilot Quality Gate in `docs/academy-graph-engine-plan.md` is fully satisfied

- Build the four foundations courses first
- Keep the work structural before content-heavy:
  - course definitions
  - section definitions
  - concept placement
  - cross-course prerequisite edges
  - review pass
  - only then expand KPs and problems

### Increment 5: academy expansion

- Add Parts 2-7 in order
- Preserve the same workflow:
  - graph first
  - review pass
  - content authoring second

## Agent-Ready Work Board

| Status | Workstream | Deliverable |
| --- | --- | --- |
| `completed` | Discovery | Read `docs/adding-a-course.md`, read the Math Academy PDF sections, audit the current TAM course |
| `completed` | DDD architecture alignment | Update architecture + authoring docs so they all target an academy-scoped graph with multiple real courses |
| `completed` | Academy graph design | Define academy, course, section, concept, and edge semantics in the knowledge-graph context |
| `work in progress` | Academy graph implementation | Extend schema, importer, validators, graph reads, diagnostics, and task selection for academy scope |
| `not started` | Academy UI design | Define browse and graph views for `academy -> course -> section -> concept` |
| `not started` | Academy UI implementation | Ship the zoomable academy/course/section/concept views |
| `not started` | Foundations outline | Canonical outline for Courses 1-4 |
| `not started` | Foundations graph split | Re-map concepts and prerequisites into the four foundations courses |
| `not started` | Foundations review | Adversarial review of the new academy graph before content expansion |
| `not started` | Foundations authoring | Expand KPs, examples, and problems for Courses 1-4 |
| `not started` | Identity resolution outline | Courses 5-7 mapped into the new tree |
| `not started` | Products outline | Courses 8-15 mapped into the new tree |
| `not started` | Data platform outline | Courses 16-18 mapped into the new tree |
| `not started` | Platform & commercial outline | Courses 19-20 mapped into the new tree |

## Parallelization Plan

After the DDD docs land and after the academy model is frozen, we can parallelize safely.

Suggested agent split:

- `Agent 1`: architecture alignment across docs
- `Agent 2`: academy graph schema/importer/API design
- `Agent 3`: Data Models course
- `Agent 4`: Data Pipelines course
- `Agent 5`: PostHog Data Model course
- `Agent 6`: PostHog Ingestion Pipeline course
- `Agent 7`: review agent for graph quality and lesson granularity
- `Agent 8+`: later courses once the foundations structure is stable

Rules for parallel execution:

- No course authoring starts before the academy model is frozen
- No TAM foundations split starts before the academy engine passes the Pre-Pilot Quality Gate
- No importer/schema changes start before the DDD docs are aligned
- No heavy content writing starts before the academy graph passes review
- Shared vocabulary must be frozen first so agents do not invent conflicting structures

## Risks To Manage

- **Pseudo-course drift:** renaming sections as "courses" without refactoring the engine would preserve the old problem
- **Disconnected-course drift:** splitting into standalone courses without cross-course graph logic would violate Ch. 16's layering requirements
- **Architecture drift:** if the TAM plan, architecture docs, and authoring docs disagree, agents will make inconsistent changes
- **Progress migration:** existing learner state will need a deliberate migration path when the monolithic TAM course is split
- **False reuse:** some current sections should be split and redistributed, not copied wholesale
- **Over-authoring too early:** writing detailed KPs before the academy graph is approved will create rework

## Success Criteria

- The docs explicitly say the learning-engine refactor is primary and the TAM
  pilot is the first proving ground
- The docs explicitly say PostHog TAM should become an academy with multiple real courses
- The docs explicitly say lesson quality matters more than a fixed number of KPs
- The architecture docs and authoring docs agree on an academy-scoped graph with cross-course edges
- The engine can compute frontier, remediation, and review compression across course boundaries
- The TAM pilot does not begin until the academy engine passes the Pre-Pilot Quality Gate
- Academy routes and UI are not thin wrappers around unchanged course-scoped adaptive behavior
- The foundations are represented as four distinct real courses, not one course with relabeled sections
- Parts 2-7 fit the same academy structure instead of being appended ad hoc
- The work board can be updated using only `not started`, `work in progress`, and `completed`
- The structure is clean enough to support multiple authoring agents without overlap or contradictions
