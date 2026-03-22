# Graspful

> Create adaptive learning courses with AI agents. Launch in minutes.

## What Is Graspful?

Graspful is an agent-first course creation platform. Courses are defined as YAML files with knowledge graphs, validated by schema, and imported via CLI or MCP server -- no UI clicking required. Agents (or humans) scaffold a course, fill in content concept by concept, run quality checks, and publish. The platform handles the rest: adaptive diagnostics, mastery-based progression, spaced repetition, white-label landing pages, and Stripe billing.

## How It Works

1. **Scaffold** -- `graspful create course --topic "CKA Exam"` generates the knowledge graph skeleton
2. **Fill** -- `graspful fill concept course.yaml networking` adds KPs and practice problems
3. **Review** -- `graspful review course.yaml` runs 10 quality checks
4. **Import** -- `graspful import course.yaml --org k8s-cert --publish` goes live
5. **Brand** -- `graspful create brand --niche "Kubernetes"` generates the landing page

Two YAMLs (course + brand) produce one live product with adaptive learning, spaced repetition, and Stripe billing.

## Quick Start

```bash
npx @graspful/cli init
```

Or install globally:

```bash
bun add -g @graspful/cli
graspful login
graspful create course --scaffold-only --topic "Your Topic" -o course.yaml
```

## Tech Stack

- **Backend:** NestJS, Prisma, PostgreSQL (Supabase-hosted)
- **Frontend:** Next.js (App Router), React, Tailwind CSS, shadcn/ui
- **CLI:** `@graspful/cli` (commander.js)
- **MCP Server:** `@graspful/mcp` for AI agent integration
- **Auth:** Supabase Auth (JWT) + API keys for agents
- **Billing:** Stripe + Stripe Connect (70/30 revenue share)
- **Monorepo:** Turborepo, bun

## Architecture

```
graspful/
├── apps/web/          # Next.js frontend
├── backend/           # NestJS API
├── packages/
│   ├── shared/        # Zod schemas, types, quality gate
│   ├── cli/           # @graspful/cli
│   └── mcp/           # @graspful/mcp server
├── content/
│   ├── courses/       # Course YAML files
│   ├── brands/        # Brand YAML files
│   └── academies/     # Multi-course academy manifests
└── docs/              # Documentation
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `graspful create course` | Generate course YAML skeleton |
| `graspful create brand` | Generate brand YAML with theme presets |
| `graspful fill concept` | Add KPs and problems to a concept |
| `graspful validate` | Offline schema + DAG validation |
| `graspful review` | 10 mechanical quality checks |
| `graspful describe` | Course statistics |
| `graspful import` | Push YAML to Graspful instance |
| `graspful publish` | Publish a draft course |
| `graspful login` | Authenticate |

## MCP Server

For AI agent integration (Claude Code, Cursor, Codex):

```bash
npx @graspful/cli init  # Auto-configures MCP for your editor
```

Or manually add to your MCP config:

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

## Development

```bash
# Install dependencies
bun install

# Start development servers
bun run dev

# Backend (port 3000)
cd backend && bun run dev

# Frontend (port 3001)
cd apps/web && bun run dev

# Build
bun run build

# Test
bun run test

# E2E tests
cd apps/web && npx playwright test
```

## Revenue Model

70/30 revenue share (Apple model):

- Free to create and publish courses
- When learners subscribe, Graspful collects payment
- Graspful keeps 30%, creator receives 70% via Stripe Connect
- No upfront cost, no monthly platform fee

## Documentation

- [Adding a Course](docs/adding-a-course.md) -- Step-by-step course creation guide
- [Course Review Gate](docs/course-review-gate.md) -- Quality checks and review specification
- [CLI Agent Strategy](docs/cli-agent-strategy.md) -- Full platform strategy and architecture
- [Content Guide](content/README.md) -- YAML schema reference and authoring guidelines

## License

Private
