# Adding a New Course

End-to-end guide for creating a course YAML and importing it into the platform.

This document also serves as the agent runbook for new course creation. If an agent is asked to "add a course", "draft a course graph", or "author a course YAML", this is the document it should follow.

## Agent Workflow

Use this sequence every time. Do not jump straight to YAML authoring.

### Required reference before authoring

Before creating or revising a course graph, the agent should review the relevant parts of *The Math Academy Way* PDF:

- Chapter 4, pp. 69-80: knowledge graph, course graph, prerequisites, key prerequisites, encompassings, diagnostic frontier
- Chapter 13, pp. 207-214: mastery learning, only advancing once prerequisites are mastered, teaching at the frontier
- Chapter 14, pp. 217-224: learning staircase, knowledge points, worked examples, cognitive load, gradual scaffold removal
- Chapter 16, pp. 241-245: layering, structural integrity, why advanced topics should exercise earlier knowledge

Official PDF:

- https://www.justinmath.com/files/the-math-academy-way.pdf

### Step 0: Gather required inputs

Before writing any graph structure, the agent must identify the course's source of truth:

- Official exam blueprint, syllabus, codebook, handbook, standard, or curriculum outline
- Official learning objectives or competency statements
- Version / edition year of the source document
- Scope boundary: what is in-scope for the exam, and what is explicitly out-of-scope

If the source of truth is missing, ambiguous, or appears unofficial, stop and ask the user for the official source document before building the course. Do not invent a graph from marketing copy or generic web summaries.

Record these in the `course:` block:

```yaml
course:
  id: my-course-slug
  name: "Course Name"
  description: "One-line description"
  estimatedHours: 40
  version: "2026.1"
  sourceDocument: "Official source document name, edition, year"
```

### Step 0.5: Decide whether this is a course or an academy

Before drawing the graph, decide whether the material should be modeled as:

- one standalone `course`
- or an `academy/track -> courses -> sections -> concepts` tree

Use an academy/track when:

- the source naturally breaks into multiple major branches
- those branches have different downstream dependents
- a learner should be able to stall on one branch and keep progressing on another
- forcing everything into one course would create oversized mixed buckets

This follows the PDF's core structural claims:

- Ch. 4, pp. 72-73: courses are compressed views of the underlying graph
- Ch. 14, pp. 217-220: large stairs should be split into smaller stairs
- Ch. 16, pp. 241-245: the goal is a hierarchical connected sequence of learning units, not a discontinuous array of disconnected courses

Important rule:

- Do not force a multi-branch domain into one course just because the current content is easier to store that way
- Do not split a connected domain into disconnected standalone courses if the learning engine will lose cross-course prerequisite, remediation, or review-compression logic

For PostHog TAM, the correct target is an academy with multiple real courses, not one monolithic course with relabeled sections.

### Step 1: Start from the tree, not the prose

The knowledge graph is the curriculum. Sections and labels are summaries for humans; prerequisite edges are the real structure the learning engine uses.

This comes directly from *The Math Academy Way* Chapter 4: a course graph is a compressed summary, while the knowledge graph is the actual source of truth for the curriculum and learning paths (pp. 69-79).

Think in this order:

1. Roots: what must be learned first because nothing inside the course precedes it?
2. Trunk: what core concepts everything else builds on?
3. Branches: what major capability streams grow from that trunk?
4. Leaves: what advanced or applied concepts sit at the ends of those streams?

If a concept feels "important" but nothing depends on it, it may be misplaced, too broad, or not actually part of the core graph.

### Step 2: Break the source into candidate concepts

Read the source of truth and convert it into candidate concepts. A concept should be:

- One teachable idea or skill
- Independently testable
- Small enough that failure tells you something precise
- Large enough that it deserves its own place in the graph

Do not start with sections from the syllabus as if they are automatically graph nodes. Syllabus headings are often presentation buckets, not learning dependencies.

Use the PDF's lesson model when deciding concept granularity: a topic should be teachable through a small sequence of knowledge points with worked examples and mastery checks, not as an oversized chapter bucket (Ch. 4 pp. 74-76; Ch. 14 pp. 217-220).

For each candidate concept, write down:

- `id`
- `name`
- `sourceRef`
- Why it exists in the course
- What a student must already know to learn it
- Whether it feels root, trunk, branch, or leaf

### Step 3: Draw the prerequisite tree before writing YAML

Build the prerequisite structure as a tree-like DAG:

- Roots are foundational concepts with no in-course prerequisites
- Trunk concepts unify the foundations and support multiple later branches
- Branches are coherent capability streams
- Leaves are advanced applications, integrated tasks, and edge cases

Important constraint: the graph is not always a pure tree because some advanced concepts depend on multiple earlier concepts. That is expected. But the agent should still reason in tree terms first so foundational layering stays clear.

