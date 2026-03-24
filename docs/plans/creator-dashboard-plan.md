# Creator Dashboard Plan

## Problem

graspful.vercel.app has Sign In / Get Started buttons that land on the **student** dashboard (streaks, XP, lessons). This makes no sense — graspful.com is for **course creators and AI agents**, not learners.

When a creator signs in on graspful.com, they should see their courses, learner stats, and revenue.

## Current State

**What exists (backend):**
- Course import API — `POST /orgs/{orgSlug}/courses/import`
- Course list API — `GET /orgs/{orgSlug}/courses`
- API key system — `gsk_` keys, SHA256 hashed, per-org scoped
- Stripe Connect — 30% platform fee, `GET /orgs/{orgId}/billing/revenue`
- Revenue events — tracked on `invoice.paid` webhook
- `ApiKeyGuard` — exists but not wired to any endpoint

**What doesn't exist:**
- Creator dashboard UI — no web page for creators at all
- API key management UI — keys can only be created via API
- Course management UI — no way to create/edit courses in the browser
- Course archive — no endpoint or UI
- Brand-aware post-login routing — everyone goes to student dashboard
- Agent self-signup — no way to register without a browser

## Design Principles

1. **Agent-first.** Every workflow must work headless via API/CLI. The web UI is a convenience layer, not the primary interface.
2. **Follow existing architecture.** DDD bounded contexts, existing guards/services, reuse the `(app)` sidebar layout.
3. **Test everything.** Unit tests for new services, e2e tests for the full creator flow.

## Pages

### Creator sidebar

Reuse the existing `(app)` sidebar. For the graspful brand, swap the nav items:

**Student brand sidebar:** Dashboard, Browse, Settings
**Graspful (creator) sidebar:** Courses, Course Management, API Keys, Settings + org switcher dropdown (if user has multiple orgs)

### Page 1: Creator Dashboard (`/creator`)

```
┌──────────┬──────────────────────────────────────────┐
│          │  Graspful                will@example.com │
│ SIDEBAR  ├──────────────────────────────────────────┤
│          │                                           │
│ Courses  │  ┌──────────┐ ┌────────────┐ ┌────────┐ │
│ Manage   │  │ Students │ │ Avg Compl. │ │Revenue │ │
│ API Keys │  │    142   │ │    67%     │ │ $4,280 │ │
│ Settings │  │    142   │ │    67%     │ │ $4,280 │ │
│          │  └──────────┘ └────────────┘ └────────┘ │
│          │                                           │
│          │  Your Courses                             │
│          │  ┌─────────────────────────────────────┐ │
│          │  │ AWS SA        Published  89 learners│ │
│          │  │ will-aws.graspful.com  [Edit][Archv]│ │
│          │  ├─────────────────────────────────────┤ │
│          │  │ JavaScript    Draft       0 learners│ │
│          │  │ will-js.graspful.com   [Edit][Archv]│ │
│          │  └─────────────────────────────────────┘ │
│          │                                           │
└──────────┴──────────────────────────────────────────┘
```

**1. Stat cards (top)** — 3 cards:

| Card | Data | Source |
|------|------|--------|
| Students | Total enrolled learners across all courses | Count of `CourseEnrollment` rows for org |
| Avg Completion | Average course completion % across learners | Avg of mastered/total concepts per enrollment |
| Revenue | Total creator payout (all time) | Sum of `RevenueEvent.creatorPayout` for org |

**2. Course cards** — one per course:
- Course name
- Status badge (Published / Draft)
- Learner count (enrolled)
- Brand URL as a link (e.g., `will-javascript.graspful.com`) — opens in new tab
- **Edit button** → navigates to `/creator/manage/[courseId]` (loads YAML into editor)
- **Archive button** → confirmation modal, user types course slug to confirm

### Page 2: Course Management (`/creator/manage`)

This is where creators can create new courses or edit existing ones **in the browser**. The primary workflow is still CLI/MCP, but this gives a web fallback.

