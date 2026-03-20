# PostHog Learning Engine Academy Refactor Master Plan

## Status Legend

- `not started`: planned, but no implementation work has begun
- `work in progress`: actively being implemented, reviewed, or validated
- `completed`: implemented, regression-tested, and accepted

## Purpose

This is the top-level execution plan for a full internal replacement of the
current learning engine with an academy-scoped model modeled on *The Math
Academy Way*.

The TAM academy work is the proving ground for that replacement, not a wrapper
layer or a light update. We are using the TAM course monolith as the first real
validation slice for the engine change.

Use this document when deciding:

- what the overall sequence is
- which work can happen in parallel
- what is blocked on what
- what status each section is in

Use the detailed companion docs when doing the actual work:

- `docs/academy-graph-engine-plan.md`
- `docs/posthog-tam-course-tree-plan.md`

## End State

The end state is:

- the learning engine has been internally replaced with an academy-scoped
  runtime rather than patched with academy wrappers
- the adaptive runtime behaves like the academy-level model described by
  *The Math Academy Way*, including cross-course frontier, remediation, and
  review behavior
- the product can represent one connected academy graph across multiple courses
- the existing TAM monolith has been split into 4 real foundation courses as the
  first pilot used to validate the refactored engine
- later TAM expansion happens only after the engine refactor and pilot are stable

## Non-Negotiable Rules

- This plan is primarily about the learning-engine refactor. The TAM split is the
  validation vehicle for that refactor, not the other way around.
- Do not start the TAM 4-course pilot until the engine rework passes the Pre-Pilot Quality Gate in `docs/academy-graph-engine-plan.md`.
- Do not use the TAM split to discover unfinished engine architecture.
- Do not begin heavy content authoring until the graph structure for that slice has passed review.
- Every section below must satisfy its declared quality bar before its status can move to `completed`.

## Quality Bars By Section Type

### Docs-only sections

Use for planning and architecture sections with no code or content import changes.

Required checks:

- docs stay internally consistent
- links and references point to the right companion docs
- no conflicting terminology or sequencing remains

### Code-bearing sections

Use for backend, frontend, importer, engine, routing, and migration work.

Required checks:

- `cd backend && npm run build`
- `bun run lint`
- `bun run test`
- `cd apps/web && bun run test:e2e`

If regressions appear:

- fix them in the same section if they were introduced by that work
- if a failure is clearly pre-existing, record it explicitly before moving on

### Content-bearing sections

Use for course splitting, graph authoring, and lesson/content expansion where code is not the primary change.

Required checks:

- validate/import the changed academy and course content successfully
- run graph validation on the changed slice
- review cross-course refs, cycles, orphan nodes, and concept placement
- run targeted academy smoke checks for the changed slice after import

Additional rule:

- run the full code-bearing regression suite when closing the section as a milestone, or earlier if that section included code changes

## Execution Protocol

- execute one plan step at a time unless the section explicitly calls out safe parallel lanes
- after each completed step:
  - update status and current-state notes in this master plan
  - update the relevant companion doc if that step changed its real progress state
  - record which checks were run, and note any known pre-existing failures before continuing
  - report back with a short checkpoint covering: what finished, what was verified, current section status, and the next step
- do not move a section to `completed` until its "Done when" and quality-bar requirements are both satisfied

## Master Status Board

