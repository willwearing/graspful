# Course Review Gate

Review specification for course quality validation. This document defines both the human/agent review process and the 10 automated mechanical checks.

## Quick Start

```bash
graspful review course.yaml              # Run all 10 checks offline
graspful review course.yaml --format json # Machine-readable output
graspful import course.yaml --publish     # Runs review gate inline
```

## Structural Review (Agent Review)

After the authoring agent finishes the YAML skeleton, the workflow must spawn a second agent to review the graph abstractly before the course is treated as ready. Self-review by the authoring agent is not enough.

This second agent is reviewing the first agent's work, not assisting it. It should assume the first draft is under-split or under-connected until the graph and lesson staircase prove otherwise. The review agent should challenge the first agent's decisions and require rewrites when the structure is technically valid but still too large for smooth learning.

The review agent should return findings ordered by severity with file and line references where possible. Approval is not the default outcome.

The handoff should be explicit:

- Agent 1 authors or revises the graph and lesson draft.
- Agent 2 reviews that output as an adversarial checker.
- Agent 1 (or a fresh authoring pass) fixes the issues raised by Agent 2.
- The course is not treated as complete until the review findings are resolved or consciously accepted.

The review agent should check:

1. Are the roots truly foundational?
2. Does every non-root concept have the minimum necessary prerequisites?
3. Are any concepts placed too low that should be higher up as later capstones?
4. Are any concepts placed too high that actually require earlier foundations?
5. Are there missing cross-branch edges where one branch quietly depends on another?
6. Are any branches large enough that they should become separate courses inside an academy?
7. Do sections and course boundaries reflect the graph, or are they hiding a broken graph?
8. Does the course or academy create a clear root -> trunk -> branch -> leaf progression?
9. For each concept, is the lesson broken into a real staircase of KPs with increasing difficulty, or is it still a mini-chapter disguised as one KP?
10. If a learner missed a later KP, would the failure point tell us something precise about the missing foundation or missing subskill?
11. **Are any questions repeated or near-identical across KPs or concepts?** Duplicate questions train memorization, not understanding. If a learner sees the same question on retake, the spaced-repetition loop is worthless — they are recalling the answer, not reconstructing the reasoning. The review agent must grep the problem pool for duplicate `question` text, duplicate `explanation` text, and questions that test the same atomic fact at the same cognitive level. Cross-concept overlap is especially dangerous because it inflates apparent mastery without real depth.
12. **Does each concept's problem set escalate in difficulty?** Problems within a concept must form a staircase: recognition -> guided application -> judgment / transfer. If every problem in a concept is at recognition level (definitions, true/false recall, simple matching), the concept has no depth — the learner can "pass" without ever applying the knowledge. Flag any concept where all problems test the same cognitive level.

The review agent must explicitly ask:

- "Is this foundational, or can it go further up?"
- "What breaks downstream if this concept is missing?"
- "Would a student who mastered the stated prerequisites actually be ready for this?"
- "Is this branch big enough or independent enough to deserve its own course?"
- "If this becomes its own course, do we still preserve the real prerequisite and layering structure across courses?"
- "Is this lesson small-step enough to be learnable in audio form, or did the first agent pack multiple ideas into one KP?"
- "Do the practice explanations provide reactive feedback that tells the learner what to fix next?"
- "Have I seen this exact question — or a question testing the same fact at the same cognitive level — anywhere else in the course?" (If yes, one of them must be deleted, escalated, or rewritten to test a different angle.)
- "Do this concept's problems actually escalate in difficulty, or are they all recognition-level?" (If all problems can be answered from a single definition, the concept lacks depth.)

The review agent should evaluate the graph against the PDF's core claims:

- Chapter 13: students should only be advanced to topics for which they have demonstrated prerequisite mastery, and alternative frontier topics should remain available if one branch stalls (pp. 210-212)
- Chapter 14: steps should be small enough to avoid cognitive overload; oversized concepts should be split (pp. 217-219)
- Chapter 16: advanced topics should strengthen earlier knowledge through layering rather than bypass it (pp. 241-244)

## Content Review

After the graph review and the content pass, run one final review focused on lesson quality. Prefer a separate review agent here too if the course changed materially after the first review.