Uses **Monaco Editor** (VS Code's editor), lazy-loaded via `next/dynamic` so the ~2MB bundle only downloads when the user navigates to this page.

**Two tabs: Brand Config and Course Content.**

```
┌──────────┬──────────────────────────────────────────┐
│          │  Course Management                        │
│ SIDEBAR  ├──────────────────────────────────────────┤
│          │                                           │
│          │  ┌─ Brand Config ──┬─ Course Content ──┐ │
│          │  │                 │                    │ │
│          │  │  ┌────────────────────────────────┐ │ │
│          │  │  │ 1  brand:                      │ │ │
│          │  │  │ 2    id: will-javascript       │ │ │
│          │  │  │ 3    name: "JS Mastery"        │ │ │
│          │  │  │ 4    domain: will-js.grasp...  │ │ │
│          │  │  │ 5    tagline: "..."            │ │ │
│          │  │  │ 6  theme:                      │ │ │
│          │  │  │ 7    preset: blue              │ │ │
│          │  │  │ ...                    500px ↕ │ │ │
│          │  │  └────────────────────────────────┘ │ │
│          │  │                                      │ │
│          │  │  [Import to Platform]  [Download]     │ │
│          │  └──────────────────────────────────────┘ │
│          │                                           │
│          │  ┌──────────────────────────────────────┐ │
│          │  │ Prefer using AI? Use the CLI or MCP  │ │
│          │  │ to create courses with your agent.    │ │
│          │  │ Docs → /docs/quickstart               │ │
│          │  └──────────────────────────────────────┘ │
│          │                                           │
└──────────┴──────────────────────────────────────────┘
```

**New course (`/creator/manage`):**
- Brand Config tab: pre-filled with a minimal brand template (~40 lines, TODOs for name/domain/theme)
- Course Content tab: pre-filled with a skeleton (~30 lines: one section, one concept, one KP, one problem, comments explaining the structure)
- "Import to Platform" button → calls `POST /orgs/{orgSlug}/courses/import` (and brand import)
- "Download YAML" button → downloads the editor contents as a `.yaml` file

**Edit existing course (`/creator/manage/[courseId]`):**
- Same component, same two tabs
- Brand Config tab: loaded with the course's brand YAML (fetched from API or reconstructed)
- Course Content tab: loaded with the course's YAML (need `GET /orgs/{orgSlug}/courses/{courseId}/yaml` endpoint)
- "Import to Platform" becomes "Save Changes" (calls import with `replace: true`)
- "Download YAML" still works (lets you take the YAML offline to edit with an agent)

**Monaco Editor config:**
- Language: YAML
- Theme: match the app's dark code block style (`#0A1628` background)
- Height: fixed 500px, scrollable
- Line numbers: on
- Minimap: off (saves space)
- Word wrap: on
- Lazy loaded: `next/dynamic(() => import('@monaco-editor/react'), { ssr: false })`

**Why tabs instead of two editors stacked:**
- Brand YAML is optional for edits (rarely changes after first setup)
- Course YAML is the main event — give it the full viewport
- Tabs keep the page clean; stacking would make it scroll-heavy

### Page 3: API Keys (`/creator/api-keys`)

Separate page, linked from sidebar.

- List existing keys: name, prefix (`gsk_a1b2...`), created date, last used, revoke button
- "Create API Key" button → modal:
  - Name field (e.g., "Claude Code", "CI Pipeline")
  - Key shown once in a copyable box after creation
  - Warning: "This key will only be shown once"
- Revoke button per key

**Agent quick-start block** at top:
```bash
# Set your API key
export GRASPFUL_API_KEY=gsk_your_key_here

# Or login with the CLI
graspful login --token gsk_your_key_here

# Import a course
graspful import my-course.yaml --org your-org-slug
```

### What's NOT in scope

- No revenue charts or monthly breakdowns (future)
- No per-course analytics deep-dive (future)
- No team member management (future)
- No billing/plan management (future — just show current plan)

## Architecture

### Route structure — reuse the existing `(app)` layout

```
apps/web/src/app/(app)/
├── layout.tsx              # MODIFY — sidebar nav changes based on brand
├── dashboard/              # Student dashboard (unchanged)
├── study/                  # Student study flow (unchanged)
├── browse/                 # Student course browser (unchanged)
├── settings/               # Settings (unchanged)
├── creator/                # NEW — creator pages inside existing (app)
│   ├── page.tsx            # Creator dashboard (stats + course cards)
│   ├── manage/
│   │   ├── page.tsx        # New course (Monaco editor with templates)
│   │   └── [courseId]/
│   │       └── page.tsx    # Edit existing course (Monaco editor with loaded YAML)
│   └── api-keys/
│       └── page.tsx        # API key management
```

### Brand-aware routing

After sign-in, middleware checks the brand:
- **graspful brand** → redirect to `/creator` (creator dashboard)
- **any other brand** → redirect to `/dashboard` (student dashboard)

```typescript
// middleware.ts — after auth callback
if (brand.id === "graspful" && isAuthenticated) {
  redirect("/creator");
}
```

### Agent auth: `JwtOrApiKeyGuard`

The `ApiKeyGuard` exists but isn't used on any endpoint. Wire it up.

Create `JwtOrApiKeyGuard` — composite guard that:
1. Checks for `Bearer gsk_*` → validates API key, sets OrgContext
2. Otherwise → validates Supabase JWT, checks org membership

Apply to these endpoints:
```
POST   /orgs/{orgSlug}/courses/import
POST   /orgs/{orgSlug}/courses/review
POST   /orgs/{orgSlug}/courses/{id}/publish
DELETE /orgs/{orgSlug}/courses/{id}          # NEW (soft delete)
POST   /orgs/{orgSlug}/academies/import
POST   /brands
```

### Agent self-signup: `POST /auth/register`

**Agents need to be able to create accounts without a browser.** Add a public endpoint:

```
POST /auth/register
Body: { email, password }
Response: { userId, orgSlug, apiKey }
```

Flow:
1. Create Supabase user (email/password, auto-confirmed for API registrations)
2. Auto-create a default org with slug derived from email (e.g., `will@example.com` → `will-example`)
3. Set user as `owner` of org
4. Create free-tier subscription
5. Generate an API key automatically
6. Return the API key + org slug

When the agent later imports a course, the brand is auto-created from the username prefix + course slug (e.g., `will-javascript`). The brand gets a subdomain at `will-javascript.graspful.com` with a default landing page generated from the course YAML.

This means an agent can go from zero to importing courses in two API calls:
```bash
# 1. Register (returns API key + org slug)
curl -X POST https://api.graspful.com/auth/register \
  -d '{"email":"agent@example.com","password":"..."}'
# → { "apiKey": "gsk_...", "orgSlug": "agent-example" }

# 2. Import a course
curl -X POST https://api.graspful.com/api/v1/orgs/agent-example/courses/import \
  -H "Authorization: Bearer gsk_..." \
  -d '{"yaml": "..."}'
```

**Rate limiting:** Apply strict rate limits to prevent abuse (e.g., 5 registrations per IP per hour).

### CLI auth: `graspful register` + `graspful login`

Agents interact via CLI. The CLI needs first-class support for the full auth flow.

**New command: `graspful register`**
```bash
# Register a new account — returns API key, saves it locally
graspful register --email agent@example.com --password "..."
# → Created org: agent-example
# → API key: gsk_xxxx... (saved to ~/.graspful/credentials.json)
# → You're ready. Run: graspful import course.yaml --org agent-example
```

Calls `POST /auth/register` under the hood. Saves the returned API key to `~/.graspful/credentials.json` automatically (same format as `graspful login`).

**Existing command: `graspful login`** — already supports two modes:
1. `graspful login --token gsk_xxxx` — saves API key (works today)
2. `graspful login` — interactive email/password prompt (needs updating)

Update `graspful login` to also accept `--email` + `--password` flags for non-interactive use:
```bash
# Login with email/password (non-interactive, for agents)
graspful login --email agent@example.com --password "..."

# Login with API key (existing)
graspful login --token gsk_xxxx

# Interactive prompt (existing)
graspful login
```

### MCP auth

MCP servers read `GRASPFUL_API_KEY` from the environment. No code change needed — once an agent has a key (from `graspful register` or the web UI), it sets the env var and MCP works.

But the MCP setup docs need to show the full flow:

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "graspful": {
      "command": "npx",
      "args": ["@graspful/mcp"],
      "env": {
        "GRASPFUL_API_KEY": "gsk_your_key_here",
        "GRASPFUL_ORG": "your-org-slug"
      }
    }
  }
}
```

### Self-service org creation (browser path)

On graspful.com sign-up via browser:
1. User creates account (existing Supabase email/password form)
2. After first login, auto-create an org:
   - Slug derived from email (e.g., `will@example.com` → `will-example`)
   - User gets `owner` role
   - Free tier subscription
3. Redirect to `/creator`

This replaces the current "auto-join brand org" behavior for the graspful brand.

### Course archive (soft delete)

**Not a hard delete.** Add an `archivedAt` timestamp column to the `Course` table. "Archiving" a course sets `archivedAt = now()`.

- Archived courses are hidden from the creator dashboard and student-facing browse
- All learner data, enrollments, and progress are preserved
- Can be restored later if needed (set `archivedAt = null`)
- All queries that list courses add `WHERE archivedAt IS NULL`

API: `DELETE /orgs/{orgSlug}/courses/{courseId}` → sets `archivedAt`, returns 200.

UI: Confirmation modal requires typing the course slug to confirm. ("Type the course slug to archive: `javascript-fundamentals`")

### Multi-org: supported out of the box

The schema already supports many-to-many (User ↔ Org via `OrgMembership`). No reason to limit it.

**Model:** One user can own multiple orgs. Each org has one brand. Each brand gets its own subdomain and landing page.

**How it works:**
- On registration, user gets one org (slug from email: `will-example`)
- Each course import auto-creates a brand + org if the user wants a separate brand
- Or the user can put multiple courses under one org/brand

**Course cards show their brand URL.** Each course card links to the live site:

```
┌───────────────────────────────────────────────────┐
│ JavaScript Fundamentals                           │
│ Published  •  89 learners                         │
│ will-javascript.graspful.com                      │
│                                    [Edit] [Archive]│
└───────────────────────────────────────────────────┘
```

**Brand slug auto-generation:** When a course is imported, the brand slug is derived from the user's username prefix + course slug:
- `will@example.com` imports `javascript-fundamentals` → brand slug `will-javascript`
- If `will-javascript` is taken → `will-javascript-1`, `will-javascript-2`, etc.
- The brand domain becomes `will-javascript.graspful.com`

**Org switcher:** The sidebar shows which org/brand you're viewing. If you have multiple, a dropdown lets you switch. For single-org users, this is hidden.

**API keys are per-org.** When a user has multiple orgs, each org has its own API keys. The `--org` flag in the CLI selects which one.

## New Backend Work

### New endpoints

| Endpoint | Purpose | Auth | Method |
|----------|---------|------|--------|
| `POST /auth/register` | Agent self-signup → returns API key + org slug | Public (rate-limited) | POST |
| `GET /orgs/{orgSlug}/creator/stats` | { students, avgCompletion, totalRevenue } | JWT or API key | GET |
| `DELETE /orgs/{orgSlug}/courses/{courseId}` | Soft-delete (set archivedAt) | JWT or API key (admin) | DELETE |
| `GET /orgs/{orgSlug}/courses/{courseId}/yaml` | Export course as YAML (for editor pre-fill) | JWT or API key | GET |
| `POST /orgs` | Self-service org creation (browser path) | JWT | POST |
| `GET /users/me/orgs` | List all orgs the user belongs to (for org switcher) | JWT | GET |

### Modified endpoints

| Endpoint | Change |
|----------|--------|
| `POST /orgs/{orgSlug}/courses/import` | Auto-create brand if none exists. Brand slug = `{username}-{courseslug}`. Provision `{slug}.graspful.com` subdomain via Vercel. |

### New guard

```typescript
// backend/src/auth/guards/jwt-or-apikey.guard.ts
@Injectable()
export class JwtOrApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (authHeader?.startsWith('Bearer gsk_')) {
      return this.apiKeyGuard.canActivate(context);
    }
    return this.supabaseAuthGuard.canActivate(context);
  }
}
```

### Prisma migration

```sql
ALTER TABLE "Course" ADD COLUMN "archivedAt" TIMESTAMPTZ;
```

All course queries add: `WHERE "archivedAt" IS NULL`

### New services

```typescript
// backend/src/knowledge-graph/creator-stats.service.ts
@Injectable()
export class CreatorStatsService {
  async getStats(orgId: string): Promise<CreatorStats> {
    // students: COUNT(DISTINCT userId) FROM CourseEnrollment WHERE course.orgId = orgId
    // avgCompletion: AVG(mastered/total concepts) across enrollments
    // totalRevenue: SUM(creatorPayout) FROM RevenueEvent WHERE orgId = orgId
  }
}