Use Chapter 4 as the model here: arrows define potential learning paths, higher topics can have multiple prerequisites, and key prerequisites should exist where failure on a specific sub-step reveals a missing foundation (pp. 69-76).

For every edge, ask:

- Can concept B be learned without concept A?
- If a student fails B, would weakness in A plausibly explain that failure?
- Does mastering B naturally exercise A as a subskill?

If the answer is yes, the edge probably belongs in the graph.

### Step 4: Convert the graph into human-facing containers

Once the prerequisite graph is coherent, compress it into:

- for a narrower domain:
  - `course` -> high-level container
  - `sections` -> major tiers or capability clusters
  - `concepts` -> graph nodes inside those sections
- for a broader multi-branch domain:
  - `academy/track` -> connected curriculum graph
  - `courses` -> named subgraphs inside that academy
  - `sections` -> human-readable groupings inside each course
  - `concepts` -> graph nodes inside those sections

Sections are not the source of truth. Courses are not the source of truth either. The graph is the source of truth; courses and sections are compressions for humans.

A good course groups concepts that:

- form a coherent capability stream
- are large enough to deserve a named learner-facing milestone
- still remain connected to the rest of the academy graph through explicit edges

A good section groups concepts that:

- Sit at a similar layer of the graph
- Serve a coherent learning goal
- Respect working-memory limits

Sections should usually move from foundations to application. If a later section does not build on earlier ones, either the sectioning is wrong or the graph is missing cross-section prerequisites.

Courses inside an academy should follow the same rule. If course B depends on course A in the real learning sequence, the graph should say so. Do not hide inter-course dependencies behind a catalog order or roadmap page.

This follows the PDF's distinction between knowledge graph and course graph: courses and sections are human-readable compressions of the underlying graph, not substitutes for it (Ch. 4 pp. 72-73).

### Step 5: Check for true foundations

Before authoring knowledge points, perform a structural check:

- For each root concept, ask whether it is genuinely foundational or whether it should itself depend on something earlier
- For each trunk concept, ask whether it is too broad and should be split into smaller concepts
- For each leaf concept, ask whether it goes far enough up the graph or whether there is a missing capstone above it

Use the multiplication/addition test:

- If concept B cannot be learned, practiced, or explained without concept A, then A is more foundational and should sit below B
- Example: you cannot do multiplication without addition; multiplication must not appear as a root if addition is in scope

Chapter 16 is the reference model for this review. The PDF explicitly uses multiplication as a component skill in long division and exponentiation to show how later learning should reinforce earlier knowledge and reveal weak foundations when structure is wrong (pp. 241-243).

This check matters more than matching the document's chapter order. The source may present material in a linear way that hides the real dependency structure.

### Step 6: Author the YAML skeleton first

Write the course YAML in two passes.

Pass 1: graph skeleton only

- academy / course structure (if applicable)
- `course`
- `sections`
- `concepts`
- `prerequisites`
- `encompassing`
- metadata (`difficulty`, `estimatedMinutes`, `tags`, `sourceRef`)

Pass 2: instructional content

- `knowledgePoints`
- `instruction`
- `instructionContent`
- `workedExample`
- `workedExampleContent`
- `problems`

This keeps structural thinking separate from content writing.

The PDF supports this split. Chapter 14 describes lessons as finely scaffolded sequences of knowledge points, each with a worked example and mastery checks before progressing. That implies the graph should exist first, and the instruction should be authored to fit that structure second (pp. 217-223).

### Step 7: Add encompassing edges only after prerequisites are stable

Do not guess encompassing edges before the prerequisite graph is sound.

Add encompassing edges only when practicing the advanced concept genuinely rehearses the earlier one as a subskill. If that relationship is weak or incidental, omit it.

This follows Chapter 4's distinction between prerequisites and encompassings: encompassed topics are usually prerequisites, but prerequisites are often not fully encompassed. Do not treat these as interchangeable edges (pp. 77-79).

### Step 8: Run a review-agent pass

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

The review agent must explicitly ask:

- "Is this foundational, or can it go further up?"
- "What breaks downstream if this concept is missing?"
- "Would a student who mastered the stated prerequisites actually be ready for this?"
- "Is this branch big enough or independent enough to deserve its own course?"
- "If this becomes its own course, do we still preserve the real prerequisite and layering structure across courses?"
- "Is this lesson small-step enough to be learnable in audio form, or did the first agent pack multiple ideas into one KP?"
- "Do the practice explanations provide reactive feedback that tells the learner what to fix next?"

The review outcome should be one of:

- `approved`
- `approved with edge adjustments`
- `approved with lesson split adjustments`
- `rewrite graph structure before authoring KPs`
- `rewrite KPs before shipping`

The review agent should evaluate the graph against the PDF's core claims:

- Chapter 13: students should only be advanced to topics for which they have demonstrated prerequisite mastery, and alternative frontier topics should remain available if one branch stalls (pp. 210-212)
- Chapter 14: steps should be small enough to avoid cognitive overload; oversized concepts should be split (pp. 217-219)
- Chapter 16: advanced topics should strengthen earlier knowledge through layering rather than bypass it (pp. 241-244)

### Step 9: Only then write or expand knowledge points

Once the review pass approves the graph, the agent can continue with KPs, examples, and problems. Do not invest heavily in content before the graph is structurally sound.

### Step 10: Author every knowledge point in the lesson pattern

Every fully-authored knowledge point should follow this pattern:

1. `instruction` — the core explanation that can stand on its own in audio form
2. `instructionContent` — optional but strongly recommended visual/reference blocks that support the instruction
3. `workedExample` — a concrete walkthrough when the idea benefits from one
4. `workedExampleContent` — optional supporting image, link, video, or callout for the example
5. `problems` — the actual practice session for that knowledge point

Important constraint: `instruction` and `workedExample` should remain readable as plain text because they also power audio. Put screenshots, diagrams, external references, and video links in the structured `*Content` blocks instead of burying URLs inside the prose.

Lesson-quality rules:

- Do not optimize for the shortest possible course or the fewest possible KPs. Optimize for successful mastery through enough scaffolding, examples, and reactive feedback.
- Fully-authored concepts should usually have 2-4 KPs. One oversized KP is almost always worse than two smaller KPs.
- Each KP should teach one load-bearing move, contrast, or case. If the prose has to cover definition + why it matters + tradeoffs + caveats + operational pattern, split it.
- KPs must increase in difficulty in small steps. The learner should move from recognition -> guided application -> judgment / transfer, not from definition straight to edge cases.
- Treat `problems` + `explanation` as reactive feedback. Wrong-answer explanations should diagnose the likely misconception and tell the learner what rule, distinction, or prerequisite to revisit.
- If a concept still reads like a short chapter instead of a staircase, stop and split it before polishing prose.
- See the "Content Quality Rules" section below for detailed formatting and variant-depth requirements.

### Step 11: Run a content review before calling the course done

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
- KPs must form an increasing-difficulty staircase: recognition → guided application → judgment / transfer.
- If a concept still reads like a short chapter instead of a staircase, stop and split it before polishing prose.

### Problem variant depth

- Every concept should have at least 3-4 distinct problem variants per KP that has problems.
- Problems testing the same concept must use different angles, scenarios, or framings — not the same question with reshuffled options.
- Section exams draw from the concept's problem pool. If the pool has only 1-2 questions, the learner will see the same questions on retakes, which defeats the purpose.
- Problem types should vary: mix multiple choice, true/false, scenario-based, fill-in-the-blank, ordering, and matching where appropriate.
- Wrong-answer explanations must diagnose the likely misconception and tell the learner what to fix — they are reactive feedback, not just "that's wrong."

### Callout and reference blocks

- Use `instructionContent` blocks for visual aids, external links, and callouts.
- Every concept where a diagram, screenshot, or reference link would materially help understanding should have at least one `instructionContent` block.
- Callout blocks should highlight key rules, common mistakes, or memory aids — not repeat the instruction.
- Link blocks should point to authoritative external resources that the learner can use for deeper exploration.

## 1. Create the Organization & Brand

Every course belongs to an organization, and every org needs a brand to be visible in the app.

### Step 1: Create the org in the database

```bash
cd backend
bun -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.organization.create({
  data: { slug: 'my-org-slug', name: 'My Org Name', niche: 'my-niche' }
}).then(org => { console.log('Created org:', org.id, org.slug); prisma.\$disconnect(); });
"
```

Note the UUID — you'll need it for the import step.

### Step 2: Add a brand config

Three files need updating:

**`apps/web/src/lib/brand/defaults.ts`** — Add a new brand config:

```typescript
export const myBrand: BrandConfig = {
  id: "my-brand",
  name: "My Brand Name",
  domain: "mybrand.audio",
  tagline: "Tagline here",
  logoUrl: "/images/logo-firefighter.svg",  // reuse or add your own
  faviconUrl: "/favicon.ico",
  ogImageUrl: "/images/og-firefighter.png",
  orgId: "my-org-slug",  // must match the org slug from step 1

  theme: { /* copy from an existing brand and customize */ },
  landing: { /* hero, features, howItWorks, faq */ },
  seo: { /* title, description, keywords */ },
  pricing: { monthly: 0, yearly: 0, currency: "USD", trialDays: 0 },
  contentScope: { courseIds: [] },
};
```

**`apps/web/src/lib/brand/resolve.ts`** — Register the brand:

```typescript
import { ..., myBrand } from "./defaults";

// Add to brandsByDomain:
["mybrand.audio", myBrand],

// Add to brandsById:
["my-brand", myBrand],
```

