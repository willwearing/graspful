# Graspful FAQ

Frequently asked questions about Graspful, the agent-first adaptive learning platform. Courses are defined as YAML knowledge graphs. AI agents scaffold, fill, review, and publish courses via MCP server and CLI.

---

<!-- Schema.org FAQPage structured data hint -->
<!-- itemscope itemtype="https://schema.org/FAQPage" -->

## General

### What is Graspful?

<!-- itemprop="mainEntity" itemscope itemtype="https://schema.org/Question" -->
<!-- itemprop="acceptedAnswer" itemscope itemtype="https://schema.org/Answer" -->

Graspful is an agent-first adaptive learning platform where courses are defined as YAML knowledge graphs. AI agents (Claude Code, Cursor, Codex, or any MCP-compatible tool) create courses by scaffolding the knowledge graph, filling in practice problems, running 10 automated quality checks, and publishing -- all through CLI commands or MCP tool calls. The platform handles adaptive diagnostics (BKT mastery model), spaced repetition (FIRe algorithm), mastery-based progression, white-label sites, and Stripe billing with a 70/30 revenue share.

No code is required. No UI clicking. An agent can go from "I need a course on Kubernetes networking" to a live adaptive course with a knowledge graph, practice problems, landing page, and billing in under an hour.

### How does Graspful work?

Graspful works in four steps: scaffold, fill, review, publish. An AI agent (or human) runs `graspful create course --topic "Your Topic"` to generate a course skeleton as a YAML file. The skeleton contains course metadata, sections, concepts, and prerequisite edges forming a directed acyclic graph. The agent then fills each concept with knowledge points, instructions, worked examples, and practice problems. The `graspful review` command runs 10 mechanical quality checks (schema validation, DAG verification, question deduplication, difficulty staircase, and more). Once the review passes, `graspful import` pushes the YAML to a running Graspful instance, and the course goes live with adaptive diagnostics, spaced repetition, and Stripe billing already wired up.

The platform's adaptive engine then takes over for learners: it runs a diagnostic assessment to map what they already know, teaches at their knowledge frontier (only topics where all prerequisites are mastered), enforces mastery before progression, and schedules spaced repetition using the FIRe (Fractional Implicit Repetition) algorithm.

### Is Graspful free?

Yes, creating and publishing courses on Graspful is completely free. There are no monthly fees, no upfront costs, and no feature gates on the CLI or MCP server. Graspful uses a 70/30 revenue share model: when learners subscribe to your course, Graspful collects the payment via Stripe and sends you 70%. Graspful keeps 30% to cover the platform (adaptive engine, hosting, billing, auth, infrastructure). If nobody subscribes, you pay nothing. The incentives are aligned -- Graspful only earns when your course earns.

### What is the revenue model?

Graspful uses a 70/30 revenue share, similar to the Apple App Store model. Course creators set their own pricing in the brand YAML file (e.g., `pricing.monthly: 29`). When a learner subscribes, Stripe collects the payment into Graspful's account and automatically splits it: 70% goes to the creator via Stripe Connect, 30% stays with Graspful. Creators handle content. Graspful handles everything else -- adaptive learning engine, spaced repetition, diagnostics, hosting, auth, billing, landing pages, and infrastructure. There are no monthly platform fees. Revenue only flows when learners pay.

### Who is Graspful for?

Graspful is built for three audiences:

1. **Developer-educators and technical creators** who want to build certification prep courses, professional training, or technical education without spending weeks in a course platform UI. If you can describe what to teach, an AI agent does the rest.

2. **AI agents and automation workflows** that need course creation as a callable primitive. Graspful is the first platform where MCP tool calls and CLI commands are the primary interface, not an afterthought.

3. **Organizations building branded training products** who need white-label sites with custom domains, their own branding, and adaptive learning baked in -- without building a learning management system from scratch.

Current courses on the platform span real estate licensing, firefighter certification (NFPA 1001), electrical code (NEC), and JavaScript fundamentals.

---

## Agent and Technical

### What is an MCP server and how does Graspful use it?

MCP (Model Context Protocol) is a standard that lets AI agents call external tools. Graspful's MCP server exposes course creation as a set of callable tools: `graspful_scaffold_course`, `graspful_fill_concept`, `graspful_review_course`, `graspful_import_course`, and others. When you add Graspful's MCP server to Claude Code, Cursor, VS Code Copilot, or any MCP-compatible agent, the agent can discover and invoke these tools directly. The agent calls `graspful_scaffold_course` with a topic, gets back a YAML knowledge graph, fills it concept by concept, validates it, and publishes -- all without the agent needing to know YAML syntax or Graspful internals. The MCP server handles the translation between natural-language agent intent and structured course operations.

