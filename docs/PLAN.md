# Niche Audio Prep - Master Plan

> White-labeled audio exam prep SaaS. Same platform, different brands, dozens of niches. Professionals pass certification exams by listening to regulations on repeat.

## The Idea

Professional certification exams (firefighting NFPA codes, pilot FAR regulations, electrician NEC, CDL, etc.) require memorizing dense regulatory content. The target users -- tradespeople, drivers, first responders -- are physically unable to read while working. They're on jobsites, in trucks, on shift.

Audio study aids for these niches barely exist. The ones that do are generic text-to-speech garbage. We go deep: niche-specific branding, curated content, adaptive learning, web-first.

**Business model:** White-label the same platform across niches. Each niche gets its own domain, branding, and content. Adding a new niche = content + config, not code. Target $1k/month per niche, stack niches.

## Agent-Driven Development

Each phase in this plan is designed to be executed by a separate Claude Code agent. This keeps context windows clean and ensures focused execution.

**Workflow per phase:**
1. `/writing-plans` creates a detailed implementation plan with bite-sized TDD tasks (saved to `docs/plans/YYYY-MM-DD-phase-N-name.md`)
2. `/subagent-driven-development` or `/executing-plans` executes the plan task-by-task

**Principles:**
- **Explicit inputs/outputs** — every phase declares what must exist before starting and what's done when complete, so agents start with full context
- **Status tracking** — agents check the Status field before starting and update it when done (Not Started → In Progress → Complete)
- **One agent per phase** — no parallelizing implementers. One phase at a time, sequential execution
- **TDD everywhere** — test first, watch fail, write minimal code to pass. Every phase
- **Two-stage review** — each completed phase gets reviewed for (1) spec compliance and (2) code quality
- **Plans live in `docs/plans/`** — named `YYYY-MM-DD-phase-N-name.md` so they're easy to find and order

## Architecture Overview

```
                    ┌─────────────────────────────────┐
                    │         Custom Domains           │
                    │  firefighterprep.audio           │
                    │  pilotcodes.audio                │
                    │  electricianexam.audio           │
                    └──────────┬──────────────────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │     Next.js on Vercel            │
                    │  (single deployment, all brands) │
                    │  Middleware: Host → brand config  │
                    │  Runtime CSS variable theming    │
                    │  shadcn/ui components            │
                    │  Mobile-responsive (no native)   │
                    └──────────┬──────────────────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │    NestJS Backend (TypeScript)   │
                    │  (single service, all brands)   │
                    │  JWT auth, org-scoped queries    │
                    │  Prisma ORM, NOT white-labeled   │
                    └──────────┬──────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼───┐  ┌────────▼────┐  ┌────────▼────────┐
    │  Supabase   │  │   Modal     │  │    Stripe       │
    │  Auth + DB  │  │  Kokoro TTS │  │   Billing       │
    │  + Storage  │  │  (batch)    │  │   Subscriptions  │
    └─────────────┘  └─────────────┘  └─────────────────┘

    React Native (Expo) — DEFERRED until web is validated
```

## Plan Documents

### [market-research.md](./market-research.md) -- Market Research
Comprehensive analysis of 18+ niche exam markets across 4 tiers. Key findings:
- **Tier 1 niches** (launch first): Electrical (NEC), CDL, Real Estate, Insurance, Firefighting (NFPA), Aviation (FAR)
- **Zero audio competition** in: plumbing, building inspection, pest control, general contractor
- Trades are the sweet spot: users can't read on jobsites, high exam volume, regulation-heavy
- Each niche documented with: exam name, governing body, content scope, annual test-takers, source materials