1. Does every fully-authored KP include `instruction` and practice problems?
2. Does the instruction explain one idea clearly without depending on the example?
3. Is there a worked example wherever the learner would otherwise have to infer the application step?
4. Is there at least one useful visual/reference block in sections where a diagram, screenshot, or doc page would materially improve understanding?
5. Do the practice problems check understanding and application, not just wording recall?
6. Are the linked visuals sized intentionally and captioned clearly?
7. Would a first-time learner understand what to do next at every step?
8. Does each concept have a real increasing-difficulty staircase of KPs, rather than one dense KP plus a quiz?
9. Do explanations act as reactive feedback by naming likely misconceptions and telling the learner how to recover?
10. If the learner failed a later KP twice, would the failure location and feedback point to a specific missing idea or prerequisite?
11. **DEDUPLICATION CHECK (mandatory):** Grep every `question:` field in the YAML and flag any pair of questions that test the same atomic fact at the same cognitive level — even if the wording differs or the problem type differs. Repeated questions are the single most common failure mode in AI-authored courses. They create the illusion of mastery by training the learner to memorize the answer rather than reconstruct the reasoning. This check must be run cross-concept, not just within a single concept, because cross-concept duplication is harder to spot and more damaging. If duplicates are found, the review agent must either (a) delete the weaker variant, (b) rewrite it to test a genuinely different angle/application/scenario, or (c) escalate its difficulty so it adds a new rung on the staircase.
12. **DIFFICULTY STAIRCASE CHECK (mandatory):** For each concept, list the cognitive level of every problem (recognition / application / judgment-transfer). If all problems are at the same level, the concept fails this check. The fix is to add at least one problem at a higher cognitive level: scenario-based application, multi-step tracing, "design the right approach" judgment, or troubleshooting a realistic failure. A course where every problem is recognition-level teaches vocabulary, not competence.
13. **CROSS-CONCEPT FACT COVERAGE CHECK:** Identify the 5-10 most-tested facts across the entire course. If any single fact is tested more than 3 times across different concepts (even via encompassing), flag it. Some overlap from layering is expected, but excessive repetition of the same fact signals that the problem pool lacks variety, not that the concept is well-reinforced.

Do not mark the course complete until both the graph review and the content review pass.

## Content Quality Rules

These rules apply to all course content. The authoring workflow should not produce content that violates them, and the review agent should explicitly check for violations.

### Instruction formatting

Every `instruction` field must be structured for scannability. The instruction is the primary teaching content — it must be easy to read, easy to listen to in audio form, and easy to return to for reference.

Rules:

- No wall-of-text paragraphs. If an instruction exceeds ~100 words without a visual break, it needs restructuring.
- One idea per paragraph. Use double blank lines in YAML `>-` scalars to create paragraph breaks.
- Use **bold** for key terms on first introduction.
- Use numbered lists for sequential processes or steps.
- Use bullet lists for parallel alternatives or properties.
- If a single KP covers definition + why it matters + tradeoffs + caveats + operational patterns, it is too big. Split it.
- Instructions must be audio-readable: no URLs in the prose, no "see diagram below", no "the image shows". Put visual references in `instructionContent` blocks.

Bad example:
```
instruction: >-
  Every entity needs a primary key — an attribute that uniquely identifies each instance. Customer 42 is different from Customer 43 because they have different primary keys. Primary keys serve two critical purposes: they guarantee uniqueness and they allow other entities to reference this one via foreign keys. Good primary keys have three properties. They are unique. They are stable. They are never null. Common choices include auto-incrementing integers, UUIDs, or natural keys from the business domain though these can be problematic if they change.
```

Good example:
```
instruction: >-
  Every entity needs a **primary key** — an attribute (or combination of attributes) that uniquely identifies each instance.


  Primary keys serve two purposes:

  1. **Uniqueness** — no two instances share the same key

  2. **Referenceability** — other entities can point to this one via foreign keys


  A good primary key has three properties:

  - **Unique** — no duplicates allowed

  - **Stable** — does not change over time

  - **Never null** — every instance must have a value


  Common choices: auto-incrementing integers, UUIDs, or natural keys from the business domain. Surrogate keys (system-generated IDs) are generally preferred because they are guaranteed stable and unique.
```

### Knowledge point granularity

- Fully-authored concepts should have 2-4 KPs. One oversized KP is almost always worse than two smaller KPs.
- Each KP should teach one idea or one skill step. If you need more than ~150 words to explain it, the KP probably covers too much.
- KPs must form an increasing-difficulty staircase: recognition -> guided application -> judgment / transfer.
- If a concept still reads like a short chapter instead of a staircase, stop and split it before polishing prose.

### Problem variant depth

