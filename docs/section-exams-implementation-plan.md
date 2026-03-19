# Section Exams Implementation Plan

## Goal

Add **section-end exams** that sit between knowledge-point lessons and the existing course-level quiz flow.

This is the missing layer between:

- lesson-level mastery: `instruction -> worked example -> practice`
- course-level assessment: broad timed quizzes across recent material

The target behavior is:

1. A learner completes the lessons for a section.
2. The system unlocks a **section exam** for that section.
3. The learner must pass the section exam to certify readiness for downstream sections.
4. If they fail, the system assigns targeted remediation or section review before retry.

This matches the Math Academy model in [`math-academy-way.pdf`](/Users/will/github/niche-audio-prep/math-academy-way.pdf):

- lessons are heavily scaffolded at the knowledge-point level
- scaffolding is gradually removed as competence grows
- quizzes are broader, timed, and closed-book

Our current platform implements the first and last bullets, but not the middle certification layer.

## Why This Needs a New Primitive

The current architecture in [`docs/adaptive-learning-architecture.md`](/Users/will/github/niche-audio-prep/docs/adaptive-learning-architecture.md) supports:

- `lesson`
- `review`
- `quiz`
- `remediation`

The current quiz service in [`backend/src/assessment/quiz.service.ts`](/Users/will/github/niche-audio-prep/backend/src/assessment/quiz.service.ts) is **course-scoped**, in-memory, and keyed off recent/in-progress concepts. That is the wrong abstraction for section readiness.

Section exams should be modeled as a new assessment primitive, not as a cosmetic rename of quizzes.

## Product Semantics

### Section exam definition

A section exam is:

- scoped to a single course section
- broad across the section's concepts
- less scaffolded than lesson practice
- closed-book in spirit
- pass/fail
- a gate for downstream progression

### Unlock rule

A section exam becomes available when:

- all concepts in the section are lesson-complete
- no blocking remediation is pending for concepts in that section

### Pass rule

Initial recommendation:

- `8-12` questions per section exam
- `>= 75%` required to pass
- no immediate feedback while taking the exam
- end-of-exam summary only

### Failure rule

Initial recommendation:

- failing marks the section as `needs_certification`
- failed concepts inside the section are moved to `needs_review`
- the next task engine prioritizes section remediation or section review before retry
- retry allowed after completing assigned remediation

### Progression rule

Passing a section exam should:

- mark the section as certified
- unlock downstream sections that depend on it
- make the course page show the section as complete, not merely "in progress"

## Math Academy Fit

Relevant guidance from Chapter 14:

- Lessons should be split into small, scaffolded steps.
- Worked examples and similar follow-on practice reduce cognitive load.
- Visuals and diagrams should be used heavily where they clarify structure.
- Scaffolding should be removed over time.
- Broader quizzes should be timed, mixed, and closed-book.

Applied here:

- KP lessons remain the scaffolded learning staircase.
- Section exams are the first explicit place where scaffolding is stripped away across a coherent cluster of concepts.
- Course-level quizzes still exist, but they should sit above section certification, not replace it.

## Current Gaps

### Backend

- No section-level assessment entity in [`backend/prisma/schema.prisma`](/Users/will/github/niche-audio-prep/backend/prisma/schema.prisma)
- No `section_exam` task type in the learning engine
- No persistent section exam session state
- No section pass/fail progression logic

### Frontend

- Browse page in [`apps/web/src/app/(app)/browse/[courseId]/page.tsx`](/Users/will/github/niche-audio-prep/apps/web/src/app/(app)/browse/[courseId]/page.tsx) only understands course progress and concept mastery
- Study router in [`apps/web/src/app/(app)/study/[courseId]/page.tsx`](/Users/will/github/niche-audio-prep/apps/web/src/app/(app)/study/[courseId]/page.tsx) only routes from `next-task`
- Only course quiz UI exists today in [`apps/web/src/app/(app)/study/[courseId]/quiz/page.tsx`](/Users/will/github/niche-audio-prep/apps/web/src/app/(app)/study/[courseId]/quiz/page.tsx)

### Authoring

- [`docs/adding-a-course.md`](/Users/will/github/niche-audio-prep/docs/adding-a-course.md) requires lesson-level content quality, but does not require section exam blueprints
- [`content/README.md`](/Users/will/github/niche-audio-prep/content/README.md) defines KP practice but not section-level assessment coverage

### TAM course

- The TAM course now has instruction, supporting content, and KP practice
- It does not yet have section exam definitions

## Architecture Decision

Use a **new `section_exam` task type** and a **persistent section exam session model**.

Do not reuse the current quiz service as-is because it is:

