# Graspful

Adaptive learning platform. Multi-tenant white-label SaaS.

## Critical Rules

- **CLI or MCP for everything.** Never open a browser to sign up, import, or manage courses. The platform is built for programmatic agent workflows.
- **Use `bun` not `npm`.**
- **Read `docs/adding-a-course.md` before building any course.** It is the canonical agent runbook.

## Course Creation — Agent Workflow

> If a user asks you to build, draft, author, or create a course, follow this section. Do NOT improvise a workflow — use the CLI/MCP tools below.

### Authentication — Read This First

**You can scaffold, fill, validate, and review courses without any account.** These operations run locally.

**You MUST authenticate before importing or publishing.** Four tools require auth: `graspful_import_course`, `graspful_publish_course`, `graspful_import_brand`, `graspful_list_courses`.

To authenticate, do ONE of:
1. **MCP tool (recommended):** Call `graspful_register(email, password)` — creates an account + org + API key. The key is automatically active for the rest of the session.
2. **CLI:** Run `graspful register --email <email> --password <password>` — saves credentials to `~/.graspful/credentials.json`.
3. **Environment variable:** Set `GRASPFUL_API_KEY=gsk_...` before starting the MCP server.

If you try an authenticated tool without auth, you'll get a clear error telling you to register first.

### Step 1: Install the CLI

```bash
npx @graspful/cli init
```

This auto-detects your editor (Claude Code, Cursor, Windsurf, Codex) and configures MCP if supported. No global install needed.

If you have MCP configured, skip the CLI and use MCP tools directly (see Step 1b).

### Step 1b: MCP alternative

If MCP is already configured, you have these tools available — no CLI needed:

| Tool | Auth? | Description |
|------|:---:|-------------|
| `graspful_register` | No | **Call this first if you need to import/publish.** Creates account + org + API key |
| `graspful_scaffold_course` | No | Generate course YAML skeleton |
| `graspful_fill_concept` | No | Add KPs and problems to a concept |
| `graspful_validate` | No | Validate YAML against schema |
| `graspful_review_course` | No | Run 10 quality checks |
| `graspful_describe_course` | No | Course statistics |
| `graspful_create_brand` | No | Generate brand YAML |
| `graspful_import_course` | **Yes** | Import course to platform (call `graspful_register` first) |
| `graspful_publish_course` | **Yes** | Publish a draft course (call `graspful_register` first) |
| `graspful_import_brand` | **Yes** | Import brand config (call `graspful_register` first) |
| `graspful_list_courses` | **Yes** | List org courses (call `graspful_register` first) |

Tools marked "No" for auth work offline — no account needed. Tools marked **Yes** will fail with a clear error if you haven't authenticated. Call `graspful_register` first.

**MCP discovery:** To check if MCP is active, try calling `graspful_validate` with any small YAML string. If it responds, MCP is working. If you get a "tool not found" error, fall back to the CLI.

### Step 2: Register (before importing/publishing)

If you haven't already authenticated (see "Authentication" above), do it now before proceeding to import.

**MCP (recommended):**
```
graspful_register(email: "you@example.com", password: "your-password")
```

**CLI:**
```bash
graspful register --email <email> --password <password>
```

Both create an account, org, and API key. The MCP tool auto-activates the key for the current session. The CLI saves it to `~/.graspful/credentials.json`.

### Step 3: Build a course

The workflow is: scaffold -> fill -> validate -> review -> import.

**Before writing any YAML**, follow the detailed runbook in `docs/adding-a-course.md`. Key steps:
1. Gather source material (official docs, syllabi, PDFs — not marketing copy)
2. Decide: single course or academy with multiple courses
3. Build the prerequisite graph (roots -> trunk -> branches -> leaves)
4. Write the YAML skeleton (graph first, content second)
5. Fill concepts one at a time
6. Validate and review

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
-> edit the YAML
graspful_fill_concept(yaml: "...", conceptId: "concept-id")
graspful_validate(yaml: "...")
graspful_review_course(yaml: "...")
graspful_import_course(yaml: "...", org: "org-slug", publish: true)
```

### Images, Videos, Links in Course Content

Course YAML supports rich media through **content blocks** on two fields: `instructionContent` and `workedExampleContent`. Each is an array of typed blocks.

**Image block:**
```yaml
instructionContent:
  - type: image
    url: https://example.com/photo.jpg
    alt: Description for accessibility
    caption: Optional caption text
    width: 960  # optional, positive integer
```

**Video block:**
```yaml
instructionContent:
  - type: video
    url: https://youtube.com/watch?v=abc123
    title: Video title
    caption: Optional caption
```

**Link block:**
```yaml
instructionContent:
  - type: link
    url: https://example.com/reference
    title: Link title
    description: Optional description
```

**Callout block:**
```yaml
instructionContent:
  - type: callout
    title: Important distinction
    body: The explanation text here.