| Status | Section | Goal | Parallelization | Depends On | Detailed Docs |
| --- | --- | --- | --- | --- | --- |
| `completed` | 0. Docs and vocabulary freeze | Freeze the academy/course/section/concept/KP model and align all supporting docs | Safe for doc-only parallel work | None | `docs/posthog-tam-course-tree-plan.md`, `docs/academy-graph-engine-plan.md` |
| `work in progress` | 1. Schema, importer, and validation | Make the academy structure real in persistence and content import | 2 backend lanes | Section 0 | `docs/academy-graph-engine-plan.md` |
| `work in progress` | 2. Read models, enrollment, and diagnostics | Make academy reads and academy enrollment/diagnostic flows real | 2 backend lanes | Section 1 | `docs/academy-graph-engine-plan.md` |
| `work in progress` | 3. Frontier, remediation, and implicit review | Make the adaptive runtime academy-scoped | 2 backend lanes | Section 2 | `docs/academy-graph-engine-plan.md` |
| `work in progress` | 4. Progress, gamification, and web routing | Make the UI and progress model academy-aware | 2 lanes: backend + web | Sections 2-3 | `docs/academy-graph-engine-plan.md` |
| `not started` | 5. Pre-pilot verification gate | Prove the academy engine is truly ready to be tested by the TAM pilot | QA/review lanes in parallel, close serially | Sections 1-4 | `docs/academy-graph-engine-plan.md` |
| `not started` | 6. TAM 4-course pilot split | Use the TAM monolith split to validate the refactored engine on real content | 4 content lanes + review lane | Section 5 | `docs/posthog-tam-course-tree-plan.md` |
| `not started` | 7. TAM pilot review and hardening | Validate the engine refactor under real TAM pilot conditions and fix revealed gaps | Limited parallel bugfix/review lanes | Section 6 | Both docs |
| `not started` | 8. Full TAM academy expansion | Expand TAM only after the engine refactor and pilot are proven | High parallelization | Section 7 | `docs/posthog-tam-course-tree-plan.md` |

## Section 0: Docs and Vocabulary Freeze

**Status:** `completed`

**Goal**

- align the teaching model, engine model, and authoring model
- make `Academy` the official adaptive boundary
- freeze the vocabulary so agents stop inventing conflicting structures

**What this section covers**

- pedagogy and structure decisions
- terminology
- support-doc updates
- explicit decision that the engine refactor is primary and the TAM split is the
  proving ground

**Parallelization**

- safe for doc-only agents
- this section is already complete

**Done when**

- the academy model is unambiguous
- the two detailed plans exist and agree
- supporting docs no longer imply that TAM restructuring is the primary goal
- supporting docs no longer imply that TAM should stay one flat course

**Quality bar**

- docs-only checks:
  - docs consistency
  - correct links and references
  - no terminology drift

## Section 1: Schema, Importer, and Validation

**Status:** `work in progress`

**Goal**

- make the academy structure real in data storage and content import
- stop assuming one course file equals one isolated adaptive graph

**Main work**

- add academy-level schema and migration support
- add academy manifests and per-course files
- support cross-course concept references
- validate academy-wide graph structure

**Current repo state**

- completed/in progress:
  - academy schema foundation and migration/backfill groundwork
  - academy manifest schema and importer orchestration
  - qualified cross-course authoring refs
  - cross-course ref resolution during import
  - academy-wide validation for manifest imports and persisted academy graphs
  - academy import admin endpoint
  - persisted academy-graph validation endpoint
- still open:
  - formal section-close verification beyond backend build/test (`lint`, web e2e, and multi-course academy smoke fixtures)

**Parallelization**

- `Lane 1A`: schema, migrations, backfills
- `Lane 1B`: importer, YAML schemas, graph validation

**Depends on**

- Section 0 complete

**Done when**

- existing single-course content can be represented as one-course academies
- academy imports work end-to-end
- cross-course refs and academy-wide cycles are validated correctly

**Quality bar**

- code-bearing section:
  - run `bun run lint`
  - run `bun run test`
  - run `cd apps/web && bun run test:e2e`
  - fix regressions before changing status

## Section 2: Read Models, Enrollment, and Diagnostics

**Status:** `work in progress`

**Goal**

- make academy-level reads, academy enrollment, and academy diagnostics real
- stop treating course enrollment and course diagnostic as the authoritative adaptive boundary

**Main work**

- academy read APIs and graph projections
- academy enrollment flow
- academy-first student state reads
- academy-scoped diagnostic sessions

**Current repo state**

- completed/in progress:
  - academy graph/list endpoints
  - academy enrollment endpoint and academy-owned concept/course state seeding
  - academy-first student mastery/profile endpoints
  - academy-scoped diagnostic routes and session ownership
  - backend regression closure for the refactored academy contracts
- still open:
  - remaining importer/read-path cleanup that still assumes a course-only authoring model

