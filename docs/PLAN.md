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
                    │                                  │
                    │  Middleware: Host → brand config  │
                    │  Runtime CSS variable theming    │
                    │  shadcn/ui components            │
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

### [backend-plan.md](./backend-plan.md) -- Backend Architecture
15-table Supabase schema, Modal TTS pipeline, Stripe billing. Key decisions:
- **Supabase** for auth (multi-provider), database (PostgreSQL + RLS), and storage (audio files)
- **Modal** for hosting Kokoro TTS -- batch pre-generation of all content audio (not on-demand like try-listening)
- **Multi-tenant org model** with roles (owner/admin/member) and row-level security
- **Content hierarchy**: exams > topics > sections > study_items > audio_files
- **Stripe** subscriptions: per-org billing with tiered plans
- 20 tasks across 8 phases, TDD-style

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

### [white-label-architecture-research.md](./white-label-architecture-research.md) -- White-Label Research
Analysis of 4 approaches to white-labeling. Recommendation: runtime config/theme-driven, single Vercel deployment.

## Shared Patterns Across All Plans

These carry over from try-listening and are used everywhere:
- `chunkText()` -- sentence-boundary text chunking (max 3800 chars)
- `synthesize()` -- Modal Kokoro TTS call pattern
- `TokenBucket` rate limiter
- `requireUser()` auth guard
- `@supabase/ssr` cookie-based auth
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
├── packages/
│   └── shared/             # Types, API client, business logic hooks
│       ├── types/          # Shared TypeScript types
│       ├── api/            # API client (fetch wrapper)
│       └── utils/          # chunkText, formatting, etc.
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
5. Tenant resolution middleware
6. Auth flow (Supabase + multi-provider)
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

## What We're NOT Building (Yet)

- User-generated content (paste your own URLs) -- that's try-listening
- AI tutoring / chat / quizzes -- just audio for now
- Community features (forums, study groups)
- Live classes or video
- Content creation tools for third parties

Keep it simple. Audio study. Pass your exam. Ship fast.
