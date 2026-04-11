# Wrong-Answer Remediation Loop

**Date:** 2026-04-11
**Status:** Draft for review — no code yet
**Owner:** Will
**Related:** `docs/adaptive-learning-architecture.md`, `docs/academy-graph-engine-plan.md`, `math-academy-way.pdf`

## TL;DR

When a learner gets a practice question wrong today, Graspful logs the failure, shows the feedback text for 1.5 seconds, and silently advances to the next problem. The instruction and worked example are never re-shown. Remediation only kicks in after a **whole concept** fails twice, and only at the prerequisite level — never at the KP the learner is actually struggling with.

Math Academy's own doctrine is stricter at the KP level and softer at the concept level than what we do:

- **Never lower the bar, only add practice** on the same KP when it's missed.
- **Don't re-explain differently** — if the original explanation was bad, fix the content; if the student is lost, the prerequisite is the problem.
- **Pause failed lessons gracefully** and route the student to unrelated progress, then re-attempt later.
- **Two failures at the same KP auto-trigger remedial review on the _key prerequisite_** of that KP — not the concept.
- **Every missed quiz question immediately spawns a remedial review** on its topic.

This plan proposes a staged upgrade to Graspful's wrong-answer loop that adopts those patterns while respecting our existing DDD boundaries (Assessment ↔ StudentModel ↔ LearningEngine).

---

## 1. Current State

### Data flow on a wrong answer

1. `AssessmentController.submitLessonAnswer` → `ProblemSubmissionService.submitAnswer`
   (`backend/src/assessment/problem-submission.service.ts:47-193`)
2. Evaluates the answer, updates `StudentKPState` (`passed`, `attempts`, `consecutiveCorrect`)
   (`backend/src/student-model/student-state.service.ts:244-271`)
3. Updates `StudentConceptState.masteryState` via the transition rules at
   `problem-submission.service.ts:243-276`:
   - `unstarted → in_progress` on first answer
   - `in_progress → mastered` once every KP has `passed: true`
   - `mastered → needs_review` on any post-mastery miss
   - Otherwise stays `in_progress` with `failCount++`
4. Returns the new KP + mastery state to the frontend.

### UX on a wrong answer

`apps/web/src/components/app/lesson-flow.tsx:161-206`

1. Feedback overlay appears with the explanation.
2. After ~1.5s, the practice index auto-advances to the next problem.
3. The worked example / instruction is **not** re-presented.
4. The learner cannot complete the lesson until the practice list is done, but nothing pulls them back to reconsider the KP they just missed.

### Existing remediation mechanisms

| Mechanism | Where | When |
|---|---|---|
| KP mastery rule | `student-state.service.ts:244-271` | 2 consecutive correct to pass a KP |
| Plateau detection | `backend/src/learning-engine/plateau-detector.ts:14-65` | `failCount ≥ 2` on a concept → fall back to weakest unmastered ancestor |
| Remediation record blocks lesson | `backend/src/learning-engine/lesson.service.ts:48-57` | Hard block until prereq review completed |
| Spaced rep (FIRe) decay | `backend/src/learning-engine/task-selector.ts:84-167` | Memory decay schedules reviews |
| Mastery regression | `problem-submission.service.ts:253-255` | `mastered → needs_review` on post-mastery miss |

### Gaps versus The Math Academy Way