**Parallelization**

- `Lane 2A`: academy read models and controller/API work
- `Lane 2B`: enrollment, student state, and diagnostic engine work

**Depends on**

- Section 1 complete

**Done when**

- learners can enroll in an academy
- academy diagnostic can place learners across multiple courses
- course-level views are derived projections, not separate adaptive systems

**Quality bar**

- code-bearing section:
  - run `bun run lint`
  - run `bun run test`
  - run `cd apps/web && bun run test:e2e`
  - fix regressions before changing status

## Section 3: Frontier, Remediation, and Implicit Review

**Status:** `work in progress`

**Goal**

- make the adaptive runtime truly academy-scoped
- preserve cross-course layering, review compression, and remediation

**Main work**

- academy-scoped frontier calculation
- academy-scoped task selection
- cross-course remediation
- cross-course implicit review and encompassing propagation

**Current repo state**

- completed/in progress:
  - academy-scoped `next-task` and study-session service/controller paths
  - academy-scoped remediation storage and blocking
  - task payloads now carry academy/course context
  - backend selector/runtime contracts are covered by the green backend suite
- still open:
  - implicit review / spaced-repetition propagation across course boundaries

**Parallelization**

- `Lane 3A`: learning engine, task selector, remediation
- `Lane 3B`: review propagation and spaced-repetition propagation

**Depends on**

- Section 2 complete

**Done when**

- a blocked concept in one course does not freeze a ready concept in another
- cross-course prerequisites gate progression correctly
- implicit review and remediation can cross course boundaries inside the academy

**Quality bar**

- code-bearing section:
  - run `bun run lint`
  - run `bun run test`
  - run `cd apps/web && bun run test:e2e`
  - fix regressions before changing status

## Section 4: Progress, Gamification, and Web Routing

**Status:** `work in progress`

**Goal**

- make the learner-facing app coherent once the adaptive boundary becomes academy-scoped
- keep course-level progress visible without letting course pages remain the true system boundary

**Main work**

- academy-aware progress summaries
- academy-aware XP, streaks, and completion estimates
- academy-aware browse, study, and diagnostic routes
- nested course views inside an academy context

**Current repo state**

- completed/in progress:
  - academy-level XP persistence groundwork on the backend
  - academy browse root now lists academies instead of treating courses as the only entry objects
  - academy overview and academy study entry routes exist on the web
  - academy-aware continue-study CTA and academy-aware study router are wired
- still open:
  - academy summaries/read models across the rest of gamification
  - academy-first diagnostic UI and deeper nested academy course/task views
  - dashboard/browse/study UX migration beyond the first academy entry slice

**Parallelization**

- `Lane 4A`: backend progress/gamification services
- `Lane 4B`: web routes, task routing, browse/study/diagnostic UX

**Depends on**

- Sections 2 and 3 complete

**Done when**

- the web app can enter an academy, open a course, start diagnostic, get next task, and continue learning without falling back to course-only assumptions
- academy summaries are first-class and course summaries are projections

**Quality bar**

- code-bearing section:
  - run `bun run lint`
  - run `bun run test`
  - run `cd apps/web && bun run test:e2e`
  - fix regressions before changing status

## Section 5: Pre-Pilot Verification Gate

**Status:** `not started`

**Goal**

- prove that the academy engine is actually ready to be tested by a real TAM
  multi-course pilot

**Main work**

- tiny multi-course academy fixtures
- migration and backfill verification
- cross-course unlock/remediation verification
- route and flow verification across backend and web

**Parallelization**

- QA and review agents can test separate fixtures and flows in parallel
- the section only closes after one serial acceptance pass

**Depends on**

- Sections 1-4 complete

**Done when**

- the Pre-Pilot Quality Gate in `docs/academy-graph-engine-plan.md` is fully satisfied
- the engine no longer relies on `courseId` as the true adaptive boundary

**Quality bar**

- code-bearing section:
  - run `bun run lint`
  - run `bun run test`
  - run `cd apps/web && bun run test:e2e`
  - fix regressions before changing status

