# Course Creation Benchmarks: Manual vs Graspful CLI vs Graspful MCP

How long does it actually take to create a course? This document compares three approaches: building a course manually on a traditional platform (Teachable, Kajabi, etc.), using the Graspful CLI directly, and using the Graspful MCP server through an AI agent like Claude Code or Cursor.

All benchmarks are based on creating a mid-sized certification prep course (30-50 concepts, 80-150 knowledge points, 200-400 practice problems). Times are realistic ranges, not best-case marketing numbers. Your results will vary based on domain complexity, content depth, and the AI model used.

---

## 1. Course Skeleton: From Topic to Structure

The skeleton is the course's knowledge graph: metadata, sections, concepts, prerequisite edges, and difficulty assignments. This is the architectural phase -- getting the structure right before filling in content.

| Approach | Time | What Happens |
|----------|------|-------------|
| **Manual (Teachable/Kajabi)** | 2-4 hours | Click through the platform UI to create modules, lessons, and sections one by one. No prerequisite graph -- just a flat or nested list. Rearranging later means manual drag-and-drop. No validation that the structure makes pedagogical sense. |
| **Graspful CLI** | ~3 seconds | `graspful create course --topic "CKA Exam" --scaffold-only` generates a YAML skeleton with course metadata, sections, concept stubs, and prerequisite edges forming a validated DAG. The output is a starting point, not a finished structure -- you'll review and adjust the graph. |
| **Graspful MCP (via AI agent)** | 1-5 minutes | Agent calls `graspful_scaffold_course` with topic and source material. The agent adds thinking time: analyzing the exam blueprint, deciding concept granularity, mapping prerequisite relationships, and structuring sections. The result is a more thoughtful skeleton than the raw CLI scaffold because the agent applies domain reasoning. |

**Key difference:** On traditional platforms, the "skeleton" is a flat list of modules with no structural validation. On Graspful, it's a directed acyclic graph with prerequisite edges, difficulty ratings, and estimated times -- validated by topological sort before any content is written.

---

## 2. Filling a Concept: Knowledge Points and Practice Problems

Each concept needs 1-4 knowledge points, each with instruction text, worked examples, and practice problems (multiple choice, true/false, fill-in-the-blank). This is where the bulk of authoring time lives.

| Approach | Time per Concept | What Happens |
|----------|-----------------|-------------|
| **Manual (Teachable/Kajabi)** | 30-60 minutes | Research the topic, write lesson text or record a video, create quiz questions one at a time through form fields, write explanations for each answer option, check for consistency. No deduplication check, no difficulty staircase validation. Multiply by 30-50 concepts for the full course. |
| **Graspful CLI** | ~2 seconds | `graspful fill concept course.yaml networking` generates content stubs for one concept -- placeholder instructions, template problems. These are starting points that need human or agent editing, not publish-ready content. Useful for batch-generating stubs across all concepts quickly. |
| **Graspful MCP (via AI agent)** | 1-2 minutes | Agent fills the concept with real content: researched instruction text, worked examples, and practice problems with escalating difficulty (recognition -> application -> judgment/transfer). The agent references the source document, generates explanations for incorrect answers, and ensures problems test different cognitive levels. Quality depends on the AI model and the source material provided. |

**For a 40-concept course:**

| Approach | Total Fill Time |
|----------|----------------|
| Manual | 20-40 hours |
| Graspful CLI (stubs only) | ~80 seconds (but stubs need editing) |
| Graspful MCP (agent-generated content) | 40-80 minutes |

**Caveat:** Agent-generated content for Graspful MCP is not guaranteed to be publish-ready. Complex technical domains (electrical code, medical certifications) require human review of the agent's output for accuracy. The time advantage comes from generating a solid first draft that needs editing, not from eliminating review entirely.

---

## 3. Validation and Review

Catching structural problems, duplicate questions, missing prerequisites, flat difficulty curves, and schema errors before the course reaches learners.

