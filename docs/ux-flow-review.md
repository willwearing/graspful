# Graspful UX Flow Review

This review is based on the implemented `apps/web` product surface and the current Playwright suite in `apps/web/e2e`.

## Review Summary

Graspful currently exposes seven major UX surfaces:

1. Marketing discovery
2. Account auth and recovery
3. CLI and agent auth handoff
4. Creator onboarding and authoring
5. Learner browse and study
6. Branded academy and `/learn` access
7. Billing, branding, and routing infrastructure

The main strengths are:

- The platform has clear split surfaces for creators, learners, and agents.
- Route protection and host-aware routing are already heavily exercised.
- The most important end-to-end journeys are covered with real backend integration, not shallow mocks.

The main UX risks I found are:

- Flow coverage was broad but not previously documented in one place, so it was easy to miss what counted as a regression-critical path.
- Academy continuation existed as a first-class CTA on both native and branded surfaces, but did not have direct Playwright regression coverage.
- CLI browser auth had coverage for sign-up handoff, but not the existing-user sign-in handoff.

## Flow Inventory

Each item below is a real user flow or system-supported handoff, with at least one corresponding E2E regression test.

| Flow | Primary entry | Expected outcome | E2E coverage |
| --- | --- | --- | --- |
| Visitor lands on homepage | `/` | Sees hero, features, pricing, FAQ, CTA | `landing.spec.ts` |
| Visitor navigates from landing to sign-up | Homepage CTA/nav | Reaches `/sign-up` | `navigation.spec.ts` |
| Visitor navigates from landing to sign-in | Homepage nav | Reaches `/sign-in` | `navigation.spec.ts` |
| Visitor navigates to pricing | `/pricing` or landing nav | Sees plan details and CTA | `pricing.spec.ts`, `navigation.spec.ts` |
| Visitor browses docs | `/docs` and subpages | Docs content loads with nav/sidebar | `docs-smoke.spec.ts` |
| Visitor evaluates agent offering | `/agents`, `/agents.md`, `/llms.txt`, `/llms-full.txt` | Sees agent workflow, auth guidance, MCP info | `agents-page.spec.ts`, `agent-discovery.spec.ts`, `seo-smoke.spec.ts` |
| User opens sign-up form | `/sign-up` | Form renders correctly | `auth.spec.ts` |
| User opens sign-in form | `/sign-in` | Form renders correctly | `auth.spec.ts` |
| User validates sign-up form errors | `/sign-up` | Missing/short password errors display | `auth.spec.ts` |
| User signs in with invalid credentials | `/sign-in` | Error feedback displays | `auth.spec.ts` |
| User navigates between sign-up and sign-in | Auth page cross-links | Correct auth screen loads | `auth.spec.ts`, `navigation.spec.ts` |
| User requests password reset | `/forgot-password` | Confirmation state appears after submit | `auth-recovery.spec.ts` |
| User follows recovery link | `/reset-password` | Can set a new password and sign in | `auth-recovery.spec.ts` |
| Unauthenticated user hits a protected route | `/dashboard`, `/settings`, `/browse`, `/study/...`, `/diagnostic/...` | Redirects to sign-in with preserved return URL | `auth.spec.ts`, `navigation.spec.ts` |
| User signs up through web UI | `/sign-up` | Account is provisioned with a working org | `provision-flow.spec.ts` |
| User signs up on branded subdomain | branded `/sign-up` | Confirmation screen and callback wiring work | `subdomain-signup.spec.ts` |
| User signs out | app header | Session clears and protected routes bounce to sign-in | `sign-out.spec.ts` |
| Agent registers via API | `POST /auth/register` | Gets user, org, and API key | `agent-registration.spec.ts`, `agent-auth-ux.spec.ts` |
| Agent reads discovery/auth docs | `/agents*`, `llms*.txt` | Learns auth-first workflow | `agent-discovery.spec.ts`, `agent-auth-ux.spec.ts` |
| Agent imports course via API | import endpoints | Draft/published course is created | `agent-course-creation.spec.ts`, `course-import.spec.ts` |
| Agent imports brand via API | brand import endpoint | Brand config is stored | `agent-brand-import.spec.ts` |
| CLI user starts sign-up browser handoff | `/cli-auth?mode=sign-up` | Browser auth completes and CLI exchange returns API key | `cli-auth.spec.ts` |
| CLI user starts sign-in browser handoff | `/cli-auth?mode=sign-in` | Existing-user auth completes and CLI exchange returns API key | `cli-auth.spec.ts` |
| Creator lands in creator control plane | `/creator` | Sees creator dashboard and stats/empty state | `creator-dashboard.spec.ts` |
| Creator opens new-course workspace | `/creator/manage` | Sees brand/course tabs and import actions | `creator-manage-new.spec.ts` |
| Creator imports a new course from UI | creator manage screen | Lands on edit page after import | `creator-authoring.spec.ts` |
| Creator edits and saves YAML | `/creator/manage/[courseId]` | Changes persist after reload | `creator-authoring.spec.ts`, `creator-manage-edit.spec.ts` |
| Creator downloads YAML | creator manage screens | YAML download is offered | `creator-authoring.spec.ts`, `creator-manage-edit.spec.ts` |
| Creator archives a course | creator manage list | Course disappears after confirmation | `creator-archive-course.spec.ts` |
| Creator opens API keys page | `/creator/api-keys` | Sees quickstart, empty state, and dialog | `creator-api-keys.spec.ts` |
| Creator creates, lists, and revokes API keys | API keys UI/API | Key lifecycle works end to end | `creator-api-keys.spec.ts`, `api-keys.spec.ts` |
| Creator views billing/settings | `/settings` | Billing card and account details render | `creator-billing.spec.ts` |
| Learner lands on dashboard | `/dashboard` | Sees courses, XP, streaks, and browse entry | `courses.spec.ts` |
| Learner browses academies | `/browse` | Sees available academies | `courses.spec.ts`, `academy.spec.ts` |
| Learner opens course detail | `/browse/[courseId]` | Sees course summary, sections, and concepts | `courses.spec.ts`, `course-sections.spec.ts` |
| Learner starts diagnostic from course detail | course page CTA | Lands on diagnostic flow | `learner-happy-path.spec.ts`, `diagnostic.spec.ts` |
| Learner progresses through diagnostic | diagnostic route | Questions advance and session resumes after reload | `diagnostic.spec.ts` |
| Learner reaches study after diagnostic | study router | Sees lesson/review/quiz/remediation content | `learner-happy-path.spec.ts`, `spaced-repetition.spec.ts`, `failure-remediation.spec.ts` |
| Learner opens direct lesson route | `/study/[courseId]/lesson/[conceptId]` | Lesson content loads | `posthog-lessons.spec.ts` |
| Learner opens review route | `/study/[courseId]/review/[conceptId]` | Review content loads | `failure-remediation.spec.ts` |
| Learner opens quiz route | `/study/[courseId]/quiz` | Quiz content loads | `learn-deep-routes.spec.ts` |
| Learner sees post-diagnostic progress state | course detail after activity | Progress/mastery indicators replace initial CTA | `spaced-repetition.spec.ts`, `failure-remediation.spec.ts` |
| Learner opens academy detail | `/academy/[academyId]` | Sees academy progress, graph, and courses | `academy.spec.ts` |
| Learner continues via academy study entry | academy CTA | Academy study router loads | `academy.spec.ts` |
| Branded learner enters learning hub | `/learn/[orgSlug]` | Learner sees entitled academy/course hub | `learn-access.spec.ts` |
| Branded learner opens academy detail | `/learn/[orgSlug]/academies/[academySlug]` | Sees academy progress and course list | `learn-access.spec.ts` |
| Branded learner continues via academy study entry | academy CTA on `/learn` | Branded academy study router loads | `learn-deep-routes.spec.ts` |
| Branded learner opens deep study routes | branded lesson/review/quiz routes | Content loads on `/learn` surface | `learn-deep-routes.spec.ts` |
| Host-aware brand routing resolves correct surface | `graspful.ai`, `app.graspful.ai`, academy domains | Marketing, creator, and learner surfaces stay separated | `host-routing.spec.ts`, `white-label.spec.ts` |
| White-label theming is applied | branded requests | Brand variables, name, and headers are injected | `white-label.spec.ts` |
| Public SEO/discovery endpoints work | `robots.txt`, `sitemap.xml`, metadata | Search/LLM discovery surfaces load correctly | `seo.spec.ts`, `seo-smoke.spec.ts` |

## Coverage Additions Made In This Review

- Added direct Playwright coverage for the CLI existing-user sign-in browser handoff.
- Added direct Playwright coverage for the native academy “Continue Academy” study entry.
- Added direct Playwright coverage for the branded `/learn` academy “Continue Academy” study entry.

## Notes

- I treated flows as user-meaningful journeys, not every single route file.
- Some backend/API surfaces are regression-critical even when they are agent-first rather than click-first, so they remain in scope for the flow list.
