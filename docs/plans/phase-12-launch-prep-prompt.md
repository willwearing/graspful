# Phase 12: Launch Prep -- Build Prompt

> Copy this entire prompt into a new Claude Code session to kick off the build.

---

## Prompt

```
I'm building a white-labeled adaptive learning platform for professional certification exams. Phases 1-11 are complete (backend learning engine + frontend learning experience + audio pipeline + billing + gamification). I need you to execute Phase 12: Launch Prep.

## Your workflow

1. Read the docs below to understand the project and what's already built
2. Use `/writing-plans` to create a detailed implementation plan for Phase 12
3. After I approve the plan, use `/subagent-driven-development` to execute it task-by-task
4. After all tasks are done, run the **review protocol** (see bottom of this prompt)

## Context -- read these docs IN ORDER

1. `docs/PLAN.md` -- Master plan. Read "Phase 12: Launch Prep" for scope. Note Phases 1-11 are Complete.

2. `docs/adaptive-learning-architecture.md` -- Primary architecture doc. Understand the full system.

3. `docs/backend-plan.md` -- Backend architecture and APIs. Note existing modules, test patterns, and audio pipeline.

4. `docs/frontend-plan.md` -- Frontend architecture. Note existing components, routing, and white-label theming.

5. Browse `docs/market-research.md` -- Tier 1 niches for first content load.

6. Browse `backend/prisma/schema.prisma` -- Full data model.

7. Browse `backend/src/` -- Existing modules (assessment, gamification, audio, billing, etc.)

8. Browse `apps/web/src/` -- Existing frontend (dashboard, study, auth, marketing).

## What Phases 1-11 built (already working)

### Backend (Phases 1-6, 9-11) -- 419 tests passing
- **Phases 1-6:** NestJS backend, knowledge graph, student model, assessment (all problem types + XP calculator), learning engine, spaced repetition
- **Phase 9:** Audio pipeline (Modal Kokoro TTS, batch generation, audio serving)
- **Phase 10:** Billing (Stripe checkout, webhooks, subscription guard, pricing)
- **Phase 11:** Gamification (XP events with daily cap, streaks with freeze tokens, leaderboards, completion estimates, knowledge graph API)

### Frontend (Phases 7-11) -- 161 tests passing (31 files)
- **Phases 7-8:** Next.js 15, white-label theming, auth, dashboard, content browser, diagnostic UI, problem UIs, study session, lesson flow, review/quiz flows
- **Phase 9:** Audio player (AudioPlayerProvider, PlayerBar, Media Session, offline audio)
- **Phase 10:** Pricing page, billing settings, subscription management
- **Phase 11:** Dashboard gamification widgets (XP chart, leaderboard, completion estimate, knowledge graph visualization)

## Phase 12 scope

Prepare for launch with first niche content and production readiness.

Specific deliverables:

1. **First niche content loaded (Tier 1)**:
   - Pick one Tier 1 niche from market research (e.g., Electrical/NEC)
   - Create complete course content: concepts, knowledge points, problems, prerequisite edges
   - Content loading script that reads structured content and seeds the database
   - Brand configuration for the niche (org, theming, domain)

2. **Full adaptive course content**:
   - Ensure all problem types work with real content (MC, TF, fill-blank, matching, ordering)
   - Verify diagnostic, lesson, review, and quiz flows work end-to-end
   - Generate audio for all content via the audio pipeline

3. **SEO optimization**:
   - Meta tags (title, description, og:image) for marketing pages
   - Sitemap generation
   - robots.txt
   - Structured data (JSON-LD) for course pages

4. **Analytics + monitoring (PostHog)**:
   - PostHog integration (page views, custom events)
   - Key events: sign-up, enrollment, lesson-complete, quiz-complete, subscription
   - Error tracking
   - Feature flags setup

5. **Load testing**:
   - Load test script for key API endpoints
   - Target: 100 concurrent users
   - Identify and fix bottlenecks

## Constraints

- Use `bun` as package manager
- Content must follow existing Prisma schema exactly
- All UI must use CSS variables (white-label theming)
- Don't modify existing working features
- PostHog should use the official Next.js integration

## What "done" looks like

- One complete niche with 50+ concepts, 200+ problems, audio generated
- Content loading script works and is idempotent
- Brand configuration complete (org, theme, custom domain ready)
- SEO meta tags on all marketing pages
- Sitemap and robots.txt served
- PostHog tracking key user flows
- Load test passes at 100 concurrent users
- No TypeScript errors
- All existing tests still passing
- Production build succeeds

---

## Review protocol (MANDATORY -- do this after all tasks are complete)

### Step 1: Full code review
Launch 4 parallel review agents, one for each area:

1. **Content loading (backend)**: Read content loading script, seed data. Check: data integrity, idempotency, all problem types covered, prerequisite edges valid.

2. **SEO + marketing (frontend)**: Read meta tags, sitemap, robots.txt, structured data. Check: correct OpenGraph tags, sitemap includes all public pages, JSON-LD validates.

3. **Analytics (frontend + backend)**: Read PostHog integration. Check: provider setup, key events tracked, no PII in events, feature flags wired.

4. **Load testing**: Read load test script. Check: covers key endpoints, assertions reasonable, identifies bottlenecks.

### Step 2: Fix all issues
Fix every issue found -- prioritize P0 (broken functionality) and P1 (security, bad UX) first.

### Step 3: Run all tests
```bash
cd apps/web && bun run test
```
Fix any failures. Add tests for any component or hook that lacks coverage.

### Step 4: Type check + build
```bash
cd apps/web && npx tsc --noEmit && bun run build
```
Fix any errors.

### Step 5: Verify backend tests still pass
```bash
cd backend && npx jest --silent
```
Should still be 419+ tests passing.

### Step 6: Update plan docs
1. Update `docs/PLAN.md` -- set Phase 12 status to "Complete" with actual task/test counts
2. Update `docs/backend-plan.md` -- update status line
3. Update `docs/frontend-plan.md` -- update status line

### Step 7: Summary
Print a summary of:
- What was built (deliverables)
- Test counts (frontend + backend)
- Issues found and fixed during review
- What's next (production deployment, marketing, user onboarding)
```