| Math Academy principle (page) | What Graspful does today | Delta |
|---|---|---|
| "More questions" on the same KP when a student struggles within a task (p.300) | Advances to next practice problem regardless of the KP it targets | **Gap** — we don't guarantee extra targeted practice on the failed KP within the session |
| Pause a failed lesson, route to unrelated progress, re-attempt later (p.300, p.415) | Lesson can still "complete" with unpassed KPs; no explicit pause state | **Gap** — a lesson is either in_progress or mastered; no "paused, cool-down" state |
| Key-prerequisite remediation triggered on second KP-level failure (Ch 4 p.76; Ch 21 p.300) | Plateau + fallback only fires at the concept level, and walks to the weakest ancestor (not a curated key prerequisite) | **Gap** — no KP→key-prereq link, no KP-level remediation |
| Immediate remedial review on any missed quiz question (p.300) | Quiz answers flow through the same `ProblemSubmissionService` path and rely on background FIRe decay | **Gap** — no direct "you missed it, here's a remedial review queued" |
| Order of right/wrong matters (p.412: `✗✓✗✓✓` is learning, `✓✓✗✓✗` is not) | Only `consecutiveCorrect` and `attempts` tracked | **Partial** — we have the signal, we don't interpret patterns |
| Reviews must feel hard; retrieval-practice enforcement (p.405, p.411) | Review question pool not interleaved with harder prompts | **Gap** |
| Slow peel-back is anti-gaming (p.416) | We already slow-peel via plateau threshold | **Aligned** |
| XP penalties / randomized retries / delayed retry (p.312-313) | We have XP + anti-gaming detection, no explicit retry delay or randomization | **Partial** |
| Mastery = consistency + order + speed, not single correct (p.412) | Mastery = 2 consecutive correct | **Partial** — no speed component, no pattern reading |

The single biggest gap: **we do nothing at the KP level when a student misses a KP.** The student misses, sees the explanation, and is handed a new problem with no guarantee the new problem even targets the same KP. The Math Academy model treats this moment as the most important remediation signal in the system.

---

## 2. Proposed Design

Three vertical slices, staged so we can ship Slice 1 alone and get most of the value.

### Slice 1 — KP-level "more practice" loop (the big win)

**Principle:** If a learner misses a problem on KP `x`, the next problem they see must also target KP `x`, drawn from a different bucket in the problem bank, until they demonstrate 2 consecutive correct on that KP. Only then do they advance.

**Also:** After a wrong answer, the KP's worked example/instruction is re-surfaced in a collapsible "Review the example" panel (expanded by default on a miss). This is **not** a new explanation — we show the exact same worked example from the KP content. The Math Academy FAQ (p.416-417) is explicit that re-explaining differently is anti-pedagogy; our job is to make the original explanation easy to re-read, not to generate or author variants. **Decision:** no authored "alternate angle" second example. One canonical worked example per KP; re-surface it verbatim on miss.

**Backend changes**

- New service: `KPRemediationSelector` in `backend/src/assessment/` — given `(userId, conceptId, currentKPId, lastAnswerCorrect)`, return the next problem to serve. Pure function over problem bank + KP state.
- `ProblemSubmissionService.submitAnswer` extends `SubmitAnswerResult` to include `nextProblemHint` (the KP the next problem should target). Submission service does not choose the actual problem — the frontend (or a follow-up endpoint) calls `KPRemediationSelector`. This respects the existing separation: assessment updates state, learning-engine / a new KP selector recommends the next task.
- No schema change: `StudentKPState` already has `consecutiveCorrect` and `attempts`.
- Anti-gaming: add a lightweight randomized retry delay on KPs with `attempts > 2` in the same session (Ch 22, p.313).

**Frontend changes**

- `lesson-flow.tsx` gets a new "practice loop" state machine per KP:
  `intro → worked_example → practice → (miss → review_example → practice) → passed`
- On miss, the worked example panel re-opens and the next practice problem is fetched from the new endpoint rather than from a pre-computed practice list.
- Practice list is no longer a fixed array of problems — it's a stream driven by `nextProblemHint`.

**DDD alignment**

- `Assessment` still owns: evaluation, state updates, XP.
- `StudentModel` still owns: state reads/writes.
- New `KPRemediationSelector` lives inside `Assessment` because it only consults KP state + problem bank, no graph traversal.
- `LearningEngine` is untouched in Slice 1.

**Acceptance**

- A learner who misses a KP problem is immediately served another problem from the same KP.
- They cannot advance to the next KP until they pass 2 consecutive correct on the current KP.
- The worked example re-appears after a miss without being framed as a "new explanation".
- Session-level retries on the same KP are drawn without replacement where possible; when exhausted, the system falls back to the problem bank with a delay.

### Slice 2 — Graceful lesson pause + re-attempt next session

