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
graspful register --email you@example.com --password your-password
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

| Command | Auth? | Description |
|---------|:---:|-------------|
| `graspful register` | No | Create account + org + API key |
| `graspful login` | No | Authenticate with existing credentials |
| `graspful create course` | No | Generate course YAML skeleton |
| `graspful create brand` | No | Generate brand YAML with theme presets |
| `graspful fill concept` | No | Add KPs and problems to a concept |
| `graspful validate` | No | Offline schema + DAG validation |
| `graspful review` | No | 10 mechanical quality checks |
| `graspful describe` | No | Course statistics |
| `graspful import` | **Yes** | Push YAML to Graspful instance |
| `graspful publish` | **Yes** | Publish a draft course |

Run `graspful register --email <email> --password <password>` before `import` or `publish`. Credentials are saved to `~/.graspful/credentials.json`.

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
      "args": ["@graspful/mcp"],
      "env": { "GRASPFUL_API_KEY": "gsk_..." }
    }
  }
}
```

### MCP Tools

| Tool | Auth? | Description |
|------|:---:|-------------|
| `graspful_register` | No | Create account + org + API key (call first if you need to import/publish) |
| `graspful_scaffold_course` | No | Generate course YAML skeleton |
| `graspful_fill_concept` | No | Add KPs and problems to a concept |
| `graspful_validate` | No | Validate YAML against schema |
| `graspful_review_course` | No | Run 10 quality checks |
| `graspful_describe_course` | No | Course statistics |
| `graspful_create_brand` | No | Generate brand YAML |
| `graspful_import_course` | **Yes** | Import course to platform |
| `graspful_publish_course` | **Yes** | Publish a draft course |
| `graspful_import_brand` | **Yes** | Import brand config |
| `graspful_list_courses` | **Yes** | List org courses |

Auth-gated tools return a prescriptive error if unauthenticated, telling the agent to call `graspful_register` first. You can also set `GRASPFUL_API_KEY` as an env var in your MCP config.

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

[O'Saasy License](LICENSE.md) -- MIT with one restriction: you can't offer this as a competing SaaS.

**Why this license?** The adaptive learning science behind Graspful (BKT, spaced repetition, knowledge graphs) is built on open academic work. It should stay open. You can view the code, self-host it, learn from it, contribute to it. The one thing you can't do is take it and run a competing hosted service. That feels fair -- I'm trying to bring all these ideas together into something useful, and I'd like to get rewarded for that work.

If you think there's a better way to do this, [open an issue](https://github.com/willwearing/graspful/issues). I'm genuinely interested in getting the balance right.