### [backend-plan.md](./backend-plan.md) -- Backend Architecture (DDD)
Standalone NestJS service (TypeScript). NOT white-labeled -- single service serving all brands. Key decisions:
- **NestJS** -- TypeScript end-to-end with frontend, shared types
- **Prisma ORM** -- type-safe queries, generated client, snake_case DB mapping
- **Supabase** for auth (JWT verification), database (PostgreSQL + RLS), and storage (audio files)
- **Modal** for hosting Kokoro TTS -- batch pre-generation, called via HTTP from NestJS
- **NestJS Guards** for auth: SupabaseAuthGuard, OrgMembershipGuard, SubscriptionGuard
- **Content hierarchy**: exams > topics > sections > study_items > audio_files
- **Stripe** subscriptions: per-org billing with tiered plans
- 16 modules, 6-phase implementation plan, DDD-style

### [frontend-plan.md](./frontend-plan.md) -- Frontend Architecture
White-labeled Next.js on Vercel, single deployment serving all brands. Key decisions:
- **Runtime theming** via CSS variables -- brand config from DB, injected at request time
- **Tenant detection** via middleware (Host header → brand lookup, cached 5 min)
- **shadcn/ui** components that read CSS variables natively -- zero hardcoded colors
- **Landing page template** that renders per-brand content (hero, features, pricing, testimonials)
- **Audio player** evolved from try-listening: same chunk architecture, but fetches pre-generated R2 URLs
- **Separate custom domains** per niche for SEO (not subdomains)
- **Mobile-responsive** -- no native app, responsive web covers mobile use cases

### [mobile-plan.md](./mobile-plan.md) -- Mobile Architecture (DEFERRED)
React Native (Expo) with one app per niche in app stores. **Deferred until web platform is validated.** Preserved for reference.

### [adaptive-learning-architecture.md](./adaptive-learning-architecture.md) -- Adaptive Learning System
Math Academy-inspired mastery-based adaptive learning. The system that compresses a course's worth of learning into the shortest path per student. Covers:
- **Knowledge graph** -- concepts, prerequisite edges, encompassing edges (subject-agnostic, defined by content not code)
- **Diagnostic assessment** -- adaptive 20-60 question assessment to map what the student already knows
- **Mastery enforcement** -- can't advance without passing prerequisites, plateau detection + remediation
- **FIRe spaced repetition** -- Fractional Implicit Repetition: credit flows backward through the graph, reducing review burden
- **Active practice** -- multiple choice, fill blank, true/false, ordering, matching, scenario-based problems
- **Task selection algorithm** -- the "brain" that decides what to study next (frontier, non-interference, review compression)
- **XP system + gamification** -- 1 XP = ~1 min of study, streaks, leaderboards, anti-gaming
- **DDD bounded contexts** -- 6 new backend modules with domain events
- **Data model** -- full Prisma schema additions
- **Content authoring** -- YAML/JSON course definitions, no code to add a new course

### [white-label-architecture-research.md](./white-label-architecture-research.md) -- White-Label Research
Analysis of 4 approaches to white-labeling. Recommendation: runtime config/theme-driven, single Vercel deployment.

## Shared Patterns Across All Plans

These carry over from try-listening and are used everywhere:
- `chunkText()` -- sentence-boundary text chunking (max 3800 chars)
- `synthesize()` -- Modal Kokoro TTS call pattern
- `TokenBucket` rate limiter
- `SupabaseAuthGuard` / `OrgMembershipGuard` (NestJS guards)
- `@CurrentUser()` / `@CurrentOrg()` / `@MinRole()` decorators
- Supabase JWT verification (backend) / `@supabase/ssr` cookie auth (frontend)
- IndexedDB offline audio caching (web)
- PostHog analytics events
- Media Session API (web) for lock screen controls

## Monorepo Structure

