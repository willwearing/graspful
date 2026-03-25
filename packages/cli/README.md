# @graspful/cli

[![npm version](https://img.shields.io/npm/v/@graspful/cli)](https://www.npmjs.com/package/@graspful/cli)
[![license](https://img.shields.io/npm/l/@graspful/cli)](https://github.com/willwearing/graspful/blob/main/LICENSE)

CLI for creating adaptive learning courses from YAML knowledge graphs. Designed for AI agents and humans. Two YAML files in, live course product out -- with adaptive learning, spaced repetition, and Stripe billing.

## Quick Start

```bash
# 1. Create an account (gets you an org + API key)
npx @graspful/cli register --email you@example.com --password your-password

# 2. Scaffold a course
npx @graspful/cli create course --topic "CKA Exam" -o cka.yaml

# 3. Validate and review
npx @graspful/cli validate cka.yaml
npx @graspful/cli review cka.yaml

# 4. Import and publish
npx @graspful/cli import cka.yaml --org <your-org> --publish
```

Steps 2-3 work offline — no account needed. You only need to register before importing or publishing.

## Install

```bash
# Zero-config (recommended)
npx @graspful/cli <command>

# Or install globally
bun add -g @graspful/cli
# npm install -g @graspful/cli
```

## Why Graspful

- **Agent-first.** CLI + MCP server. AI agents create courses as well as humans -- faster.
- **YAML-native.** Course content is a YAML knowledge graph. Version it, diff it, review it, generate it.
- **Adaptive learning.** Bayesian Knowledge Tracing, spaced repetition (FIRe algorithm), mastery-based progression. Built in, not bolted on.
- **White-label.** Brand YAML defines theme, landing page, domain, and Stripe config. Each brand is its own product.
- **Revenue share.** Creators keep revenue. Graspful handles infrastructure.

## The Two-YAML Workflow

Graspful turns two YAML files into a live learning product:

```
course.yaml  ──┐
                ├──▶  graspful import  ──▶  Live adaptive course
brand.yaml   ──┘                           with billing, analytics,
                                           and spaced repetition
```

**Course YAML** defines what learners study: concepts, prerequisite graph, knowledge points, practice problems, section exams.

**Brand YAML** defines how the product looks: name, domain, theme, landing page, pricing, Stripe config.

## Commands

| Command | Description |
|---------|-------------|
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

### `graspful create brand`

Generate a brand YAML scaffold. Niche presets: `education`, `healthcare`, `finance`, `tech`, `legal`.

```bash
graspful create brand --niche tech --name "DevOps Academy" --org devops-co
```

### `graspful fill concept`

Add knowledge point and problem stubs to a concept. Each stub includes instruction, worked example, and problem placeholders with a difficulty staircase.

```bash
graspful fill concept course.yaml networking --kps 3 --problems 4
```

| Flag | Description | Default |
|------|-------------|---------|
| `--kps` | Number of KP stubs | `2` |
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

Run 10 mechanical quality checks. All 10 must pass to publish.

```bash
graspful review course.yaml
# Score: 10/10
# Stats: 42 concepts (12 authored, 30 stubs), 24 KPs, 89 problems
```

The 10 checks:

| # | Check | What it verifies |
|---|-------|-----------------|
| 1 | `yaml_parses` | Valid Zod schema |
| 2 | `unique_problem_ids` | No duplicate problem IDs |
| 3 | `prerequisites_valid` | All prerequisite refs point to real concepts |
| 4 | `question_deduplication` | No near-duplicate questions at same difficulty |
| 5 | `difficulty_staircase` | Each concept has problems at 2+ difficulty levels |
| 6 | `cross_concept_coverage` | No single term dominates too many concepts |
| 7 | `problem_variant_depth` | Each KP has 3+ problems |
| 8 | `instruction_formatting` | Long instructions (100+ words) use content blocks |
| 9 | `worked_example_coverage` | 50%+ of authored concepts have worked examples |
| 10 | `import_dry_run` | DAG is valid (no cycles, valid refs) |

### `graspful describe`

Show course statistics: concept counts, KP counts, problem counts, graph depth, section breakdown, and missing content.

```bash
graspful describe course.yaml
```

### `graspful import`

Push a course or brand YAML to a Graspful instance. Requires authentication.

```bash
graspful import course.yaml --org acme-learning
graspful import course.yaml --org acme-learning --publish
```

| Flag | Description | Default |
|------|-------------|---------|
| `--org` | Organization slug (required for courses) | -- |
| `--publish` | Publish immediately (runs review gate) | `false` |

### `graspful publish`

Publish a draft course. Server runs the review gate -- all 10 quality checks must pass.

```bash
graspful publish <courseId> --org acme-learning
```

### `graspful login`

Authenticate with a Graspful instance.

```bash
graspful login                        # Interactive prompt
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

1. **Scaffold** -- `graspful create course --topic "X"` to generate the graph skeleton
2. **Edit** -- modify the YAML to add concepts, adjust prerequisites and difficulty levels
3. **Fill** -- `graspful fill concept` for each concept to add KP/problem stubs
4. **Author** -- replace TODO placeholders with real instructions, worked examples, and problems
5. **Validate** -- `graspful validate` after each edit (offline, fast)
6. **Review** -- `graspful review` to run all 10 quality checks
7. **Import** -- `graspful import --org <org> --publish` when review passes 10/10

## MCP Server

For deeper AI agent integration, use the companion MCP server [`@graspful/mcp`](https://www.npmjs.com/package/@graspful/mcp). It exposes all CLI functionality as MCP tools for Claude Code, Cursor, Codex, Windsurf, and any MCP-compatible client.

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

## Links

- [Website](https://graspful.ai)
- [GitHub](https://github.com/willwearing/graspful)
- [MCP Server (`@graspful/mcp`)](https://www.npmjs.com/package/@graspful/mcp)
- [Content Authoring Guide](https://github.com/willwearing/graspful/tree/main/content)
