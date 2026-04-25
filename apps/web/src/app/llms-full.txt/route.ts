function generateLlmsFullTxt(): string {
  return `# Graspful — Complete Platform Documentation

> Agent-first adaptive learning platform. Courses defined as YAML knowledge graphs.

Graspful is an adaptive learning platform where AI agents create, validate, and publish courses. Courses are defined as YAML knowledge graphs with concepts, prerequisites, and problems. The platform handles adaptive diagnostics (BKT mastery model), spaced repetition (FIRe algorithm), mastery-based progression, white-label sites, and Stripe billing with a 70/30 revenue share.

Graspful provides a CLI and MCP server so AI agents can scaffold, fill, validate, review, and publish courses without any manual steps.

---

## Quick Start

\`\`\`bash
# 1. Initialize (zero-config, auto-configures MCP)
npx @graspful/cli init

# 2. Register to get an API key (required before import/publish)
graspful register

# 3. Scaffold the academy plan
graspful create academy --topic "Linear Algebra" -o academy.yaml

# 4. Scaffold each course graph, then fill concepts
mkdir -p courses
graspful create course --topic "Linear Algebra Foundations" -o courses/linear-algebra-foundations.yaml
graspful fill concept courses/linear-algebra-foundations.yaml concept-id

# 5. Review the course (runs 10 quality checks)
graspful review courses/linear-algebra-foundations.yaml

# 6. Import and publish the academy to an organization
graspful import academy.yaml --org my-org --course-dir . --publish
\`\`\`

---

## Authentication

**You MUST register before importing or publishing.** Scaffold, validate, fill, and review all work without auth.

### How to authenticate

1. **CLI (recommended for first-time setup):**
   \`\`\`bash
   graspful register
   \`\`\`
   This opens browser auth, completes email verification / MFA on the web side, then saves an API key to \`~/.graspful/credentials.json\`.

2. **MCP / agents:**
   Set \`GRASPFUL_API_KEY=gsk_...\` before starting the MCP server.

3. **Environment variable:**
   Set \`GRASPFUL_API_KEY=gsk_...\` before starting the MCP server or CLI.

### Which operations need auth?

| Operation | Auth required? |
|-----------|:-:|
| Create academy, scaffold course, fill, validate, review, describe, create brand | No |
| Import academy, import course, publish course, import brand, list courses | **Yes** |

---

## CLI Commands

| Command | Auth? | Description | Key Flags |
|---------|:---:|-------------|-----------|
| \`graspful init\` | No | Initialize project, browser-auth, and auto-configure MCP | \`--email\`, \`--no-browser\` |
| \`graspful register\` | No | Create account + API key via browser auth | \`--email <email>\`, \`--no-browser\` |
| \`graspful create academy\` | No | Scaffold an academy plan with source, landing-page, graph, and review gates | \`--topic <topic>\`, \`--course <name>\`, \`--version <version>\` |
| \`graspful create course\` | No | Scaffold a new course YAML | \`--topic <topic>\`, \`--hours <n>\`, \`--source <file>\` |
| \`graspful fill concept <yaml> <conceptId>\` | No | Generate knowledge points and problems for a concept | \`--force\` overwrite existing |
| \`graspful validate <yaml>\` | No | Validate course YAML against schema | — |
| \`graspful review <yaml>\` | No | Run all 10 quality checks | \`--fix\` auto-fix issues |
| \`graspful describe <yaml>\` | No | Describe course structure | — |
| \`graspful create brand\` | No | Scaffold a brand YAML | \`--niche <niche>\`, \`--name <name>\`, \`--domain <domain>\`, \`--org <slug>\` |
| \`graspful import <yaml>\` | **Yes** | Import an academy manifest or course to platform | \`--org <slug>\`, \`--publish\`, \`--course-dir <dir>\` |
| \`graspful publish <courseId>\` | **Yes** | Publish an imported course | \`--org <slug>\` |
| \`graspful import-brand <yaml>\` | **Yes** | Import brand config to platform | \`--org <slug>\` |
| \`graspful list courses\` | **Yes** | List courses in an org | \`--org <slug>\` |
| \`graspful login\` | No | Browser sign-in or save an API key/JWT | \`--token\`, \`--email\`, \`--no-browser\` |

---

## MCP Tools

Graspful exposes 12 MCP tools for AI agents. Tools marked (AUTH REQUIRED) need
an API key in \`GRASPFUL_API_KEY\`.

### graspful_create_academy
Generate an academy manifest with planning layers and authoring gates.
- \`topic\` (string, required) — Academy topic
- \`courseNames\` (string[], optional) — Ordered course names. Defaults to foundations, core structures, operational flows, and applied judgment
- \`version\` (string, optional) — Academy version string

### graspful_scaffold_course
Scaffold a new course YAML from a topic.
- \`topic\` (string, required) — The subject to create a course for
- \`hours\` (number, optional) — Estimated course duration in hours
- \`source\` (string, optional) — Path to source document for content extraction

### graspful_fill_concept
Generate knowledge points and problems for a single concept.
- \`yaml\` (string, required) — Path to the course YAML file
- \`conceptId\` (string, required) — ID of the concept to fill

### graspful_validate
Validate a course YAML file against the schema.
- \`yaml\` (string, required) — Path to the course YAML file

### graspful_review_course
Run all 10 quality checks on a course.
- \`yaml\` (string, required) — Path to the course YAML file

### graspful_import_course (AUTH REQUIRED)
Import a course YAML to the Graspful platform. Set \`GRASPFUL_API_KEY\` first if not authenticated.
- \`yaml\` (string, required) — Path to the course YAML file
- \`orgSlug\` (string, required) — Organization slug
- \`publish\` (boolean, optional) — Publish immediately after import

### graspful_import_academy (AUTH REQUIRED)
Import an academy manifest and referenced course YAMLs. Set \`GRASPFUL_API_KEY\` first if not authenticated.
- \`manifestYaml\` (string, required) — Full academy manifest YAML
- \`courseYamls\` (object, required) — Map of course file paths to course YAML strings
- \`org\` (string, required) — Organization slug
- \`publish\` (boolean, optional) — Publish imported courses after import

### graspful_publish_course (AUTH REQUIRED)
Publish an already-imported course. Set \`GRASPFUL_API_KEY\` first if not authenticated.
- \`courseId\` (string, required) — ID of the course to publish
- \`orgSlug\` (string, required) — Organization slug

### graspful_describe_course
Describe the structure of a course YAML.
- \`yaml\` (string, required) — Path to the course YAML file

### graspful_create_brand
Create a new brand YAML for a white-label site.
- \`niche\` (string, required) — The niche/vertical for the brand
- \`name\` (string, optional) — Brand name
- \`domain\` (string, optional) — Custom domain
- \`orgSlug\` (string, optional) — Organization slug

### graspful_import_brand (AUTH REQUIRED)
Import a brand YAML to the platform. Set \`GRASPFUL_API_KEY\` first if not authenticated.
- \`yaml\` (string, required) — Path to the brand YAML file
- \`orgSlug\` (string, required) — Organization slug

### graspful_list_courses (AUTH REQUIRED)
List all courses in an organization. Set \`GRASPFUL_API_KEY\` first if not authenticated.
- \`orgSlug\` (string, required) — Organization slug

---

## Course YAML Schema

\`\`\`yaml
course:
  id: "linear-algebra-101"          # Unique identifier (kebab-case)
  name: "Linear Algebra 101"        # Display name
  description: "Introduction to..."  # Course description
  estimatedHours: 20                 # Estimated completion time
  version: 1                         # Schema version
  sourceDocument: "textbook.pdf"     # Optional source reference

concepts:
  - id: "vectors"                    # Unique concept ID (kebab-case)
    name: "Vectors"                  # Display name
    difficulty: 2                    # 1-5 scale (1=easiest, 5=hardest)
    estimatedMinutes: 45             # Time to learn concept
    tags: ["algebra", "geometry"]    # Categorization tags
    prerequisites: []                # IDs of prerequisite concepts
    sourceRef: "Chapter 1"           # Optional reference to source
    knowledgePoints:
      - id: "vector-addition"        # Unique KP ID
        instruction: |               # Teaching content (markdown)
          A vector is a quantity with both magnitude and direction...
        problems:
          - id: "vec-add-1"          # Unique problem ID
            type: "multiple_choice"  # multiple_choice | true_false | fill_blank
            question: "What is [2,3] + [1,4]?"
            options:                  # Required for multiple_choice
              - "[3,7]"
              - "[2,12]"
              - "[3,4]"
              - "[1,1]"
            correct: "[3,7]"         # Must match an option exactly
            explanation: |           # Shown after answering
              Add component-wise: [2+1, 3+4] = [3,7]
            difficulty: 2            # Optional, 1-5 scale

  - id: "matrices"
    name: "Matrices"
    difficulty: 3
    estimatedMinutes: 60
    tags: ["algebra"]
    prerequisites: ["vectors"]       # Must reference existing concept IDs
    knowledgePoints:
      - id: "matrix-mult"
        instruction: "Matrix multiplication..."
        problems:
          - id: "mat-mult-1"
            type: "true_false"
            question: "Matrix multiplication is commutative."
            correct: "false"         # "true" or "false" for true_false
            explanation: "AB != BA in general."
          - id: "mat-mult-2"
            type: "fill_blank"
            question: "A 2x3 matrix multiplied by a 3x4 matrix produces a ___x___ matrix."
            correct: "2x4"           # Expected answer for fill_blank
            explanation: "The result has rows of A and columns of B."
\`\`\`

### Field Constraints

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| \`course.id\` | string | yes | kebab-case, unique |
| \`course.name\` | string | yes | — |
| \`course.description\` | string | yes | — |
| \`course.estimatedHours\` | number | yes | > 0 |
| \`course.version\` | number | yes | integer |
| \`course.sourceDocument\` | string | no | — |
| \`concepts[].id\` | string | yes | kebab-case, unique within course |
| \`concepts[].difficulty\` | number | yes | 1-5 integer |
| \`concepts[].estimatedMinutes\` | number | yes | > 0 |
| \`concepts[].tags\` | string[] | yes | at least 1 tag |
| \`concepts[].prerequisites\` | string[] | yes | must reference valid concept IDs |
| \`knowledgePoints[].id\` | string | yes | unique within course |
| \`knowledgePoints[].instruction\` | string | yes | markdown content |
| \`problems[].id\` | string | yes | unique within course |
| \`problems[].type\` | string | yes | multiple_choice, true_false, or fill_blank |
| \`problems[].question\` | string | yes | — |
| \`problems[].options\` | string[] | conditional | required if type=multiple_choice |
| \`problems[].correct\` | string | yes | must match an option for multiple_choice |
| \`problems[].explanation\` | string | yes | — |
| \`problems[].difficulty\` | number | no | 1-5 integer |

---

## Brand YAML Schema

\`\`\`yaml
brand:
  id: "my-brand"                     # Unique brand ID
  name: "My Learning Platform"       # Display name
  domain: "learn.example.com"        # Custom domain
  tagline: "Master anything."        # Short tagline
  orgSlug: "my-org"                  # Organization slug

theme:
  preset: "zinc"                     # Color preset
  radius: 0.5                        # Border radius multiplier

landing:
  hero:
    heading: "Learn Smarter"
    subheading: "Adaptive courses that meet you where you are."
    cta: "Get Started"
  features:
    heading: "Why Choose Us"
    subheading: "Built for real learning."
    items:
      - title: "Adaptive"
        description: "Courses adapt to your knowledge level."
      - title: "Spaced Repetition"
        description: "Never forget what you learn."
      - title: "AI-Powered"
        description: "Created and curated by AI agents."
  howItWorks:
    heading: "How It Works"
    steps:
      - title: "Take a Diagnostic"
        description: "We assess what you already know."
      - title: "Learn Adaptively"
        description: "Focus on what you need to learn."
      - title: "Stay Sharp"
        description: "Spaced repetition keeps knowledge fresh."
  faq:
    - question: "How much does it cost?"
      answer: "Pricing depends on the course creator."
    - question: "How does adaptive learning work?"
      answer: "We use Bayesian Knowledge Tracing to model your mastery."

seo:
  title: "My Learning Platform — Master Anything"
  description: "Adaptive courses powered by AI."
  keywords: ["learning", "adaptive", "AI", "courses"]
\`\`\`

---

## Quality Checks

The \`graspful review\` command (and \`graspful_review_course\` MCP tool) runs 10 quality checks:

1. **YAML Schema Validation** — Course YAML conforms to the required schema
2. **Unique Problem IDs** — Every problem ID is unique across the entire course
3. **Valid Prerequisites** — All referenced prerequisite concept IDs exist in the course
4. **No DAG Cycles** — The prerequisite graph is a valid DAG (no circular dependencies)
5. **Minimum 1 KP per Concept** — Every concept has at least one knowledge point
6. **Minimum 2 Problems per KP** — Every knowledge point has at least two problems
7. **Difficulty Distribution** — Not all concepts have the same difficulty level
8. **Explanation Coverage** — Every problem has an explanation
9. **Question Deduplication** — No duplicate questions across the course
10. **Tag Coverage** — Every concept has at least one tag

Each check returns pass/fail with details. Fix failures before importing.

---

## MCP Configuration

### Claude Code (\`~/.claude.json\`)

\`\`\`json
{
  "mcpServers": {
    "graspful": {
      "command": "npx",
      "args": ["@graspful/cli", "mcp"],
      "env": {
        "GRASPFUL_API_KEY": "your-api-key"
      }
    }
  }
}
\`\`\`

### Cursor (\`.cursor/mcp.json\`)

\`\`\`json
{
  "mcpServers": {
    "graspful": {
      "command": "npx",
      "args": ["@graspful/cli", "mcp"],
      "env": {
        "GRASPFUL_API_KEY": "your-api-key"
      }
    }
  }
}
\`\`\`

### Codex

\`\`\`json
{
  "mcpServers": {
    "graspful": {
      "command": "npx",
      "args": ["@graspful/cli", "mcp"],
      "env": {
        "GRASPFUL_API_KEY": "your-api-key"
      }
    }
  }
}
\`\`\`

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| \`GRASPFUL_API_KEY\` | Yes (for API ops) | — | API key for authentication. Get one from your org settings. |
| \`GRASPFUL_API_URL\` | No | \`https://api.graspful.ai\` | API base URL. Override for self-hosted or dev. |

---

## Typical Agent Workflow

1. **Register** — Run \`graspful register\` in a terminal to complete browser auth and get an API key. This is required before importing or publishing. Skip if you already have GRASPFUL_API_KEY set.
2. **Plan the academy** — Use \`graspful_create_academy(topic: "Your Topic")\` to generate the academy manifest, planning layers, and authoring gates.
3. **Resolve the plan** — Fill in source material, learner promise, landing-page proof, and course dependencies before writing knowledge points.
4. **Scaffold course graphs** — Use \`graspful_scaffold_course(topic: "Your Course", estimatedHours: 10)\` for each course referenced by the academy.
5. **Fill concepts** — For each concept, call \`graspful_fill_concept(yaml, conceptId)\` to generate knowledge points and problems.
6. **Review** — Call \`graspful_review_course(yaml)\` to run quality checks. Fix any failures.
7. **Import academy** — Call \`graspful_import_academy(manifestYaml, courseYamls, org, publish: true)\` to push the connected product to platform.
8. **Create brand** — Use \`graspful_create_brand(niche: "Your Niche", topic: "Your Topic")\` to generate the landing page config.
9. **Import brand** — Use \`graspful_import_brand(yaml, orgSlug)\` to deploy the site.

### Tips for Agents

- Always run \`review\` before \`import\` — the API will reject courses that fail validation.
- Fill concepts one at a time for better quality. Don't try to fill the entire course in one call.
- Use \`describe\` to inspect a course YAML before making changes.
- The \`--source\` flag on \`create course\` extracts structure from an existing document (PDF, markdown, etc).
- Problem IDs must be globally unique within a course. Use a consistent naming pattern like \`{concept-id}-{kp-index}-{problem-index}\`.

---

## Platform Concepts

### Adaptive Diagnostics (BKT)
Graspful uses Bayesian Knowledge Tracing (BKT) to model student mastery. When a learner starts a course, a diagnostic session estimates their prior knowledge by asking targeted questions selected via Maximum Expected Posterior Entropy (MEPE). The diagnostic stops when mastery estimates converge.

### Spaced Repetition (FIRe)
The Flashcard-based Item Repetition (FIRe) algorithm schedules reviews based on retention probability. Items are reviewed just before the model predicts they'll be forgotten, maximizing long-term retention with minimal review sessions.

### Mastery-Based Progression
Learners must demonstrate mastery of prerequisite concepts before advancing. The knowledge graph defines the prerequisite structure, and the learning engine enforces it. No skipping ahead.

### Revenue Share
Course creators earn 70% of subscription revenue from their courses. Graspful takes 30%. Billing is handled via Stripe Connect.
`;
}

export async function GET() {
  const content = generateLlmsFullTxt();

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