```
niche-audio-prep/
├── docs/                    # You are here
│   ├── PLAN.md             # This file
│   ├── plans/              # Per-phase implementation plans
│   ├── market-research.md
│   ├── backend-plan.md
│   ├── frontend-plan.md
│   ├── mobile-plan.md      # DEFERRED
│   └── adaptive-learning-architecture.md
├── backend/                 # NestJS API server
│   ├── src/
│   │   ├── modules/        # NestJS modules (auth, orgs, exams, audio, etc.)
│   │   ├── guards/         # SupabaseAuth, OrgMembership, Subscription
│   │   ├── decorators/     # @CurrentUser, @CurrentOrg, @MinRole
│   │   └── prisma/         # Prisma service + schema
│   ├── test/
│   └── package.json
├── packages/
│   └── shared/             # Shared TS types, API client
│       ├── types/
│       ├── api/
│       └── utils/
├── apps/
│   └── web/                # Next.js app (landing + dashboard)
├── modal/                  # Kokoro TTS deployment (from try-listening)
├── supabase/               # Migrations, seed data, RLS policies
└── scripts/                # Content import, audio batch generation
```

## Execution Order

Learning engine first, then audio platform, then billing. Mobile is deferred entirely.

> See [adaptive-learning-architecture.md](./adaptive-learning-architecture.md) for full technical details on the learning system (Phases 2-6).

---

### Phase 1: Foundation (Week 1-2)

**Status:** Complete

1. Scaffold monorepo (turborepo or nx)
2. Set up Supabase project (schema, RLS, auth)
3. Shared types package
4. NestJS scaffold with Supabase JWT verification
5. Auth guards + decorators

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/backend-plan.md, docs/PLAN.md, try-listening codebase for reference patterns
> - **Outputs:** Working monorepo with NestJS backend, Supabase connected, auth guards passing tests, shared types package importable from backend
> - **Dependencies:** None (first phase)
> - **Estimated tasks:** 12 (each 2-5 min)

---

### Phase 2: Knowledge Graph Foundation (Week 2-4)

**Status:** Complete

1. Prisma schema additions (Course, Concept, KnowledgePoint, PrerequisiteEdge, EncompassingEdge, Problem + ProblemType enum)
2. Knowledge graph module: CRUD, YAML import, graph validation
3. Graph query service: frontier calculation, topological sort, prerequisite chain traversal
4. Content authoring format + two example course YAMLs (NY Real Estate, Alberta Firefighter)

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/adaptive-learning-architecture.md (knowledge graph section), Phase 1 outputs (working backend + Prisma)
> - **Outputs:** Knowledge graph CRUD API, YAML import working, graph validation (cycle detection, orphan check), frontier query service with tests
> - **Dependencies:** Phase 1
> - **Actual tasks:** 8 (implemented 2026-03-09), 66 tests passing

---

### Phase 3: Student Model & Diagnostic (Week 4-6)

**Status:** Complete

1. Student model module: StudentConceptState, StudentKPState
2. Course enrollment flow
3. Adaptive diagnostic assessment algorithm
4. Knowledge profile API

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/adaptive-learning-architecture.md (student model + diagnostic sections), Phase 2 outputs (knowledge graph + query service)
> - **Outputs:** Student model tracking mastery per concept/KP, enrollment API, diagnostic algorithm that adaptively selects questions and maps initial knowledge state, knowledge profile endpoint
> - **Dependencies:** Phase 2
> - **Actual tasks:** 12 (implemented 2026-03-09), 143 tests passing

---

### Phase 4: Assessment & Practice (Week 6-8)

**Status:** Complete

1. Assessment module: problems, reviews, quizzes
2. Problem types: MC, true/false, fill blank, ordering, matching
3. Review + quiz flows

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/adaptive-learning-architecture.md (assessment section), Phase 3 outputs (student model + enrollment)
> - **Outputs:** Problem CRUD, all 5 problem types with scoring logic, review flow (grouped problems per concept), quiz flow with pass/fail thresholds, student state updates on answer submission
> - **Dependencies:** Phase 3
> - **Estimated tasks:** 16 (each 2-5 min)

---

### Phase 5: Learning Engine (Week 8-10)

**Status:** Not Started

