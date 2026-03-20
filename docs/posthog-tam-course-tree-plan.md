# PostHog TAM Course Tree Plan

## Status Legend

- `not started`: planned, but no implementation work has begun
- `work in progress`: actively being authored, reviewed, or validated
- `completed`: implemented and validated for the current increment

## Current State

- Source file today: `content/courses/posthog-tam-onboarding.yaml`
- Current shape: 1 course, 10 sections, 37 concepts
- Current structure mixes foundations, identity, groups, CDP, and querying into one course graph
- Desired near-term shape: split the foundations into 4 smaller learning branches:
  - Data Models
  - Data Pipelines
  - PostHog Data Model
  - PostHog Ingestion Pipeline
- Desired longer-term shape: grow this into a larger TAM onboarding tree using the Parts 1-7 / Modules 1-20 outline

## Why The Split Is Correct

- *The Math Academy Way* Ch. 4, pp. 72-73: a course graph is a compressed summary of the underlying knowledge graph. Large branches should be visible at the right level of abstraction instead of hidden inside one monolith.
- *The Math Academy Way* Ch. 14, pp. 217-223: smaller stairs reduce cognitive overload. Foundational material should be split most aggressively because it supports everything downstream.
- *The Math Academy Way* Ch. 16, pp. 241-245: hierarchical, highly connected learning sequences produce structural integrity. Broad mixed buckets weaken layering.
- Repo guidance already points in the same direction: `docs/adding-a-course.md` says sections are compressed views of the graph and foundational sections should be smaller.

## Lesson Quality Guardrail

- Do not treat 3-step lessons as the norm.
- `docs/adaptive-learning-architecture.md` says lessons can have `1-4` KPs.
- `content/README.md` and `docs/adding-a-course.md` say fully-authored concepts usually have `2-4` KPs.
- Those ranges are heuristics, not pedagogical targets.
- For TAM authoring, the governing standard is lesson quality:
  - some concepts should stay tiny
  - some concepts will need more scaffolding
  - the right lesson length is whatever creates a clean staircase with worked examples, reactive practice, and manageable cognitive load
- Step 1 docs hardening should therefore add an explicit rule:
  - do not optimize for a fixed number of KPs per concept
  - optimize for the smallest number of high-quality steps that actually teaches the concept well

## Critical Constraint

- The platform today is modeled as `course -> sections -> concepts`.
- The current schema and YAML importer do not support parent/child courses or prerequisite edges that cross course boundaries.
- That means a true split into separate child courses is not just a content rewrite. It is also a product decision:
  - Either we add explicit course-tree support and cross-course sequencing.
  - Or we accept that separate courses will be manually sequenced and will not share one prerequisite graph.

## Architecture-Backed Solution

The constraint above is now explicitly resolved in this plan.

- `docs/adaptive-learning-architecture.md` says a course is a named subset of the knowledge graph, and the learning engine, frontier logic, remediation, and progress systems operate on a full course graph.
- `backend/src/knowledge-graph/course-read.service.ts` and `backend/src/learning-engine/task-selector.ts` are course-scoped today.
- `docs/future-plans/zoomable-course-graph.md` already proposes the missing abstraction: a grouping layer above sections via course areas.

### Recommended v1 model

- Keep `PostHog TAM Onboarding` as one technical `Course`
- Add a grouping layer above sections for the learner-facing tree:
  - `Course`
  - `Part`
  - `Area` or `Module` (this is the "sub-course" concept)
  - `Section`
  - `Concept`
  - `Knowledge Point`
- Keep all prerequisite edges, encompassing edges, diagnostics, remediation, and mastery inside that one course graph

### Why this solves the problem

- It preserves graph correctness for frontier calculation and task selection
- It avoids cross-course prerequisite gaps
- It avoids learner-progress migration problems from introducing new course slugs
- It still gives us the bigger tree you want in authoring and UI
- It matches the existing zoomable-graph direction in the architecture docs instead of fighting it

### Minimal implementation shape

- Authoring model:
  - extend section metadata with `part` and `area` or `module`
  - or define explicit `areas` and let sections reference stable area slugs
- Knowledge-graph bounded context:
  - either add metadata fields to `CourseSection`
  - or add first-class `CourseArea` and optionally `CoursePart` models
- Read model / API:
  - extend course graph reads to return grouped `course -> area -> section -> concept` projections
  - derive area dependencies from existing cross-section prerequisite edges
- UI:
  - align browse and graph views around `course graph -> area graph -> section graph -> concept graph`

