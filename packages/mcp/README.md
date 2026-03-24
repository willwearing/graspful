# @graspful/mcp

[![npm version](https://img.shields.io/npm/v/@graspful/mcp)](https://www.npmjs.com/package/@graspful/mcp)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/npm/l/@graspful/mcp)](https://github.com/willwearing/graspful/blob/main/LICENSE)

MCP server for creating adaptive learning courses. AI agents scaffold, validate, review, and publish courses as YAML knowledge graphs.

Part of [Graspful](https://graspful.com) -- the agent-first adaptive learning platform. Courses are authored as two YAML files (graph structure + content), validated offline, then imported via API.

## Quick Setup

### Auto-configure (recommended)

```bash
npx @graspful/cli init
```

Detects your editor (Claude Code, Cursor, Windsurf) and writes the MCP config automatically.

### Manual

Add to your editor's MCP config (see [Editor Configuration](#editor-configuration) below):

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

The API key is only needed for import/publish/list operations. Scaffold, fill, validate, review, and describe all work offline.

## Available Tools

10 tools. Focused and minimal -- agents degrade above 40 tools.

| Tool | Description | Auth Required |
|------|-------------|:---:|
| `graspful_scaffold_course` | Generate a course YAML skeleton with sections, concepts, and prerequisite edges | No |
| `graspful_fill_concept` | Add knowledge points and problem stubs to a specific concept | No |
| `graspful_validate` | Validate any Graspful YAML against its Zod schema. Auto-detects file type | No |
| `graspful_review_course` | Run all 10 mechanical quality checks. Returns a score with failure details | No |
| `graspful_describe_course` | Compute course statistics without importing (concept/KP/problem counts, graph depth) | No |
| `graspful_create_brand` | Generate brand YAML scaffold for a white-label learning site | No |
| `graspful_import_course` | Import course YAML into an organization. Creates as draft by default | Yes |
| `graspful_publish_course` | Publish a draft course. Runs review gate first -- all 10 checks must pass | Yes |
| `graspful_import_brand` | Import brand YAML to create white-label site config | Yes |
| `graspful_list_courses` | List all courses in an organization | Yes |

## Tool Reference

### `graspful_scaffold_course`

Generate a course YAML skeleton with sections, concepts, and prerequisite edges. Returns a minimal valid YAML structure with TODO placeholders. This is step 1 of the Graspful two-YAML workflow.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `topic` | string | Yes | Course topic (e.g., "Linear Algebra") |
| `estimatedHours` | number | No | Total course hours (default: 10) |
| `sourceDocument` | string | No | Reference to source material |

### `graspful_fill_concept`

Add knowledge points (KPs) and problem stubs to a specific concept in a course YAML. Returns the full updated YAML. Fails if the concept already has KPs (prevents accidental overwrites).

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `yaml` | string | Yes | Full course YAML string |
| `conceptId` | string | Yes | ID of the concept to fill |
| `kps` | number | No | Number of KP stubs (default: 2) |
| `problemsPerKp` | number | No | Problems per KP (default: 3) |

### `graspful_validate`

Validate any Graspful YAML (course, brand, or academy manifest) against its Zod schema. Auto-detects file type. For courses, also checks DAG validity and prerequisite integrity. Runs offline -- no API needed. Use frequently during authoring.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `yaml` | string | Yes | YAML string to validate |

**Returns:** `{ valid, fileType, errors, stats }`

### `graspful_review_course`

Run all 10 mechanical quality checks. Returns a score (e.g., "8/10") with details on each failure. A score of 10/10 is required for publishing.

**The 10 checks:**

1. Schema validation (valid Zod schema)
2. Unique problem IDs
3. Valid prerequisites (all refs point to real concepts)
4. No DAG cycles
5. Minimum KPs per concept
6. Minimum problems per KP
7. Difficulty distribution (2+ levels per concept)
8. Explanation coverage (worked examples)
9. Question deduplication (no near-duplicates at same difficulty)
10. Concept tag coverage

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `yaml` | string | Yes | Full course YAML string |

**Returns:** `{ passed, score, failures, warnings, stats }`

### `graspful_import_course`

Import course YAML into a Graspful organization. Creates as draft by default. If `publish=true`, the server runs the review gate first.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `yaml` | string | Yes | Full course YAML string |
| `org` | string | Yes | Organization slug |
| `publish` | boolean | No | Publish immediately (default: false) |

**Returns:** `{ courseId, url, published, reviewFailures? }`

### `graspful_publish_course`

Publish a draft course. Server runs the review gate first -- all 10 checks must pass.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `courseId` | string | Yes | Course ID (UUID) |
| `org` | string | Yes | Organization slug |

**Returns:** `{ courseId, published }`

### `graspful_describe_course`

Compute statistics for a course YAML without importing it. Use to track authoring progress.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `yaml` | string | Yes | Full course YAML string |

**Returns:** `{ courseName, courseId, version, estimatedHours, concepts, authoredConcepts, stubConcepts, knowledgePoints, problems, graphDepth, conceptsWithoutKps, kpsWithoutProblems, sections }`

### `graspful_create_brand`

Generate brand YAML scaffold for a white-label learning site. Niche presets set appropriate colors, taglines, and copy.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `niche` | string | Yes | `education`, `healthcare`, `finance`, `tech`, or `legal` |
| `name` | string | No | Brand name |
| `domain` | string | No | Custom domain |
| `orgSlug` | string | No | Organization slug |

### `graspful_import_brand`

Import brand YAML into Graspful. Creates the white-label site configuration.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `yaml` | string | Yes | Full brand YAML string |
| `orgSlug` | string | Yes | Organization slug |

**Returns:** `{ slug, domain, verificationStatus }`

### `graspful_list_courses`

List all courses in a Graspful organization.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `org` | string | Yes | Organization slug |

## Typical Agent Workflow

```
1. Scaffold       graspful_scaffold_course(topic: "Kubernetes Networking", estimatedHours: 8)
                  Edit the returned YAML -- add concepts, set prerequisites

2. Validate       graspful_validate(yaml) -- catch schema errors early

3. Fill           graspful_fill_concept(yaml, conceptId: "k8s-services")
                  Repeat for each concept. Replace TODO placeholders with real content.
                  Validate after each fill.

4. Review         graspful_review_course(yaml) -- run quality gate
                  Fix failures, re-review until 10/10

5. Import         graspful_import_course(yaml, org: "acme") -- creates draft

6. Brand          graspful_create_brand(niche: "tech", name: "Acme Learn")
                  graspful_import_brand(yaml, orgSlug: "acme")

7. Publish        graspful_publish_course(courseId: "...", org: "acme")
```

Offline tools (scaffold, fill, validate, review, describe, create_brand) need no API key. Only import, publish, import_brand, and list_courses require `GRASPFUL_API_KEY`.

## Editor Configuration

### Claude Code / Claude Desktop

Add to `~/.claude/claude_desktop_config.json` or your project's `.mcp.json`:

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

Add to `.cursor/mcp.json` in your project root:

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

### Windsurf / Codex / Other MCP-compatible agents

Same pattern -- point `command` at `npx` and `args` at `@graspful/mcp`. The server communicates over stdio using the [Model Context Protocol](https://modelcontextprotocol.io).

## Environment Variables

| Variable | Required | Description |
|----------|:---:|-------------|
| `GRASPFUL_API_KEY` | For import/publish/list | API key for authenticated operations |
| `GRASPFUL_API_URL` | No | API base URL (default: `https://api.graspful.com`) |

## Links

- [Graspful](https://graspful.com) -- Platform
- [Content Authoring Guide](../../content/README.md) -- YAML schema reference and authoring rules
- [Course Review Gate](../../docs/course-review-gate.md) -- Full specification of all 10 quality checks
- [CLI Agent Strategy](../../docs/cli-agent-strategy.md) -- Design philosophy and architecture
- [@graspful/cli](https://www.npmjs.com/package/@graspful/cli) -- CLI companion package
- [Model Context Protocol](https://modelcontextprotocol.io) -- MCP specification
