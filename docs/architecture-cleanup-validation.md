# Architecture cleanup validation

This branch implements the assigned architecture cleanup workstreams. It includes the prerequisite security changes from PR #139 and keeps the product decisions listed below open.

## Changes

| Area | Result | Regression coverage |
| --- | --- | --- |
| Auth and tenant boundaries | Shared roles and scope guards validate course, academy, enrollment, and API-key organization before service execution. CLI approval and redirects are explicit and scoped. | Unit and Nest HTTP tests; live tenant, enrollment, domain, CLI approval, and redirect tests. |
| Learner services | Shared enrollment resolution, academy-level gamification, UTC date boundaries, and transactional diagnostic completion replace duplicate paths. | Session resumption, atomic writes, legacy enrollment isolation, XP caps, week boundaries, and practice failure counters. |
| Knowledge graph | Import stages, assessment helpers, student-state ownership, brand creation, and revenue reads have explicit service boundaries. | DTO HTTP validation, import failure propagation, transaction boundaries, brand slug collisions, and module wiring. |
| Database | Prisma owns auth triggers and RLS. Additive organization relations and leaderboard indexes are validated before application. | Live PostgreSQL migrations, repeat application, preserved rows, orphan rejection, tenant isolation, restricted profile updates, and schema alignment. |
| Web data and UI | Verified request sessions and learner views are shared. Activity writes require a Start action. API keys clear on account changes. Auth fields wait for hydration. | Component, request race, route, no-render-write, auth, learner, creator, and hydration browser tests. |
| Site reconciliation | Both apps share creator UI, API transport, Supabase factories, session cookies, creator organization selection, public catalog reads, API-key management, and telemetry configuration. | Both app builds; site creator access and key CRUD; cookie refresh, stale credentials, identity changes, selected organization, and telemetry tests. |
| CLI and MCP | A shared client owns transport, credentials, imports, publication, YAML, brand mapping, and telemetry settings. MCP schemas and runtime validation agree. | CLI subprocess, MCP input/output, credential rotation, publishing manifest, package isolation, and local packed-artifact checks. |
| Repository | Workspace lint/type checks, environment examples, Prisma-only setup, seed scripts, canonical agent instructions, and CI are aligned. | Script tests, environment inventory, documentation checks, public agent instructions, lint, type checks, and production builds. |

## Site differences retained

The site keeps its creator-focused navigation, marketing pages, pricing copy, and compact documentation. The web app keeps branded learner routing, brand themes, organization switching, and learner navigation. Their auth callbacks retain the corresponding destination, brand provisioning, and analytics behavior. Shared redirect validation, API transport, credential handling, hydration readiness, and cookie handling apply to both.

## Validation environment

Validation uses Node 22, Bun 1.3.6, Chromium, and an isolated local Supabase 2.90.0 instance. External telemetry and deployment credentials are disabled. Package tests use temporary credential directories and reject unexpected external requests. Migration tests create and remove their own local databases.

Commands from the repository root, after the local setup in [local-e2e.md](local-e2e.md):

```sh
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test -- --concurrency=2
bun run test:scripts
MIGRATION_TEST_DATABASE_URL="$DATABASE_URL" bun test backend/prisma/__tests__/migrations.test.ts
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 --file backend/test/assert-public-rls.sql
bun run --cwd backend build
bun run --cwd apps/web build
bun run --cwd apps/site build
# Start the compiled API and both apps as described in local-e2e.md.
E2E_REUSE_EXISTING_SERVER=1 bun run --cwd apps/web test:e2e
E2E_REUSE_EXISTING_SERVER=1 bun run --cwd apps/site test:e2e
```

## Recorded local results

Final integrated run on 2026-09-24:

| Check | Result |
| --- | --- |
| Unit, component, and package tests | 2,076 passed: backend 1,286; web 496; site 65; shared 81; client 20; CLI 70; MCP 58. |
| Repository script tests | 32 passed. |
| Live migration tests | 12 passed, 80 assertions; row-security assertion passed. Earlier fresh deploy replay and Prisma schema diff also passed. |
| Web browser tests | 307 passed, including 35 security regressions. |
| Site browser tests | 19 passed, including creator access, API-key lifecycle, and organization selection. |
| Frozen dependency installation | Passed. |
| Type checks | All workspaces passed. |
| Lint | Passed with 0 errors and 10 component-length warnings under the new 150-line warning rule. |
| Production builds | Backend, web app, and site passed. Both Next apps also build with Supabase public configuration omitted, matching unconfigured preview builds. |
| Package artifacts | Shared, client, CLI, and MCP tarballs checked locally; published entrypoints and dependency versions resolved. |

The server Supabase factory reads request cookies before configuration validation, so Next can defer creator pages during static generation. A regression covers this order. Preview authentication still requires valid public Supabase configuration; authenticated flows were tested against isolated local Supabase.

The CLI build runs in suite setup with its own bounded timeout. A controlled six-second compilation delay passed without increasing command-test timeouts.

## Deployment and decisions

See the [migration rollout notes](../backend/prisma/README.md) before deployment. Existing orphan organization IDs or duplicate email identities stop their migration without deleting records. Index creation and constraint validation can take write locks. Production migrations have not been run by this task.

Billing enforcement and tiers, lazy learner organization creation, draft-site publication timing, subdomain naming, role redesign, production test-data deletion, and test-runner consolidation remain unchanged. Legacy table removal and the Brand organization foreign-key conversion are proposals only. Package artifacts were checked locally; package publication and trusted-publisher account configuration remain separate release steps.
