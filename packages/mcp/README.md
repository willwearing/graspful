# @graspful/mcp

[![npm version](https://img.shields.io/npm/v/@graspful/mcp)](https://www.npmjs.com/package/@graspful/mcp)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/npm/l/@graspful/mcp)](https://github.com/willwearing/graspful/blob/main/LICENSE)

MCP server for creating adaptive learning academies and courses. AI agents scaffold, validate, review, and publish academy manifests, course YAMLs, and brand YAMLs as a connected product.

Part of [Graspful](https://graspful.ai) -- the agent-first adaptive learning platform. Academies are authored as an academy manifest plus one or more course YAMLs, then paired with a brand YAML for the learner-facing landing page.

## Quick Start

### 1. Configure your editor

Follow the [editor-specific configuration](#editor-configuration) below. You can omit `GRASPFUL_API_KEY` while authoring offline.

### 2. Author and review an academy

```
graspful_create_academy(topic: "Your Topic")
→ create or author the course YAMLs referenced by the manifest
graspful_scaffold_course(topic: "Your First Course", estimatedHours: 10)
→ edit the YAML
graspful_validate(yaml: "...")
graspful_review_course(yaml: "...")
```

Scaffold, fill, validate, and review work offline. Scaffolds contain unfinished content. Author every concept and replace placeholders before publication review.

### 3. Authenticate and import

Run the CLI to complete browser auth and mint an API key:

```bash
bunx @graspful/cli register
```

Add the returned key as `GRASPFUL_API_KEY` in your editor's Graspful server configuration, then restart the MCP server. After review passes, import the academy and request publication:

```
graspful_import_academy(manifestYaml: "...", courseYamls: { "courses/course.yaml": "..." }, org: "your-org", publish: true)
```

Confirm each course appears in `publishedCourseIds`. Failed publications return `isError: true` with details and preserve the imported draft.

## Available Tools

12 tools for academy and course authoring.

| Tool | Description | Auth Required |
|------|-------------|:---:|
| `graspful_create_academy` | Generate an academy plan and manifest scaffold | No |
| `graspful_scaffold_course` | Generate a course YAML skeleton with sections, concepts, and prerequisite edges | No |
| `graspful_fill_concept` | Add knowledge points and problem stubs to a specific concept | No |
| `graspful_validate` | Validate any Graspful YAML against its Zod schema. Auto-detects file type | No |
| `graspful_review_course` | Run all 10 mechanical quality checks. Returns a score with failure details | No |
| `graspful_describe_course` | Compute course statistics without importing (concept/KP/problem counts, graph depth) | No |
| `graspful_create_brand` | Generate brand YAML scaffold for a white-label learning site | No |
| `graspful_import_academy` | Import academy manifest + course YAMLs. Optionally publish imported courses | Yes |
| `graspful_import_course` | Import course YAML into an organization. Creates as draft by default | Yes |
| `graspful_publish_course` | Publish a draft course. Runs review gate first -- all 10 checks must pass | Yes |
| `graspful_import_brand` | Import brand YAML to create white-label site config | Yes |
| `graspful_list_courses` | List all courses in an organization | Yes |

## Tool Reference

### `graspful_create_academy`

Generate an academy plan and manifest scaffold. Every Graspful product should be modeled as an academy, even if it starts with a single course.

If `courseNames` is omitted, the scaffold starts with the four default planning layers: foundations, core structures, operational flows, and applied judgment. It also returns authoring gates for the source material, learner promise, landing-page proof, graph checks, and review before publishing.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `topic` | string | Yes | Academy topic (e.g., "PostHog TAM") |
| `courseNames` | string[] | No | Ordered course names for the manifest. Defaults to the four academy planning layers. |
| `version` | string | No | Academy version string |

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

Run all 10 automated quality checks. Returns a score (e.g., "8/10") with details on each failure. All 10 must pass before publishing. Check factual accuracy against your sources separately.

**The 10 checks:**

1. `yaml_parses`: Course structure and problem answers match the schema.
2. `unique_problem_ids`: Every problem has a unique ID.
3. `publication_readiness`: Every concept has teaching content and known scaffold markers are removed.
4. `question_deduplication`: Questions at the same difficulty have distinct normalized text.
5. `difficulty_staircase`: Each concept has problems at two or more difficulty levels.
6. `problem_teaching_alignment`: A vocabulary check flags questions that appear unrelated to the teaching path.
7. `problem_variant_depth`: Each knowledge point has at least three problems.
8. `instruction_formatting`: Instructions longer than 100 words include content blocks.
9. `worked_example_coverage`: At least half of authored concepts include a worked example.
10. `import_dry_run`: Concept and knowledge point IDs are unique in their scopes; prerequisites exist without cycles.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `yaml` | string | Yes | Full course YAML string |

**Returns:** `{ passed, score, failures, warnings, stats }`

### `graspful_import_academy`

Import academy manifest YAML plus the course YAMLs it references.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `manifestYaml` | string | Yes | Full academy manifest YAML string |
| `courseYamls` | object | Yes | Map of manifest file paths to full course YAML strings |
| `org` | string | Yes | Organization slug |
| `publish` | boolean | No | Publish imported courses after academy import |
| `replace` | boolean | No | Replace existing content on re-import |
| `archiveMissing` | boolean | No | Archive removed content on re-import |

The result includes confirmed `publishedCourseIds` and `publishFailures`. When any requested publication fails, the tool returns `isError: true` while preserving the academy import result and successful publications. A mixed result has `status: "partially_published"`; if no course was published, it has `status: "imported_but_not_published"`.

### `graspful_import_course`

Import course YAML into a Graspful organization. Creates as draft by default. If `publish=true`, the server runs the review gate first.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `yaml` | string | Yes | Full course YAML string |
| `org` | string | Yes | Organization slug |
| `publish` | boolean | No | Publish immediately (default: false) |

**Returns:** `{ courseId, url, published, review?, reviewFailures? }`

If `publish: true` was requested and the server does not return `published: true`, the tool returns `isError: true`. The result preserves the imported course and review, with `status: "imported_but_not_published"` and readable `publicationFailures`. A draft import without requested publication is successful.

### `graspful_publish_course`

Publish a draft course. Server runs the review gate first -- all 10 checks must pass.

| Parameter | Type | Required | Description |
|-----------|------|:---:|-------------|
| `courseId` | string | Yes | Course ID (UUID) |
| `org` | string | Yes | Organization slug |

**Returns:** `{ courseId, published, url, review }`

Success requires `published: true`. Otherwise the tool returns `isError: true`, `status: "not_published"`, and `publicationFailures`, including review check names and details.

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
| `topic` | string | No | Academy topic for more specific landing-page copy |
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
1. Academy shell  graspful_create_academy(topic: "Kubernetes Networking")
                  Define the academy boundary first, then author the courses inside it.

2. Course graph   graspful_scaffold_course(topic: "Kubernetes Networking Foundations", estimatedHours: 8)
                  Edit the returned YAML -- add concepts, set prerequisites

3. Validate       graspful_validate(yaml) -- catch schema errors early

4. Fill           graspful_fill_concept(yaml, conceptId: "k8s-services")
                  Repeat for each concept. Replace TODO placeholders with real content.
                  Validate after each fill.

5. Review         graspful_review_course(yaml) -- run quality gate
                  Fix failures, re-review until 10/10

6. Brand          graspful_create_brand(niche: "tech", topic: "Kubernetes Networking", name: "Acme Learn")
                  Replace scaffold copy with learner-specific landing-page proof
                  graspful_import_brand(yaml, orgSlug: "acme")

7. Import         graspful_import_academy(manifestYaml, courseYamls, org: "acme", publish: true)
```

Offline tools (scaffold, fill, validate, review, describe, create_brand) need no API key. Only import, publish, import_brand, and list_courses require `GRASPFUL_API_KEY`.

## Editor Configuration

### Claude Code

```bash
claude mcp add --scope user graspful --env GRASPFUL_API_KEY=gsk_your_key_here -- bunx @graspful/mcp
```

### Codex

```bash
codex mcp add graspful --env GRASPFUL_API_KEY=gsk_your_key_here -- bunx @graspful/mcp
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

### VS Code

Use the `servers` key in `.vscode/mcp.json`:

```json
{
  "servers": {
    "graspful": {
      "type": "stdio",
      "command": "bunx",
      "args": ["@graspful/mcp"],
      "env": { "GRASPFUL_API_KEY": "gsk_your_key_here" }
    }
  }
}
```

See the [VS Code MCP documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers).

### Windsurf Cascade

Use the Cursor configuration shape above in `~/.codeium/windsurf/mcp_config.json`, as described in the [Cascade MCP documentation](https://docs.devin.ai/desktop/cascade/mcp).

The Graspful server uses stdio. Other MCP clients need their own configuration format. `graspful init` can configure detected Claude Code, Cursor, VS Code, and Windsurf Cascade installations after authentication. If an existing file cannot be parsed, the command preserves it and reports a failure.

## Environment Variables

| Variable | Required | Description |
|----------|:---:|-------------|
| `GRASPFUL_API_KEY` | For import/publish/list | API key for authenticated operations |
| `GRASPFUL_API_URL` | No | API base URL (default: `https://api.graspful.ai`) |
| `GRASPFUL_USER_ID` | No | Graspful user ID for analytics identity continuity |
| `GRASPFUL_TELEMETRY_DISABLED` | No | Set to `1` to disable anonymous product analytics |

The MCP server sends tool usage and outcome metadata to help improve Graspful. It never sends API keys or YAML course bodies. Set `GRASPFUL_TELEMETRY_DISABLED=1` to disable this data collection.

## Links

- [Graspful](https://graspful.ai) -- Platform
- [Content Authoring Guide](../../content/README.md) -- YAML schema reference and authoring rules
- [Course Review Gate](../../docs/course-review-gate.md) -- Full specification of all 10 quality checks
- [CLI Agent Strategy](../../docs/cli-agent-strategy.md) -- Design philosophy and architecture
- [@graspful/cli](https://www.npmjs.com/package/@graspful/cli) -- CLI companion package
- [Model Context Protocol](https://modelcontextprotocol.io) -- MCP specification
