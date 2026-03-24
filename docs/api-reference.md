# Graspful API Reference

Version: 0.1.0

---

## Table of Contents

- [1. CLI Reference](#1-cli-reference)
  - [Global Options](#global-options)
  - [graspful create course](#graspful-create-course)
  - [graspful create brand](#graspful-create-brand)
  - [graspful fill concept](#graspful-fill-concept)
  - [graspful validate](#graspful-validate)
  - [graspful review](#graspful-review)
  - [graspful describe](#graspful-describe)
  - [graspful import](#graspful-import)
  - [graspful publish](#graspful-publish)
  - [graspful login](#graspful-login)
  - [graspful register](#graspful-register)
- [2. MCP Tools Reference](#2-mcp-tools-reference)
  - [graspful_scaffold_course](#graspful_scaffold_course)
  - [graspful_fill_concept](#graspful_fill_concept)
  - [graspful_validate](#graspful_validate)
  - [graspful_review_course](#graspful_review_course)
  - [graspful_import_course](#graspful_import_course)
  - [graspful_publish_course](#graspful_publish_course)
  - [graspful_describe_course](#graspful_describe_course)
  - [graspful_create_brand](#graspful_create_brand)
  - [graspful_import_brand](#graspful_import_brand)
  - [graspful_list_courses](#graspful_list_courses)
- [3. YAML Schema Reference](#3-yaml-schema-reference)
  - [Course YAML](#course-yaml)
  - [Brand YAML](#brand-yaml)
  - [Academy Manifest YAML](#academy-manifest-yaml)
- [4. Authentication](#4-authentication)
- [5. Environment Variables](#5-environment-variables)
- [6. Error Codes](#6-error-codes)

---

## 1. CLI Reference

### Global Options

All commands accept these global options:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--format <format>` | `human` \| `json` | `human` | Output format. `json` outputs structured JSON to stdout. |
| `--version` | — | — | Print version and exit. |
| `--help` | — | — | Print help for the command. |

When `--format json` is set, all commands emit structured JSON to stdout and structured error JSON to stderr.

---

### `graspful create course`

Generate a course YAML scaffold with placeholder sections and concepts.

**Syntax:**

```
graspful create course --topic <topic> [options]
```

**Parameters:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--topic <topic>` | string | Yes | — | Course topic name. |
| `--hours <hours>` | number | No | `10` | Estimated total course hours. |
| `--source <source>` | string | No | `"TODO: Add source document"` | Source document reference. |
| `-o, --output <file>` | string | No | stdout | Output file path. If omitted, YAML is printed to stdout. |
| `--scaffold-only` | boolean | No | `true` | Generate scaffold without AI enrichment. |

**Example:**

```bash
graspful create course --topic "Linear Algebra" --hours 20 --source "Strang Ch1-8"
```

**Example output (YAML to stdout):**

```yaml
course:
  id: linear-algebra
  name: Linear Algebra
  description: Adaptive course on Linear Algebra
  estimatedHours: 20
  version: '2026.1'
  sourceDocument: Strang Ch1-8
sections:
  - id: foundations
    name: Foundations
    description: Core concepts
  - id: application
    name: Application
    description: Applied concepts
concepts:
  - id: linear-algebra-intro
    name: Introduction to Linear Algebra
    section: foundations
    difficulty: 2
    estimatedMinutes: 15
    tags:
      - foundational
    prerequisites: []
    knowledgePoints: []
```

**JSON output (with `--format json` and `-o`):**

```json
{ "file": "course.yaml", "topic": "Linear Algebra" }
```

---

### `graspful create brand`

Generate a brand YAML scaffold for a white-label learning site.

**Syntax:**

```
graspful create brand --niche <niche> [options]
```

**Parameters:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--niche <niche>` | string | Yes | — | Brand niche. One of: `education`, `healthcare`, `finance`, `tech`, `legal`. Anything else uses the `default` preset. |
| `--name <name>` | string | No | `"{Niche} Academy"` | Brand display name. |
| `--domain <domain>` | string | No | `"{slug}.graspful.com"` | Custom domain. |
| `--org <slug>` | string | No | `"TODO: your-org-slug"` | Organization slug. |
| `-o, --output <file>` | string | No | stdout | Output file path. |

**Niche presets:**

| Niche | Theme Preset | Tagline |
|-------|-------------|---------|
| `education` | blue | Learn smarter, not harder |
| `healthcare` | emerald | Training that saves lives |
| `finance` | slate | Build financial expertise |
| `tech` | indigo | Level up your skills |
| `legal` | amber | Know the law, pass the exam |
| (default) | blue | Learn adaptively |

**Example:**

```bash
graspful create brand --niche healthcare --name "MedPrep Academy" --domain medprep.com --org medprep
```

---

### `graspful fill concept`

Add knowledge point (KP) and problem stubs to a specific concept in a course YAML file.

**Syntax:**

```
graspful fill concept <file> <conceptId> [options]
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `<file>` | string (path) | Yes | — | Path to the course YAML file. Modified in place. |
| `<conceptId>` | string | Yes | — | ID of the concept to fill. Must exist in the file. |
| `--kps <count>` | number | No | `2` | Number of KP stubs to generate. |
| `--problems <count>` | number | No | `3` | Number of problem stubs per KP. |

**Behavior:**
- Skips (does not overwrite) if the concept already has KPs.
- Writes the updated YAML back to the same file.
- Generated problem IDs follow pattern: `{conceptId}-kp{i}-p{j}`.
- Problem difficulty auto-increments: `min(j + 1, 5)`.

**Example:**

```bash
graspful fill concept course.yaml linear-algebra-intro --kps 3 --problems 4
```

**JSON output:**

```json
{
  "conceptId": "linear-algebra-intro",
  "kpsAdded": 3,
  "problemsPerKp": 4,
  "file": "course.yaml"
}
```

---

### `graspful validate`

Validate a course, brand, or academy YAML file against its Zod schema. Auto-detects file type from the top-level key (`course`, `brand`, or `academy`).

**Syntax:**

```
graspful validate <file>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `<file>` | string (path) | Yes | Path to the YAML file. |

**Behavior:**
- Detects file type automatically.
- Validates against the corresponding Zod schema.
- For course files, additionally validates prerequisite DAG (no dangling refs, no cycles).
- Exit code `0` on pass, `1` on failure.

**Example (pass):**

```bash
graspful validate course.yaml
```

```
PASS  course validation
  fileType: course
  concepts: 12
  knowledgePoints: 36
  problems: 108
```

**Example (fail):**

```
FAIL  course validation (2 errors):
  - concepts.0.difficulty: Expected number, received string
  - concepts.3.section: Concept "advanced-topics" references unknown section "chapter-5"
```

**JSON output:**

```json
{
  "valid": true,
  "fileType": "course",
  "errors": [],
  "stats": {
    "fileType": "course",
    "concepts": 12,
    "knowledgePoints": 36,
    "problems": 108
  }
}
```

**Authentication:** Not required. Runs offline.

---

### `graspful review`

Run all 10 mechanical quality checks on a course YAML file. Returns a score out of 10.

**Syntax:**

```
graspful review <file>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `<file>` | string (path) | Yes | Path to the course YAML file. |

**Quality checks (10 total):**

| # | Check | What It Validates |
|---|-------|--------------------|
| 1 | `yaml_parses` | Valid against CourseYamlSchema. |
| 2 | `unique_problem_ids` | No duplicate problem IDs anywhere in the course. |
| 3 | `prerequisites_valid` | All prerequisite refs point to existing concept IDs. |
| 4 | `question_deduplication` | No near-duplicate questions at the same difficulty (MD5 hash). |
| 5 | `difficulty_staircase` | Each authored concept has problems at 2+ difficulty levels. |
| 6 | `cross_concept_coverage` | No single meaningful term dominates >3 concepts (pass if <=5 violations). |
| 7 | `problem_variant_depth` | Each KP has 3+ problems. |
| 8 | `instruction_formatting` | Instructions >100 words must have content blocks. |
| 9 | `worked_example_coverage` | 50%+ of authored concepts have worked examples. |
| 10 | `import_dry_run` | DAG is valid (no cycles, no dangling prerequisite refs). |

**Example (pass):**

```
PASS
Score: 10/10
Stats: 12 concepts (12 authored, 0 stubs), 36 KPs, 108 problems
```

**Example (fail):**

```
FAIL
Score: 7/10
Stats: 12 concepts (10 authored, 2 stubs), 30 KPs, 85 problems

Failures:
  [FAIL] difficulty_staircase: "basic-ops" has problems at only 1 difficulty level(s) -- need 2+
  [FAIL] problem_variant_depth: "advanced/kp3" has 2 problem(s) -- need 3+
  [FAIL] worked_example_coverage: 4/10 authored concepts have worked examples (40%) -- need 50%+
```

**JSON output:**

```json
{
  "passed": false,
  "score": "7/10",
  "failures": [
    { "check": "difficulty_staircase", "passed": false, "details": "..." }
  ],
  "warnings": [],
  "stats": {
    "concepts": 12,
    "kps": 30,
    "problems": 85,
    "authoredConcepts": 10,
    "stubConcepts": 2
  }
}
```

**Authentication:** Not required. Runs offline.

---

### `graspful describe`

Show course statistics and structure summary without importing.

**Syntax:**

```
graspful describe <file>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `<file>` | string (path) | Yes | Path to the course YAML file. |

**Example output:**

```
Course: "Linear Algebra" (v2026.1)
Concepts: 12 (10 authored, 2 stubs)
KPs: 30, Problems: 90
Graph depth: 4
Missing: 2 concepts need KPs, 1 KPs need problems

Sections:
  foundations: 5 concepts, 15 KPs, 45 problems
  application: 7 concepts, 15 KPs, 45 problems
```

**JSON output:**

```json
{
  "courseName": "Linear Algebra",
  "courseId": "linear-algebra",
  "version": "2026.1",
  "estimatedHours": 20,
  "concepts": 12,
  "authoredConcepts": 10,
  "stubConcepts": 2,
  "knowledgePoints": 30,
  "problems": 90,
  "graphDepth": 4,
  "conceptsWithoutKps": 2,
  "kpsWithoutProblems": 1,
  "sections": [
    { "section": "foundations", "concepts": 5, "kps": 15, "problems": 45 },
    { "section": "application", "concepts": 7, "kps": 15, "problems": 45 }
  ]
}
```

**Authentication:** Not required. Runs offline.

---

### `graspful import`

Import a course or brand YAML into a Graspful instance. Auto-detects file type from the top-level key (`course` or `brand`).

**Syntax:**

```
graspful import <file> [options]
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `<file>` | string (path) | Yes | — | Path to the YAML file (course or brand). |
| `--org <slug>` | string | Yes (courses) | — | Organization slug. Required for course imports. |
| `--publish` | boolean | No | `false` | If set, publish immediately after import (runs review gate server-side). |

**Behavior — courses:**
- Sends YAML to `POST /api/v1/orgs/{org}/courses/import`.
- If `--publish` is set and the review gate fails, the course is imported as a draft and failures are returned.

**Behavior — brands:**
- Sends parsed YAML object to `POST /api/v1/brands`.
- `--org` is not required for brand imports.

**Example (course):**

```bash
graspful import course.yaml --org acme-learning --publish
```

```
Imported course: abc123-uuid
  URL: https://acme-learning.graspful.com/courses/abc123-uuid
  Published: true
```

**Example (brand):**

```bash
graspful import brand.yaml
```

```
Imported brand: medprep-academy
  Domain: medprep.com
  Verification: pending
```

**JSON output (course):**

```json
{
  "courseId": "abc123-uuid",
  "url": "https://acme-learning.graspful.com/courses/abc123-uuid",
  "published": true
}
```

**JSON output (brand):**

```json
{
  "slug": "medprep-academy",
  "domain": "medprep.com",
  "verificationStatus": "pending"
}
```

**Authentication:** Required.

---

### `graspful publish`

Publish a draft course (sets `isPublished = true`). The server runs the review gate before publishing.

**Syntax:**

```
graspful publish <courseId> --org <slug>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `<courseId>` | string | Yes | Course ID (UUID) to publish. |
| `--org <slug>` | string | Yes | Organization slug. |

**Example:**

```bash
graspful publish abc123-uuid --org acme-learning
```

```
Published course: abc123-uuid
```

**JSON output:**

```json
{ "courseId": "abc123-uuid", "published": true }
```

**Authentication:** Required.

---

### `graspful login`

Authenticate with a Graspful instance. Saves credentials to `~/.graspful/credentials.json`.

**Syntax:**

```
graspful login [options]
```

**Parameters:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--api-url <url>` | string | No | `GRASPFUL_API_URL` or `https://api.graspful.com` | API base URL. |
| `--token <token>` | string | No | — | API key or JWT. Skips interactive prompt. |

**Behavior:**
- If `--token` is provided, saves it immediately.
- If stdin is a TTY, prompts interactively for the token.
- If stdin is piped, reads the token from stdin.
- Saves to `~/.graspful/credentials.json` with mode `0600`.

**Example (interactive):**

```bash
graspful login
```

```
Authenticating with https://api.graspful.com
Enter your API key or JWT token:
(New user? Run "graspful register" instead.)
> sk-abc123...
Authenticated. Credentials saved for https://api.graspful.com
```

**Example (non-interactive):**

```bash
graspful login --token sk-abc123
```

---

### `graspful register`

Create a new Graspful account and organization. Saves the returned API key to `~/.graspful/credentials.json`.

**Syntax:**

```
graspful register --email <email> --password <password> [options]
```

**Parameters:**

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--email <email>` | string | Yes | — | Email address. |
| `--password <password>` | string | Yes | — | Password. |
| `--api-url <url>` | string | No | `GRASPFUL_API_URL` or `https://api.graspful.com` | API base URL. |

**Example:**

```bash
graspful register --email alice@example.com --password s3cret
```

```
Created org: alice-org
API key: sk-abc123... (saved to ~/.graspful/credentials.json)

You're ready. Run: graspful import course.yaml --org alice-org
```

**JSON output:**

```json
{
  "userId": "uuid",
  "orgSlug": "alice-org",
  "apiKey": "sk-abc123...",
  "baseUrl": "https://api.graspful.com"
}
```

---

## 2. MCP Tools Reference

The Graspful MCP server exposes 10 tools over the Model Context Protocol (stdio transport). Server name: `graspful`, version `0.1.0`.

All tools return `{ content: [{ type: "text", text: "..." }], isError?: boolean }`. The `text` field contains either raw YAML or a JSON string depending on the tool.

---

### `graspful_scaffold_course`

Generate a course YAML skeleton with sections, concepts, and prerequisite edges.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `topic` | string | Yes | — | Course topic name (e.g., "Linear Algebra"). |
| `estimatedHours` | number | No | `10` | Estimated total course hours. |
| `sourceDocument` | string | No | `"TODO: Add source document"` | Reference to source material. |

**Returns:** Raw YAML string (not JSON-wrapped).

**Example request:**

```json
{
  "name": "graspful_scaffold_course",
  "arguments": {
    "topic": "AWS Solutions Architect",
    "estimatedHours": 40,
    "sourceDocument": "AWS SAA-C03 Exam Guide"
  }
}
```

**Example response text:**

```yaml
course:
  id: aws-solutions-architect
  name: AWS Solutions Architect
  description: Adaptive course on AWS Solutions Architect
  estimatedHours: 40
  version: '2026.1'
  sourceDocument: AWS SAA-C03 Exam Guide
sections:
  - id: foundations
    name: Foundations
    description: Core concepts
  - id: application
    name: Application
    description: Applied concepts
concepts:
  - id: aws-solutions-architect-intro
    name: Introduction to AWS Solutions Architect
    section: foundations
    difficulty: 2
    estimatedMinutes: 15
    tags:
      - foundational
    prerequisites: []
    knowledgePoints: []
```

**Error cases:** None. Always succeeds.

---

### `graspful_fill_concept`

Add KP and problem stubs to a specific concept. Returns the full updated YAML.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `yaml` | string | Yes | — | The full course YAML string. |
| `conceptId` | string | Yes | — | ID of the concept to fill. Must exist and have 0 KPs. |
| `kps` | number | No | `2` | Number of KP stubs to add. |
| `problemsPerKp` | number | No | `3` | Number of problem stubs per KP. |

**Returns:** Updated full course YAML string (not JSON-wrapped).

**Error cases:**

| Condition | Error message |
|-----------|---------------|
| Invalid YAML | `Invalid course YAML: {details}` |
| Concept not found | `Concept "{id}" not found. Available: {ids}` |
| Concept already has KPs | `Concept "{id}" already has {n} KP(s). Remove them first to regenerate.` |

---

### `graspful_validate`

Validate any Graspful YAML against its Zod schema. Auto-detects file type.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `yaml` | string | Yes | The YAML string to validate (course, brand, or academy manifest). |

**Returns:** JSON string with structure:

```json
{
  "valid": true,
  "fileType": "course",
  "errors": [],
  "stats": {
    "fileType": "course",
    "concepts": 12,
    "knowledgePoints": 36,
    "problems": 108
  }
}
```

**Error cases (returned in `errors` array, not `isError`):**

| Condition | Error message |
|-----------|---------------|
| YAML parse error | `YAML parse error: {details}` |
| Unknown file type | `Could not detect file type. Expected top-level key: course, brand, or academy` |
| Schema violation | `{path}: {message}` for each Zod issue |
| DAG error (courses) | `Concept "{id}" has unknown prerequisite "{ref}"` |
| Cycle detected (courses) | `Cycle: A -> B -> A` |

---

### `graspful_review_course`

Run all 10 quality checks on a course YAML. Returns score and detailed results.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `yaml` | string | Yes | The full course YAML string. |

**Returns:** JSON string with structure:

```json
{
  "passed": true,
  "score": "10/10",
  "failures": [],
  "warnings": [],
  "stats": {
    "concepts": 12,
    "kps": 36,
    "problems": 108,
    "authoredConcepts": 12,
    "stubConcepts": 0
  }
}
```

Each failure object:

```json
{ "check": "difficulty_staircase", "passed": false, "details": "..." }
```

See the [quality checks table](#graspful-review) for the full list of 10 checks.

**Error cases:** If YAML fails to parse, returns `score: "0/10"` with only the `yaml_parses` check failing.

---

### `graspful_import_course`

Import a course YAML into a Graspful organization via the API.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `yaml` | string | Yes | — | The full course YAML string. |
| `org` | string | Yes | — | Organization slug (e.g., "acme-learning"). |
| `publish` | boolean | No | `false` | Publish immediately (runs server-side review gate). |

**Returns:** JSON string:

```json
{
  "courseId": "uuid",
  "url": "https://...",
  "published": true,
  "reviewFailures": []
}
```

`reviewFailures` is present only when `publish=true` and the review gate failed.

**Error cases:**

| Condition | Error |
|-----------|-------|
| No API key | `Import failed: API error 401: Unauthorized` |
| Invalid org | `Import failed: API error 404: ...` |
| Server error | `Import failed: API error {status}: {body}` |

**Authentication:** Requires `GRASPFUL_API_KEY`.

---

### `graspful_publish_course`

Publish a draft course. Server runs the review gate before publishing.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `courseId` | string | Yes | Course ID (UUID). |
| `org` | string | Yes | Organization slug. |

**Returns:** JSON string:

```json
{ "courseId": "uuid", "published": true }
```

**Error cases:**

| Condition | Error |
|-----------|-------|
| No API key | `Publish failed: API error 401: Unauthorized` |
| Course not found | `Publish failed: API error 404: ...` |
| Review gate fails | `Publish failed: API error 422: ...` |

**Authentication:** Requires `GRASPFUL_API_KEY`.

---

### `graspful_describe_course`

Compute statistics for a course YAML without importing it.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `yaml` | string | Yes | The full course YAML string. |

**Returns:** JSON string:

```json
{
  "courseName": "Linear Algebra",
  "courseId": "linear-algebra",
  "version": "2026.1",
  "estimatedHours": 20,
  "concepts": 12,
  "authoredConcepts": 10,
  "stubConcepts": 2,
  "knowledgePoints": 30,
  "problems": 90,
  "graphDepth": 4,
  "conceptsWithoutKps": 2,
  "conceptsWithoutKpsList": ["concept-a", "concept-b"],
  "kpsWithoutProblems": 1,
  "kpsWithoutProblemsList": ["concept-c/kp1"],
  "sections": [
    { "section": "foundations", "concepts": 5, "kps": 15, "problems": 45 }
  ]
}
```

**Error cases:**

| Condition | Error |
|-----------|-------|
| Invalid YAML | `Invalid course YAML: {details}` |

**Authentication:** Not required. Runs offline.

---

### `graspful_create_brand`

Generate a brand YAML scaffold for a white-label learning site.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `niche` | string | Yes | — | Brand niche: `education`, `healthcare`, `finance`, `tech`, or `legal`. |
| `name` | string | No | `"{Niche} Academy"` | Brand display name. |
| `domain` | string | No | `"{slug}.graspful.com"` | Custom domain. |
| `orgSlug` | string | No | `"TODO: your-org-slug"` | Organization slug to associate with. |

**Returns:** Raw YAML string (not JSON-wrapped).

**Error cases:** None. Always succeeds. Unknown niches fall back to the `default` preset.

---

### `graspful_import_brand`

Import a brand YAML into Graspful via the API.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `yaml` | string | Yes | The full brand YAML string. |

**Returns:** JSON string:

```json
{
  "slug": "medprep-academy",
  "domain": "medprep.com",
  "verificationStatus": "pending"
}
```

**Error cases:**

| Condition | Error |
|-----------|-------|
| YAML parse error | `Brand import failed: YAML parse error: {details}` |
| No API key | `Brand import failed: API error 401: Unauthorized` |
| Server error | `Brand import failed: API error {status}: {body}` |

**Authentication:** Requires `GRASPFUL_API_KEY`.

---

### `graspful_list_courses`

List all courses in a Graspful organization.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `org` | string | Yes | Organization slug (e.g., "acme-learning"). |

**Returns:** JSON string (array of course objects).

**Error cases:**

| Condition | Error |
|-----------|-------|
| No API key | `List failed: API error 401: Unauthorized` |
| Invalid org | `List failed: API error 404: ...` |

**Authentication:** Requires `GRASPFUL_API_KEY`.

---

## 3. YAML Schema Reference

All schemas are defined as Zod schemas in `packages/shared/src/schemas/`.

---

### Course YAML

Top-level key: `course`. File: `course-yaml.schema.ts`.

#### `course` (required)

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | — | Slug identifier for the course. |
| `name` | string | Yes | — | Human-readable course name. |
| `description` | string | No | — | Course description. |
| `estimatedHours` | number | Yes | > 0 | Total estimated study hours. |
| `version` | string | Yes | — | Version string (e.g., "2026.1"). |
| `sourceDocument` | string | No | — | Reference to source material. |

#### `sections` (optional, default: `[]`)

Array of section objects:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `id` | string | Yes | — | Unique section identifier. |
| `name` | string | Yes | — | Section display name. |
| `description` | string | No | — | Section description. |
| `sectionExam` | object | No | — | Section exam configuration (see below). |

#### `sectionExam` (optional, nested in section)

| Field | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `enabled` | boolean | No | `true` | — | Whether the section exam is active. |
| `passingScore` | number | No | `0.75` | 0-1 | Minimum score to pass. |
| `timeLimitMinutes` | number | No | — | > 0, integer | Time limit in minutes. |
| `questionCount` | number | No | `10` | > 0, integer | Number of exam questions. |
| `blueprint` | array | No | `[]` | — | Per-concept minimum question requirements. |
| `instructions` | string | No | — | — | Exam instructions shown to students. |

`blueprint` items:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `conceptId` | string | Yes | Must reference a concept in the same section | Concept to draw questions from. |
| `minQuestions` | number | Yes | > 0, integer | Minimum questions from this concept. |

**Section exam validation rules:**
- Section must have 2+ concepts when exam is enabled.
- `questionCount` must be >= sum of all `blueprint[].minQuestions`.
- Section must have enough problems across its concepts to fill `questionCount`.
- Blueprint concepts must belong to the same section.

#### `concepts` (required)

Array of concept objects:

| Field | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `id` | string | Yes | — | — | Unique concept identifier. |
| `name` | string | Yes | — | — | Concept display name. |
| `section` | string | No | — | Must reference a section `id` | Section this concept belongs to. |
| `difficulty` | number | Yes | — | 1-10, integer | Concept difficulty level. |
| `estimatedMinutes` | number | Yes | — | > 0, integer | Estimated time to learn. |
| `tags` | string[] | No | `[]` | — | Arbitrary tags. |
| `sourceRef` | string | No | — | — | Reference to source material section. |
| `prerequisites` | string[] | No | `[]` | Must reference concept `id`s. No cycles. | Prerequisite concept IDs. |
| `encompassing` | object[] | No | `[]` | — | Encompassing relationship refs. |
| `knowledgePoints` | object[] | No | `[]` | — | Knowledge points for this concept. |

`encompassing` items:

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `concept` | string | Yes | — | Referenced concept ID. |
| `weight` | number | Yes | 0-1 | How much of the referenced concept this one covers. |

#### Knowledge Points

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | string | Yes | — | Unique KP identifier. |
| `instruction` | string | No | — | Teaching content (markdown or file reference). |
| `instructionContent` | ContentBlock[] | No | `[]` | Rich content blocks (images, videos, etc). |
| `workedExample` | string | No | — | Step-by-step worked example. |
| `workedExampleContent` | ContentBlock[] | No | `[]` | Rich content blocks for the worked example. |
| `problems` | Problem[] | No | `[]` | Assessment problems. |

#### Content Blocks (discriminated union on `type`)

**Image:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"image"` | Yes | — |
| `url` | string | Yes | Image URL. |
| `alt` | string | Yes | Alt text. |
| `caption` | string | No | Caption text. |
| `width` | number | No | Width in pixels (positive integer). |

**Video:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"video"` | Yes | — |
| `url` | string | Yes | Video URL. |
| `title` | string | Yes | Video title. |
| `caption` | string | No | Caption text. |

**Link:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"link"` | Yes | — |
| `url` | string | Yes | Link URL. |
| `title` | string | Yes | Link title. |
| `description` | string | No | Link description. |

**Callout:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"callout"` | Yes | — |
| `title` | string | Yes | Callout title. |
| `body` | string | Yes | Callout body text. |

#### Problems

| Field | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `id` | string | Yes | — | Must be unique across the entire course | Problem identifier. |
| `type` | enum | Yes | — | One of: `multiple_choice`, `fill_blank`, `true_false`, `ordering`, `matching`, `scenario` | Problem type. |
| `question` | string | Yes | — | — | Question text. |
| `options` | string[] | No | — | — | Answer options (for multiple_choice, etc). |
| `correct` | number \| string | Yes | — | — | Correct answer index (number) or value (string). |
| `explanation` | string | No | — | — | Explanation of the correct answer. |
| `difficulty` | number | No | — | 1-5, integer | Problem difficulty level. |

---

### Brand YAML

Top-level key: `brand`. File: `brand-yaml.schema.ts`.

#### `brand` (required)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Brand slug identifier. |
| `name` | string | Yes | Brand display name. |
| `domain` | string | Yes | Domain for the white-label site. |
| `tagline` | string | Yes | Short tagline. |
| `logoUrl` | string | No | Logo image URL. |
| `faviconUrl` | string | No | Favicon URL. |
| `ogImageUrl` | string | No | Open Graph image URL. |
| `orgSlug` | string | Yes | Organization slug this brand belongs to. |

#### `theme` (optional)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `preset` | enum | No | — | One of: `blue`, `red`, `green`, `orange`, `purple`, `slate`, `emerald`, `rose`, `amber`, `indigo`. |
| `radius` | string | No | `"0.5rem"` | Border radius. |
| `light` | object | No | — | Light mode HSL color overrides (19 color tokens). |
| `dark` | object | No | — | Dark mode HSL color overrides (19 color tokens). |

Theme color tokens (all optional, HSL format `"220 90% 50%"`):
`background`, `foreground`, `card`, `cardForeground`, `popover`, `popoverForeground`, `primary`, `primaryForeground`, `secondary`, `secondaryForeground`, `muted`, `mutedForeground`, `accent`, `accentForeground`, `destructive`, `destructiveForeground`, `border`, `input`, `ring`.

#### `landing` (required)

**`hero` (required):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `headline` | string | Yes | Hero headline. |
| `subheadline` | string | Yes | Hero subheadline. |
| `ctaText` | string | Yes | Call-to-action button text. |

**`features` (required):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `heading` | string | Yes | Features section heading. |
| `subheading` | string | No | Features section subheading. |
| `items` | array | Yes (min 1) | Feature items. |

Feature item:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Feature title. |
| `description` | string | Yes | Feature description. |
| `icon` | string | Yes | Icon identifier. |
| `wide` | boolean | No | Display as wide card. |

**`howItWorks` (required):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `heading` | string | Yes | Section heading. |
| `items` | array | Yes (min 1) | Steps. |

How-it-works item: `{ title: string, description: string }` (both required).

**`faq` (optional, default: `[]`):**

Array of `{ question: string, answer: string }` (both required per item).

**`bottomCta` (optional):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `headline` | string | Yes | Bottom CTA headline. |
| `subheadline` | string | No | Bottom CTA subheadline. |

#### `seo` (optional)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | string | Yes | — | Page title. |
| `description` | string | Yes | — | Meta description. |
| `keywords` | string[] | No | `[]` | Meta keywords. |

#### `pricing` (optional)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `monthly` | number | Yes | — | Monthly price (>= 0). |
| `yearly` | number | No | — | Yearly price (>= 0). |
| `currency` | string | No | `"usd"` | Currency code. |
| `trialDays` | number | No | `0` | Free trial length in days (>= 0, integer). |

#### `contentScope` (optional)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `courseIds` | string[] | No | `[]` | Course IDs accessible via this brand. |

---

### Academy Manifest YAML

Top-level key: `academy`. File: `academy-manifest.schema.ts`.

Used to define a multi-course academy with optional grouping into "parts."

#### `academy` (required)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Academy identifier. |
| `name` | string | Yes | Academy display name. |
| `description` | string | No | Academy description. |
| `version` | string | Yes | Version string. |

#### `parts` (optional, default: `[]`)

Array of part objects:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique part identifier. |
| `name` | string | Yes | Part display name. |
| `description` | string | No | Part description. |

**Validation:** Part IDs must be unique.

#### `courses` (required, min 1)

Array of course entry objects:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Course identifier. Must be unique. |
| `name` | string | Yes | Course display name. |
| `description` | string | No | Course description. |
| `part` | string | No | Part ID this course belongs to. Must reference an existing part. |
| `file` | string | Yes | Path to the course YAML file. Must be unique. |

**Validation rules:**
- Course IDs must be unique.
- Course file paths must be unique.
- If a course references a `part`, that part must exist in the `parts` array.

---

## 4. Authentication

Graspful uses two authentication methods:

### API Key (recommended for agents and automation)

Set the `GRASPFUL_API_KEY` environment variable:

```bash
export GRASPFUL_API_KEY=sk-your-api-key
```

The API key is sent as a `Bearer` token in the `Authorization` header.

**Obtaining an API key:**
1. Run `graspful register --email you@example.com --password secret` to create an account and get an API key.
2. The key is saved to `~/.graspful/credentials.json` automatically.

### JWT Token (interactive sessions)

Obtained via `graspful login`. The JWT is saved to `~/.graspful/credentials.json`.

### Resolution Order

1. `GRASPFUL_API_KEY` environment variable (highest priority).
2. API key stored in `~/.graspful/credentials.json`.
3. JWT stored in `~/.graspful/credentials.json`.

### Which Operations Require Auth

| Operation | Auth Required |
|-----------|--------------|
| `create course` | No |
| `create brand` | No |
| `fill concept` | No |
| `validate` | No |
| `review` | No |
| `describe` | No |
| `import` | Yes |
| `publish` | Yes |
| `login` | No (produces credentials) |
| `register` | No (produces credentials) |
| MCP `graspful_scaffold_course` | No |
| MCP `graspful_fill_concept` | No |
| MCP `graspful_validate` | No |
| MCP `graspful_review_course` | No |
| MCP `graspful_describe_course` | No |
| MCP `graspful_create_brand` | No |
| MCP `graspful_import_course` | Yes |
| MCP `graspful_publish_course` | Yes |
| MCP `graspful_import_brand` | Yes |
| MCP `graspful_list_courses` | Yes |

### MCP Server Authentication

The MCP server reads `GRASPFUL_API_KEY` and `GRASPFUL_API_URL` from the environment. Configure these in your MCP client's server configuration.

### Credential Storage

Credentials file: `~/.graspful/credentials.json`
- Directory created with mode `0700`.
- File created with mode `0600`.
- Contains either `{ apiKey, baseUrl }` or `{ jwt, baseUrl }`.

---

## 5. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GRASPFUL_API_KEY` | — | API key for authenticating with the Graspful API. Takes precedence over stored credentials. |
| `GRASPFUL_API_URL` | `https://api.graspful.com` | Base URL for the Graspful API. Used by both CLI and MCP server. Trailing slash is stripped automatically. |

---

## 6. Error Codes

### CLI Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success. |
| `1` | Failure (validation error, API error, missing file, auth error). |

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `File not found: {path}` | The specified YAML file does not exist. | Check the file path. |
| `YAML parse error: {details}` | The file is not valid YAML. | Fix YAML syntax (check indentation, colons, etc). |
| `Could not detect file type` | No `course`, `brand`, or `academy` top-level key. | Add the correct top-level key to the YAML. |
| `Not authenticated. Set GRASPFUL_API_KEY or run: graspful login` | No credentials found for an operation that requires auth. | Set `GRASPFUL_API_KEY` or run `graspful login`. |
| `--org is required for course imports` | The `--org` flag was omitted on `graspful import` for a course file. | Add `--org your-org-slug`. |
| `Concept "{id}" not found` | The specified concept ID doesn't exist in the YAML. | Check available concept IDs with `graspful describe`. |
| `Concept "{id}" already has {n} KP(s)` | Attempted to fill a concept that already has knowledge points. | Remove existing KPs first, or choose a different concept. |
| `API error 401: Unauthorized` | Invalid or missing API key. | Check your `GRASPFUL_API_KEY` value. |
| `API error 404: ...` | Resource not found (wrong org slug, course ID, etc). | Verify the org slug and resource IDs. |
| `API error 422: ...` | Validation failed server-side (e.g., review gate failed on publish). | Run `graspful review` locally to see failures, fix them, re-import. |
| `Cycle: A -> B -> A` | Prerequisite graph contains a cycle. | Remove one edge to break the cycle. |
| `Unknown prerequisite: {concept} -> {ref}` | A concept references a prerequisite that doesn't exist. | Fix the prerequisite ID or add the missing concept. |

### MCP Error Handling

MCP tools signal errors by returning `{ isError: true }` in the tool result. The `text` field contains the error message. The MCP server never throws — all errors are caught and returned as error results.