- Every concept should have at least 3-4 distinct problem variants per KP that has problems.
- Problems testing the same concept must use different angles, scenarios, or framings — not the same question with reshuffled options.
- Section exams draw from the concept's problem pool. If the pool has only 1-2 questions, the learner will see the same questions on retakes, which defeats the purpose.
- Problem types should vary: mix multiple choice, true/false, scenario-based, fill-in-the-blank, ordering, and matching where appropriate.
- Wrong-answer explanations must diagnose the likely misconception and tell the learner what to fix — they are reactive feedback, not just "that's wrong."

### Question uniqueness and deduplication (CRITICAL)

**Repeated questions are the #1 failure mode in AI-authored courses.** When a learner encounters the same question twice — whether word-for-word identical or testing the same atomic fact at the same cognitive level — they memorize the answer instead of building understanding. This defeats the entire purpose of spaced repetition and mastery learning.

Rules:

- **No two problems in the entire course may test the same atomic fact at the same cognitive level.** "Same atomic fact" means: if you wrote a one-sentence summary of what each question tests, the summaries would be identical. "Same cognitive level" means: both are recognition, both are application, or both are judgment. Testing the same fact at a *different* cognitive level (e.g., recognition in KP1, then scenario-based application in KP3) is not just acceptable — it's the desired staircase pattern.
- **Cross-concept duplication is worse than within-concept duplication.** When the same fact appears as a question in concept A and again in concept B, the learner gets false confidence — they think they "know" two things when they really know one thing twice. The review agent must check for this explicitly.
- **Flipping a question is not a new question.** "Which features require person profiles?" and "Which features work without person profiles?" test the same discrimination. Rephrasing is not reframing.
- **Common duplication patterns to watch for:**
  - True/false in one KP, multiple-choice asking the same fact in another KP
  - "What is X?" in one concept, "What must you do to get X?" in a related concept (same underlying knowledge)
  - Matching tasks where one pair tests a fact that also appears as a standalone question elsewhere
  - Scenario questions that are thin wrappers around recognition questions — the scenario adds narrative but the cognitive demand is unchanged

How to fix duplicates:

1. **Delete the weaker variant** if the stronger one already covers the fact.
2. **Escalate the duplicate** to a higher cognitive level: turn recognition into application, application into judgment, judgment into design/troubleshooting.
3. **Change the angle**: instead of testing "does X require Y?", test "given this customer scenario with X and Y present, what would you investigate first?" — this tests the same knowledge but through transfer, not recall.
4. **Move the duplicate to a different concept** where it serves as a genuine encompassing exercise rather than a repeat.

### Difficulty staircase within concepts

- Problems within a concept must escalate in difficulty: recognition -> guided application -> judgment / transfer.
- If every problem in a concept can be answered by recalling a single definition, the concept has no depth.
- A concept that passes every student at the recognition level has not tested whether the student can *use* the knowledge in context.
- The minimum bar: at least one problem per concept must require the learner to apply the knowledge to a scenario they haven't seen before, or to discriminate between two plausible approaches in context.
- If the authoring agent produces problems that are all at the same level, the review agent must reject the concept and require rewrites before the course ships.

### Callout and reference blocks

- Use `instructionContent` blocks for visual aids, external links, and callouts.
- Every concept where a diagram, screenshot, or reference link would materially help understanding should have at least one `instructionContent` block.
- Callout blocks should highlight key rules, common mistakes, or memory aids — not repeat the instruction.
- Link blocks should point to authoritative external resources that the learner can use for deeper exploration.

## Mechanical Quality Gate

The following 10 checks are automated and run by `graspful review`:

| # | Check | What It Does |
|---|-------|-------------|
| 1 | yaml_parses | YAML loads and validates against CourseYamlSchema |
| 2 | unique_problem_ids | No duplicate problem IDs across the course |
| 3 | prerequisites_valid | All prerequisite references resolve to real concept IDs |
| 4 | question_deduplication | No near-identical questions at the same cognitive level |
| 5 | difficulty_staircase | Each concept has problems at 2+ cognitive levels |
| 6 | cross_concept_coverage | No fact tested >3 times across concepts |
| 7 | problem_variant_depth | Each authored KP has >=3 practice problems |
| 8 | instruction_formatting | No wall-of-text instructions >100 words without content blocks |
| 9 | worked_example_coverage | >=50% of concepts have worked examples |
| 10 | import_dry_run | DAG validation succeeds (no cycles, valid refs) |

**Current state:** Checks 1-3 and 10 are automated by the importer and load script. Checks 4-9 are run manually by the review agent. If the manual checks repeatedly catch the same failures, or if agent-authored courses keep shipping with the same quality issues, consider building automation for checks 4-9 as a single mechanical pass. The decision point: if the review agent has to flag the same class of issue (e.g., duplicate questions) on 3+ courses, automate that check into a script so it can't be missed.