## Section 6: TAM 4-Course Pilot Split

**Status:** `not started`

**Goal**

- split the existing TAM monolith into the four foundation courses inside one
  academy
- use that split as the first real-world proof that the finished academy engine
  works on real content

**Main work**

- define the 4 course files
- place sections and concepts correctly
- add cross-course edges
- review the graph before heavy content expansion

**Parallelization**

- `Lane 6A`: Data Models
- `Lane 6B`: Data Pipelines
- `Lane 6C`: PostHog Data Model
- `Lane 6D`: PostHog Ingestion Pipeline
- `Lane 6R`: graph review and structural QA

**Depends on**

- Section 5 complete

**Done when**

- the 4 foundation courses import cleanly
- the graph structure passes review
- the pilot validates the refactored engine without TAM-specific workaround
  semantics
- content authors are not inventing workaround semantics to compensate for engine gaps

**Quality bar**

- content-bearing section:
  - validate/import the changed academy and course content
  - run graph validation on the changed slice
  - review cross-course refs, cycles, orphan nodes, and concept placement
  - run targeted academy smoke checks after import
  - when closing the section, also run:
    - `bun run lint`
    - `bun run test`
    - `cd apps/web && bun run test:e2e`

## Section 7: TAM Pilot Review and Hardening

**Status:** `not started`

**Goal**

- validate that the engine refactor holds up under the TAM pilot, not just that
  the content imports
- fix any migration or adaptive-runtime gaps the pilot reveals

**Main work**

- migration dry runs for existing TAM learner state
- academy-level flow review
- edge-case cleanup
- regression hardening after pilot import

**Parallelization**

- smaller parallel bugfix lanes are fine
- acceptance should still happen in one coordinated review pass

**Depends on**

- Section 6 complete

**Done when**

- migrated TAM users keep meaningful progress
- cross-course behavior is stable in real pilot flows
- the academy model feels coherent end-to-end
- the pilot has validated the engine refactor rather than merely exercising a
  content reshuffle

**Quality bar**

- mixed section:
  - if the hardening work changes code, run:
    - `bun run lint`
    - `bun run test`
    - `cd apps/web && bun run test:e2e`
  - if the hardening work is content-only, run:
    - validate/import the changed academy and course content
    - run graph validation on the changed slice
    - run targeted academy smoke checks after import
  - before closing the section, run the full code-bearing regression suite

## Section 8: Full TAM Academy Expansion

**Status:** `not started`

**Goal**

- expand from the 4-course foundations pilot to the larger Parts 1-7 / Courses
  1-20 academy shape only after the engine refactor has been validated

**Main work**

- outline and graph later courses
- review graph slices before heavy authoring
- author lessons, examples, and problems only after structure is accepted

**Parallelization**

- high parallelization is appropriate here
- one or more agents per course or part
- dedicated review agents should trail authoring agents continuously

**Depends on**

- Section 7 complete

**Done when**

- later TAM courses fit the same academy structure cleanly
- graph quality remains consistent across all parts
- content expansion does not erode the academy-wide prerequisite model

**Quality bar**

- content-bearing section:
  - validate/import the changed academy and course content
  - run graph validation on the changed slice
  - review cross-course refs, cycles, orphan nodes, and concept placement
  - run targeted academy smoke checks after import
  - run the full code-bearing regression suite at major integration milestones or if code changed

## How To Use This With Many Agents

- Use this document as the top-level status board.
- Use the detailed docs for the actual implementation and content details.
- Assign agents by lane, not by vague area.
- Do not start a section whose dependency section is not `completed`.
- Do not mark a section `completed` until its declared quality bar has been satisfied.

## Current Recommendation

The current active tranche is Sections 1-4.

That means:

- finish the open importer and academy-validation work in Section 1
- close regression gaps and remaining authoring-path cleanup in Sections 2-3
- complete academy-aware progress summaries and academy-first web routing in Section 4
- then run Section 5 as the formal pre-pilot gate

Do not start the TAM 4-course content split yet.
The point of that split is to validate a closed academy-scoped engine refactor,
not to discover or define the refactor while splitting content.