// backend/src/knowledge-graph/course-yaml-export.service.ts
@Injectable()
export class CourseYamlExportService {
  async exportAsYaml(courseId: string, orgId: string): Promise<string> {
    // Reverse the import: read course + sections + concepts + KPs + problems from DB
    // Serialize back to YAML format matching the course schema
  }
}
```

## New Frontend Work

### Files to create (~10)

```
apps/web/src/app/(app)/creator/page.tsx                     # Creator dashboard
apps/web/src/app/(app)/creator/manage/page.tsx              # New course (Monaco + templates)
apps/web/src/app/(app)/creator/manage/[courseId]/page.tsx   # Edit course (Monaco + loaded YAML)
apps/web/src/app/(app)/creator/api-keys/page.tsx            # API key management
apps/web/src/components/creator/stat-card.tsx                # Reusable stat card
apps/web/src/components/creator/course-card.tsx              # Course card with brand URL + edit + archive
apps/web/src/components/creator/org-switcher.tsx             # Org dropdown (hidden if single org)
apps/web/src/components/creator/yaml-editor.tsx              # Monaco wrapper (lazy-loaded, tabbed)
backend/src/auth/auth-register.controller.ts                 # POST /auth/register
packages/cli/src/commands/register.ts                        # graspful register command
```

### Files to modify (~6)

```
apps/web/src/app/(app)/layout.tsx                            # Sidebar nav: swap items based on brand
apps/web/src/middleware.ts                                    # Brand-aware redirect after auth
apps/web/src/components/auth/auth-form.tsx                    # Auto-create org for graspful brand
backend/src/knowledge-graph/knowledge-graph.controller.ts    # Add JwtOrApiKeyGuard + archive + yaml export
backend/src/auth/auth.module.ts                              # Register JwtOrApiKeyGuard
packages/cli/src/commands/login.ts                           # Add --email/--password flags
```

### New dependency

```bash
cd apps/web && bun add @monaco-editor/react
```

### Docs to update (3 pages)

```
apps/web/src/app/(marketing)/docs/quickstart/page.tsx  # Agent registration as primary path (step 1-2 rewrite)
apps/web/src/app/(marketing)/docs/cli/page.tsx         # Add `register` command, update `login` flags
apps/web/src/app/(marketing)/docs/mcp/page.tsx         # Add "Getting your API key" section + GRASPFUL_ORG env var
```

## Tests

### Backend unit tests

| Test file | What it covers |
|-----------|---------------|
| `jwt-or-apikey.guard.spec.ts` | Guard routes gsk_ to API key guard, JWT to Supabase guard |
| `creator-stats.service.spec.ts` | Stats aggregation (students, completion, revenue) |
| `course-archive.spec.ts` | Soft delete sets archivedAt, queries exclude archived |
| `course-yaml-export.spec.ts` | Export round-trips: import YAML → export → compare |
| `auth-register.spec.ts` | Registration creates user + org + API key, rate limiting, slug dedup |
| `brand-auto-create.spec.ts` | Import auto-creates brand with correct slug, handles slug conflicts |

### Frontend e2e tests

| Test file | What it covers |
|-----------|---------------|
| `creator-dashboard.spec.ts` | Sign in on graspful brand → lands on /creator, sees stat cards + course cards with brand URLs |
| `creator-archive-course.spec.ts` | Archive a course → type slug to confirm → course disappears from list |
| `creator-manage-new.spec.ts` | Navigate to /creator/manage → see Monaco editor with template → edit → import → course appears in dashboard |
| `creator-manage-edit.spec.ts` | Click Edit on course card → /creator/manage/[id] → YAML loaded → edit → save → changes reflected |
| `creator-api-keys.spec.ts` | Create API key → see prefix in list → copy quick-start block |
| `agent-registration.spec.ts` | POST /auth/register → get API key → import course → brand auto-created |
| `creator-org-switcher.spec.ts` | User with 2+ orgs sees org switcher, switching orgs updates course list |

### Integration test

| Test | Flow |
|------|------|
| `agent-full-flow.spec.ts` | Register via API → get API key → import course → brand auto-created at `{user}-{course}.graspful.com` → course appears in creator dashboard with live URL → edit via /creator/manage/[id] |

## Execution Plan — Parallelized for Multiple Agents

The work is grouped into **tracks** that can run in parallel. Dependencies between tracks are marked.

### Track A: Backend Core (Agent 1)

No frontend dependencies. Can be built and tested independently.

| Step | Task | Depends on |
|------|------|------------|
| A1 | Prisma migration: add `archivedAt` to Course | — |
| A2 | `JwtOrApiKeyGuard` composite guard | — |
| A3 | `POST /auth/register` endpoint + rate limiting | — |
| A4 | `GET /orgs/{orgSlug}/creator/stats` endpoint + `CreatorStatsService` | A1 |
| A5 | `DELETE /orgs/{orgSlug}/courses/{courseId}` (soft delete) | A1, A2 |
| A6 | `GET /users/me/orgs` endpoint | — |
| A7 | Wire `JwtOrApiKeyGuard` to existing import/review/publish endpoints | A2 |
| A8 | Brand auto-creation on course import (slug generation + Vercel domain) | A2 |
| A9 | Unit tests for all of the above | A1-A8 |

### Track B: Backend YAML Export (Agent 2)

Independent from Track A (shares Prisma but no code deps).

| Step | Task | Depends on |
|------|------|------------|
| B1 | `CourseYamlExportService` — reverse the importer, serialize DB → YAML | — |
| B2 | `GET /orgs/{orgSlug}/courses/{courseId}/yaml` endpoint | B1 |
| B3 | Unit tests: export round-trip (import → export → compare) | B1 |

### Track C: CLI (Agent 3)

Depends on `POST /auth/register` from Track A (A3), but the CLI code can be written against the API contract before the endpoint is live.

| Step | Task | Depends on |
|------|------|------------|
| C1 | `graspful register` command | A3 (API contract) |
| C2 | `graspful login --email --password` flags | — |
| C3 | CLI tests | C1, C2 |

### Track D: Frontend — Dashboard + Course Cards (Agent 4)

Depends on `GET /creator/stats` (A4) and `GET /courses` (exists). Can stub API responses for development.

| Step | Task | Depends on |
|------|------|------------|
| D1 | `(app)/layout.tsx` — sidebar nav swap based on brand | — |
| D2 | `/creator/page.tsx` — stat cards + course card list | A4 (API), D1 |
| D3 | `stat-card.tsx`, `course-card.tsx` components | — |
| D4 | `org-switcher.tsx` component | A6 (API) |
| D5 | Archive modal (type slug to confirm) | A5 (API) |

### Track E: Frontend — Course Management (Agent 5)

Depends on YAML export (B2) for edit mode. New course mode has no backend deps.

| Step | Task | Depends on |
|------|------|------------|
| E1 | `bun add @monaco-editor/react` | — |
| E2 | `yaml-editor.tsx` — lazy-loaded Monaco wrapper with tabs (Brand / Course) | E1 |
| E3 | `/creator/manage/page.tsx` — new course with templates pre-filled | E2 |
| E4 | `/creator/manage/[courseId]/page.tsx` — edit with loaded YAML | E2, B2 (API) |
| E5 | Import/save button wiring (calls existing import endpoint) | A7 |

### Track F: Middleware + Auth Flow (Agent 6)

Depends on Tracks A and D being mostly complete.

| Step | Task | Depends on |
|------|------|------------|
| F1 | `middleware.ts` — brand-aware redirect after auth | D1 |
| F2 | `auth-form.tsx` — auto-create org on graspful sign-up | A3 |
| F3 | Post-login redirect to `/creator` for graspful brand | F1 |

### Track G: Docs (Agent 7)

No code dependencies. Can be written against the planned API/CLI contracts.

| Step | Task | Depends on |
|------|------|------------|
| G1 | Rewrite `/docs/quickstart` — agent registration as primary path | — |
| G2 | Update `/docs/cli` — add `register`, update `login` flags | — |
| G3 | Update `/docs/mcp` — add "Getting your API key" + `GRASPFUL_ORG` | — |

### Track H: E2E Tests (Agent 8)

Depends on all tracks being complete.

| Step | Task | Depends on |
|------|------|------------|
| H1 | `creator-dashboard.spec.ts` | D2 |
| H2 | `creator-archive-course.spec.ts` | D5 |
| H3 | `creator-manage-new.spec.ts` | E3 |
| H4 | `creator-manage-edit.spec.ts` | E4 |
| H5 | `creator-api-keys.spec.ts` | D2 |
| H6 | `agent-registration.spec.ts` | A3, C1 |
| H7 | `creator-org-switcher.spec.ts` | D4 |
| H8 | `agent-full-flow.spec.ts` (integration) | All |

### Parallelism Summary

```
Time →
──────────────────────────────────────────────────────────