## Self-Improvement Loop (Autoresearch Pattern)

After every authoring or review pass, the agent should run an autonomous self-improvement loop inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch). The core principle: **modify one thing, verify mechanically, keep or revert, repeat.**

This is not optional polish. It is the mechanism that prevents quality from decaying over time and ensures every iteration of a course is better than the last.

### The loop

```
1. MODIFY  — Make one targeted change to the course YAML
2. VERIFY  — Run the mechanical quality gate (see checks below)
3. MEASURE — Compare the result against the baseline score
4. DECIDE  — Keep the change if quality improved or held; revert if it degraded
5. REPEAT  — Loop until all gate checks pass or no further improvements are found
```

### What makes this work

Three design choices from autoresearch translate directly:

1. **Single file, single change.** Each iteration touches one concept, one KP, or one problem cluster — not the whole course at once. This makes the keep/revert decision unambiguous. If you change five things and quality drops, you don't know which change caused it.

2. **Fixed verification budget.** Don't spend unlimited time on review. Run the mechanical checks (below), score the results, decide in under 60 seconds. The quality gate is cheap to run; the improvement comes from running it many times, not from running it once very carefully.

3. **Mechanical verification, not vibes.** Every check must produce a pass/fail or a number. "Does it feel better?" is not a check. "Are there 0 duplicate-fact question pairs at the same cognitive level?" is a check.

### How the agent should use this

**After authoring (Steps 6-10):**

1. Run the quality gate.
2. If any check fails, pick the highest-severity failure.
3. Make one targeted fix for that failure.
4. Re-run the quality gate.
5. If the fix resolved the failure without introducing new ones, keep it. If it introduced a new failure, revert and try a different approach.
6. Repeat until all checks pass.

**After review (Steps 8, 11):**

The review agent's findings become the modification queue for the improvement loop. Each finding is one iteration:

1. Pick the highest-severity finding.
2. Make the fix.
3. Run the quality gate.
4. Keep or revert.
5. Move to the next finding.

**After any course content change (ongoing):**

Any agent that edits a course YAML — whether adding concepts, rewriting problems, or adjusting prerequisites — must run the quality gate before marking the work complete. The gate is the gatekeeper, not the agent's self-assessment.

### What the agent must NOT do

- Do not skip the gate because "the change was small."
- Do not batch multiple fixes into one iteration. One change, one verify, one decision.
- Do not override a gate failure with a justification. If the gate says fail, either fix the issue or revert the change.
- Do not treat the gate as a final step. It is a loop — the agent should expect to run it multiple times per authoring session.

### Logging

Each iteration should be logged so quality trends are visible:

```
[iteration 1] MODIFY: rewrote ph-sessions-p4 as scenario problem
[iteration 1] VERIFY: gate passed (10/10 checks)
[iteration 1] DECIDE: keep

[iteration 2] MODIFY: deleted duplicate gotcha-p5
[iteration 2] VERIFY: gate passed (10/10 checks)
[iteration 2] DECIDE: keep

[iteration 3] MODIFY: split oversized KP in ph-actions
[iteration 3] VERIFY: gate failed (check 2: duplicate problem ID ph-actions-p3)
[iteration 3] DECIDE: revert, fix ID collision, retry
```

### Connection to Playwright tests

The quality gate for course content is necessary but not sufficient. After the YAML quality gate passes, the agent must also verify that the course loads and works in the app:

1. Import the course with `load-course.ts`
2. Run the relevant Playwright E2E tests (`courses.spec.ts`, `diagnostic.spec.ts`, etc.)
3. If any test fails, the change is not complete — treat the test failure as a gate failure and fix it before moving on.

This is the same principle as autoresearch: the training run (Playwright tests) is the final arbiter, not the agent's confidence that the change is correct.

## Review Outcomes

The review outcome should be one of:

- **approved** — course passes all structural and content checks
- **approved with edge adjustments** — minor prerequisite or encompassing fixes needed
- **approved with lesson split adjustments** — some concepts or KPs need splitting but the graph structure is sound
- **deduplicate and escalate problems** — duplicate questions found; must be deleted, rewritten, or escalated before shipping
- **rewrite graph structure before authoring KPs** — fundamental structural issues that must be resolved before content work continues
- **rewrite KPs before shipping** — graph structure is sound but lesson content needs significant rework
