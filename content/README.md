# Content Authoring Guide

## Overview

Courses are defined as YAML files in `content/courses/`. Each file defines a complete knowledge graph for one certification exam: concepts, prerequisite edges, encompassing edges, knowledge points, and practice problems.

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
        workedExample: string          # optional
        problems:
          - id: string
            type: multiple_choice | fill_blank | true_false | ordering | matching | scenario
            question: string
            options: [string]          # for MC, ordering, matching
            correct: string | number   # answer
            explanation: string        # shown after answering
```

## Authoring Guidelines

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

- 1-4 KPs per concept, progressively harder
- Each KP needs: instruction text, 2-3 practice problems minimum
- 2 consecutive correct answers = KP passed
- Problems should test understanding, not just recall

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