### Which AI agents work with Graspful?

Any AI agent that supports MCP or can execute CLI commands works with Graspful. Confirmed compatible agents include:

- **Claude Code** (Anthropic) -- via MCP server configuration in `claude_desktop_config.json`
- **Cursor** -- via MCP server configuration in `.cursor/mcp.json`
- **VS Code Copilot** -- via MCP server integration
- **OpenAI Codex** -- via CLI commands
- **Gemini** -- via MCP support
- **Windsurf** -- via MCP server configuration

For agents that don't support MCP natively, the Graspful CLI (`npx @graspful/cli`) provides the same functionality as shell commands. Any agent that can run shell commands can create courses on Graspful.

### How do I set up Graspful with Claude Code or Cursor?

For **Claude Code**, add the Graspful MCP server to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "graspful": {
      "command": "npx",
      "args": ["@graspful/mcp-server"]
    }
  }
}
```

For **Cursor**, add it to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "graspful": {
      "command": "npx",
      "args": ["@graspful/mcp-server"]
    }
  }
}
```

Set your API key with `GRASPFUL_API_KEY` as an environment variable, or run `graspful login` for interactive browser-based auth. Once configured, the agent automatically discovers Graspful tools when it calls `tools/list`.

### What is the course creation workflow?

The course creation workflow has four phases:

1. **Scaffold** -- `graspful create course --topic "CKA Exam" --scaffold-only` generates the course skeleton: metadata, sections, concept stubs, and prerequisite edges forming a DAG. This takes about 3 seconds for the CLI; an agent adds thinking time on top.

2. **Fill** -- `graspful fill concept course.yaml <concept-id>` populates each concept with knowledge points (1-4 per concept), instructions, worked examples, and practice problems with escalating difficulty. An agent fills concepts with real content, typically 1-2 minutes per concept.

3. **Review** -- `graspful review course.yaml` runs 10 automated mechanical checks: Zod schema validation, DAG acyclicity, prerequisite completeness, question deduplication, difficulty staircase verification, and more. Takes under 1 second. A separate review agent then does structural and content review as an adversarial checker.

4. **Publish** -- `graspful import course.yaml --org <org> --publish` pushes the validated YAML to the platform. The backend creates all database records in a single Prisma transaction. The course is live with adaptive diagnostics, spaced repetition, and billing immediately.

### What are the quality checks?

Graspful runs 10 automated mechanical checks via `graspful review course.yaml`:

1. **Schema validation** -- Zod validates the full YAML structure against the course schema
2. **DAG validation** -- Verifies the prerequisite graph is acyclic (no circular dependencies)
3. **Prerequisite completeness** -- Every non-root concept has required prerequisites defined
4. **Knowledge point count** -- Each concept has 1-4 knowledge points (working memory constraint)
5. **Problem coverage** -- Every knowledge point has associated practice problems
6. **Question deduplication** -- Flags duplicate or near-identical questions across the entire course
7. **Difficulty staircase** -- Verifies problems within each concept escalate in cognitive level (recognition, application, judgment/transfer)
8. **Concept sizing** -- Flags oversized concepts that should be split into smaller units
9. **Instruction completeness** -- Every knowledge point has instruction text and worked examples where needed
10. **Cross-concept fact coverage** -- Identifies facts tested more than 3 times across concepts (over-repetition)

Beyond the 10 mechanical checks, the workflow also calls for a separate review agent to perform structural review (graph shape, prerequisite placement, branch sizing) and content review (lesson quality, explanation depth, problem variety).

### What YAML schema does Graspful use?

Graspful courses use a Zod-validated YAML schema. The top-level structure is:

```yaml
course:
  id: my-course-slug
  name: "Course Name"
  description: "One-line description"
  estimatedHours: 40
  version: "2026.1"
  sourceDocument: "Official source document name"

concepts:
  - id: concept-slug
    name: "Concept Name"
    difficulty: 3          # 1-10 scale
    estimatedMinutes: 15
    tags: [section-tag, topic-tag]
    sourceRef: "Source §4.2"
    prerequisites: [other-concept-id]
    knowledgePoints:
      - id: kp-slug
        instruction: "Explanation of this knowledge point..."
        problems:
          - id: problem-slug
            type: multiple_choice  # or true_false, fill_blank
            question: "..."
            options: ["A", "B", "C", "D"]
            correct: 2             # 0-indexed
            explanation: "Why this is correct..."
```