**`apps/web/src/components/dev/brand-switcher.tsx`** — Add to the BRANDS array:

```typescript
{ id: "my-brand", name: "My Brand Name", emoji: "🎯", orgId: "my-org-slug" },
```

## 2. Create the YAML File

Add a new file at `content/courses/<course-slug>.yaml`. Use kebab-case for the filename.

Reference existing courses for patterns:
- `ny-real-estate-salesperson.yaml` — law/regulation-heavy content
- `ab-nfpa-1001-firefighter-i.yaml` — skills/standards-based content
- `electrical-nec/course.yaml` — technical exam prep
- `posthog-tam-onboarding.yaml` — multi-section technical onboarding

### Minimal Structure

```yaml
course:
  id: my-course-slug          # kebab-case, globally unique
  name: "Course Name"
  description: "One-line description"
  estimatedHours: 40
  version: "2024.1"
  sourceDocument: "Official Source Document"

# Optional: organize concepts into named sections
sections:
  - id: fundamentals
    name: "Fundamentals"
    description: "Core concepts everyone should know"
    sectionExam:
      enabled: true
      passingScore: 0.75
      timeLimitMinutes: 12
      questionCount: 6
      blueprint:
        - conceptId: concept-slug
          minQuestions: 2
      instructions: "Show that you can apply this section without guided scaffolding."
  - id: advanced
    name: "Advanced Topics"
    description: "Builds on the fundamentals"

concepts:
  - id: concept-slug
    name: "Concept Name"
    section: fundamentals      # references a section id (optional)
    difficulty: 5              # 1-10
    estimatedMinutes: 15
    tags: [topic-tag]
    sourceRef: "Section 4.2"
    prerequisites: []          # other concept IDs from this course
    encompassing: []           # [{concept: other-id, weight: 0.7}]
    knowledgePoints:
      - id: kp-slug
        instruction: "Markdown explanation text"
        instructionContent:
          - type: image
            url: "https://posthog.com/images/products/data-warehouse/screenshot-data-warehouse.png"
            alt: "Data warehouse interface showing synced tables and queries"
            caption: "Use visuals to anchor the explanation in a real interface"
            width: 960
          - type: link
            url: "https://posthog.com/docs/data-warehouse"
            title: "Data warehouse docs"
            description: "Reference link for deeper reading"
        workedExample: "Step-by-step example (optional)"
        workedExampleContent:
          - type: callout
            title: "Why this example matters"
            body: "Use a callout to highlight the exact decision or mental model the learner should notice."
        problems:
          - id: prob-1
            type: multiple_choice
            question: "What is X?"
            options: ["A", "B", "C", "D"]
            correct: 0
            explanation: "Because..."
            difficulty: 3      # 1-5, optional
```

### Recommended authoring order inside the YAML

When creating a new course file, write it in this order:

1. `course`
2. `sections`
3. `concepts` with `id`, `name`, `section`, `difficulty`, `estimatedMinutes`, `tags`, `sourceRef`
4. `prerequisites`
5. `encompassing`
6. `knowledgePoints`

That order forces the graph to exist before the prose.

### Knowledge point authoring pattern

Treat each knowledge point as a small lesson:

- `instruction`: the learner-facing explanation in plain language
- `instructionContent`: structured support material
- `workedExample`: a concrete walkthrough if needed
- `workedExampleContent`: optional support material for the example
- `problems`: the practice session for that KP

Supported content block types:

| Field | Purpose |
|------|---------|
| `image` | Screenshot or diagram with `alt`, optional `caption`, optional `width` |
| `video` | External walkthrough or demo link with `title` and optional `caption` |
| `link` | Supporting doc/reference link with `title` and optional `description` |
| `callout` | Short note that highlights a key takeaway or common mistake |

Authoring rules:

- Keep `instruction` and `workedExample` as plain text first. They should still make sense without the visual.
- Use `instructionContent` for real screenshots, diagrams, and references. Do not dump raw URLs into the prose.
- Size images intentionally. Use widths that keep screenshots readable on desktop without overwhelming mobile.
- Prefer one strong visual over a gallery of weak ones.
- If a section is highly abstract, a `callout` or `link` is acceptable when no useful visual exists.
- Split aggressively when needed. If a KP has to introduce the term, explain the design rule, compare alternatives, and cover pitfalls, it should become multiple KPs.
- Design the KPs as a staircase: first recognition, then direct application, then troubleshooting / transfer.
- Explanations should be corrective feedback. Tell the learner what distinction they missed and what to look for next time.

### Sections

Sections are optional but recommended for courses with 10+ concepts. They group concepts visually in the UI and help students navigate large courses.

- Define sections in the `sections` array with `id`, `name`, and optional `description`
- If a section should gate progression, add `sectionExam` with `passingScore`, `questionCount`, and a `blueprint`
- Reference a section from each concept using the `section` field
- Sections display in `sortOrder` (array order)
- Concepts without a `section` field appear at the end, unsectioned
- All concept prerequisites still work across section boundaries
- Every section exam blueprint concept must belong to that section, and `questionCount` must cover the blueprint minimums