1. Task selector: the "brain" -- what to study next
2. Knowledge frontier calculation + mastery enforcement
3. Plateau detection + prerequisite remediation
4. "Next task" API + study session logic

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/adaptive-learning-architecture.md (task selector section), Phase 4 outputs (assessment + practice working)
> - **Outputs:** Task selector that picks optimal next activity (lesson, practice, review), frontier calculation respecting prerequisites, plateau detection triggering remediation, "next task" endpoint returning the right activity with full context
> - **Dependencies:** Phase 4
> - **Estimated tasks:** 14 (each 2-5 min)

---

### Phase 6: Spaced Repetition -- FIRe (Week 10-12)

**Status:** Not Started

1. FIRe algorithm: core equations, memory decay
2. Implicit repetition propagation through encompassing edges
3. Review scheduling + compression
4. Replace SM-2 for adaptive-mode enrollments

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/adaptive-learning-architecture.md (FIRe section), Phase 5 outputs (learning engine + task selector)
> - **Outputs:** FIRe implementation with memory decay curves, implicit repetition flowing through encompassing edges, review scheduler that compresses reviews, SM-2 replacement for adaptive enrollments
> - **Dependencies:** Phase 5
> - **Estimated tasks:** 12 (each 2-5 min)

---

### Phase 7: Web Frontend -- Core (Week 12-15)

**Status:** Not Started

1. White-label theming system (CSS variables, shadcn/ui)
2. Tenant detection middleware (Host header → brand config)
3. Landing page template
4. Auth pages (sign-in, sign-up, invite accept)
5. Study dashboard
6. Content browser (courses → concepts)
7. **Mobile-responsive design throughout** (no native mobile app)

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/frontend-plan.md, Phase 1 outputs (shared types, Supabase auth), backend API from Phases 1-6
> - **Outputs:** Next.js app on Vercel, white-label theming working, tenant detection via Host header, landing page rendering per brand, auth flow complete, study dashboard showing enrolled courses, content browser navigating course → concept hierarchy, all pages mobile-responsive
> - **Dependencies:** Phase 1 (minimum), Phase 6 (for full learning data)
> - **Estimated tasks:** 18 (each 2-5 min)

---

### Phase 8: Web Frontend -- Learning Experience (Week 15-17)

**Status:** Not Started

1. Diagnostic assessment UI
2. Knowledge profile visualization
3. Practice problem UI (all problem types)
4. Study session UI (the main learning experience)
5. Review + quiz flows
6. Progress tracking UI

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/frontend-plan.md, docs/adaptive-learning-architecture.md (UI sections), Phase 7 outputs (working Next.js app), backend APIs from Phases 3-6
> - **Outputs:** Diagnostic flow UI, knowledge profile graph/chart, all 5 problem type UIs, study session page consuming "next task" API, review + quiz flows, progress dashboard with mastery percentages
> - **Dependencies:** Phase 7
> - **Estimated tasks:** 18 (each 2-5 min)

---

### Phase 9: Audio Pipeline (Week 17-19)

**Status:** Not Started

1. Port Modal Kokoro TTS from try-listening
2. Batch TTS generation script
3. Upload to Supabase Storage
4. Audio serving API with caching
5. Audio player component (evolved from try-listening)
6. Audio integration with lessons (instruction + worked examples)
7. Offline audio support (IndexedDB)

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** try-listening codebase (TTS + audio player), docs/backend-plan.md (audio module), Phase 8 outputs (learning experience UI)
> - **Outputs:** Modal Kokoro TTS deployed, batch generation script producing audio for all content, Supabase Storage upload pipeline, audio serving API with CDN caching, audio player component in web app, audio integrated into lesson flow, IndexedDB offline caching working
> - **Dependencies:** Phase 8 (for UI integration), Phase 1 (for backend)
> - **Estimated tasks:** 16 (each 2-5 min)

---

### Phase 10: Billing (Week 19-20)

**Status:** Not Started

1. Stripe integration (checkout, webhooks, portal)
2. Subscription gating middleware
3. Pricing page per brand

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/backend-plan.md (billing module), Phase 7 outputs (web frontend with theming)
> - **Outputs:** Stripe Checkout flow, webhook handler for subscription events, customer portal link, SubscriptionGuard gating premium content, per-brand pricing page with Stripe Checkout integration
> - **Dependencies:** Phase 7 (for frontend), Phase 1 (for backend)
> - **Estimated tasks:** 10 (each 2-5 min)