- course-scoped
- transient/in-memory
- not tied to section gating
- not represented in learner progression state

We can still reuse pieces of quiz infrastructure:

- answer evaluation
- problem serialization
- exam UI patterns
- scoring approach

## Data Model Changes

Update [`backend/prisma/schema.prisma`](/Users/will/github/niche-audio-prep/backend/prisma/schema.prisma).

### Add section-level learner state

Recommended new model:

```prisma
model StudentSectionState {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  courseId          String   @map("course_id") @db.Uuid
  sectionId         String   @map("section_id") @db.Uuid
  status            SectionMasteryState
  examPassedAt      DateTime? @map("exam_passed_at") @db.Timestamptz
  lastExamAttemptAt DateTime? @map("last_exam_attempt_at") @db.Timestamptz
  attempts          Int      @default(0)
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz
}
```

Suggested enum:

```prisma
enum SectionMasteryState {
  locked
  lesson_in_progress
  exam_ready
  certified
  needs_review
}
```

### Add persistent section exam session

Recommended new model:

```prisma
model SectionExamSession {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  courseId      String   @map("course_id") @db.Uuid
  sectionId     String   @map("section_id") @db.Uuid
  attemptNumber Int      @map("attempt_number")
  status        ExamSessionStatus
  score         Float?
  passed        Boolean?
  timeLimitMs   Int?
  startedAt     DateTime @default(now()) @map("started_at") @db.Timestamptz
  completedAt   DateTime? @map("completed_at") @db.Timestamptz
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz
}
```

And optionally:

```prisma
model SectionExamQuestion {
  id              String   @id @default(uuid()) @db.Uuid
  sessionId       String   @map("session_id") @db.Uuid
  problemId       String   @map("problem_id") @db.Uuid
  conceptId       String   @map("concept_id") @db.Uuid
  sortOrder       Int      @map("sort_order")
  response        Json?
  correct         Boolean?
  responseTimeMs  Int?
}
```

### Optional authoring support in DB

If we want authored section blueprints persisted:

- add section exam metadata to `CourseSection`
- or keep blueprint data only in YAML/import pipeline and resolve at runtime

Recommendation:

- persist the resolved blueprint JSON on the section record for reliability and future analytics

## Content / Authoring Model

### YAML/schema updates

Extend the course schema in [`backend/src/knowledge-graph/schemas/course-yaml.schema.ts`](/Users/will/github/niche-audio-prep/backend/src/knowledge-graph/schemas/course-yaml.schema.ts) to support section exam config.

Recommended section-level shape:

```yaml
sections:
  - id: data-modeling-basics
    name: Data Modeling Basics
    description: ...
    sectionExam:
      enabled: true
      passingScore: 0.75
      timeLimitMinutes: 12
      questionCount: 10
      blueprint:
        - conceptId: entities
          minQuestions: 2
        - conceptId: attributes-and-keys
          minQuestions: 2
        - conceptId: relationships
          minQuestions: 2
      instructions: |
        This exam checks whether you can apply the section concepts without step-by-step guidance.
```

### Authoring rules

Update [`docs/adding-a-course.md`](/Users/will/github/niche-audio-prep/docs/adding-a-course.md) and [`content/README.md`](/Users/will/github/niche-audio-prep/content/README.md) so every section must specify:

- section objective
- what unaided performance looks like
- section exam blueprint
- concept coverage minimums
- target misconceptions to test
- whether visuals from lesson content are prerequisite for exam success

### Quality bar

A section exam should:

- cover the section's critical concepts, not just vocabulary
- include at least one integrative question that spans multiple concepts
- not reuse lesson practice verbatim where possible
- reflect realistic customer-facing or product reasoning when relevant

## Importer and Validation

Update:

- [`backend/src/knowledge-graph/course-importer.service.ts`](/Users/will/github/niche-audio-prep/backend/src/knowledge-graph/course-importer.service.ts)
- [`backend/src/knowledge-graph/schemas/course-yaml.schema.ts`](/Users/will/github/niche-audio-prep/backend/src/knowledge-graph/schemas/course-yaml.schema.ts)

Validation rules:

- every `sectionExam.blueprint.conceptId` exists in the course
- every blueprint concept belongs to that section
- `questionCount >= sum(minQuestions)` if both are provided
- `passingScore` is between `0` and `1`
- enough eligible problems exist to support generation
- if a section exam is enabled, the section must contain at least two concepts unless explicitly overridden

## Assessment Generation Strategy

Use a hybrid strategy.

### Phase 1

Generate section exam questions from existing problem banks, with stricter selection rules:

- prefer review variants where available
- avoid direct duplicates of the last lesson attempts
- ensure concept coverage per blueprint
- prefer higher-transfer question types for integrative concepts