#### How to design sections

Sections are compressed views of the prerequisite graph — they should mirror how the knowledge frontier naturally progresses through the course. The principles below are grounded in *The Math Academy Way* (Skycak, 2026) and the [content authoring guidelines](../content/README.md).

**Principle 1: The knowledge graph is the ultimate source of truth.**

*The Math Academy Way* Ch 4 (pp. 69-80) establishes the foundational idea: **the knowledge graph IS the curriculum.** Everything else — sections, topic labels, course descriptions — is just a compressed summary for human consumption. The graph is what the learning engine uses to decide what to teach next.

The book defines the graph simply: topics (nodes) connected by prerequisite edges (arrows). "Each linkage between topics indicates a relationship between them, such as one topic being a prerequisite for another" (p69). "The arrows point along potential 'learning paths' that the student can follow" (p69).

This means: **getting the prerequisite edges right is the single most important thing a course author does.** If the edges are wrong, the learning paths are wrong, the knowledge frontier is wrong, and the student's experience is wrong. Everything downstream — mastery enforcement (Ch 13, p207), the knowledge frontier / Zone of Proximal Development (Ch 13, p212), cognitive load minimization (Ch 14, p217), layering and structural integrity (Ch 16, p241) — depends on correct prerequisite edges.

**How to determine prerequisites:** For every concept, ask: *"What does a student need to already understand to learn this?"* The book describes "key prerequisites" (Ch 4, p75) as "the prerequisite knowledge that is most directly being used in that knowledge point." Be specific — don't just think at the topic level ("data modeling"), think at the knowledge level ("to understand how a data pipeline stores data, you need to understand what a primary key is").

**The most common mistake is making concepts independent when they're actually dependent.** If two concepts seem like different "topics" but one builds on the knowledge from the other, they need a prerequisite edge. Example: "Data Models" and "Data Pipelines" seem like parallel topics, but pipelines move *entities* through *storage layers* using *keys* — all modeling concepts. Without the cross-topic prerequisite edges, the graph treats them as independent, students can start pipelines without understanding models, and the knowledge frontier expands in the wrong direction.

**Cross-topic prerequisites are essential, not optional.** They're what create the layering structure (Ch 16, pp. 241-243) that produces structural integrity: "continually acquiring new knowledge that exercises prerequisite or component knowledge... causes existing knowledge to become more ingrained, organized, and deeply understood."

**The graph visualization is your truth test.** The graph renders concepts by prerequisite depth — roots at the bottom, advanced concepts at the top. If a concept appears at the wrong tier, it's missing a prerequisite. If two concepts appear at the same tier but one should come before the other, there's a missing edge. The graph never lies — if the visual structure doesn't match your intended learning flow, the prerequisites are incomplete.

"The knowledge graph is the ultimate source of truth; a course graph simply summarizes and communicates information about the high-level structure of a knowledge graph so that humans can understand it" (Ch 4, p73). Sections are the course graph. They summarize. The prerequisite edges are what actually matters.

