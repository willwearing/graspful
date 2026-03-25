# Graspful — Agent Instructions

> You are an AI agent helping a user build an adaptive learning course on Graspful.
> Follow these steps in order. Use the CLI or MCP — do NOT use a browser for account creation or course management.

## Step 1: Install the CLI

```bash
npx @graspful/cli init
```

This auto-detects your editor (Claude Code, Cursor, Windsurf, Codex) and configures MCP if supported. No global install needed.

If you have MCP configured, skip the CLI and use MCP tools directly (see Step 1b).

## Step 1b: MCP alternative

If MCP is already configured, you have these tools available — no CLI needed:

| Tool | Auth? | Description |
|------|:---:|-------------|
| `graspful_scaffold_course` | No | Generate course YAML skeleton |
| `graspful_fill_concept` | No | Add KPs and problems to a concept |
| `graspful_validate` | No | Validate YAML against schema |
| `graspful_review_course` | No | Run 10 quality checks |
| `graspful_describe_course` | No | Course statistics |
| `graspful_create_brand` | No | Generate brand YAML |
| `graspful_import_course` | Yes | Import course to platform |
| `graspful_publish_course` | Yes | Publish a draft course |
| `graspful_import_brand` | Yes | Import brand config |
| `graspful_list_courses` | Yes | List org courses |

Tools marked "No" for auth work offline — no account needed. You can scaffold, fill, validate, and review courses without registering.

## Step 2: Register (only when you need to import/publish)

Register via CLI. Do NOT use a browser.

```bash
graspful register --email <email> --password <password>
```

This creates an account, org, and API key — saved to `~/.graspful/credentials.json` automatically.

If you already have an API key, set it as an environment variable instead:

```bash
export GRASPFUL_API_KEY=gsk_...
```

## Step 3: Build a course

The workflow is: scaffold → fill → validate → review → import.

```bash
# 1. Scaffold the knowledge graph
graspful create course --topic "Your Topic" --hours 10 -o course.yaml

# 2. Fill each concept with knowledge points and problems
graspful fill concept course.yaml <concept-id>

# 3. Validate after every edit
graspful validate course.yaml

# 4. Review — must score 10/10 to publish
graspful review course.yaml

# 5. Import and publish
graspful import course.yaml --org <org-slug> --publish
```

Or with MCP tools:

```
graspful_scaffold_course(topic: "Your Topic", estimatedHours: 10)
→ edit the YAML
graspful_fill_concept(yaml: "...", conceptId: "concept-id")
graspful_validate(yaml: "...")
graspful_review_course(yaml: "...")
graspful_import_course(yaml: "...", org: "org-slug", publish: true)
```

## Step 4: Brand (optional)

Create a white-label landing page and theme:

```bash
graspful create brand --niche tech --name "My Academy" --org my-org -o brand.yaml
graspful import brand.yaml
```

## Key rules

- **CLI or MCP for everything.** Never open a browser to sign up, import, or manage courses.
- **Validate after every edit.** It's offline and fast.
- **Fill one concept at a time.** Quality is better than filling the whole course at once.
- **Review before import.** The server rejects courses that fail the quality gate.
- **Problem IDs must be globally unique.** Use `{concept-id}-{kp-index}-p{problem-index}`.

## Output format

Pass `--format json` to any CLI command for machine-readable output:

```bash
graspful validate course.yaml --format json
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `GRASPFUL_API_KEY` | API key for import/publish (set automatically by `register` or `login`) |
| `GRASPFUL_API_URL` | API base URL (default: `https://api.graspful.ai`) |

## Links

- Documentation: https://graspful.com/docs
- CLI reference: https://graspful.com/docs/cli
- MCP setup: https://graspful.com/docs/mcp
- Course YAML schema: https://graspful.com/docs/course-schema
- Brand YAML schema: https://graspful.com/docs/brand-schema
- Full docs for LLMs: https://graspful.com/llms-full.txt
