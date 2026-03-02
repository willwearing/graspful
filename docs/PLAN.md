# Niche Audio Prep - Master Plan

> White-labeled audio exam prep SaaS. Same platform, different brands, dozens of niches. Professionals pass certification exams by listening to regulations on repeat.

## The Idea

Professional certification exams (firefighting NFPA codes, pilot FAR regulations, electrician NEC, CDL, etc.) require memorizing dense regulatory content. The target users -- tradespeople, drivers, first responders -- are physically unable to read while working. They're on jobsites, in trucks, on shift.

Audio study aids for these niches barely exist. The ones that do are generic text-to-speech garbage. We go deep: niche-specific branding, curated content, spaced repetition, mobile-first.

**Business model:** White-label the same platform across niches. Each niche gets its own domain, branding, and content. Adding a new niche = content + config, not code. Target $1k/month per niche, stack niches.

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

    ┌─────────────────────────────────────────────────────┐
    │              React Native (Expo)                     │
    │  One codebase → separate app per niche              │
    │  FirefighterPrep, PilotCodes, ElectricianExam, etc. │
    │  Shared: types, API client, business logic hooks    │
    └─────────────────────────────────────────────────────┘
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
- **NestJS** -- TypeScript end-to-end with frontend and mobile, shared types
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
- 25 tasks across 8 phases