Sections have internal prerequisite structure (concepts within a section depend on each other — that's normal). The sections themselves should form a forward-flowing DAG: section B can depend on section A, but not the reverse. The section DAG is a compressed view of the knowledge graph and should tell you the learning flow at a glance:

```
data-modeling-basics → data-modeling-design → pipeline-basics → pipeline-architecture → posthog-data-model → ...
```

**Principle 2: Smaller foundational sections = faster mastery (the learning staircase).**

*The Math Academy Way* Ch 14 (pp. 217-224) introduces the **learning staircase**: "Learning is like climbing a staircase. Each step is a learning task — the higher the step, the more advanced the topic is. However, different students have different stair-climbing abilities, and many students never make it to the top because they get stuck at individual stairs that are too tall for them to climb."

"Math Academy's solution is to split individual stairs into even smaller stairs so that all students can climb them. The smaller we make the individual stairs, the more students can climb all the way to the top." (p217)

In technical terms, this is **minimizing cognitive load** — "the amount of working memory that is required to complete a task" (p217). Working memory capacity has been shown to be a better predictor of academic success than IQ (Alloway & Alloway, 2010, cited on p218).

Applied to sections: **foundational sections (those that other sections depend on) should be the smallest.** If your "Fundamentals" section has 7 concepts, it's one big stair. Split it into two sections of 3-4 concepts — two smaller stairs that more students can climb. Foundations matter most because students who get stuck on foundations get stuck on everything downstream.

As the course progresses toward applied/specialized topics, sections can be slightly larger because students have more accumulated schema to draw on. The book calls this the **expertise reversal effect** (p222): "the instructional techniques that promote the most learning in beginners, promote the least learning in experts, and vice versa." Heavy scaffolding helps beginners but can hinder experts.

**Principle 3: Sections should produce structural integrity through layering.**

*The Math Academy Way* Ch 16 (pp. 241-245) defines **layering** as "continually building on top of existing knowledge — continually acquiring new knowledge that exercises prerequisite or component knowledge." The book identifies two forms of facilitation:

- **Retroactive facilitation**: learning a new topic reinforces memory of prerequisites "to the same extent as identical repetition of the prior task" (Ausubel, Robbins, & Blake, 1957; Arzi, Ben-Zvi, & Ganiel, 1985)
- **Proactive facilitation**: knowledge from prerequisites "can improve the acquisition of knowledge that is specific to the new task" (Arzi, Ben-Zvi, & Ganiel, 1985)

This means layering isn't just nice-to-have — it actively strengthens foundations AND accelerates new learning. But it only works if the prerequisites are actually correct. The book is explicit: "Math Academy's curriculum is intentionally structured so that earlier topics are applied and reinforced in higher-level topics" (p243). If a later section doesn't exercise earlier sections, layering breaks down and students lose the compounding benefit.

**Structural integrity** (p242): "When advanced features are built on top of a system, they sometimes fail in ways that reveal previously-unknown foundational weaknesses. This forces engineers to fortify the underlying structure." Applied to learning: a well-connected knowledge graph ensures that weaknesses in foundations are revealed and remediated as the student advances, rather than accumulating silently.

The test: *Does mastering section N exercise knowledge from sections 1 through N-1?* If yes, layering is working. If not, the sections may be disconnected — check for missing cross-section prerequisites.

**Principle 4: Respect working memory limits (3-5 concepts per section).**

The [content authoring guidelines](../content/README.md) cap direct prerequisites at 3-4 per concept because of working memory constraints (~4 chunks). The same principle applies to sections — a student looking at a section should be able to hold its full scope in their head.

**Principle 5: Name sections by capability, not topic.**

A section name should answer "what can I do after completing this?" not just "what topic is this about?"

- Bad: "Data Modeling" (too vague)
- Good: "Data Modeling Basics — Entities, Attributes & Keys" (I can identify and describe data entities)
- Good: "Data Modeling Design — Relationships & Cardinality" (I can design how entities connect)

#### Section design process

1. **Draw the prerequisite graph.** Identify root concepts (no prerequisites), and trace the DAG forward. Identify independent streams (parallel roots with no cross-dependencies).
2. **Identify natural tiers.** Group concepts by prerequisite depth and topic coherence — what can be learned at roughly the same stage? Independent streams at the same depth become separate sections.
3. **Add capstone prerequisites to enforce section ordering.** If section B should come after section A, make sure at least one concept in B has a prerequisite on a concept in A — ideally the *last* concept in A (the "capstone"). Without this, the knowledge graph will show concepts from B at the same tier as concepts from A, because the graph only knows about direct prerequisites, not section intent. See the example below.
4. **Verify the section DAG flows forward.** Cross-section prerequisites should only point from earlier sections to later ones. Run the verification script (see below) to check.
5. **Check for orphaned foundations.** Every foundational concept should be transitively required by at least one applied concept. If a foundational concept is orphaned (nothing downstream requires it), the graph doesn't enforce learning it. Add a prerequisite from the appropriate applied concept.
6. **Size-check each section.** Use the table below. Foundational sections should lean toward the smaller end (3-4 concepts).
7. **Verify layering.** Does each section exercise knowledge from prior sections? If not, reconsider the ordering.

**Example 1: cross-topic prerequisites.** "Data Pipelines" concepts need "Data Modeling" concepts as prerequisites — you can't understand how data moves without understanding what data is. `what-is-a-pipeline` should require `entities`. `storage-layers` should require `keys-and-identity` (you need to understand how data is identified before understanding how it's stored). Without these cross-topic prerequisites, the graph shows models and pipelines as parallel roots at the same tier — which tells students they can learn either one first, when in reality models must come first.

**Example 2: capstone prerequisites.** Suppose you have a "Data Modeling" section (ending with `data-modeling-process`) and a "PostHog Data Model" section (starting with `ph-events`). If `ph-events` only requires `entities` and `attributes` (early modeling concepts), the graph will show `ph-events` at the same tier as mid-level foundations. Fix: add `data-modeling-process` as a prerequisite to `ph-events`. This creates a "bridge" that enforces "finish all modeling before starting PostHog."

**How to catch these issues:** After building the graph, look at the visualization. If a concept appears at the same tier as something that should come before it, it's missing a prerequisite. The graph never lies — if the visual structure doesn't match your intended learning flow, the prerequisites are incomplete.

