# Niche Audio Prep

White-labeled adaptive learning platform for professional certification exams. Audio instruction + mastery-based progression, powered by a knowledge graph.

## What This Is

Professionals in trades and regulated industries (firefighters, pilots, electricians, CDL drivers, real estate agents) need to memorize dense regulatory content to pass certification exams. They're on jobsites, in trucks, on shift -- they can't sit down and read a textbook.

This platform delivers that content via audio, then verifies understanding through active practice. One codebase serves every niche. Adding a new certification = content + config, not code.

## Guiding Principles

### 1. Identify what the student already knows
An adaptive diagnostic maps existing knowledge in 20-60 questions. No wasting time on material already mastered.

### 2. Build a personal knowledge profile on a knowledge graph
Every course is a directed graph of concepts connected by prerequisite and encompassing edges. The student's diagnostic results overlay onto this graph, producing a personal map of what's known, partially known, and unknown.

### 3. Teach only at the knowledge frontier
The frontier is the boundary between known and unknown. The system teaches only concepts whose prerequisites are fully mastered. Every minute of study time is spent on exactly the right thing.

### 4. Minimum effective dose of instruction + active practice
Each lesson cycles: short audio explanation, worked example, 2-3 practice problems. Students spend most of their time solving problems, not passively listening.

### 5. Enforce mastery relentlessly
Can't consistently solve problems? You don't advance. The system routes you to parallel learning paths, identifies the specific weak prerequisite, remediates it, then brings you back.

### 6. Spaced repetition + broad-coverage quizzes
Previously learned material decays. The system schedules reviews on an exponential spacing schedule and runs periodic timed quizzes across recent material.

### 7. Review old stuff by learning new stuff
The key efficiency innovation. Advanced concepts implicitly practice their prerequisites as subskills. The system tracks this implicit repetition and credits it against the review schedule -- dramatically reducing explicit review burden. You advance by reviewing, not by going backwards.

## Architecture

- **Frontend:** Next.js 15, shadcn/ui, Tailwind -- single Vercel deployment, custom domains per niche
- **Backend:** NestJS (TypeScript), Prisma, Supabase -- DDD bounded contexts
- **Mobile:** React Native (Expo) -- one app per niche in app stores
- **Audio:** Kokoro TTS on Modal -- batch pre-generation
- **Adaptive Learning:** Knowledge graph + FIRe spaced repetition + mastery enforcement
- **Billing:** Stripe

## Docs

| Document | What It Covers |
|----------|---------------|
| [PLAN.md](docs/PLAN.md) | Master plan, architecture overview, 13-phase execution roadmap |
| [adaptive-learning-architecture.md](docs/adaptive-learning-architecture.md) | Full adaptive learning system design -- knowledge graph, FIRe algorithm, diagnostic, mastery, DDD contexts, data model, API |
| [backend-plan.md](docs/backend-plan.md) | NestJS backend architecture, Prisma schema, API design, content pipeline |
| [frontend-plan.md](docs/frontend-plan.md) | Next.js frontend, white-label theming, audio player, 25 tasks |
| [mobile-plan.md](docs/mobile-plan.md) | React Native (Expo), offline audio, background playback, 25 tasks |
| [white-label-architecture-research.md](docs/white-label-architecture-research.md) | 4 approaches to white-labeling, recommendation |
| [market-research.md](market-research.md) | 18+ niche markets analyzed, tier rankings |

## Inspired By

The adaptive learning system is heavily inspired by [Math Academy](https://mathacademy.com) and Justin Skycak's published research on knowledge graphs, mastery-based learning, and the Fractional Implicit Repetition (FIRe) algorithm. See the [adaptive learning doc](docs/adaptive-learning-architecture.md#16-key-sources--further-reading) for all sources.