### [mobile-plan.md](./mobile-plan.md) -- Mobile Architecture
React Native (Expo) with one app per niche in app stores. Key decisions:
- **React Native over Flutter** -- TypeScript/React code reuse with web is decisive
- **One app per niche** in app stores -- ASO wins ("FirefighterPrep" ranks, "ExamAudio" doesn't)
- **react-native-track-player** for background audio, lock screen, Bluetooth/car controls
- **WatermelonDB** (SQLite) for offline data sync + expo-file-system for audio file downloads
- **Pre-generated audio files** (not on-demand TTS) -- RNTP expects complete files
- 25 tasks across 7 phases

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
- Phases 8-13 implementation plan (~10-15 weeks)

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
- IndexedDB offline audio caching (web) / WatermelonDB + file system (mobile)
- PostHog analytics events
- Media Session API (web) / RNTP (mobile) for lock screen controls

## Monorepo Structure

```
niche-audio-prep/
├── docs/                    # You are here
│   ├── PLAN.md             # This file
│   ├── market-research.md
│   ├── backend-plan.md
│   ├── frontend-plan.md
│   └── mobile-plan.md
├── backend/                 # NestJS API server
│   ├── src/
│   │   ├── modules/        # NestJS modules (auth, orgs, exams, audio, etc.)
│   │   ├── guards/         # SupabaseAuth, OrgMembership, Subscription
│   │   ├── decorators/     # @CurrentUser, @CurrentOrg, @MinRole
│   │   └── prisma/         # Prisma service + schema
│   ├── test/
│   └── package.json
├── packages/
│   └── shared/             # Shared TS types, API client (web + mobile)
│       ├── types/
│       ├── api/
│       └── utils/
├── apps/
│   ├── web/                # Next.js app (landing + dashboard)
│   └── mobile/             # Expo app
├── modal/                  # Kokoro TTS deployment (from try-listening)
├── supabase/               # Migrations, seed data, RLS policies
└── scripts/                # Content import, audio batch generation
```

## Execution Order

### Phase 1: Foundation (Week 1-2)
1. Scaffold monorepo (turborepo or nx)
2. Set up Supabase project (schema, RLS, auth)
3. Port Modal TTS from try-listening
4. Shared types package

### Phase 2: Backend Core (Week 2-3)
5. NestJS scaffold with Supabase JWT verification (SupabaseAuthGuard)
6. Auth guards + decorators (OrgMembershipGuard, @MinRole, @CurrentUser)
7. Org management API (create, invite, roles)
8. Content CRUD API (admin)
9. Content import pipeline (regulation text → study items)

### Phase 3: Audio Pipeline (Week 3-4)
10. Batch TTS generation script
11. Upload to Supabase Storage
12. Audio serving API with caching

### Phase 4: Web Frontend (Week 4-6)
13. White-label theming system
14. Landing page template
15. Auth pages (sign-in, sign-up, invite accept)
16. Study dashboard
17. Content browser (exam → topic → section)
18. Audio player (evolve from try-listening)
19. Progress tracking UI
20. Offline support

### Phase 5: Billing (Week 6-7)
21. Stripe integration (checkout, webhooks, portal)
22. Subscription gating middleware
23. Pricing page per brand

### Phase 6: Mobile (Week 7-10)
24. Expo scaffold with shared packages
25. Audio engine (RNTP)
26. Offline downloads (WatermelonDB + file system)
27. Study features (modes, streaks, bookmarks)
28. Push notifications
29. White-label build pipeline (EAS)

### Phase 7: Launch Prep (Week 10-11)
30. First niche content loaded (pick one Tier 1)
31. SEO optimization
32. App Store submission
33. Analytics + monitoring
34. Load testing

## Launch Strategy

1. **Pick ONE niche first.** Recommendation: Electrical (NEC) or CDL. Highest volume, zero audio competition, users are mobile-first.
2. **Web MVP first**, mobile fast-follow. Web is faster to ship and iterate.
3. **Validate with 10 paying users** before expanding to second niche.
4. **Add niches every 2-3 weeks** once the platform is stable. Each new niche is just content + brand config.

## Key Risks

| Risk | Mitigation |
|------|------------|
| Regulatory content licensing | Start with publicly available codes/regulations. Some (NFPA, NEC) require purchase. Budget for source material. |
| TTS quality for technical terms | Custom pronunciation dictionaries per niche. Kokoro handles most terms well. |
| App Store rejection | Follow subscription guidelines carefully. No workarounds. |
| Content accuracy liability | Disclaimer: "study aid, not official source." Version content to match current exam year. |
| Modal costs at scale | Pre-generate everything. Cache aggressively. One-time cost per content version. |

### Phase 8: Knowledge Graph Foundation (Week 12-14)
35. Prisma schema additions (Concept, KnowledgePoint, edges, Course, enrollment)
36. Knowledge graph module: CRUD, YAML import, graph validation
37. Graph query service: frontier calculation, prerequisite/encompassing traversal
38. Content authoring format + example course YAML

### Phase 9: Student Model & Diagnostic (Week 14-16)
39. Student model module: StudentConceptState, StudentKPState
40. Course enrollment flow
41. Adaptive diagnostic assessment algorithm
42. Diagnostic UI (web + mobile)
43. Knowledge profile visualization

### Phase 10: Assessment & Practice (Week 16-18)
44. Assessment module: problems, reviews, quizzes
45. Problem types: MC, true/false, fill blank, ordering, matching
46. Practice problem UI (web + mobile)
47. Review + quiz flows with audio integration

### Phase 11: Learning Engine (Week 18-20)
48. Task selector: the "brain" -- what to study next
49. Knowledge frontier calculation + mastery enforcement
50. Plateau detection + prerequisite remediation
51. "Next task" API + study session UI

### Phase 12: Spaced Repetition -- FIRe (Week 20-22)
52. FIRe algorithm: core equations, memory decay
53. Implicit repetition propagation through encompassing edges
54. Review scheduling + compression
55. Replace SM-2 for adaptive-mode enrollments

### Phase 13: Gamification & Polish (Week 22-24)
56. XP system with anti-gaming
57. Leaderboards + enhanced streaks
58. Knowledge graph progress visualization
59. First full adaptive course content (one Tier 1 niche)

> See [adaptive-learning-architecture.md](./adaptive-learning-architecture.md) for full technical details on Phases 8-13.

## What We're NOT Building (Yet)

- User-generated content (paste your own URLs) -- that's try-listening
- AI tutoring / chat
- Community features (forums, study groups)
- Live classes or video
- Content creation tools for third parties

Ship the audio platform first (Phases 1-7), then layer adaptive learning on top (Phases 8-13).