---

### Phase 11: Gamification & Polish (Week 20-22)

**Status:** Not Started

1. XP system with anti-gaming
2. Leaderboards + enhanced streaks
3. Knowledge graph progress visualization

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/adaptive-learning-architecture.md (gamification section), Phase 8 outputs (learning experience UI), Phase 5 outputs (learning engine)
> - **Outputs:** XP awarded per activity with anti-gaming caps, leaderboard API + UI, streak system with freeze tokens, interactive knowledge graph visualization showing mastery progress
> - **Dependencies:** Phase 8
> - **Estimated tasks:** 10 (each 2-5 min)

---

### Phase 12: Launch Prep (Week 22-24)

**Status:** Not Started

1. First niche content loaded (pick one Tier 1)
2. First full adaptive course content
3. SEO optimization
4. Analytics + monitoring (PostHog)
5. Load testing

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/market-research.md (Tier 1 niches), all previous phase outputs
> - **Outputs:** One complete niche (e.g., Electrical/NEC) with full adaptive course content, audio generated, brand configured, SEO meta tags + sitemap, PostHog tracking on key flows, load test passing at target concurrency
> - **Dependencies:** All previous phases (9-11 especially)
> - **Estimated tasks:** 12 (each 2-5 min)

---

### Deferred: Mobile App

**Status:** Deferred

React Native (Expo) with one app per niche in app stores. See [mobile-plan.md](./mobile-plan.md) for the full plan.

Will be built after the web platform is validated with paying users. The web app is mobile-responsive, which covers the core use case until native features (background audio, offline downloads, push notifications) justify the investment.

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** docs/mobile-plan.md, all backend APIs, validated web platform
> - **Outputs:** Expo app with RNTP audio, WatermelonDB offline sync, per-niche App Store builds
> - **Dependencies:** Phases 1-12 complete, web platform validated with paying users
> - **Estimated tasks:** 25 (each 2-5 min)

---

## Launch Strategy

1. **Learning engine first.** The adaptive learning system is the moat. Audio is a feature, not the product. Build the brain before the voice.
2. **Web-first, mobile-responsive.** No native app until the web platform is validated. Responsive design covers mobile use cases for MVP.
3. **Pick ONE niche first.** Recommendation: Electrical (NEC) or CDL. Highest volume, zero audio competition, users are mobile-first.
4. **Validate with 10 paying users** before expanding to second niche.
5. **Add niches every 2-3 weeks** once the platform is stable. Each new niche is just content + brand config.
6. **Mobile app after validation.** Build native only when background audio / offline downloads become the #1 user request.

## Key Risks

| Risk | Mitigation |
|------|------------|
| Regulatory content licensing | Start with publicly available codes/regulations. Some (NFPA, NEC) require purchase. Budget for source material. |
| TTS quality for technical terms | Custom pronunciation dictionaries per niche. Kokoro handles most terms well. |
| Content accuracy liability | Disclaimer: "study aid, not official source." Version content to match current exam year. |
| Modal costs at scale | Pre-generate everything. Cache aggressively. One-time cost per content version. |
| Adaptive learning complexity | Build incrementally (Phases 2-6). Each phase is independently testable. Don't try to ship it all at once. |
| No native mobile at launch | Mobile-responsive web covers 80% of use case. Monitor user feedback for native demand signals. |

## What We're NOT Building (Yet)

- **Mobile app** -- deferred until web is validated (see mobile-plan.md)
- User-generated content (paste your own URLs) -- that's try-listening
- AI tutoring / chat
- Community features (forums, study groups)
- Live classes or video
- Content creation tools for third parties

Build the adaptive learning engine first (Phases 1-6), then the web platform (Phases 7-8), then audio + billing (Phases 9-10), then polish and launch (Phases 11-12).