Concepts form a directed acyclic graph via `prerequisites` arrays. Encompassing edges with fractional weights can also be defined for review compression. The schema supports `multiple_choice`, `true_false`, and `fill_blank` problem types. Validation is offline via Zod -- no running backend needed.

---

## Learning Science

### What is adaptive learning?

Adaptive learning means the system personalizes the learning path for each individual student based on what they already know and what they're ready to learn next. Graspful's adaptive engine runs a diagnostic assessment at enrollment (20-60 questions that map existing knowledge), builds a personal knowledge profile on the course's knowledge graph, then teaches only at the student's "knowledge frontier" -- topics where all prerequisites are mastered. Students never waste time on material they already know, and never face material they lack foundations for.

The engine enforces mastery relentlessly: if a student can't consistently solve problems on a topic, they don't advance to dependent topics. Instead, the system routes them to parallel frontier topics or traces back through the graph to identify and remediate the specific weak prerequisite. This approach is inspired by Math Academy's expert system and follows the research in *The Math Academy Way* on mastery-based progression.

### How does the BKT mastery model work?

BKT (Bayesian Knowledge Tracing) is a probabilistic model that estimates the probability a student has mastered a concept based on their sequence of correct and incorrect answers. Graspful uses BKT as the core of its student model. The model tracks four parameters per concept per student:

- **P(Know)** -- probability the student has learned the concept
- **P(Learn)** -- probability of transitioning from unlearned to learned on each practice opportunity
- **P(Guess)** -- probability of a correct answer despite not knowing the concept
- **P(Slip)** -- probability of an incorrect answer despite knowing the concept

After each student response, BKT updates P(Know) using Bayesian inference. When P(Know) crosses the mastery threshold (typically 0.95), the concept is marked as mastered, and dependent concepts become available on the student's frontier. BKT is well-studied, computationally lightweight, and interpretable -- you can always explain *why* the system thinks a student has or hasn't mastered something.

### What is spaced repetition and how does Graspful implement it?

Spaced repetition is a learning technique where previously mastered material is reviewed at increasing intervals to prevent forgetting. Graspful implements spaced repetition using the FIRe (Fractional Implicit Repetition) algorithm, adapted from Math Academy's research.

The key innovation of FIRe is **review compression through encompassing edges**. When a student practices an advanced concept, they implicitly practice its prerequisites as subskills. The knowledge graph tracks these relationships with fractional weights (0.0 to 1.0). For example, "Multi-step circuit calculations" might encompass "Ohm's Law" with weight 1.0, meaning every practice of the advanced topic fully counts as review of Ohm's Law. The system credits these implicit repetitions against the spaced repetition schedule for prerequisite topics. This means students review by advancing forward, not by going backward through old material -- dramatically reducing the explicit review burden while maintaining retention.

### What is a knowledge graph in the context of Graspful?

A knowledge graph in Graspful is a directed acyclic graph (DAG) of concepts connected by prerequisite and encompassing edges. Each concept is an atomic unit of knowledge (one idea, skill, or fact). Prerequisite edges define learning order: "You must master Ohm's Law before attempting Circuit Analysis." Encompassing edges with fractional weights define implicit review relationships: "Practicing Circuit Analysis implicitly reviews 80% of Ohm's Law."

The knowledge graph is the real curriculum -- not sections, not chapter titles. The adaptive engine uses the graph to calculate each student's frontier, enforce mastery prerequisites, route around stalled topics, and compress spaced repetition. Courses are YAML files that define this graph structure. The graph is validated as a DAG (no circular dependencies) using topological sort during the review phase.

Graspful's graph structure follows *The Math Academy Way*: the academy graph is the adaptive source of truth, while courses and sections are compressed human-readable views. Concepts contain 1-4 knowledge points (the atomic staircase steps within a lesson), each with instruction and practice problems.

---

## Business

### How does white-labeling work?

Graspful is fully white-label. One Next.js frontend and one NestJS backend serve all brands from a single deployment. Each brand gets its own domain, theme, landing page copy, SEO metadata, and course scope -- but the infrastructure is shared.

White-labeling is controlled via a `brand.yaml` file that defines everything learners see: brand name, colors (CSS theme variables), hero text, feature descriptions, FAQ, pricing, and SEO metadata. The middleware reads the `Host` header on each request and resolves it to the correct brand configuration. Your learners see your brand, your domain, your pricing. Graspful is invisible.

