# @graspful/cli

Command-line tool for creating adaptive learning courses from YAML. Designed for both humans and AI agents.

## Install

```bash
npm install -g @graspful/cli
# or
npx @graspful/cli <command>
```

## Quick Start

```bash
# 1. Scaffold a course skeleton
graspful create course --topic "Kubernetes Networking" --hours 8 -o k8s.yaml

# 2. Fill in content for each concept
graspful fill concept k8s.yaml k8s-intro --kps 3 --problems 4

# 3. Validate the YAML (offline, no API needed)
graspful validate k8s.yaml

# 4. Run quality checks (10/10 required to publish)
graspful review k8s.yaml

# 5. Import to Graspful
graspful import k8s.yaml --org acme-learning

# 6. Publish
graspful publish <courseId> --org acme-learning
```

## Authentication

Two modes:

**API key (agents)** — set `GRASPFUL_API_KEY` as an environment variable. Required for `import`, `publish`, and `list` commands.

**Interactive (humans)** — run `graspful login` to enter your API key or JWT. Credentials are stored in `~/.graspful/credentials.json`. New users can run `graspful register` to create an account.

```bash
# Agent mode
export GRASPFUL_API_KEY=gsk_...
graspful import course.yaml --org my-org

# Human mode
graspful login
graspful import course.yaml --org my-org
```

## Commands

### `graspful create course`

Generate a course YAML scaffold with sections, concepts, and prerequisite edges. The scaffold has no learning content — just the graph structure with TODO placeholders.

```bash
graspful create course \
  --topic "AWS Solutions Architect" \
  --hours 40 \
  --source "AWS SAA-C03 Exam Guide" \
  -o ./courses/aws-saa.yaml
```

| Flag | Description | Default |
|------|-------------|---------|
| `--topic` | Course topic name (required) | — |
| `--hours` | Estimated total hours | `10` |
| `--source` | Source document reference | — |
| `-o, --output` | Output file path | stdout |

### `graspful create brand`

Generate a brand YAML scaffold for a white-label learning site. Niche presets: `education`, `healthcare`, `finance`, `tech`, `legal`.

```bash
graspful create brand --niche tech --name "DevOps Academy" --org devops-co
```

### `graspful fill concept`

Add knowledge point (KP) and problem stubs to a concept. Each stub includes instruction, worked example, and problem placeholders with a difficulty staircase.

```bash
graspful fill concept course.yaml intro-to-k8s --kps 3 --problems 4
```

| Flag | Description | Default |
|------|-------------|---------|
| `--kps` | Number of KP stubs | `2` |
| `--problems` | Problems per KP | `3` |

Fails if the concept already has KPs (prevents accidental overwrites).

### `graspful validate`

Validate any Graspful YAML (course, brand, or academy manifest) against its Zod schema. Auto-detects file type from the top-level key. For courses, also checks that all prerequisite references are valid and the graph is acyclic (DAG).

**Runs offline — no API needed.** Agents should validate frequently during generation.

```bash
graspful validate course.yaml
graspful validate brand.yaml
```

### `graspful review`

Run 10 mechanical quality checks on a course YAML. All 10 must pass for a course to be published.

```bash
graspful review course.yaml
```

**The 10 checks:**

| # | Check | What it verifies |
|---|-------|-----------------|
| 1 | `yaml_parses` | Valid Zod schema |
| 2 | `unique_problem_ids` | No duplicate problem IDs |
| 3 | `prerequisites_valid` | All prerequisite refs point to real concepts |
| 4 | `question_deduplication` | No near-duplicate questions at same difficulty |
| 5 | `difficulty_staircase` | Each concept has problems at 2+ difficulty levels |
| 6 | `cross_concept_coverage` | No single term dominates too many concepts |
| 7 | `problem_variant_depth` | Each KP has 3+ problems |
| 8 | `instruction_formatting` | Long instructions (100+ words) have content blocks |
| 9 | `worked_example_coverage` | 50%+ of authored concepts have worked examples |
| 10 | `import_dry_run` | DAG is valid (no cycles, valid refs) |

### `graspful import`

Import a course or brand YAML into a Graspful instance. Requires auth.

```bash
# Import as draft
graspful import course.yaml --org acme-learning

# Import and publish (runs review gate server-side)
graspful import course.yaml --org acme-learning --publish
```

| Flag | Description | Default |
|------|-------------|---------|
| `--org` | Organization slug (required for courses) | — |
| `--publish` | Publish immediately (runs review gate) | `false` |

### `graspful publish`

Publish a draft course. Server runs the review gate — all 10 quality checks must pass.

```bash
graspful publish <courseId> --org acme-learning
```

### `graspful describe`

Show course statistics: concept counts, KP counts, problem counts, graph depth, section breakdown, and missing content.

```bash
graspful describe course.yaml
```

### `graspful login` / `graspful register`

Authenticate with a Graspful instance or create a new account.

```bash
graspful login                          # Interactive prompt
graspful login --token gsk_abc123       # Non-interactive
graspful register --email user@example.com
```

## Output Formats

Every command supports `--format` for human-readable or machine-readable output.

```bash
# Human-readable (default)
graspful validate course.yaml

# JSON for agent composability
graspful validate course.yaml --format json
# { "valid": true, "errors": [], "stats": { "concepts": 42, "knowledgePoints": 89, "problems": 267 } }
```

## Agent Workflow

The typical agent workflow is:

1. **Scaffold** — `graspful create course --topic "X"` to generate the graph skeleton
2. **Edit** — modify the YAML to add concepts, adjust prerequisites and difficulty levels
3. **Fill** — `graspful fill concept` for each concept to add KP/problem stubs
4. **Author** — replace TODO placeholders with real instructions, worked examples, and problems
5. **Validate** — `graspful validate` after each edit (offline, fast)
6. **Review** — `graspful review` to run all 10 quality checks
7. **Import** — `graspful import --org <org> --publish` when review passes 10/10

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GRASPFUL_API_KEY` | API key for authenticated commands |
| `GRASPFUL_API_URL` | API base URL (default: `https://api.graspful.com`) |

## Related Docs

- [Content Authoring Guide](../../content/README.md) — YAML schema reference and authoring rules
- [Course Review Gate](../../docs/course-review-gate.md) — review specification and quality checks
- [CLI Agent Strategy](../../docs/cli-agent-strategy.md) — design philosophy and architecture