To verify section DAG flow, run:
```bash
cd backend && bun -e "
const yaml = require('js-yaml'), fs = require('fs');
const data = yaml.load(fs.readFileSync('../content/courses/YOUR-COURSE.yaml', 'utf8'));
const cs = {}; for (const c of data.concepts) cs[c.id] = c.section;
const so = {}; data.sections.forEach((s, i) => so[s.id] = i);
let ok = true;
for (const c of data.concepts) {
  for (const p of (c.prerequisites || [])) {
    if (cs[p] && cs[p] !== c.section && so[cs[p]] > so[c.section]) {
      console.log('BACKWARD: ' + c.section + ' depends on ' + cs[p]);
      ok = false;
    }
  }
}
if (ok) console.log('All section dependencies flow forward');
"
```

#### Section sizing checklist

| Concepts in section | Action |
|---------------------|--------|
| 1-2 | Consider merging with an adjacent section |
| 3-5 | Ideal size — aim for 3-4 on foundational sections |
| 6-7 | Split if concepts naturally group into two learning goals |
| 8+ | Must split — too much for one section |

#### References

- Skycak, J. (2026). *The Math Academy Way: Using the Power of Science to Supercharge Student Learning.* Working Draft. (`math-academy-way.pdf` in repo root)
  - Ch 4: Knowledge Graph — course graphs as compressed DAGs (pp. 69-80)
  - Ch 13: Mastery Learning — knowledge frontier as Zone of Proximal Development (pp. 207-214)
  - Ch 14: Minimizing Cognitive Load — the learning staircase, micro-scaffolding (pp. 217-224)
  - Ch 16: Layering — facilitation, structural integrity, how layering reinforces foundations (pp. 241-245)
- [Content Authoring Guide](../content/README.md) — concept granularity, prerequisite limits
- [Adaptive Learning Architecture](./adaptive-learning-architecture.md) — knowledge graph design, task selection algorithm

### Problem Types

| Type | `options` | `correct` |
|------|-----------|-----------|
| `multiple_choice` | 4 string options | Index (0-based) |
| `fill_blank` | — | String answer |
| `true_false` | — | `true` or `false` |
| `ordering` | 4-6 steps | Comma-separated correct order |
| `matching` | Pairs | Correct mapping |
| `scenario` | Varies | Varies |

### Choosing the right interaction

Default to structured interactions. This product is audio-first, mobile-heavy, and the current `fill_blank` evaluator is only a normalized string match (trim + lowercase, with optional exact alternatives). It does not do semantic grading.

That means `fill_blank` should be rare. Use it only when the student answer is:

- Very short
- Canonical
- Easy to type on mobile
- Easy to grade with exact-match rules

Good uses of `fill_blank`:

- Math or calculation answers with a single expected value
- One-word technical terms with limited, explicitly listed alternatives
- Short codes, acronyms, symbols, or section references where the exact string matters

Avoid `fill_blank` for:

- Definition recall in the student's own words
- Sentence completion where several phrasings would be reasonable
- Conceptual diagnostics that are really asking "do you understand this idea?"
- Any prompt where typing burden is higher than the learning value

If the question is testing recognition, discrimination, or applied judgment, rewrite it as `multiple_choice`, `true_false`, `matching`, `ordering`, or `scenario` instead.

Bad `fill_blank` example:

- "Backend PostHog SDKs do not auto-generate a distinct_id — you must ___ one on every capture call."

Better rewrites:

- `multiple_choice`: "What must backend SDK users provide on every capture call?" with plausible distractors
- `true_false`: "Backend PostHog SDKs auto-generate `distinct_id` values for you."
- `scenario`: "You are instrumenting a backend worker. What identifier must you send with each event?"

Rule of thumb: if a human reviewer would accept 3+ materially different phrasings as correct, do not use `fill_blank`.

### Practice sessions

In this product, the authored `problems` on a knowledge point are the practice session for that lesson step. Write them as a progression, not as a random pile:

1. Start with recognition or core discrimination
2. Move to applied judgment or sequencing
3. End with a scenario when the concept is operational or customer-facing

Quality bar:

- Minimum 2 problems per fully-authored KP
- Prefer 3 when the concept has operational nuance
- Include at least one problem that checks transfer or diagnosis, not just vocabulary
- Distractors should reflect realistic TAM misunderstandings
- If the learner misses a problem, the explanation should teach, not just reveal the answer
- Across a concept's KPs, difficulty should ratchet upward. Do not keep all problems at the same recognition level.

### Authoring Guidelines

See [`content/README.md`](../content/README.md) for detailed guidelines on:
- Concept granularity (one teachable idea per concept)
- Prerequisite limits (max 3-4 direct per concept)
- Encompassing weights (1.0 = full, 0.5-0.7 = substantial, 0.2-0.4 = partial)
- Knowledge point structure (1-4 per concept, progressively harder)
- Problem quality (plausible distractors, test understanding not recall)
- Tag conventions and source references

## 3. Validate the Schema

