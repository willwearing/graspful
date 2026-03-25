# Graspful

Adaptive learning platform. Multi-tenant white-label SaaS.

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