## Recommendation

- Treat the 4-way split as the target information architecture now.
- Do not immediately delete or replace the existing monolithic course.
- First make the authoring rule explicit in the docs.
- Then implement the bigger tree inside the existing course graph by adding a grouping layer above sections.
- In planning and UI copy, it is fine to call these "sub-courses."
- In architecture and data modeling, they should be implemented as areas/modules within one course-scoped graph unless we later need separate enrollment, publishing, billing, or ownership boundaries.

## Step 1 Must Happen First

**Step 1 is a docs change, not a YAML change.**

We should update the course-authoring docs so they explicitly say:

- One large course is a bad default when the material has clear independent branches.
- Foundations should be split into smaller sections or sub-courses before prose authoring starts.
- If a course contains multiple major streams with different downstream dependents, the structure should show those streams instead of hiding them inside one top-level bucket.
- Lessons should not be forced into a fixed 3-step pattern; concept quality and staircase integrity matter more than uniform length.
- PostHog TAM should be the example:
  - Data Models
  - Data Pipelines
  - PostHog Data Model
  - PostHog Ingestion Pipeline

Docs to update first:

- `docs/adding-a-course.md`
- `content/README.md`
- `docs/adaptive-learning-architecture.md`
- `docs/future-plans/zoomable-course-graph.md`

References to cite in that docs update:

- Ch. 4, pp. 72-73: course graph as compressed knowledge graph
- Ch. 14, pp. 217-223: split large stairs into smaller stairs
- Ch. 16, pp. 241-245: hierarchical connected sequences beat broad disconnected buckets

## Proposed Tree

### Near-term foundations split

- `PostHog TAM Onboarding`
- `Part 1: Foundations`
- `Sub-course 1: Data Models`
- `Sub-course 2: Data Pipelines`
- `Sub-course 3: PostHog Data Model`
- `Sub-course 4: PostHog Ingestion Pipeline`

### Longer-term academy tree

- `Part 1: Foundations`
  - `Module 1: Data modelling fundamentals`
  - `Module 2: Data pipelines fundamentals`
  - `Module 3: PostHog data model`
  - `Module 4: PostHog ingestion pipeline`
- `Part 2: Identity resolution`
  - `Module 5: Anonymous events`
  - `Module 6: Identified events`
  - `Module 7: Groups`
- `Part 3: Products (analysis)`
  - `Module 8: Web analytics`
  - `Module 9: Product analytics`
  - `Module 10: Session replay`
- `Part 4: Products (shipping & reliability)`
  - `Module 11: Feature flags`
  - `Module 12: Experiments`
  - `Module 13: Error tracking`
- `Part 5: Products (feedback & AI)`
  - `Module 14: Surveys`
  - `Module 15: LLM analytics`
- `Part 6: Data platform`
  - `Module 16: Data warehouse`
  - `Module 17: Data pipelines (CDP)`
  - `Module 18: Workflows`
- `Part 7: Platform & commercial`
  - `Module 19: SDKs & implementation`
  - `Module 20: Pricing, billing & contracts`

## Mapping The Current Course Into The New Shape

### Foundations

- `Data Models`
  - Reuse current concepts from `data-modeling-basics`
  - Reuse current concepts from `data-modeling-design`
  - Add the new fundamentals you listed around event-based vs session-based vs entity-based models, schema-on-read vs schema-on-write, and properties as metadata
- `Data Pipelines`
  - Reuse current concepts from `pipeline-basics`
  - Reuse current concepts from `pipeline-architecture`
  - Add real-time vs batch, queues/Kafka, columnar vs row-based storage, and CDP framing
- `PostHog Data Model`
  - Reuse the current `posthog-data-model` section
  - Pull `cohorts` into this branch because they are part of the model-level vocabulary in your outline
  - Pull the conceptual part of `groups` into this branch where it belongs structurally
  - Keep deeper implementation, billing, and pitfalls for groups in Part 2
- `PostHog Ingestion Pipeline`
  - Reuse the current `posthog-ingestion` section
  - Add destination timing, replay ingestion, reverse proxies, and common failure modes

### Later parts

- `Identity resolution`
  - Mostly sourced from the current `identification` section
  - Takes advanced group implementation and billing topics from the current `group-analytics` section
- `Products`, `Data platform`, and `Platform & commercial`
  - Mostly new content authoring work
  - Reuse `posthog-cdp` and `querying` where they fit, rather than preserving the current course boundaries

## Execution Strategy

### Increment 0: DDD architecture pass