**Principle:** When a learner has enough KP failures within a single lesson session, the lesson gets **paused**, not failed. The student is routed to other progress (new frontier work, reviews on unrelated concepts) and the lesson is re-offered **in the next study session**, not on a wall-clock timer. Math Academy cites an 80% pass rate on second attempts *without any intervention* (FAQ p.415) — rest + consolidation is itself a remediation strategy, and the book explicitly frames the pause as "across sessions" rather than minutes/hours.

**Cool-down model (decision):** session-based, not time-based. A paused concept is hidden from the frontier for the remainder of the current study session and re-surfaces on the next `GET /next-task` call that belongs to a new session. This matches Math Academy's doctrine and sidesteps the problem of tuning a clock value for different learner cadences.

**New state**

- Keep `StudentConceptState.masteryState` = `in_progress` and add a `LessonPause` value object with `pausedAtSessionId` (or `pausedAt` + session join) on `StudentConceptState`. No new mastery state to avoid breaking consumers that branch on it.
- Pause is triggered when: `sessionFailedKPAttempts ≥ N` (tune on data; start N=6) **and** at least one KP still unpassed.
- A `StudySession` is already implied by task-selector usage; if not explicit, Slice 2 adds a lightweight session identifier (day-keyed UUID) rather than a full session aggregate.

**Task selector integration**

