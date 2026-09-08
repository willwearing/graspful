# @graspful/cli

[![npm version](https://img.shields.io/npm/v/@graspful/cli)](https://www.npmjs.com/package/@graspful/cli)
[![license](https://img.shields.io/npm/l/@graspful/cli)](https://github.com/willwearing/graspful/blob/main/LICENSE)

CLI for authoring, reviewing, and importing learning academies and courses from YAML knowledge graphs. Publication requires completed content and a passing review.

## Quick Start

```bash
# 1. Scaffold one academy and its first course, offline
bunx @graspful/cli create academy --topic "CKA Exam" --course "CKA exam foundations" -o academy.yaml
mkdir -p courses
bunx @graspful/cli create course --topic "CKA exam foundations" -o courses/cka-exam-foundations.yaml

# 2. Author the YAML from your sources. Replace every scaffold marker,
# add teaching to every concept, and add questions and worked examples.
# Then validate and review the completed file.
bunx @graspful/cli validate courses/cka-exam-foundations.yaml
bunx @graspful/cli review courses/cka-exam-foundations.yaml

# 3. After review passes, authenticate and import a draft
bunx @graspful/cli register
bunx @graspful/cli import academy.yaml --org <your-org> --course-dir .

# 4. Publish the courseId returned by import
bunx @graspful/cli --format json publish <courseId> --org <your-org>
```

Scaffolds are drafts and will fail publication review until authored. Confirm `published: true` in the final response before sharing the course. If review fails, correct the YAML and re-import with `--replace` before retrying publication.

## Install

```bash
# Zero-config (recommended)
npx @graspful/cli <command>

# Or install globally
bun add -g @graspful/cli
# npm install -g @graspful/cli
```

## Why Graspful

- **Agent tools.** CLI and MCP commands support authoring, validation, review, and import.
- **YAML-native.** Course content is a YAML knowledge graph. Version it, diff it, review it, generate it.
- **Adaptive learning.** Bayesian Knowledge Tracing, spaced repetition (FIRe algorithm), and mastery-based progression.
- **White-label.** Brand YAML defines theme, landing page, domain, and Stripe config. Each brand is its own product.
- **Billing setup.** Payments require Stripe configuration before they can be enabled.

## Authoring workflow

An academy manifest groups course files. A brand file configures the landing page:

```
academy.yaml + course YAMLs -> import academy -> draft courses
completed course content   -> review + publish -> learner access
brand.yaml                 -> import brand -> landing page configuration
```

**Course YAML** defines what learners study: concepts, prerequisite graph, knowledge points, practice problems, section exams.

**Brand YAML** defines how the product looks: name, domain, theme, landing page, pricing, Stripe config.

## Commands

| Command | Description |
|---------|-------------|
| `graspful create academy` | Generate an academy plan and manifest scaffold |
| `graspful create course` | Generate a course YAML skeleton with knowledge graph structure |
| `graspful create brand` | Generate a brand YAML with theme presets |
| `graspful fill concept` | Add knowledge points and practice problems to a concept |
| `graspful validate` | Offline schema + DAG validation (no API needed) |
| `graspful review` | Run 10 mechanical quality checks, returns score X/10 |
| `graspful describe` | Course statistics (concepts, KPs, problems, depth, gaps) |
| `graspful import` | Push YAML to a Graspful instance |
| `graspful publish` | Publish a draft course (must pass quality gate) |
| `graspful login` | Authenticate via API key or JWT |

### `graspful create course`

Generate a course YAML scaffold with sections, concepts, and prerequisite edges. The scaffold has no learning content -- just the graph structure with TODO placeholders.

```bash
graspful create course \
  --topic "AWS Solutions Architect" \
  --hours 40 \
  --source "AWS SAA-C03 Exam Guide" \
  -o aws-saa.yaml
```

| Flag | Description | Default |
|------|-------------|---------|
| `--topic` | Course topic (required) | -- |
| `--hours` | Estimated total hours | `10` |
| `--source` | Source document reference | -- |
| `-o, --output` | Output file path | stdout |

### `graspful create academy`

Generate an academy plan and manifest scaffold. Every Graspful product should be modeled as an academy, even if it starts with a single course.

If you do not pass `--course`, the scaffold starts with the four default planning layers: foundations, core structures, operational flows, and applied judgment. It also includes authoring gates for the source material, learner promise, landing-page proof, graph checks, and review before publishing.

```bash
graspful create academy \
  --topic "PostHog TAM" \
  --course "Data Models" \
  --course "Pipeline Reading and Solution Design" \
  -o posthog-tam-academy.yaml
```

### `graspful create brand`

Generate a brand YAML scaffold. Niche presets: `education`, `healthcare`, `finance`, `tech`, `legal`.

```bash
graspful create brand --niche tech --topic "PostHog TAM" --name "TAM Academy" --org tam-academy
```

### `graspful fill concept`

Add knowledge point and problem stubs to a concept. Each stub includes instruction, worked example, and problem placeholders with a difficulty staircase.

```bash
graspful fill concept course.yaml networking --kps 3 --problems 4
```

| Flag | Description | Default |
|------|-------------|---------|
| `--kps` | Number of KP stubs (starting point, not a cap) | `3` |
| `--problems` | Problems per KP | `3` |

Fails if the concept already has KPs (prevents accidental overwrites).

### `graspful validate`

Validate course, brand, or academy YAML against its Zod schema. Auto-detects file type. For courses, also checks that all prerequisite references resolve and the graph is acyclic (DAG).

**Runs offline -- no API needed.** Agents should validate after every edit.

```bash
graspful validate course.yaml
graspful validate brand.yaml
```

### `graspful review`

Run 10 automated quality checks. All 10 must pass to publish. Check factual accuracy against your sources separately.

```bash
graspful review course.yaml
# Score: 10/10
# Stats: 3 concepts (3 authored, 0 stubs), 9 KPs, 27 problems
```

The 10 checks:

| # | Check | What it verifies |
|---|-------|-----------------|
| 1 | `yaml_parses` | Course structure and problem answers match the schema |
| 2 | `unique_problem_ids` | No duplicate problem IDs |
| 3 | `publication_readiness` | Every concept has teaching content and known scaffold markers are removed |
| 4 | `question_deduplication` | No near-duplicate questions at same difficulty |
| 5 | `difficulty_staircase` | Each concept has problems at 2+ difficulty levels |
| 6 | `problem_teaching_alignment` | A vocabulary check flags questions that appear unrelated to the teaching path |
| 7 | `problem_variant_depth` | Each KP has 3+ problems |
| 8 | `instruction_formatting` | Long instructions (100+ words) use content blocks |
| 9 | `worked_example_coverage` | 50%+ of authored concepts have worked examples |
| 10 | `import_dry_run` | Concept and KP IDs are unique in their scopes; prerequisites exist without cycles |

### `graspful describe`

Show course statistics: concept counts, KP counts, problem counts, graph depth, section breakdown, and missing content.

```bash
graspful describe course.yaml
```

### `graspful import`

Push a course, academy, or brand YAML to a Graspful instance. Requires authentication.

```bash
graspful import course.yaml --org acme-learning
graspful import course.yaml --org acme-learning --publish
graspful import academy.yaml --org acme-learning --course-dir . --publish
```

| Flag | Description | Default |
|------|-------------|---------|
| `--org` | Organization slug (required for courses) | -- |
| `--publish` | Publish immediately (runs review gate) | `false` |
| `--course-dir` | Base directory for academy course files | manifest directory |

With `--publish`, exit status `0` requires confirmation that every requested course was published. If a review or publication request fails, the command exits with status `1` and preserves the import result. Course results include `publicationFailures`; academy results list only confirmed `publishedCourseIds` and include `publishFailures` for the remaining courses. A partial academy publication has `status: "partially_published"` in JSON output.

### `graspful publish`

Publish a draft course. Server runs the review gate -- all 10 quality checks must pass.

```bash
graspful publish <courseId> --org acme-learning
```

The command reports success only when the server returns `published: true`. Failed reviews return exit status `1` with the check names and details. Use `--format json` to retain the full server review and the `publicationFailures` list in the error output.

### `graspful login`

Authenticate with a Graspful instance. If you do not pass a token, the CLI
opens a browser sign-in flow and saves a fresh API key locally after the
browser session completes.

```bash
graspful login                        # Browser sign-in
graspful login --token gsk_abc123     # Non-interactive (for CI)
```

## Output Formats

Human-readable by default. Pass `--format json` for machine-readable output (useful for agents and CI).

```bash
# Human-readable (default)
graspful validate course.yaml
# PASS  course validation
#   concepts: 42
#   knowledgePoints: 89
#   problems: 267

# JSON for agents
graspful validate course.yaml --format json
# {"valid":true,"fileType":"course","errors":[],"stats":{"concepts":42,"knowledgePoints":89,"problems":267}}
```

## Agent Workflow

The typical agent loop:

1. **Define the academy** -- `graspful create academy --topic "X"` to establish the academy plan
2. **Decompose the topic** -- break it into foundations, structures, operations, and applied judgment
3. **Scaffold each course** -- `graspful create course` for every course in the academy
4. **Edit** -- modify YAML to add concepts, adjust prerequisites, and keep the graph layered
5. **Fill** -- `graspful fill concept` for each concept to add KP/problem stubs
6. **Author** -- replace TODO placeholders with real instructions, worked examples, and problems
7. **Build the landing page** -- use `graspful create brand --topic "X"` as a starting point, then replace generic copy with academy-specific proof and outcomes
8. **Validate** -- `graspful validate` after each edit (offline, fast)
9. **Review** -- `graspful review` to run all 10 quality checks
10. **Import** -- `graspful import academy.yaml --org <org> --course-dir . --publish` when review passes 10/10

## MCP Server

The companion MCP server [`@graspful/mcp`](https://www.npmjs.com/package/@graspful/mcp) exposes course authoring, validation, review, and publication tools. Follow its [editor-specific setup instructions](https://github.com/willwearing/graspful/tree/main/packages/mcp#editor-configuration) for Claude Code, Codex, Cursor, VS Code, or Windsurf Cascade.

For Cursor, add this to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "graspful": {
      "command": "npx",
      "args": ["@graspful/mcp"]
    }
  }
}
```

## Course YAML Structure

A course YAML defines a knowledge graph: concepts connected by prerequisite edges, each containing knowledge points with practice problems.

```yaml
course:
  id: javascript-fundamentals
  name: "JavaScript Fundamentals"
  description: "Core JS concepts from variables through async patterns."
  estimatedHours: 30
  version: "2024.1"
  sourceDocument: "ECMA-262"

concepts:
  - id: variables-and-declarations
    name: "Variables and Declarations"
    difficulty: 1
    estimatedMinutes: 15
    tags: [s01-basics, foundational]
    prerequisites: []
    knowledgePoints:
      - id: let-const-var-differences
        instruction: "JavaScript has three ways to declare variables..."
        workedExample: "Consider: const obj = {a: 1}; obj.a = 2; ..."
        problems:
          - id: var-decl-p1
            type: multiple_choice
            question: "What happens when you access a let variable before its declaration?"
            options: ["Returns undefined", "ReferenceError", "Returns null", "Creates global"]
            correct: 1
            explanation: "let/const have a temporal dead zone..."

  - id: closures
    name: "Closures"
    difficulty: 4
    estimatedMinutes: 25
    tags: [s02-functions]
    prerequisites: [variables-and-declarations]
    knowledgePoints: []  # TODO: fill with graspful fill concept

sections:
  - id: s01-basics
    name: "Language Basics"
    concepts: [variables-and-declarations]
  - id: s02-functions
    name: "Functions"
    concepts: [closures]
```

## Authentication

Two modes:

**API key (agents/CI)** -- set `GRASPFUL_API_KEY` as an environment variable.

**Interactive (humans)** -- run `graspful login`.

```bash
# Agent mode
export GRASPFUL_API_KEY=gsk_...
graspful import course.yaml --org my-org

# Human mode
graspful login
graspful import course.yaml --org my-org
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GRASPFUL_API_KEY` | API key for authenticated commands (`import`, `publish`) |
| `GRASPFUL_API_URL` | API base URL (default: `https://api.graspful.ai`) |
| `GRASPFUL_USER_ID` | Optional Graspful user ID for analytics identity continuity |
| `GRASPFUL_TELEMETRY_DISABLED` | Set to `1` to disable anonymous product analytics |

The CLI sends command usage and outcome metadata to help improve Graspful. It never sends API keys or YAML course bodies. Set `GRASPFUL_TELEMETRY_DISABLED=1` to disable this data collection.

## Links

- [Website](https://graspful.ai)
- [GitHub](https://github.com/willwearing/graspful)
- [MCP Server (`@graspful/mcp`)](https://www.npmjs.com/package/@graspful/mcp)
- [Content Authoring Guide](https://github.com/willwearing/graspful/tree/main/content)