- Write this plan doc
- Confirm the target tree and the vocabulary for `course`, `part`, `area/module`, `section`, `concept`, and `KP`
- Update the architecture docs before code:
  - `docs/adaptive-learning-architecture.md`
  - `docs/future-plans/zoomable-course-graph.md`
  - `docs/adding-a-course.md`
  - `content/README.md`
- Freeze the v1 invariant:
  - one course-scoped graph
  - grouping layer above sections
  - no true cross-course prerequisite logic in v1

### Increment 1: docs hardening

- Add the anti-monolith rule to the authoring docs
- Add the lesson-quality rule: no fixed 3-step lesson target
- Add a short TAM-specific example that shows why one large course is wrong here
- Make the docs say this review must happen before YAML authoring

### Increment 2: grouped-tree design inside the knowledge-graph context

- Define the grouping abstraction above sections
- Decide whether it is metadata on `CourseSection` or first-class `CourseArea` / `CoursePart`
- Update the importer, read model, and browse/graph projections in design docs before code
- Keep the underlying graph course-scoped

### Increment 3: grouped-tree implementation

- Implement the grouping layer in the knowledge-graph bounded context
- Extend YAML/schema/importer/read APIs
- Expose grouped projections for browse and graph views

### Increment 4: foundations split

- Build the 4 foundations branches first
- Keep the work structural before content-heavy:
  - area/module definitions
  - section definitions
  - concept placement
  - prerequisite edges
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
| `not started` | DDD architecture alignment | Update architecture + authoring docs so they all say one course-scoped graph with a grouping layer above sections |
| `not started` | Step 1 docs hardening | Update authoring docs with the anti-monolith rule, lesson-quality rule, and TAM example |
| `not started` | Grouping model design | Define `part` / `area` / `module` above sections inside the knowledge-graph context |
| `not started` | Grouping model implementation | Extend YAML, importer, read APIs, and grouped browse/graph projections |
| `not started` | Foundations outline | Canonical outline for the 4 foundations sub-courses |
| `not started` | Foundations graph split | Re-map concepts and prerequisites into the 4 foundations branches |
| `not started` | Foundations review | Adversarial review of the new graph before content expansion |
| `not started` | Foundations authoring | Expand KPs, examples, and problems for the 4 foundations branches |
| `not started` | Identity resolution outline | Modules 5-7 mapped into the new tree |
| `not started` | Products outline | Modules 8-15 mapped into the new tree |
| `not started` | Data platform outline | Modules 16-18 mapped into the new tree |
| `not started` | Platform & commercial outline | Modules 19-20 mapped into the new tree |

## Parallelization Plan

After Step 1 and after the grouping model is frozen, we can parallelize safely.

Suggested agent split:

- `Agent 1`: DDD architecture alignment and docs hardening
- `Agent 2`: grouping-model design in the knowledge-graph context
- `Agent 3`: Data Models branch
- `Agent 4`: Data Pipelines branch
- `Agent 5`: PostHog Data Model branch
- `Agent 6`: PostHog Ingestion Pipeline branch
- `Agent 7`: review agent for graph quality and lesson granularity
- `Agent 8+`: later parts once the foundations structure is stable

Rules for parallel execution:

- No branch authoring starts before the docs update lands
- No schema or importer changes start before the DDD docs are aligned
- No heavy content writing starts before the branch graph passes review
- Shared vocabulary must be frozen first so agents do not invent conflicting structures

## Risks To Manage

- **Architecture drift:** if the authoring docs, architecture docs, and implementation plan disagree, agents will make inconsistent changes
- **Cross-course prerequisite loss:** avoided in the recommended v1 plan, but it returns immediately if we switch to true child courses too early
- **Learner progress migration:** avoided in the recommended v1 plan, but it returns if we replace one course with many course slugs
- **False reuse:** some current sections should be split and redistributed, not copied wholesale
- **Over-authoring too early:** writing detailed KPs before the graph is approved will create rework

## Success Criteria

- The docs explicitly warn against monolithic course authoring and use TAM as the concrete example
- The docs explicitly say lesson quality matters more than a fixed number of KPs
- The architecture docs and authoring docs agree on a grouping layer above sections inside one course graph
- The foundations are represented as 4 distinct branches in the target structure
- The future Parts 2-7 are captured in the same tree instead of being appended ad hoc
- The work board can be updated using only `not started`, `work in progress`, and `completed`
- The structure is clean enough to support multiple authoring agents without overlap or contradictions