### Phase 2

Allow explicitly authored section exam items where generation quality is insufficient.

Recommendation:

- start with generated exams backed by section blueprints
- add authored overrides only for sections where nuance matters

## Backend Service Plan

### New service

Add a dedicated service, likely:

- [`backend/src/assessment/section-exam.service.ts`](/Users/will/github/niche-audio-prep/backend/src/assessment/section-exam.service.ts)

Responsibilities:

- determine exam readiness
- generate section-scoped exam sessions
- persist selected questions
- accept answers
- complete exam
- update learner state
- emit remediation signals on failure

### Controller endpoints

Extend assessment or learning routes with:

- `POST /orgs/:orgId/courses/:courseId/sections/:sectionId/exam/start`
- `POST /orgs/:orgId/courses/:courseId/sections/:sectionId/exam/:sessionId/answer`
- `POST /orgs/:orgId/courses/:courseId/sections/:sectionId/exam/:sessionId/complete`
- `GET /orgs/:orgId/courses/:courseId/sections/:sectionId/exam/status`

### Reuse from quiz service

Extract reusable helpers from [`backend/src/assessment/quiz.service.ts`](/Users/will/github/niche-audio-prep/backend/src/assessment/quiz.service.ts):

- answer evaluation
- result summarization
- concept breakdown logic
- XP awarding formula shape

## Learning Engine Changes

Update:

- [`backend/src/learning-engine/learning-engine.service.ts`](/Users/will/github/niche-audio-prep/backend/src/learning-engine/learning-engine.service.ts)
- task selection pure functions under `backend/src/learning-engine/`

### New task type

Extend task recommendation types to include:

- `section_exam`

### Selection priority

Revised recommendation:

1. remediation
2. urgent reviews
3. ready section exams
4. new lessons at the frontier
5. standard reviews
6. course-level quizzes

Rationale:

- section exam is a readiness gate and should take precedence over continuing deeper into dependent material

### Blocking logic

When a section is `exam_ready`:

- block entry into downstream sections until the section exam is passed
- continue to allow review/remediation tasks

### Session routing

`/study/:courseId` should route to:

- next lesson
- next review
- ready section exam
- course quiz

based on `next-task`

## Frontend Plan

### Browse page

Update [`apps/web/src/app/(app)/browse/[courseId]/page.tsx`](/Users/will/github/niche-audio-prep/apps/web/src/app/(app)/browse/[courseId]/page.tsx) and supporting components.

Add section-level display:

- `Locked`
- `Learning`
- `Exam Ready`
- `Certified`
- `Needs Review`

Add a clearer CTA than the current generic "Continue Studying" when the next task is a section exam:

- `Take Section Exam`

### Study router

Update [`apps/web/src/app/(app)/study/[courseId]/page.tsx`](/Users/will/github/niche-audio-prep/apps/web/src/app/(app)/study/[courseId]/page.tsx) and the study router component to handle `section_exam`.

### New route/UI

Add:

- [`apps/web/src/app/(app)/study/[courseId]/sections/[sectionId]/exam/page.tsx`](/Users/will/github/niche-audio-prep/apps/web/src/app/(app)/study/[courseId]/sections/[sectionId]/exam/page.tsx)
- a `SectionExamFlow` component alongside the existing quiz flow

Behavior:

- no worked examples
- no instructional scaffolding
- no per-question correctness feedback during attempt
- end summary with pass/fail and weak concept breakdown

### Type updates

Extend shared app types in [`apps/web/src/lib/types.ts`](/Users/will/github/niche-audio-prep/apps/web/src/lib/types.ts) with:

- section exam state
- section exam task payload
- section progress type

## Progression and Mastery

We need a distinction the current app does not make:

- lesson-complete
- section-certified

Concept mastery alone should not imply section readiness certification.

Recommended progression model:

1. concept KPs passed
2. concept marked mastered
3. all section concepts mastered
4. section marked `exam_ready`
5. section exam passed
6. section marked `certified`

Downstream section unlock logic should depend on `certified`, not merely "all concepts started."

## Remediation Strategy

On section exam failure:

- identify weak concepts from the exam result
- move those concepts to `needs_review`
- optionally generate a short section remediation bundle before retry

Recommended first version:

- no new bespoke remediation flow yet
- just route failed concepts into existing review/remediation machinery

Recommended second version:

- add a `section_remediation` task that gives 3-5 targeted review items across the failed concepts

## Analytics and Instrumentation

Track:

- section exam started
- section exam completed
- section exam passed/failed
- section exam retry count
- per-section pass rate
- time-to-certification
- failure concept breakdown

Likely files:

- existing PostHog tracking utilities in the web app
- assessment completion handlers in backend services

## TAM Course Update Plan

After the product primitives exist, update [`content/courses/posthog-tam-onboarding.yaml`](/Users/will/github/niche-audio-prep/content/courses/posthog-tam-onboarding.yaml).

### Required section exam blueprints

At minimum:

- Data Modeling Basics
- PostHog Data Model
- Ingestion Pipeline
- Identity and Distinct IDs
- Groups
- CDP
- HogQL Foundations

### Data Modeling Basics exam should prove

- learner can distinguish entity vs attribute vs key
- learner can identify relationships and cardinality patterns
- learner can reason about why pipelines depend on modeling
- learner can map abstract data-modeling language to PostHog examples

### Visual alignment requirement

If a lesson relies on a diagram to teach the structure of a concept, the exam should test the underlying structure, not just textual definitions.

## Migration and Rollout

### Migration

Create a Prisma migration for:

- section state table
- section exam session table
- optional section blueprint JSON on sections/course sections

### Rollout recommendation

Use a staged rollout:

1. ship schema + backend support hidden behind a feature flag
2. ship UI and routing
3. backfill TAM with section exam blueprints
4. enable only for TAM initially
5. expand to future adaptive courses

### Existing learner progress

Decision needed:

- auto-certify previously completed sections
- or require section exams for all existing learners

Recommendation:

- existing enrollments: mark eligible completed sections as `exam_ready`, not auto-passed
- new enrollments: use the full section exam flow from the start

## Testing Plan

### Backend unit tests

Add tests for:

- section exam readiness calculation
- blueprint validation
- question generation coverage rules
- pass/fail scoring
- learner state transitions
- next-task selection with section exam priority

Likely specs:

- `backend/src/assessment/section-exam.service.spec.ts`
- `backend/src/learning-engine/task-selector.spec.ts`
- `backend/src/knowledge-graph/schemas/course-yaml.schema.spec.ts`

### Frontend unit/component tests

Add tests for:

- section exam CTA visibility
- study router handling `section_exam`
- section exam flow states
- pass/fail summary rendering

Likely specs:

- `apps/web/src/__tests__/components/study-router.test.tsx`
- `apps/web/src/__tests__/components/section-exam-flow.test.tsx`
- browse page component tests if they exist or are introduced

### Playwright E2E

Add an end-to-end regression covering the full expectation:

1. enter TAM course
2. finish remaining lessons in a small section fixture or test course
3. observe `Take Section Exam`
4. complete section exam
5. verify next section unlocks
6. verify failure path shows remediation/review

Recommended new spec:

- [`apps/web/e2e/section-exams.spec.ts`](/Users/will/github/niche-audio-prep/apps/web/e2e/section-exams.spec.ts)

### Seed/test fixture recommendation

Do not drive this only from the full TAM course.

Add a compact test fixture course with:

- 1 section with 2 concepts
- minimal lesson content
- deterministic section exam blueprint

This keeps E2E stable and fast.

## Recommended Delivery Sequence

### Phase 1: Semantics and schema

- define section exam semantics in docs
- add schema and migration
- add importer support for section exam blueprints

### Phase 2: Backend services

- implement `SectionExamService`
- persist session state
- expose endpoints
- update learning engine and next-task logic

### Phase 3: Frontend routing and UI

- add section exam route and flow
- update study router
- update browse page and section status UI

### Phase 4: TAM authoring

- author section exam blueprints for TAM
- re-import course
- manually test visuals, practice, and section exams together

### Phase 5: Regression coverage

- backend unit tests
- frontend component tests
- Playwright end-to-end coverage

## Definition of Done

This work is done when:

- a section can transition from lesson completion to `exam_ready`
- `/study/:courseId` routes to a section exam when appropriate
- passing a section exam certifies the section
- failing a section exam triggers a clear recovery path
- browse/course UI makes section readiness visible
- course authoring docs require section exam blueprints
- TAM includes section exam coverage for each major section
- automated tests cover unlock, pass, fail, and regression scenarios

## Open Decisions

These need explicit calls before implementation starts:

1. Should section exams be timed in v1, or just closed-book without a timer?
2. Should section exam pass/fail affect XP?
3. Should downstream sections be hard-blocked on certification, or soft-gated?
4. Do we want generated-only section exams first, or authored override support in v1?
5. Should existing enrollments be forced through section certification retroactively?

## Recommended Answer to the Open Decisions

For v1:

1. timed, but generous
2. yes, modest XP on completion
3. hard-gated for sections that are explicit prerequisites of downstream sections
4. generated first, authored overrides in v1.1
5. do not auto-pass existing learners; mark sections `exam_ready`
