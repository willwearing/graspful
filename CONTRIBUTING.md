# Contributing to Graspful

Graspful is an agent-first adaptive learning platform. Courses are YAML files with knowledge graphs, imported via CLI or MCP server. The platform handles adaptive diagnostics, mastery-based progression, spaced repetition, white-label landing pages, and Stripe billing.

Contributions welcome: bug fixes, new features, course content, CLI commands, MCP tools, documentation improvements.

## Getting Started

**Prerequisites:**

- [Bun](https://bun.sh/) (package manager and runtime)
- Node.js 22+
- PostgreSQL (via Supabase local dev or remote instance)

**Setup:**

```bash
git clone https://github.com/graspful/graspful.git
cd graspful
bun install
```

## Development

```bash
# Start all dev servers (Turborepo)
bun run dev

# Backend only (port 3000)
cd backend && bun run dev

# Frontend only (port 3001)
cd apps/web && bun run dev

# Build
bun run build

# Test (Jest for backend, Playwright for e2e)
bun run test
cd apps/web && npx playwright test
```

**Prisma (database):**

```bash
cd backend
npx prisma migrate dev --name <migration-name>
npx prisma generate
```

## Project Structure

```
graspful/
├── apps/web/          # Next.js frontend (App Router, Tailwind, shadcn/ui)
├── backend/           # NestJS API (TypeScript, Prisma, PostgreSQL)
├── packages/
│   ├── shared/        # Zod schemas, types, quality gate
│   ├── cli/           # @graspful/cli (commander.js)
│   └── mcp/           # @graspful/mcp server for AI agent integration
├── content/
│   ├── courses/       # Course YAML files
│   ├── brands/        # Brand YAML files
│   └── academies/     # Multi-course academy manifests
├── docs/              # Documentation
└── supabase/          # Supabase config and migrations
```

## DDD Architecture

The backend follows Domain-Driven Design with bounded contexts. Each NestJS module owns its domain.

| Context | Module | Owns |
|---------|--------|------|
| Knowledge Graph | `knowledge-graph/` | Courses, Concepts, KnowledgePoints, Edges |
| Student Model | `student-model/` | StudentProfile, ConceptState, KPState, mastery |
| Diagnostic | `diagnostic/` | BKT engine, MEPE selector, sessions |
| Learning Engine | `learning-engine/` | Task selection, frontier, remediation |
| Assessment | `assessment/` | Problems, answer evaluation, reviews |
| Spaced Repetition | `spaced-repetition/` | FIRe algorithm, review scheduling |
| Gamification | `gamification/` | XP, streaks, leaderboards |

**Rules:**

1. **Services call services, not repositories of other modules.** If Diagnostic needs mastery data, it calls `StudentStateService`, not `prisma.studentConceptState` directly.
2. **Controllers are thin.** Extract params, validate input, delegate to service, return response. No domain logic in controllers.
3. **Each module owns its Prisma queries.** Other modules request data through the owning module's service.
4. **Cross-context data** is composed at the API/controller layer or in a dedicated query service -- not by having one domain service reach into another's tables.

## Adding a Course

See [docs/adding-a-course.md](docs/adding-a-course.md) for the full step-by-step guide.

Quick version:

1. Scaffold: `graspful create course --topic "Your Topic" -o course.yaml`
2. Fill concepts: `graspful fill concept course.yaml concept-id`
3. Review: `graspful review course.yaml`
4. Import: `graspful import course.yaml --org your-org --publish`

Example courses live in `content/courses/examples/` for reference.

## MCP Server Development

The MCP server lives in `packages/mcp/`. It exposes tools for AI agents (Claude Code, Cursor, Codex) to create and manage courses programmatically.

To work on MCP tools:

1. Edit tools in `packages/mcp/`
2. Test locally: `cd packages/mcp && bun run dev`
3. Tools use the same Zod schemas from `packages/shared/`

## CLI Development

The CLI lives in `packages/cli/` and uses commander.js.

To add a new command:

1. Create a command file in `packages/cli/src/commands/`
2. Register it in the CLI entry point
3. Use Zod schemas from `packages/shared/` for validation
4. Test: `cd packages/cli && bun run dev -- <your-command>`

## Code Style

- **Database columns:** `snake_case` (Prisma `@@map`)
- **TypeScript:** `camelCase`
- **Package manager:** `bun` (not npm)
- **Schemas:** Zod for all validation (shared across CLI, MCP, backend)
- **Prisma models:** `@db.Uuid` for IDs, `@db.Timestamptz` for dates
- **Tests:** Jest for backend unit tests, Playwright for e2e

## Pull Requests

- Keep PRs focused on a single change
- Include tests for new functionality
- Describe what changed and why in the PR description
- Run `bun run test` before submitting
- Follow the DDD boundary rules -- don't leak domain logic across modules

## License

This project is licensed under the [O'Saasy License](LICENSE.md) -- MIT with one restriction: you can't offer this as a competing SaaS. By contributing, you agree that your contributions are licensed under the same terms.