| Approach | Time | What Happens |
|----------|------|-------------|
| **Manual (Teachable/Kajabi)** | Hours (if done at all) | Manual proofreading. No automated checks. No prerequisite validation (prerequisites don't exist in these platforms). No deduplication detection. No difficulty staircase analysis. Quality depends entirely on the creator's diligence. Most creators skip systematic review. |
| **Graspful CLI** | <1 second | `graspful review course.yaml` runs 10 mechanical checks: Zod schema validation, DAG acyclicity, prerequisite completeness, KP count per concept, problem coverage, question deduplication, difficulty staircase, concept sizing, instruction completeness, and cross-concept fact coverage. Returns pass/fail with specific findings and line references. |
| **Graspful MCP (via AI agent)** | 10-20 minutes | Agent runs the mechanical checks (instant), then performs structural review (is the graph well-shaped? are roots truly foundational? are any branches too large?) and content review (do problems escalate? are explanations helpful? is anything duplicated?). The review agent operates as an adversarial checker -- it assumes the first draft has problems until proven otherwise. |

**What the 10 mechanical checks catch that manual review misses:**

1. Circular prerequisites (impossible to detect by eyeballing a 40-concept course)
2. Near-identical questions across different concepts (cross-concept deduplication)
3. Concepts where all problems test the same cognitive level (flat difficulty)
4. Missing instruction text or worked examples
5. Facts tested more than 3 times across the course (over-repetition)
6. Schema violations that would cause import failures
7. Concepts with too many or too few knowledge points
8. Orphan concepts with no prerequisites that should have them
9. Oversized concepts that should be split
10. Missing problem coverage for knowledge points

Traditional platforms catch zero of these automatically.

---

## 4. End-to-End: Topic Idea to Live Course

The complete workflow from "I want a course on X" to "learners can sign up and start learning."

| Approach | Time | Includes |
|----------|------|----------|
| **Traditional platform (Teachable/Kajabi)** | 20-40 hours | Research, content writing, video recording (if applicable), quiz creation, platform setup, landing page design, payment configuration, publishing. No adaptive learning, no knowledge graph, no spaced repetition, no diagnostic assessments. |
| **Graspful + AI agent** | 1-3 hours | Scaffold (minutes) + fill all concepts (40-80 min) + mechanical review (seconds) + agent structural review (10-20 min) + fix issues (10-30 min) + publish (seconds). Includes: validated knowledge graph, adaptive diagnostics, BKT mastery tracking, FIRe spaced repetition, white-label landing page, Stripe billing. |

**The 1-3 hour range for Graspful assumes:**
- A well-scoped domain with available source material (exam blueprint, syllabus, official documentation)
- An AI agent (Claude Code, Cursor, etc.) handling the fill and review phases
- One round of revisions after the review agent flags issues
- The creator reviews and approves the agent's output before publishing

**The range stretches toward 3 hours when:**
- The domain is highly technical and requires careful fact-checking
- The source material is sparse or poorly organized
- Multiple review rounds are needed to get the difficulty staircase right
- The creator wants to manually edit many of the agent-generated explanations

**The range compresses toward 1 hour when:**
- The source material is well-structured (e.g., a clear exam blueprint with numbered objectives)
- The domain is well-represented in the AI model's training data
- The creator trusts the agent's output with light-touch review

---

## 5. Quality Metrics: What Ships

Beyond speed, the quality of what actually ships to learners matters more.

| Quality Metric | Traditional Platforms | Graspful |
|---------------|----------------------|----------|
| **Automated quality checks** | 0 | 10 mechanical checks |
| **DAG validation** | N/A (no prerequisite graph) | Topological sort verifies acyclicity |
| **Schema validation** | N/A (no schema) | Zod validates full YAML structure |
| **Question deduplication** | None | Automatic cross-concept deduplication |
| **Difficulty staircase validation** | None | Per-concept cognitive level verification |
| **Prerequisite enforcement at runtime** | None | BKT mastery gate per concept |
| **Adaptive diagnostic** | None | 20-60 question diagnostic at enrollment |
| **Spaced repetition** | None | FIRe algorithm with encompassing edge credit |
| **Review agent (structural)** | Optional manual review | Adversarial agent review built into workflow |
| **Review agent (content)** | Optional manual review | Separate content review agent with 13 criteria |

**The quality argument is not that Graspful courses are automatically better than manually crafted courses.** A skilled human instructor spending 40 hours on a Teachable course can produce excellent content. The argument is:

1. **Graspful catches structural problems that humans miss** -- circular prerequisites, cross-concept question duplication, flat difficulty curves. These are hard to spot in a 40-concept course by eyeballing.

2. **Graspful delivers adaptive features that traditional platforms cannot** -- every student gets a personalized path, not a linear sequence. This is a fundamentally different learning experience, not an incremental improvement.

3. **Graspful's speed advantage doesn't come from cutting corners.** The 10 mechanical checks, the adversarial review agent, and the structural validation exist precisely because AI-generated content needs quality gates. The workflow is designed to be fast *and* validated, not fast instead of validated.

---

## Methodology and Caveats

These benchmarks reflect realistic ranges based on mid-sized certification prep courses (30-50 concepts). Your actual experience will vary:

- **Domain complexity matters.** A JavaScript fundamentals course is faster to create than an electrical code (NEC) course because the domain is better represented in AI training data and has fewer safety-critical accuracy requirements.

- **Agent model matters.** More capable models (Claude Opus, GPT-4) produce higher-quality first drafts that need less editing. Faster models produce content quicker but may need more revision.

- **Source material quality matters.** A well-structured exam blueprint with numbered objectives maps cleanly to a knowledge graph. A 400-page textbook with no clear hierarchy requires more human judgment in the scaffolding phase.

- **"Traditional platform" times assume a competent creator** who knows the platform UI. First-time users will take longer. Similarly, Graspful times assume the creator (or agent) has the CLI/MCP configured and working.

- **Times for Graspful do not include initial setup** (installing the CLI, configuring MCP, setting up the API key). First-time setup adds 5-10 minutes.

- **Quality review time on traditional platforms is often zero** in practice -- many creators publish without systematic review. The "hours" estimate for manual review assumes a creator who actually does it. Graspful makes review non-optional by building the 10 mechanical checks into the publish workflow.
