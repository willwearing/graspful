# Graspful

Build courses with lessons, practice questions, and scheduled review.

Graspful stores academies, courses, and brand configuration in YAML files. You or an external agent, such as Claude or Codex, author the content through CLI commands or MCP tools. The CLI creates draft scaffolds. The author supplies the source material, writes the lessons and questions, and reviews the facts before publication.

Learners work through explanations, examples, and questions. Their answers update progress estimates. Prerequisites guide lesson order, and the system schedules later review.

## How it works

1. **Plan the academy.** Define its audience, source material, course scope, and prerequisites.
2. **Create draft files.** Use the CLI or MCP tools to scaffold the academy and its courses. Scaffold and fill commands generate placeholders for the author to complete.
3. **Write and review.** Replace all placeholders with sourced explanations, worked examples, and practice questions. Check the answer explanations against the sources.
4. **Validate.** Run `graspful validate` and `graspful review`. Automated checks report structural problems. The author still checks accuracy and teaching quality.
5. **Import a draft.** Import the reviewed files, inspect the result, then publish when ready. Importing without `--publish` saves a draft.
6. **Configure the brand.** Import a brand YAML file for the landing page, theme, and copy. Custom domains require domain and hosting setup.

Read [the course authoring runbook](docs/adding-a-course.md) before building a course.

## Quickstart

```bash
bun add -g @graspful/cli

# Create a local draft scaffold.
bunx @graspful/cli create academy --topic "Your topic" -o academy.yaml
mkdir -p courses
bunx @graspful/cli create course --topic "Foundations" -o courses/foundations.yaml
```

These files need authoring and review before import. Follow the [runbook](docs/adding-a-course.md) to complete the content and match the academy manifest to its course files.

Register before using import or publish commands:

```bash
bunx @graspful/cli register --email you@example.com
```

Registration opens browser authentication and saves an API key locally. If your MCP client does not reuse the saved CLI credentials, restart its Graspful server with `GRASPFUL_API_KEY` set.

## CLI commands

| Command | Auth required | Purpose |
|---------|:-------------:|---------|
| `graspful register` | No | Register through browser authentication and save an API key |
| `graspful login` | No | Authenticate an existing account |
| `graspful create academy` | No | Create an academy plan and manifest scaffold |
| `graspful create course` | No | Create a course YAML scaffold |
| `graspful create brand` | No | Create brand YAML with theme presets |
| `graspful fill concept` | No | Add placeholder knowledge points and questions |
| `graspful validate` | No | Validate the YAML schema and prerequisite graph |
| `graspful review` | No | Run mechanical quality checks |
| `graspful describe` | No | Show course statistics |
| `graspful import` | Yes | Import YAML, saving a draft unless publication is requested and succeeds |
| `graspful publish` | Yes | Request publication of a reviewed draft |

Check the command result to confirm whether publication succeeded.

## MCP server

`graspful init` authenticates through the browser and configures detected clients. For local authoring before registration, configure the MCP server directly. This example uses the Claude Desktop and Cursor format; see the linked MCP guide for other clients:

```json
{
  "mcpServers": {
    "graspful": {
      "command": "bunx",
      "args": ["@graspful/mcp"],
      "env": { "GRASPFUL_API_KEY": "gsk_..." }
    }
  }
}
```

The external agent writes the course content and uses Graspful tools to scaffold, validate, review, import, and publish it. The MCP server performs structured course operations. See the [MCP documentation](https://graspful.ai/docs/mcp) for setup and the tool reference.

## Billing status

Stripe and Stripe Connect integration code exists. Paid subscriptions and creator payouts are not ready for customers. Live credentials, price configuration, creator onboarding, webhook setup, and payment verification are required before accepting payments.

The repository contains proposed pricing and revenue-share settings. Treat those as configuration under development, rather than an offer to customers.

## Tech stack

- **Backend:** NestJS, Prisma, PostgreSQL
- **Frontend:** Next.js App Router, React, Tailwind CSS, shadcn/ui
- **CLI:** `@graspful/cli`
- **MCP server:** `@graspful/mcp`
- **Authentication:** Supabase Auth and API keys
- **Billing integration:** Stripe and Stripe Connect, pending setup
- **Workspace:** Turborepo and bun

## Repository layout

```text
graspful/
├── apps/web/          # Next.js frontend
├── backend/          # NestJS API
├── packages/
│   ├── shared/       # Schemas, types, quality checks
│   ├── cli/          # CLI
│   └── mcp/          # MCP server
├── content/
│   ├── courses/      # Course YAML files
│   ├── brands/       # Brand YAML files
│   └── academies/    # Academy manifests
└── docs/             # Documentation
```

## Development

```bash
bun install
bun run dev
bun run build
bun run test
```

Run the frontend browser tests from `apps/web` with `bun run test:e2e`. See [AGENTS.md](AGENTS.md) for service setup and test requirements.

## Documentation

- [Course authoring runbook](docs/adding-a-course.md)
- [Course review gate](docs/course-review-gate.md)
- [Course content format](content/README.md)
- [Brand configuration](content/brands/README.md)
- [Platform FAQ](docs/marketing/faq.md)

## License

See [LICENSE.md](LICENSE.md) for the license terms.
