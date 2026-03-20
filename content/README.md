# Content Authoring Guide

## Overview

Courses are defined as YAML files in `content/courses/`. Each file defines a complete knowledge graph for one certification exam: concepts, prerequisite edges, encompassing edges, knowledge points, and practice problems.

Sections can also define `sectionExam` blocks. These create section-end certification checkpoints between lesson mastery and course-level quizzes.

**No code is needed to add a new course.** The backend imports YAML, validates the graph, and builds the knowledge graph in the database.

## Directory Structure

```
content/
  courses/
    ny-real-estate-salesperson.yaml     # NY State Real Estate Salesperson exam
    ab-nfpa-1001-firefighter-i.yaml     # Alberta NFPA 1001 Fire Fighter Level I
  README.md                              # This file
```

## Course YAML Schema

See [adaptive-learning-architecture.md](../docs/adaptive-learning-architecture.md#4-content-authoring-model-no-code-just-content) for the full schema spec. Quick reference:

```yaml
course:
  id: string              # kebab-case, globally unique
  name: string
  description: string
  estimatedHours: number
  version: string         # e.g., "2024.1"
  sourceDocument: string  # official source (e.g., "NFPA 1001-2019")

concepts:
  - id: string            # kebab-case, unique within course
    name: string
    difficulty: 1-10       # 1=basic definition, 5=application, 8=complex analysis, 10=multi-step
    estimatedMinutes: number
    tags: [string]
    sourceRef: string      # e.g., "NFPA 1001-2019 JPR 4.3.1"
    prerequisites: [concept-id]         # must master before this concept
    encompassing:                       # implicit repetition edges
      - concept: concept-id
        weight: 0.0-1.0               # how much practicing THIS concept reviews the target
    knowledgePoints:
      - id: string
            instruction: string            # markdown file path or inline text -> TTS audio
            instructionContent:           # optional structured visuals/references
              - type: image | video | link | callout
        workedExample: string          # optional
        workedExampleContent:          # optional structured visuals/references
          - type: image | video | link | callout
        problems:
          - id: string
            type: multiple_choice | fill_blank | true_false | ordering | matching | scenario
            question: string
            options: [string]          # for MC, ordering, matching
            correct: string | number   # answer
            explanation: string        # shown after answering

sections:
  - id: string
    name: string
    description: string
    sectionExam:
      enabled: boolean
      passingScore: 0.0-1.0
      timeLimitMinutes: number
      questionCount: number
      blueprint:
        - conceptId: concept-id
          minQuestions: number
      instructions: string
```

## Authoring Guidelines

### Progress-safe evolution

After a course has active learners, course updates must preserve slug identity:

- Keep `course.id`, section `id`, concept `id`, and KP `id` stable across revisions.
- Safe changes: refine instruction, add worked examples, revise problems, add content blocks, add new concepts, add new sections, adjust edges.
- Unsafe changes: renaming existing slugs in-place. Removing slugs is only safe when you intentionally archive them during import instead of deleting them.
- Use the progress-safe import scripts (`scripts/load-course.ts` or `scripts/import-course-quick.ts`) instead of deleting and recreating the course.
- When retiring content, re-run the importer with `--archiveMissing true`. That hides removed sections, concepts, and KPs from active delivery while preserving historical student state on the archived rows.

Practical rule:

- Same idea, better lesson -> keep the slug and improve it.
- New idea, new frontier node -> add a new slug.
- Truly obsolete content -> archive it deliberately; do not silently drop it from the YAML without `archiveMissing`.

### Concept Granularity

A concept = one teachable idea that can be tested independently. Too broad = students get stuck. Too narrow = graph gets unwieldy.

**Good:** "Forms of Co-Ownership (Joint Tenancy, Tenancy in Common, TBE)"
**Too broad:** "All of Property Law"
**Too narrow:** "Definition of Joint Tenancy" (make this a KP within the concept instead)

### Prerequisites

- Max 3-4 direct prerequisites per concept (working memory limit)
- Only list DIRECT prerequisites — transitive ones are inferred
- If A→B→C, don't add A→C explicitly

### Encompassing Weights

- **1.0:** Fully exercises the target as a subskill
- **0.5-0.7:** Substantially exercises the target
- **0.2-0.4:** Partially exercises the target
- **< 0.2:** Probably not worth listing

### Knowledge Points (KPs)

- Do not optimize for the fewest possible KPs. Optimize for enough scaffolding that a learner can actually master the idea in sequence.
- Fully-authored concepts should usually have 2-4 KPs, progressively harder
- Use 1 KP only when the concept is genuinely tiny and atomic, or when the concept is still a graph stub rather than a finished lesson
- Each KP should follow: instruction -> content -> worked example -> practice
- Each KP should teach one load-bearing move, distinction, or case. If one KP needs to cover definition + design rule + caveat + implementation pattern, split it.
- Difficulty should rise one small step at a time. Learners should feel like they are climbing a staircase, not jumping over a gap.
- Each fully-authored KP needs: instruction text, 2-3 practice problems minimum
- Applied or high-transfer KPs should usually include a worked example, not just prose plus problems
- 2 consecutive correct answers = KP passed
- Problems should test understanding, not just recall
- Explanations are reactive feedback, not answer reveals. They should name the likely misconception and point the learner back to the rule, contrast, or earlier skill they missed.

### Structured content blocks

Use `instructionContent` and `workedExampleContent` for media and references that support the lesson without polluting the audio text.

- `image`: screenshot or diagram with `url`, `alt`, optional `caption`, optional `width`
- `video`: external demo or walkthrough with `url`, `title`, optional `caption`
- `link`: supporting document or product page with `url`, `title`, optional `description`
- `callout`: short highlighted note with `title` and `body`

Guidelines:

- Keep `instruction` and `workedExample` plain-text first
- Add a visual when it materially reduces ambiguity
- Prefer existing official assets over creating new throwaway diagrams
- Use captions to explain why the learner should care about the image

### Practice authoring

In lesson flow, `problems` are the practice session for a KP. Author them as a sequence:

- First problem: confirm the learner recognized the key idea
- Middle problem: test application or comparison
- Final problem: use a scenario when the concept shows up in real TAM work
- Explanations should tell the learner what to change on the next attempt, not just what the correct option was

### Section exam authoring

- Add a `sectionExam` block to every section that should gate downstream progression
- Every blueprint concept must live inside that section
- `questionCount` must be at least the sum of the blueprint `minQuestions`
- Make the exam broad and unaided: test transfer and reasoning, not verbatim lesson recall
- If the section relies on a diagram or visual model, the exam should test the underlying structure, not just terminology

### Problem Quality

- **Multiple choice:** 4 options, 1 correct. Distractors should be plausible.
- **Fill blank:** Accept reasonable variations (the system normalizes answers)
- **Ordering:** 4-6 steps max. Every step must be necessary.
- **Scenario:** Audio description + follow-up questions. Best for complex application.

### Tags

Use consistent tag prefixes per course section:
- `s01-license-law`, `s02-agency`, `s4.3-fireground`
- Add cross-cutting tags: `foundational`, `calculation`, `scenario`, `regulation`

### Source References

Always include the specific section/article/JPR number:
- Real estate: "DOS Syllabus Subject 2: Law of Agency"
- Firefighting: "NFPA 1001-2019 JPR 4.3.10"
- Electrical: "NEC Article 210.3"

## Validation

The backend importer validates:
- No cycles in prerequisite graph
- All referenced concept IDs exist
- Encompassing weights are 0.0-1.0
- Every concept has at least 1 KP (when fully authored)
- Every KP has at least 2 problems (when fully authored)

Concepts with `# KPs to be authored` placeholders are imported as graph structure only — they won't appear in student-facing content until KPs are added.

## Sample Courses

| Course | Niche | Concepts | Fully Authored | Purpose |
|--------|-------|----------|----------------|---------|
| `ny-real-estate-salesperson.yaml` | Real Estate (NYC) | ~85 | 3 | Validate format for law/regulation-heavy content |
| `ab-nfpa-1001-firefighter-i.yaml` | Firefighting (Alberta) | ~50 | 3 | Validate format for skills/standards-based content |

These two courses were chosen to stress-test the YAML format across maximally different content types. If the schema works for both state-specific law AND international safety standards, it works for everything in between.
