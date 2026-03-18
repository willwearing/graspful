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

### Step 4: Convert the graph into sections

Once the prerequisite graph is coherent, compress it into:

- `course` -> high-level container
- `sections` -> major tiers or capability clusters
- `concepts` -> graph nodes inside those sections

Sections are not the source of truth. They are a human-readable compression of the graph. A good section groups concepts that:

- Sit at a similar layer of the graph
- Serve a coherent learning goal
- Respect working-memory limits

Sections should usually move from foundations to application. If a later section does not build on earlier ones, either the sectioning is wrong or the graph is missing cross-section prerequisites.

This follows the PDF's distinction between knowledge graph and course graph: sections are a human-readable compression of the underlying graph, not a substitute for it (Ch. 4 pp. 72-73).

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

- `course`
- `sections`
- `concepts`
- `prerequisites`
- `encompassing`
- metadata (`difficulty`, `estimatedMinutes`, `tags`, `sourceRef`)

Pass 2: instructional content

- `knowledgePoints`
- `instruction`
- `workedExample`
- `problems`

This keeps structural thinking separate from content writing.

The PDF supports this split. Chapter 14 describes lessons as finely scaffolded sequences of knowledge points, each with a worked example and mastery checks before progressing. That implies the graph should exist first, and the instruction should be authored to fit that structure second (pp. 217-223).

### Step 7: Add encompassing edges only after prerequisites are stable

Do not guess encompassing edges before the prerequisite graph is sound.

Add encompassing edges only when practicing the advanced concept genuinely rehearses the earlier one as a subskill. If that relationship is weak or incidental, omit it.

This follows Chapter 4's distinction between prerequisites and encompassings: encompassed topics are usually prerequisites, but prerequisites are often not fully encompassed. Do not treat these as interchangeable edges (pp. 77-79).

### Step 8: Run a review-agent pass

After the authoring agent finishes the YAML skeleton, a second agent should review the graph abstractly before the course is treated as ready.

The review agent should check:

1. Are the roots truly foundational?
2. Does every non-root concept have the minimum necessary prerequisites?
3. Are any concepts placed too low that should be higher up as later capstones?
4. Are any concepts placed too high that actually require earlier foundations?
5. Are there missing cross-branch edges where one branch quietly depends on another?
6. Do sections reflect the graph, or are they hiding a broken graph?
7. Does the course create a clear root -> trunk -> branch -> leaf progression?

The review agent must explicitly ask:

- "Is this foundational, or can it go further up?"
- "What breaks downstream if this concept is missing?"
- "Would a student who mastered the stated prerequisites actually be ready for this?"

The review outcome should be one of:

- `approved`
- `approved with edge adjustments`
- `rewrite graph structure before authoring KPs`

The review agent should evaluate the graph against the PDF's core claims:

- Chapter 13: students should only be advanced to topics for which they have demonstrated prerequisite mastery, and alternative frontier topics should remain available if one branch stalls (pp. 210-212)
- Chapter 14: steps should be small enough to avoid cognitive overload; oversized concepts should be split (pp. 217-219)
- Chapter 16: advanced topics should strengthen earlier knowledge through layering rather than bypass it (pp. 241-244)

### Step 9: Only then write or expand knowledge points

Once the review pass approves the graph, the agent can continue with KPs, examples, and problems. Do not invest heavily in content before the graph is structurally sound.

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
        workedExample: "Step-by-step example (optional)"
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

### Sections

Sections are optional but recommended for courses with 10+ concepts. They group concepts visually in the UI and help students navigate large courses.

- Define sections in the `sections` array with `id`, `name`, and optional `description`
- Reference a section from each concept using the `section` field
- Sections display in `sortOrder` (array order)
- Concepts without a `section` field appear at the end, unsectioned
- All concept prerequisites still work across section boundaries

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

### Option A: Quick import with bun (recommended)

```bash
cd backend
bun scripts/import-course-quick.ts \
  --orgId <org-uuid> \
  --file ../content/courses/my-course.yaml
```

Idempotent — re-running replaces the existing course data.

### Option B: REST API

```
POST /orgs/:orgId/courses/import
Content-Type: application/json

{
  "yaml": "<raw YAML content>"
}
```

Requires `admin` role on the org.

### Option C: Seed Script

For demo/dev environments, create a script in `scripts/` following the pattern in `scripts/seed-electrical.ts`. This can create the org, load the YAML, and set up a subscription in one step.

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

## Checklist

- [ ] Org created in database
- [ ] Brand config added (`defaults.ts`, `resolve.ts`, `brand-switcher.tsx`)
- [ ] YAML file written and passes Zod validation
- [ ] Course imported into the correct org
- [ ] Visible in the app under the correct brand

## Key Files

| File | Purpose |
|------|---------|
| `content/README.md` | Authoring guidelines |
| `backend/src/knowledge-graph/schemas/course-yaml.schema.ts` | Zod schema (source of truth) |
| `backend/src/knowledge-graph/course-importer.service.ts` | YAML-to-DB importer |
| `backend/scripts/import-course-quick.ts` | Quick CLI import tool |
| `backend/prisma/schema.prisma` | Database schema |
| `apps/web/src/lib/brand/defaults.ts` | Brand configs |
| `apps/web/src/lib/brand/resolve.ts` | Brand registry |
| `apps/web/src/components/dev/brand-switcher.tsx` | Dev brand switcher |