Agent 1: [A1-A9 Backend Core                           ]
Agent 2: [B1-B3 YAML Export     ]
Agent 3:        [C1-C3 CLI      ]  (waits for A3 contract)
Agent 4:        [D1-D5 Dashboard + Cards               ]
Agent 5:        [E1-E5 Course Management               ]
Agent 6:                          [F1-F3 Middleware     ]
Agent 7: [G1-G3 Docs                                   ]
Agent 8:                                    [H1-H8 E2E ]
```

**Tracks that can start immediately (no deps):** A, B, D (with stubs), G
**Tracks that need a contract first:** C (needs A3), E (needs B2 for edit)
**Tracks that run last:** F (needs A+D), H (needs everything)

**Maximum parallelism: 5 agents** working simultaneously (A + B + D + E + G), with C joining once A3 lands and F + H running at the end.

## Decisions Made

1. **Course archive confirmation** — require typing the course slug. Prevents accidental archives.
2. **Self-service org slug** — derived from email. `will@example.com` → `will-example`. No manual input.
3. **Agent self-signup** — yes. `POST /auth/register` returns API key + org slug. Two API calls from zero to importing. Docs updated to show this as the primary path.
4. **Multi-org** — supported out of the box. Schema already has many-to-many via `OrgMembership`. Each course import can auto-create a brand/org. Brand slug = `{username}-{courseslug}` (e.g., `will-javascript`). Org switcher in sidebar when user has multiple.
5. **Brand auto-creation on import** — when a course is imported and no brand exists for it, auto-create one. Slug: `{username}-{courseslug}`. Domain: `{slug}.graspful.com`. Default landing page from course YAML data. If slug taken, append `-1`, `-2`, etc.
6. **Course cards show brand URL** — each course card links to its live subdomain. Edit button opens Monaco editor with the course YAML.
7. **Monaco Editor** — lazy-loaded via `next/dynamic`. Only downloads when user navigates to `/creator/manage`. YAML syntax highlighting, dark theme, 500px fixed height, no minimap.
8. **Course management is create + edit** — same component, same tabs. New course = template pre-filled. Edit = YAML loaded from `GET /courses/{id}/yaml`.