- `task-selector.ts` gets a new priority tier: skip any concept whose `pausedAtSessionId == currentSessionId`.
- When a new session starts, previously paused concepts re-enter the frontier with priority **above** fresh lessons (mimicking Math Academy's "you had this one, let's come back to it first").

**DDD alignment**

- Pause logic lives in `LearningEngine`, not `Assessment`. Assessment only writes the raw KP state; LearningEngine interprets "how many session misses before we pause" based on a policy that can evolve.
- New `LessonPausePolicy` pure function, testable in isolation.

**Anti-gaming**

- A student cannot voluntarily pause to dodge hard content. Pause is system-initiated only, and the paused concept is re-queued, not skipped.

### Slice 3 — Key-prerequisite remediation + quiz-miss follow-up

**Principle:** Math Academy's single most curated piece of data is the `key_prerequisite` link on each KP. When the student fails a KP twice across sessions, the system spawns a remedial review on the KP's *specific* key prerequisite — not the weakest ancestor of the whole concept.

**Content model change**

- Add `key_prerequisite_kp_id` (or `key_prerequisite_concept_id` as a first pass) to the KP content schema. This is authored data, not inferred. Start optional; validate in `graspful review course`.
- For existing courses without key-prereq links, fall back to today's concept-level plateau behavior.

**Backend changes**

- Extend `PlateauDetector` (or add a `KPPlateauDetector`) to fire on `StudentKPState.attempts ≥ 4 && !passed` across ≥ 2 sessions.
- When it fires, `LearningEngine` creates a `Remediation` record pointing to the key prereq. The existing `RemediationService` + blocked-concept gating already handles the rest.
- **Quiz follow-up (Math Academy way):** when a quiz question is missed, the quiz submission handler immediately creates a `Remediation` record on the missed concept *and* the subsequent `GET /next-task` returns that remedial review as priority P1, blocking new lesson selection until the review passes. This matches Ch 21 p.300: "Whenever they miss a question on a quiz, we immediately follow up with a remedial review on the corresponding topic." Implementation-wise: `QuizService` calls `RemediationService.createForMissedQuizQuestion(conceptId)` inside the same transaction as the answer submission, and `task-selector.ts` already gives remediation P1.

**CLI / content workflow**

- Update `docs/adding-a-course.md` and `graspful_fill_concept` to **require** a key-prereq link per KP.
- Add a `graspful review` check: "KP X has no key-prerequisite link" — fails the 10/10 quality gate if missing.
- **Backfilling existing courses:** do not block on human authoring. Spawn a dedicated content-authoring subagent (one per course) that reads each KP, consults the prerequisite graph, and proposes a `key_prerequisite_kp_id` per KP. Human reviews the batch in one pass. Run these in **parallel** across courses so the whole catalog backfills in one sitting rather than course-by-course. The agent emits a YAML patch; it does not import directly — review gate stays human.
- Going forward, `graspful_fill_concept` should suggest a key-prereq automatically when filling a KP, which the author then confirms or overrides.

**DDD alignment**

- All remediation records still flow through `RemediationService`. The existing blocked-concept check in `lesson.service.ts:48-57` is reused.
- `Assessment` does not know about remediation; it only reports state. `LearningEngine` observes state and decides remediation.
- No cross-module shortcuts.

---

## 3. What We Are Deliberately NOT Doing

- **Generating alternate explanations on the fly.** Math Academy p.416-417 is explicit: if an explanation needs to be rewritten, the content is broken, not the student. We fix the content in authoring, not in the runtime loop.
- **Adding adaptive hints during a failed problem.** p.299 treats this as lowering the bar. We re-surface the worked example, full stop.
- **Instant fallback to prerequisites after a single KP miss.** p.416: slow peel-back is anti-gaming. Fallback is a *second-failure* mechanism.
- **Mastery based on a single correct answer.** Keep 2-consecutive-correct as our baseline mastery bar; consider tightening to include time-per-problem later (p.412).
- **XP penalties beyond what exists.** Slice 1 is enough. Revisit after we have data.

---

## 4. Decisions (resolved)

1. **Key-prerequisite authoring burden → accepted.** Required on every KP. Backfill across all existing courses via parallel content-authoring subagents (one per course). Humans review the batch, not each KP. Going forward, `graspful_fill_concept` auto-suggests the link when filling.
2. **Worked-example re-surface UX → Math Academy way.** Re-show the exact same worked example verbatim. No authored alternate angle. No generated rewording. Fix the original content if the explanation is bad.
3. **Pause cool-down duration → session-based, not time-based.** Paused concepts are hidden for the rest of the current session and re-surface as top priority in the next session. No wall-clock timer.
4. **Slice order → ship all three.** No staged rollout. Slice 1 is the biggest win, but pausing without KP-level more-practice creates weird failure modes, and KP-level more-practice without quiz follow-up leaves the quiz path inconsistent. Land all three together.
5. **Quiz follow-up review UX → Math Academy way.** Missed quiz question creates an immediate `Remediation` record; the next `GET /next-task` returns it as P1, blocking new lessons until the review passes.

---

## 5. Measurement

Before shipping Slice 1, instrument:

- **KP miss-to-next-problem-target** — % of post-miss problems that target the same KP. Today: ~1/N where N is the practice list length. Target: 100%.
- **Session KP pass rate** — % of KPs that reach `passed: true` within the session they were introduced. Today: unknown. Target: measure and improve.
- **Second-attempt lesson pass rate** (for Slice 2) — Math Academy hits 80% without intervention. Our baseline unknown.
- **Time to mastery per concept** — median practice attempts before `mastered`. Should go *up* slightly with Slice 1 (more practice on missed KPs) but **pass rates should go up more**.
- **Anti-gaming signal** — ratio of `answered within 1s` to `answered within 5s` on retries. Should not spike post-change.

Log these via the existing PostHog integration so we can build dashboards without new infrastructure.

---

## 6. Risks

- **Slice 1 increases average session length.** If a learner keeps missing, the system keeps serving. Mitigation: session-level pause in Slice 2, and a "stuck on KP" sentinel that escalates to Slice 3's key-prereq fallback.
- **Worked-example re-surface becomes noise if shown too aggressively.** Mitigation: only auto-expand on the first miss per KP per session; subsequent misses collapse it.
- **Schema evolution for `LessonPause` / `pausedAt`.** New nullable columns on `StudentConceptState`, safe migration, no read-path breakage.
- **Authoring debt for key-prereq links** (Slice 3). Mitigation: soft-launch with a fallback to concept-level plateau, only gate Slice 3 features behind presence of the link.
- **Regression in existing plateau behavior.** Covered by existing specs in `plateau-detector.spec.ts`, `task-selector.spec.ts`, `remediation.service.spec.ts`. New KP-level logic gets its own spec file.

---

## 7. Delivery Order (all three ship together)

Ship all three slices in one coordinated release. They are sequenced internally so each depends on the previous, but they land in the same PR train.

| Order | Workstream | Depends on | Rough effort |
|---|---|---|---|
| **A** | Content backfill: parallel subagents propose `key_prerequisite_kp_id` per KP across all existing courses. Human batch-review. | Schema decision only | Runs in parallel with B/C |
| **B** | Slice 1 backend: `KPRemediationSelector`, `ProblemSubmissionService` returns `nextProblemHint`, session-level retry delay | — | Medium |
| **C** | Slice 1 frontend: `lesson-flow.tsx` state machine, worked-example re-surface, stream-driven practice | B | Medium |
| **D** | Slice 2: `LessonPause` value object, session-based cool-down, task-selector priority tier | B | Small |
| **E** | Slice 3 backend: `KPPlateauDetector`, key-prereq remediation, quiz-miss → immediate P1 remediation | B, A (for new courses) | Medium |
| **F** | Slice 3 content gate: `graspful review` fails without key-prereq links, `graspful_fill_concept` auto-suggests | A, E | Small |
| **G** | Update `docs/adaptive-learning-architecture.md` to reflect the new wrong-answer doctrine (KP-level more-practice, session-based pause, key-prereq remediation, immediate quiz follow-up) so it remains the canonical reference. | B–F merged | Small |

Workstream A is the critical-path long pole if done serially — which is why it runs in parallel via subagents. B/C/D/E/F can interleave in short PRs. **G lands last**, after the behavior actually matches, so the doc is never ahead of the code.

### Workstream G — hard requirement

The agent updating `docs/adaptive-learning-architecture.md` **MUST read `math-academy-way.pdf` first** — specifically Ch 4 (Knowledge Graph, key prerequisites), Ch 13 (Mastery Learning / ZPD), Ch 14 (Cognitive Load / worked examples), Ch 18 (Spaced Repetition / FIRe), Ch 21 (Targeted Remediation), and the FAQ sections on Practice Experience and Remediation (pp. 397–425).

Do not paraphrase from memory, the summary in §8 of this plan, or prior training data. Every new doctrine added to the architecture doc must be grounded in a direct citation from the book (page number required). The point of the update is to codify Math Academy's rules, not invent Graspful-flavored variants. If the agent can't find a book quote supporting a claim, the claim does not go in the doc.

The book lives at `/Users/will/github/graspful/math-academy-way.pdf`. Read it via the `Read` tool with the `pages` parameter in chunks of 15–20 pages.

---

## 8. Appendix — Key quotes from *The Math Academy Way*

> "The bar for success is never lowered; rather, students are given additional practice that helps them clear the bar fully and independently on their next attempt." — Ch 21, p.299

> "If they struggle during a task, we give more questions — that is, more chances to learn and demonstrate their learning. If they fail a lesson, we give them a break and enable them to make progress learning unrelated topics before asking them to re-attempt the failed lesson." — Ch 21, p.300

> "Some people think that students need a million different explanations of the same topic until one 'clicks' for them. But really, if you have to explain something a ton of different ways... then either 1) your original explanations were not good in a pedagogical sense, or 2) the student was lacking prerequisite knowledge." — FAQ, p.416

> "Each knowledge point is linked to one or more key prerequisite topics... If a student ever fails a lesson twice at the same knowledge point, we automatically provide remedial reviews on the key prerequisites." — Ch 4, p.76

> "The order of correct versus incorrect is very significant when it comes to measuring learning... ✗✓✗✓✓ is interpreted that... learning occurred... ✓✓✗✓✗ is interpreted that... they were not really 'getting' it initially." — FAQ, p.412

> "Whenever they miss a question on a quiz, we immediately follow up with a remedial review on the corresponding topic." — Ch 21, p.300

> "How quickly the system peels back a student's knowledge profile in response to a failed task depends on how much evidence the student has demonstrated for knowing the prerequisite topics... This is a slow process because it has to be resistant to adversarial students 'gaming the system.'" — FAQ, p.415-416