The Zod schema lives at `backend/src/knowledge-graph/schemas/course-yaml.schema.ts`. The importer validates:

- All required fields present
- No cycles in the prerequisite graph
- All referenced concept IDs exist within the course
- All referenced section IDs exist in the `sections` array
- Encompassing weights between 0.0 and 1.0
- Difficulty 1-10 for concepts, 1-5 for problems
- Problem type is a valid enum value

Concepts without knowledge points are imported as graph structure only — they won't appear to students until KPs are added.

## 4. Import the Course

### Option A: Progress-safe CLI import (recommended)

```bash
cd backend
bunx ts-node scripts/load-course.ts \
  --orgId <org-uuid> \
  --file ../content/courses/my-course.yaml
```

Re-running performs an in-place replace keyed by stable slugs. Existing concept UUIDs and learner progress are preserved when the same slugs remain in the YAML.

If you intentionally retired content and want the importer to archive anything missing from the new YAML instead of rejecting the update, add:

```bash
--archiveMissing true
```

That archives removed sections, concepts, and KPs in place. Historical learner state is preserved on the archived rows, while active learners only see the current course graph.

### Option B: Quick import alias

```bash
cd backend
bun scripts/import-course-quick.ts \
  --orgId <org-uuid> \
  --file ../content/courses/my-course.yaml
```

This now uses the same progress-safe replace path as `load-course.ts`. It no longer deletes and recreates the course.

### Option C: REST API

```
POST /orgs/:orgId/courses/import
Content-Type: application/json

{
  "yaml": "<raw YAML content>",
  "replace": true,
  "archiveMissing": false
}
```

Requires `admin` role on the org.

### Option D: Seed Script

For demo/dev environments, create a script in `scripts/` following the pattern in `scripts/seed-electrical.ts`. This can create the org, load the YAML, and set up a subscription in one step.

## 4.1 Progress-Safe Course Evolution

Once a course has learners, treat concept identity as durable infrastructure.

- Never rename or delete `course.id`, section `id`, concept `id`, or knowledge point `id` casually. Stable slugs are how the importer preserves UUID-backed learner state.
- Safe updates are:
  - revising prose, examples, problems, media, metadata, and source refs in place
  - adding new concepts, sections, or KPs with new slugs
  - adjusting prerequisite or encompassing edges for existing slugs
- Unsafe updates are:
  - removing a section, concept, or KP from the YAML
  - renaming an existing slug to a new slug
  - using a script that deletes and recreates the course
- The importer now blocks destructive replace imports by default. When you deliberately need to retire content, use `archiveMissing: true` so the removed nodes are archived instead of deleted.

Operational rule:

1. Keep the old slug if the learner's mental model is still the same concept and you are just improving the lesson.
2. Add a new slug only when you are introducing genuinely new learnable content.
3. If content is obsolete, deprecate it in place first, then archive it with the importer so old learner records remain attached to the retired UUIDs.

This preserves prior mastery and lets current students continue through improved course content without resetting their progress graph.

## 5. Verify

After importing, the CLI outputs stats:

```
Imported: 4 sections, 50 concepts, 120 knowledge points, 340 problems, 65 prerequisite edges, 28 encompassing edges
```

Then verify in the app:
1. Start dev servers: `bun run dev`
2. Open the brand switcher and switch to your new brand
3. Sign up / sign in
4. Browse courses — your new course should appear
5. Click into it — sections and concepts should display correctly
6. Start a lesson — confirm instruction, supporting content, and practice problems all appear in the intended order

## Checklist

- [ ] Org created in database
- [ ] Brand config added (`defaults.ts`, `resolve.ts`, `brand-switcher.tsx`)
- [ ] YAML file written and passes Zod validation
- [ ] Course imported into the correct org
- [ ] Replace import path used for updates; no delete-and-recreate workflow
- [ ] Existing section/concept/KP slugs preserved unless a deliberate migration exists
- [ ] Visible in the app under the correct brand
- [ ] Each fully-authored KP includes instruction, practice, and any necessary content blocks
- [ ] Content review completed before calling the course done

## Key Files

| File | Purpose |
|------|---------|
| `content/README.md` | Authoring guidelines |
| `backend/src/knowledge-graph/schemas/course-yaml.schema.ts` | Zod schema (source of truth) |
| `backend/src/knowledge-graph/course-importer.service.ts` | YAML-to-DB importer |
| `backend/scripts/load-course.ts` | Progress-safe CLI import tool |
| `backend/scripts/import-course-quick.ts` | Alias to the progress-safe CLI import path |
| `backend/prisma/schema.prisma` | Database schema |
| `apps/web/src/lib/brand/defaults.ts` | Brand configs |
| `apps/web/src/lib/brand/resolve.ts` | Brand registry |
| `apps/web/src/components/dev/brand-switcher.tsx` | Dev brand switcher |
