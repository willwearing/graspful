# Phase 7: Web Frontend — Core — Build Prompt

> Copy this entire prompt into a new Claude Code session to kick off the build.

---

## Prompt

```
I'm building a white-labeled adaptive learning platform for professional certification exams. Phases 1-6 are complete (backend fully built). I need you to execute Phase 7: Web Frontend — Core.

## Your workflow

1. Read the docs below to understand the project and what's already built
2. Use `/writing-plans` to create a detailed implementation plan for Phase 7
3. After I approve the plan, use `/subagent-driven-development` to execute it task-by-task

## Context — read these docs IN ORDER

1. `docs/PLAN.md` — Master plan. Read "Architecture Overview", "Monorepo Structure", and "Phase 7: Web Frontend — Core". Note Phases 1-6 are Complete.

2. `docs/frontend-plan.md` — **This is the primary input for Phase 7.** Read ALL sections carefully:
   - Section 1: Project Structure (file layout)
   - Section 2: White-Label Theming System (CSS variables, shadcn/ui tokens)
   - Section 3: Tenant Detection and Brand Config (middleware, Host header → brand)
   - Section 4: Component Hierarchy
   - Section 5: Landing Page Template
   - Section 6: App Layout and Navigation
   - Section 8: Content Browser and Study System
   - Section 9: State Management
   - Section 10: SEO Implementation
   - Section 12: Task Breakdown

3. `docs/adaptive-learning-architecture.md` — Skim Section 13 (API Surface) for the backend endpoints the frontend will call.

4. Browse `apps/web/` — The placeholder Next.js app from Phase 1. Check what already exists (package.json, tsconfig, etc).

5. Browse `packages/shared/` — Shared TypeScript types the frontend can import.

6. Browse `backend/src/` — Understand the API structure:
   - Controllers are at `orgs/:orgId/courses/:courseId/...`
   - Auth is Supabase (ES256 JWT)
   - Key endpoints: health, enrollment, diagnostic, assessment, learning engine

7. Browse `supabase/` — Supabase config for auth setup.

## What Phases 1-6 built (already working)

- **Phase 1:** NestJS backend on port 3000, Prisma schema, Supabase auth (ES256/JWKS)
- **Phase 2:** Knowledge graph (course import from YAML, graph queries, prerequisite + encompassing edges)
- **Phase 3:** Student model (enrollment, concept state tracking, BKT diagnostic)
- **Phase 4:** Assessment (answer evaluation, XP, speed updates, problem submission, reviews, quizzes)
- **Phase 5:** Learning engine (task selector P1-P5, plateau detection, remediation, lessons, sessions)
- **Phase 6:** Spaced repetition (FIRe equations, implicit repetition, memory decay, review compression)
- **339 tests passing** across 38 spec files (all backend)

### Key backend API patterns

- Base URL: `http://localhost:3000/api/v1`
- Auth: Supabase JWT in `Authorization: Bearer <token>`
- Org-scoped routes: `/orgs/:orgId/courses/:courseId/...`
- Key endpoints:
  ```
  GET  /health
  POST /orgs/:orgId/courses/:courseId/enroll
  GET  /orgs/:orgId/courses/:courseId/next-task
  GET  /orgs/:orgId/courses/:courseId/session
  POST /orgs/:orgId/courses/:courseId/lessons/:conceptId/start
  POST /orgs/:orgId/courses/:courseId/lessons/:conceptId/complete
  POST /orgs/:orgId/courses/:courseId/diagnostic/start
  POST /orgs/:orgId/courses/:courseId/diagnostic/answer
  POST /orgs/:orgId/courses/:courseId/assessment/submit
  POST /orgs/:orgId/courses/:courseId/assessment/reviews/start
  POST /orgs/:orgId/courses/:courseId/assessment/reviews/:sessionId/answer
  POST /orgs/:orgId/courses/:courseId/assessment/reviews/:sessionId/complete
  POST /orgs/:orgId/courses/:courseId/assessment/quizzes/generate
  POST /orgs/:orgId/courses/:courseId/assessment/quizzes/:sessionId/submit
  ```

## Phase 7 scope

Build the core web frontend: white-label theming, tenant detection, landing page, auth pages, study dashboard, and content browser. This is the "shell" that Phase 8 fills with the learning experience.

Specific deliverables:

1. **Next.js 15 App Router setup** in `apps/web/`:
   - Configure for Turborepo (shared packages)
   - Tailwind CSS 4 + shadcn/ui
   - PostHog analytics (basic pageview tracking)
   - Environment variables for Supabase URL, anon key, backend URL

2. **White-label theming system**:
   - CSS custom properties for brand colors, fonts, logos
   - `BrandConfig` type: name, slug, primaryColor, secondaryColor, logoUrl, domain, tagline, etc.
   - Seed data for 1 brand: "Firefighter Prep" (firefighterprep.com)
   - All shadcn/ui components inherit from CSS variables (no hardcoded colors)

3. **Tenant detection middleware**:
   - Next.js middleware reads `Host` header → lookup brand config
   - Set brand context via cookie or header for RSC to read
   - Fallback to default brand for localhost/unknown hosts
   - `useBrand()` hook for client components

4. **Landing page template** (marketing route group):
   - Hero section with brand tagline + CTA
   - Features grid (generic for any cert exam)
   - How it works (3-step)
   - FAQ section
   - CTA footer
   - All content reads from brand config (no hardcoded copy)

5. **Auth pages** (Supabase Auth UI):
   - Sign in page
   - Sign up page
   - Invite accept page
   - Auth callback handler
   - Protected route wrapper (`RequireAuth`)

6. **Study dashboard** (authenticated):
   - List enrolled courses with progress bars
   - "Continue studying" CTA (calls next-task API)
   - Daily XP progress
   - Streak counter placeholder

7. **Content browser** (authenticated):
   - Course → Topics → Sections → Concepts hierarchy
   - Mastery state indicators per concept (unstarted, in_progress, mastered, needs_review)
   - Click concept → start lesson (calls lesson/start API)

8. **Mobile-responsive design throughout**:
   - All pages work on 375px+ screens
   - Touch-friendly targets (44px min)
   - Responsive navigation (hamburger on mobile)

## Tech stack

- Next.js 15 (App Router, RSC)
- React 19
- Tailwind CSS 4
- shadcn/ui (Radix primitives)
- Supabase Auth (@supabase/ssr for Next.js)
- Package manager: `bun`

## Constraints

- Use `bun` as package manager
- Follow the project structure from `docs/frontend-plan.md` exactly
- All UI via shadcn/ui components — no custom CSS unless truly needed
- No hardcoded brand values — everything flows from BrandConfig
- Mobile-first responsive design
- Don't build the learning experience UI (Phase 8) — just the shell
- Don't build audio player (Phase 9)
- Don't build billing/payments (Phase 10)
- Backend is already running — just call its API

## Seed data available

- 1 org: "firefighter-prep" (Firefighter Prep)
- 1 admin user (created via Supabase)
- 1 exam/course: NFPA 1001
- Topics, sections, concepts, knowledge points, problems all seeded
- Supabase project configured in `supabase/` directory

## What "done" looks like

- `bun dev` from `apps/web/` starts the Next.js dev server
- Landing page renders with Firefighter Prep branding at localhost
- Sign in / sign up pages work with Supabase Auth
- After login, study dashboard shows enrolled courses
- Content browser navigates the course hierarchy
- Mastery state badges show on concepts
- All pages are mobile-responsive
- White-label theming works (changing CSS variables changes the brand)
- No TypeScript errors, no lint errors
```