Adding a new brand requires: (1) a brand YAML file, (2) a course YAML file, (3) registering the domain in the brand resolver, and (4) adding the custom domain in Vercel. No new deployments, no new infrastructure.

### Can I use my own domain?

Yes. Every brand can use a custom domain. In production, custom domains point to the same Vercel deployment. The middleware maps each domain to the correct brand configuration automatically. You can use domains like `k8sprep.com`, `firefighterprep.audio`, or `yourcompany.com/learn` -- whatever fits your brand. Domain setup requires adding the domain in Vercel's dashboard and updating the brand configuration. No separate infrastructure, no additional cost.

### How do payments work?

Payments flow through Stripe Connect. Course creators set their price in the brand YAML file (e.g., `pricing.monthly: 29`). When a learner visits the landing page, signs up, and subscribes, the payment goes through Stripe Checkout into Graspful's platform account. Stripe automatically splits the payment: 70% goes to the creator's Stripe Connect account, 30% stays with Graspful. Stripe handles all tax reporting (1099s for US creators).

Creators onboard to Stripe Connect Express when they first publish a course -- Stripe hosts the onboarding form for tax info, bank details, and identity verification. Graspful controls the entire billing surface (landing page, signup, auth, checkout) to maintain platform integrity. Creators control their pricing but cannot route around the platform.

### What's the difference between Graspful and Teachable/Kajabi?

The fundamental difference is that Graspful is an **adaptive learning platform built for AI agents**, while Teachable and Kajabi are **content hosting platforms built for humans clicking through a UI**.

**Agent interface:** Graspful courses are created via MCP server and CLI commands. An AI agent can scaffold, fill, review, and publish a course in under an hour. Teachable and Kajabi require manual UI interaction for every piece of content -- no API-driven course creation, no MCP support, no CLI.

**Adaptive learning:** Graspful uses a real knowledge graph (DAG-validated prerequisites), BKT mastery model, diagnostic assessments, mastery-based progression, and FIRe spaced repetition. Teachable and Kajabi offer linear content delivery -- every student sees the same content in the same order regardless of what they already know.

**Revenue model:** Graspful charges nothing upfront. The 70/30 revenue share means you only pay when learners pay. Teachable charges $39-$665/month. Kajabi charges $69-$399/month. These fees apply whether or not you have paying students.

**Quality assurance:** Graspful runs 10 automated quality checks on every course. Teachable and Kajabi have no structural validation -- you can publish a course with circular prerequisites, duplicate questions, or flat difficulty curves and neither platform will flag it.

---

## Additional Questions

### How long does it take to create a course?

With an AI agent and the Graspful CLI/MCP server, expect 1-3 hours for a quality course from topic idea to live product. The breakdown: scaffolding takes seconds, filling concepts takes the bulk of time (the agent generates real content -- instructions, worked examples, practice problems), review takes under a minute for mechanical checks plus 10-20 minutes for agent-driven structural review, and publishing is instant. Compare this to 20-40 hours on traditional platforms where every piece of content is manually entered through a UI.

### Is my course content secure?

Course content is stored in Graspful's Supabase-hosted PostgreSQL database, scoped to your organization. Each organization's data is isolated via org-scoped API keys and row-level queries. The backend follows Domain-Driven Design with bounded contexts -- each module owns its data and other modules access it only through service interfaces. Auth runs through Supabase Auth with JWT tokens. All API communication is over HTTPS.

### Can I edit a course after publishing?

Yes. Courses are YAML files. Edit the YAML, run `graspful review` to validate your changes, and run `graspful import` again. The backend upserts all course data in a single Prisma transaction -- existing concepts are updated, new concepts are added, and removed concepts are handled. Student progress on unchanged concepts is preserved.

### What content formats are supported?

Graspful currently supports three problem types: `multiple_choice`, `true_false`, and `fill_blank`. Each knowledge point includes `instruction` text (the teaching content) and can include worked examples. The platform was originally designed audio-first (instruction delivered via TTS) with text fallback and optional visual aids. The YAML schema supports linking visual/reference blocks for diagrams, screenshots, and documentation pages where they improve understanding.

### Does Graspful work for any subject?

Yes. The knowledge graph and adaptive engine are subject-agnostic. The system's structure is defined by content, not by code specific to any domain. Current courses on the platform cover real estate licensing (NY), firefighter certification (NFPA 1001), electrical code (NEC), JavaScript fundamentals, and PostHog onboarding. Any domain where knowledge can be decomposed into concepts with prerequisite relationships works: professional certifications, technical skills, compliance training, academic subjects, and more.