```

**Important:** `instruction` and `workedExample` (the plain text fields) should remain readable as standalone text because they power audio. Put images, diagrams, external references, and video links in the `*Content` blocks — do not bury URLs in the prose.

When a user asks for images or visual comparisons in a course, use `image` content blocks with publicly accessible URLs. Every knowledge point can have multiple content blocks.

### Working from source material (PDFs, documents, etc.)

When building a course from a PDF or document:

1. Read the full source material first
2. Extract the key concepts, facts, and distinctions
3. Map them to a prerequisite graph (what must be learned before what?)
4. For visual content (photos, diagrams, comparisons), find or request publicly accessible image URLs and use `image` content blocks
5. Do not copy-paste prose verbatim — rewrite for the lesson pattern (instruction -> worked example -> problems)

### Step 4: Brand (optional)

Create a white-label landing page and theme:

```bash
graspful create brand --niche tech --name "My Academy" --org my-org -o brand.yaml
graspful import brand.yaml
```

### Key rules

- **CLI or MCP for everything.** Never open a browser to sign up, import, or manage courses.
- **Validate after every edit.** It's offline and fast.
- **Fill one concept at a time.** Quality is better than filling the whole course at once.
- **Review before import.** The server rejects courses that fail the quality gate.
- **Problem IDs must be globally unique.** Use `{concept-id}-{kp-index}-p{problem-index}`.

### Output format

Pass `--format json` to any CLI command for machine-readable output:

```bash
graspful validate course.yaml --format json
```

### Environment variables

| Variable | Description |
|----------|-------------|
| `GRASPFUL_API_KEY` | API key for import/publish (set automatically by `register` or `login`) |
| `GRASPFUL_API_URL` | API base URL (default: `https://api.graspful.ai`) |

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS, shadcn/ui
- **Backend:** NestJS (TypeScript), Prisma ORM, PostgreSQL (Supabase-hosted)
- **Auth:** Supabase Auth (JWT)
- **Monorepo:** Turborepo, bun as package manager

## Architecture — DDD Bounded Contexts

The backend follows Domain-Driven Design with bounded contexts. Each NestJS module owns its domain. **Do not leak domain logic across boundaries.**

| Context | Module | Aggregate Root | Owns |
|---------|--------|---------------|------|
| Knowledge Graph | `knowledge-graph/` | Course | Concepts, KnowledgePoints, PrerequisiteEdges, EncompassingEdges |
| Student Model | `student-model/` | StudentProfile | ConceptState, KPState, mastery, enrollment |
| Diagnostic | `diagnostic/` | DiagnosticSession | BKT engine, MEPE selector, stopping criteria, session persistence |
| Learning Engine | `learning-engine/` | LearningSession | Task selection, frontier, mastery enforcement, remediation |
| Assessment | `assessment/` | Assessment | Problems, answer evaluation, reviews, quizzes |
| Spaced Repetition | `spaced-repetition/` | RepetitionSchedule | FIRe algorithm, review scheduling |
| Gamification | `gamification/` | PlayerProgress | XP, streaks, leaderboards |

### DDD Rules

1. **Services call services, not repositories of other modules.** If Diagnostic needs mastery data, it calls `StudentStateService`, not `prisma.studentConceptState` directly.
2. **Controllers are thin.** Extract, validate, delegate to service, return. No domain logic in controllers.
3. **Each module owns its Prisma queries.** Other modules request data through the owning module's service.
4. **Cross-context data for the frontend** should be composed at the API/controller layer or in a dedicated query service — not by having one domain service reach into another's tables.

## Backend

- Build: `cd backend && /path/to/tsc -p tsconfig.build.json --outDir dist` (nest build has symlink issues with bun)
- Run: `TS_NODE_PROJECT=tsconfig.runtime.json node -r tsconfig-paths/register dist/main.js`
- Dev: `bun run dev` (nest start --watch)
- Test: `bun run test`
- Port: 3000

## Frontend

- Dev: `bun run dev` (port 3001)
- Build: `npx next build`
- E2E: `cd apps/web && npx playwright test`

## Prisma

- Schema: `backend/prisma/schema.prisma`
- Migrate: `cd backend && npx prisma migrate dev --name <name>`
- Generate: `npx prisma generate` (runs automatically after migrate)

## Conventions

- Use `bun` not `npm`
- snake_case for DB columns (Prisma `@@map`), camelCase for TypeScript
- All Prisma models use `@db.Uuid` for IDs and `@db.Timestamptz` for dates
- Tests: Jest for backend unit tests, Playwright for e2e
- E2E helpers: `apps/web/e2e/helpers/auth.ts` — `signUpTestUser()` creates fresh users
- Brand cookie: `dev-brand-override` selects org in dev

## E2E Test Coverage Requirements

**Every live site page and API endpoint MUST have an e2e test.** This is non-negotiable — bread-and-butter functionality that users depend on must have regression coverage.

### What must be tested:

1. **All pages render** — every route under `(marketing)` and `(app)` must have a smoke test verifying it returns 200 and renders its heading. See `e2e/docs-smoke.spec.ts` for the pattern.
2. **Auth flows** — sign-up, sign-in, sign-out, email confirmation callback, org provisioning
3. **Creator flows** — API key CRUD, course import, brand config import, course publish
4. **API registration** — `POST /auth/register` returns userId + orgSlug + apiKey (agent onboarding)
5. **API provisioning** — `POST /auth/provision` creates personal org for web UI sign-ups
6. **Learner flows** — browse, enroll, diagnostic, study session

### When adding a new page or endpoint:

- Add an e2e test in the same PR
- If it's a new doc page, add it to the `DOCS_PAGES` array in `e2e/docs-smoke.spec.ts`
- If it's a new API endpoint, add API-level tests using the `helpers/api-auth.ts` helpers

## Links

- Documentation: https://graspful.ai/docs
- CLI reference: https://graspful.ai/docs/cli
- MCP setup: https://graspful.ai/docs/mcp
- Course YAML schema: https://graspful.ai/docs/course-schema
- Brand YAML schema: https://graspful.ai/docs/brand-schema
- Full docs for LLMs: https://graspful.ai/llms-full.txt
