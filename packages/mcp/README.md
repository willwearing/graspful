# @graspful/mcp

MCP (Model Context Protocol) server for Graspful. Exposes course creation as callable tools for AI agents — scaffold, fill, validate, review, import, and publish adaptive learning courses without leaving the agent's context.

## Install

```bash
npm install -g @graspful/mcp
```

## Setup

### Claude Desktop / Claude Code

Add to your MCP config (`~/.claude/claude_desktop_config.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "graspful": {
      "command": "npx",
      "args": ["@graspful/mcp"],
      "env": {
        "GRASPFUL_API_KEY": "gsk_your_key_here"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "graspful": {
      "command": "npx",
      "args": ["@graspful/mcp"],
      "env": {
        "GRASPFUL_API_KEY": "gsk_your_key_here"
      }
    }
  }
}
```

The server communicates over stdio using the MCP protocol.

## Tools

### `graspful_scaffold_course`

Generate a course YAML skeleton with sections, concepts, and prerequisite edges. Returns a minimal valid YAML with TODO placeholders — no learning content, just graph structure.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topic` | string | yes | Course topic (e.g., "Linear Algebra") |
| `estimatedHours` | number | no | Total course hours (default: 10) |
| `sourceDocument` | string | no | Reference to source material |

### `graspful_fill_concept`

Add knowledge point and problem stubs to a specific concept. Returns the full updated YAML. Each KP stub includes instruction, worked example, and problem placeholders with a difficulty staircase.

Fails if the concept already has KPs (prevents accidental overwrites).

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `yaml` | string | yes | Full course YAML string |
| `conceptId` | string | yes | ID of the concept to fill |
| `kps` | number | no | Number of KP stubs (default: 2) |
| `problemsPerKp` | number | no | Problems per KP (default: 3) |

### `graspful_validate`

Validate any Graspful YAML (course, brand, or academy manifest) against its Zod schema. Auto-detects file type. For courses, also checks prerequisite references and DAG acyclicity.

**Runs offline — no API needed.** Use frequently during authoring.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `yaml` | string | yes | YAML string to validate |

**Returns:** `{ valid, fileType, errors, stats }`

### `graspful_review_course`

Run all 10 mechanical quality checks. Returns a score (e.g., "8/10") with details on each failure. A score of 10/10 is required for publishing.

**The 10 checks:**

1. `yaml_parses` — Valid Zod schema
2. `unique_problem_ids` — No duplicate problem IDs
3. `prerequisites_valid` — All prereq refs point to real concepts
4. `question_deduplication` — No near-duplicate questions at same difficulty
5. `difficulty_staircase` — Each concept: problems at 2+ difficulty levels
6. `cross_concept_coverage` — No term overused across concepts
7. `problem_variant_depth` — Each KP: 3+ problems
8. `instruction_formatting` — Long instructions have content blocks
9. `worked_example_coverage` — 50%+ of concepts have worked examples
10. `import_dry_run` — DAG valid (no cycles)

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `yaml` | string | yes | Full course YAML string |

**Returns:** `{ passed, score, failures, warnings, stats }`

### `graspful_import_course`

Import a course YAML into a Graspful organization. Creates as draft by default. If `publish=true`, the server runs the review gate first — all 10 checks must pass.

Requires `GRASPFUL_API_KEY`.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `yaml` | string | yes | Full course YAML string |
| `org` | string | yes | Organization slug |
| `publish` | boolean | no | Publish immediately (default: false) |

**Returns:** `{ courseId, url, published, reviewFailures? }`

### `graspful_publish_course`

Publish a draft course. Server runs the review gate — all 10 checks must pass.

Requires `GRASPFUL_API_KEY`.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `courseId` | string | yes | Course ID (UUID) |
| `org` | string | yes | Organization slug |

**Returns:** `{ courseId, published }`

### `graspful_describe_course`

Compute statistics for a course YAML without importing it. Use to track authoring progress.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `yaml` | string | yes | Full course YAML string |

**Returns:** `{ courseName, courseId, version, estimatedHours, concepts, authoredConcepts, stubConcepts, knowledgePoints, problems, graphDepth, conceptsWithoutKps, kpsWithoutProblems, sections }`

### `graspful_create_brand`

Generate a brand YAML scaffold for a white-label learning site. Niche presets set appropriate colors, taglines, and copy.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `niche` | string | yes | `education`, `healthcare`, `finance`, `tech`, or `legal` |
| `name` | string | no | Brand name |
| `domain` | string | no | Custom domain |
| `orgSlug` | string | no | Organization slug |

### `graspful_import_brand`

Import a brand YAML into Graspful. Creates the white-label site configuration.

Requires `GRASPFUL_API_KEY`.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `yaml` | string | yes | Full brand YAML string |

**Returns:** `{ slug, domain, verificationStatus }`

### `graspful_list_courses`

List all courses in a Graspful organization.

Requires `GRASPFUL_API_KEY`.

**Inputs:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org` | string | yes | Organization slug |

## Agent Workflow

The typical course creation flow using these tools:

```
graspful_scaffold_course(topic: "Kubernetes Networking", estimatedHours: 8)
  → Edit the returned YAML: add concepts, set prerequisites, difficulty levels
  → graspful_validate(yaml) — catch schema errors early

graspful_fill_concept(yaml, conceptId: "k8s-services") — repeat for each concept
  → Replace TODO placeholders with real content
  → graspful_validate(yaml) — validate after each edit

graspful_review_course(yaml) — run quality gate
  → Fix any failures, re-review until 10/10

graspful_import_course(yaml, org: "acme", publish: true) — ship it
```

Offline tools (`scaffold`, `fill`, `validate`, `review`, `describe`) need no API key. Only `import`, `publish`, `import_brand`, and `list_courses` require authentication.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GRASPFUL_API_KEY` | API key for authenticated tools (import, publish, list) |
| `GRASPFUL_API_URL` | API base URL (default: `https://api.graspful.com`) |

## Related Docs

- [Content Authoring Guide](../../content/README.md) — YAML schema reference and authoring rules
- [Course Review Gate](../../docs/course-review-gate.md) — review specification and all 10 quality checks
- [CLI Agent Strategy](../../docs/cli-agent-strategy.md) — design philosophy and architecture
