# Niche Audio Prep -- Backend Architecture Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the backend for a multi-tenant, white-labeled audio exam prep SaaS that pre-loads professional regulation content and lets users listen to study material on repeat.

**Architecture:** Runtime config / single-deployment multi-tenancy (Approach 1 from white-label research). Middleware inspects request hostname, resolves to tenant/org, injects config. Supabase for auth + database + storage. Modal for TTS. Stripe for billing. All content is pre-generated -- no on-demand TTS for end users.

**Tech Stack:** Next.js 16 (App Router), Supabase (Auth + PostgreSQL + Storage), Kokoro TTS on Modal, Stripe, PostHog, TypeScript, `pg` (raw SQL, no ORM -- matching try-listening pattern).

**Existing Prototype Reference:** `try-listening` at `/Users/will/github/try-listening`. Key patterns to carry forward: `DatabaseLike` interface, raw SQL migrations, `requireUser()` auth guard, `pg.Pool` connection, `@supabase/ssr` cookie-based auth, token bucket rate limiting.

---

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [Auth & Multi-tenancy](#2-auth--multi-tenancy)
3. [Content Pipeline](#3-content-pipeline)
4. [TTS / Audio Generation](#4-tts--audio-generation)
5. [API Routes](#5-api-routes)
6. [Billing (Stripe)](#6-billing-stripe)
7. [Infrastructure & Environment](#7-infrastructure--environment)
8. [Migration Path from try-listening](#8-migration-path-from-try-listening)
9. [Task Breakdown](#9-task-breakdown)

---

## 1. Database Schema

### Design Principles

- **UUIDs everywhere.** No deterministic SHA-based IDs (try-listening pattern). Content is admin-managed, not user-generated.
- **Row-level security (RLS).** All user-facing tables get RLS policies scoped to org. Admin tables get service-role-only access.
- **`org_id` on every tenant-scoped row.** This is the fundamental multi-tenancy key.
- **Soft deletes for content.** Regulations change yearly; old content should be archived, not destroyed.
- **Timestamps everywhere.** `created_at`, `updated_at` on every table.

### Entity Relationship Overview

```
organizations (tenant)
  |-- org_memberships (join) -- users (extends auth.users)
  |-- exams
  |     |-- topics
  |     |     |-- sections
  |     |     |     |-- study_items (the text chunks users listen to)
  |     |     |     |     |-- audio_files (pre-generated, stored in Supabase Storage)
  |-- subscriptions (Stripe billing)
  |-- brand_configs (colors, logo, domain)

user_progress (per-user, per-study-item listening state)
user_streaks (daily activity tracking)
```

### Complete SQL Schema

```sql
-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ORGANIZATIONS (tenants)
-- =============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,              -- URL-safe identifier: "firefighter-prep"
  name TEXT NOT NULL,                      -- Display name: "FirefighterPrep"
  niche TEXT NOT NULL,                     -- Category: "firefighting", "electrical", "aviation"
  domain TEXT UNIQUE,                      -- Custom domain: "firefighterprep.com" (nullable until configured)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_domain ON organizations (domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_organizations_slug ON organizations (slug);

-- =============================================================================
-- BRAND CONFIGS (per-org theming)
-- =============================================================================

CREATE TABLE brand_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url TEXT,                            -- URL to logo in Supabase Storage
  favicon_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2563EB',    -- hex
  secondary_color TEXT NOT NULL DEFAULT '#1E40AF',
  accent_color TEXT NOT NULL DEFAULT '#3B82F6',
  background_color TEXT NOT NULL DEFAULT '#FFFFFF',
  foreground_color TEXT NOT NULL DEFAULT '#0F172A',
  font_heading TEXT NOT NULL DEFAULT 'Inter',
  font_body TEXT NOT NULL DEFAULT 'Inter',
  tagline TEXT,                             -- "Pass your firefighter exam. Eyes-free."
  meta_description TEXT,
  hero_headline TEXT,
  hero_subheadline TEXT,
  hero_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id)
);

-- =============================================================================
-- USERS (extends Supabase auth.users)
-- =============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  is_global_admin BOOLEAN NOT NULL DEFAULT false,  -- platform-level admin (us)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ORG MEMBERSHIPS (users <-> organizations, many-to-many)
-- =============================================================================

CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE org_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

CREATE INDEX idx_org_memberships_user ON org_memberships (user_id);
CREATE INDEX idx_org_memberships_org ON org_memberships (org_id);

-- =============================================================================
-- CONTENT HIERARCHY: exams -> topics -> sections -> study_items
-- =============================================================================

-- Exams represent a specific certification exam
-- e.g., "Firefighter I (NFPA 1001)", "Journeyman Electrician (NEC 2023)"
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                      -- "Firefighter I Certification"
  slug TEXT NOT NULL,                       -- "firefighter-i"
  description TEXT,
  source_document TEXT,                     -- "NFPA 1001 (2019 Edition)"
  edition_year INTEGER,                     -- 2023
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

CREATE INDEX idx_exams_org ON exams (org_id);

-- Topics are major divisions within an exam
-- e.g., "Fire Behavior", "Building Construction", "Hazardous Materials"
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                      -- "Fire Behavior"
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exam_id, slug)
);

CREATE INDEX idx_topics_exam ON topics (exam_id);

-- Sections are sub-divisions within a topic
-- e.g., "Phases of Fire", "Flashover", "Backdraft"
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                      -- "Phases of Fire"
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (topic_id, slug)
);

CREATE INDEX idx_sections_topic ON sections (topic_id);

-- Study items are the atomic units users listen to.
-- Each is a chunk of text with pre-generated audio.
-- e.g., one code section, one regulation paragraph, one concept explanation.
CREATE TABLE study_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT,                               -- Optional title for the chunk
  text_content TEXT NOT NULL,               -- The actual text (max ~3800 chars for TTS)
  text_hash TEXT NOT NULL,                  -- SHA-256 of text_content (for cache invalidation)
  char_count INTEGER NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  importance TEXT CHECK (importance IN ('low', 'medium', 'high', 'critical')),
  tags TEXT[] DEFAULT '{}',                 -- Free-form tags: ["nfpa-1001", "chapter-5", "flashover"]
  source_reference TEXT,                    -- "NFPA 1001 Section 5.3.1"
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_study_items_section ON study_items (section_id);
CREATE INDEX idx_study_items_tags ON study_items USING GIN (tags);

-- =============================================================================
-- CONTENT VERSIONING
-- =============================================================================

-- When regulations change (e.g., NEC 2023 -> NEC 2026), we create a new exam
-- record with the new edition_year. The old exam is archived (is_archived = true).
-- This is simpler than row-level versioning and matches how regulations actually work:
-- you study one edition at a time.
--
-- For minor corrections within an edition, we update the study_item in place
-- and re-generate audio. The text_hash column detects when audio needs regeneration.

-- =============================================================================
-- AUDIO FILES (pre-generated, stored in Supabase Storage)
-- =============================================================================

-- Audio is stored in Supabase Storage (S3-compatible), not in PostgreSQL BYTEA.
-- This table is a metadata index -- the actual audio bytes live in storage.
-- Storage path convention: audio/{org_slug}/{exam_slug}/{study_item_id}/{voice}.flac
CREATE TABLE audio_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  study_item_id UUID NOT NULL REFERENCES study_items(id) ON DELETE CASCADE,
  voice TEXT NOT NULL,                      -- Kokoro voice ID: "af_heart", "am_adam"
  model TEXT NOT NULL DEFAULT 'kokoro',     -- TTS model
  text_hash TEXT NOT NULL,                  -- Must match study_items.text_hash (stale = needs regen)
  storage_path TEXT NOT NULL,               -- Path in Supabase Storage bucket
  storage_bucket TEXT NOT NULL DEFAULT 'audio', -- Supabase Storage bucket name
  file_size_bytes INTEGER NOT NULL,
  duration_seconds REAL,                    -- Audio duration (populated after generation)
  format TEXT NOT NULL DEFAULT 'flac',      -- audio format
  is_current BOOLEAN NOT NULL DEFAULT true, -- false = superseded by newer generation
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (study_item_id, voice, model, text_hash)
);

CREATE INDEX idx_audio_files_study_item ON audio_files (study_item_id);
CREATE INDEX idx_audio_files_current ON audio_files (study_item_id, voice) WHERE is_current = true;

-- =============================================================================
-- USER PROGRESS
-- =============================================================================

-- Per-user, per-study-item progress. Tracks whether they've listened,
-- how far they got, and how many times they've completed it.
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  study_item_id UUID NOT NULL REFERENCES study_items(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  listen_count INTEGER NOT NULL DEFAULT 0,        -- Total completions
  last_position_seconds REAL NOT NULL DEFAULT 0,  -- Resume point
  last_playback_rate REAL NOT NULL DEFAULT 1.0,
  is_completed BOOLEAN NOT NULL DEFAULT false,    -- Has listened to 90%+ at least once
  first_listened_at TIMESTAMPTZ,
  last_listened_at TIMESTAMPTZ,
  -- Spaced repetition fields
  ease_factor REAL NOT NULL DEFAULT 2.5,          -- SM-2 algorithm ease factor
  interval_days INTEGER NOT NULL DEFAULT 1,       -- Days until next review
  next_review_at TIMESTAMPTZ,                     -- When to surface this item again
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, study_item_id)
);

CREATE INDEX idx_user_progress_user_org ON user_progress (user_id, org_id);
CREATE INDEX idx_user_progress_next_review ON user_progress (user_id, next_review_at)
  WHERE next_review_at IS NOT NULL;

-- =============================================================================
-- USER STREAKS (daily activity tracking)
-- =============================================================================

CREATE TABLE user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,                       -- UTC date of activity
  listen_seconds INTEGER NOT NULL DEFAULT 0,-- Total seconds listened that day
  items_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, org_id, date)
);

CREATE INDEX idx_user_streaks_user_org ON user_streaks (user_id, org_id);

-- =============================================================================
-- SUBSCRIPTIONS (Stripe billing)
-- =============================================================================

CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
);

CREATE TYPE plan_tier AS ENUM (
  'free', 'individual', 'team', 'enterprise'
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,       -- null during free tier
  plan plan_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  -- Usage tracking for metered billing
  audio_generation_count INTEGER NOT NULL DEFAULT 0,  -- This billing period
  audio_generation_limit INTEGER NOT NULL DEFAULT 100, -- Per-period limit
  max_members INTEGER NOT NULL DEFAULT 1,              -- Seat limit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id)
);

CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions (stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_sub ON subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- =============================================================================
-- INVITE TOKENS (for org member invitations)
-- =============================================================================

CREATE TABLE invite_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,                      -- Invited email address
  role org_role NOT NULL DEFAULT 'member',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,                  -- null = pending
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invite_tokens_token ON invite_tokens (token);
CREATE INDEX idx_invite_tokens_email ON invite_tokens (email);

-- =============================================================================
-- RATE LIMITING (per-user TTS generation, admin only)
-- =============================================================================

CREATE TABLE tts_daily_usage (
  date TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, user_id)
);

-- =============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all user-facing tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (id = auth.uid());

-- Org memberships: users can see memberships for orgs they belong to
CREATE POLICY memberships_select ON org_memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  );

-- Organizations: users can see orgs they belong to
CREATE POLICY orgs_select ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  );

-- Brand configs: readable by org members
CREATE POLICY brand_configs_select ON brand_configs
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  );

-- Content: readable by org members (through the exam -> org relationship)
CREATE POLICY exams_select ON exams
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
    AND is_published = true
    AND is_archived = false
  );

CREATE POLICY topics_select ON topics
  FOR SELECT USING (
    exam_id IN (
      SELECT id FROM exams
      WHERE org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
      AND is_published = true AND is_archived = false
    )
    AND is_archived = false
  );

CREATE POLICY sections_select ON sections
  FOR SELECT USING (
    topic_id IN (
      SELECT t.id FROM topics t
      JOIN exams e ON e.id = t.exam_id
      WHERE e.org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
      AND e.is_published = true AND e.is_archived = false
      AND t.is_archived = false
    )
    AND is_archived = false
  );

CREATE POLICY study_items_select ON study_items
  FOR SELECT USING (
    section_id IN (
      SELECT s.id FROM sections s
      JOIN topics t ON t.id = s.topic_id
      JOIN exams e ON e.id = t.exam_id
      WHERE e.org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
      AND e.is_published = true AND e.is_archived = false
      AND t.is_archived = false AND s.is_archived = false
    )
    AND is_archived = false
  );

-- Audio files: readable if the study item is readable
CREATE POLICY audio_files_select ON audio_files
  FOR SELECT USING (
    study_item_id IN (
      SELECT si.id FROM study_items si
      JOIN sections s ON s.id = si.section_id
      JOIN topics t ON t.id = s.topic_id
      JOIN exams e ON e.id = t.exam_id
      WHERE e.org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
      AND e.is_published = true
    )
    AND is_current = true
  );

-- User progress: users can only access their own
CREATE POLICY user_progress_select ON user_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_progress_insert ON user_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_progress_update ON user_progress
  FOR UPDATE USING (user_id = auth.uid());

-- User streaks: users can only access their own
CREATE POLICY user_streaks_select ON user_streaks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_streaks_insert ON user_streaks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_streaks_update ON user_streaks
  FOR UPDATE USING (user_id = auth.uid());

-- Subscriptions: readable by org admins/owners
CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Invite tokens: readable by org admins/owners, and by the invited email
CREATE POLICY invite_tokens_select ON invite_tokens
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- ADMIN POLICIES
-- Note: Content mutation (INSERT/UPDATE/DELETE on exams, topics, sections,
-- study_items, audio_files) is done via service role key from admin API routes,
-- which bypasses RLS. No RLS write policies needed for content tables.
-- =============================================================================

-- Global admins can read everything (for platform admin panel)
CREATE POLICY global_admin_all ON organizations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_global_admin = true)
  );
```

### Key Schema Decisions

1. **No BYTEA for audio.** try-listening stores audio in `audio_chunks.audio_data BYTEA`. This works for user-generated on-demand audio but does not scale for pre-generated content libraries. We use Supabase Storage (S3-compatible) and store only metadata in PostgreSQL.

2. **Flat content hierarchy (exam > topic > section > study_item).** Four levels is enough to model any regulation structure. NEC articles map to topics, sub-articles to sections, individual code paragraphs to study items.

3. **Spaced repetition on `user_progress`.** SM-2 fields (`ease_factor`, `interval_days`, `next_review_at`) let us build a review queue without a separate table. Items surface when `next_review_at <= NOW()`.

4. **Per-org subscriptions, not per-user.** Matches the team/organization purchase model. Seat limits are enforced via `subscriptions.max_members` checked against `org_memberships` count.

5. **Soft deletes via `is_archived`.** Content is never hard-deleted. This preserves progress data and allows content restoration.

---

## 2. Auth & Multi-tenancy

### Authentication Flow

Supabase Auth handles all identity management. We support three auth methods:

```
Google OAuth   -> Supabase Auth -> session cookie -> middleware -> API routes
Email/Password -> Supabase Auth -> session cookie -> middleware -> API routes
Magic Link     -> Supabase Auth -> session cookie -> middleware -> API routes
```

### Auth Callback: User Record Creation

When a user authenticates for the first time, we need to create their `users` record and optionally add them to an org. This happens via a Supabase database function triggered by `auth.users` inserts:

```sql
-- Trigger function: create public.users row when auth.users is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Middleware: Tenant Resolution

The Next.js middleware does two things: (1) refresh the Supabase session, (2) resolve the tenant from the hostname.

```typescript
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser();

  // Resolve tenant from hostname
  const hostname = request.headers.get("host") || "";
  // In dev, use x-tenant-slug header or default to first org
  // In prod, look up org by domain
  supabaseResponse.headers.set("x-org-domain", hostname);

  // Public routes: landing page, sign-in, auth callback, API webhooks
  const isPublicRoute = request.nextUrl.pathname === "/"
    || request.nextUrl.pathname.startsWith("/sign-in")
    || request.nextUrl.pathname.startsWith("/auth/")
    || request.nextUrl.pathname.startsWith("/api/webhooks");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icon).*)",
  ],
};
```

### Tenant Resolution Helper

```typescript
// src/lib/tenant.ts
import type { DatabaseLike } from "./db";

export interface Tenant {
  orgId: string;
  slug: string;
  name: string;
  niche: string;
  domain: string | null;
}

// In-memory cache (per-serverless-instance). Short TTL.
const tenantCache = new Map<string, { tenant: Tenant; cachedAt: number }>();
const TENANT_CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Resolve tenant from hostname (custom domain) or slug.
 * Returns null if no matching org found.
 */
export async function resolveTenant(
  db: DatabaseLike,
  hostnameOrSlug: string
): Promise<Tenant | null> {
  const cacheKey = hostnameOrSlug.toLowerCase();
  const cached = tenantCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < TENANT_CACHE_TTL_MS) {
    return cached.tenant;
  }

  // Try domain match first, then slug match
  const { rows } = await db.query<{
    id: string;
    slug: string;
    name: string;
    niche: string;
    domain: string | null;
  }>(
    `SELECT id, slug, name, niche, domain FROM organizations
     WHERE (domain = $1 OR slug = $1) AND is_active = true
     LIMIT 1`,
    [cacheKey]
  );

  if (rows.length === 0) return null;

  const tenant: Tenant = {
    orgId: rows[0].id,
    slug: rows[0].slug,
    name: rows[0].name,
    niche: rows[0].niche,
    domain: rows[0].domain,
  };

  tenantCache.set(cacheKey, { tenant, cachedAt: Date.now() });
  return tenant;
}
```

### Authorization Helper

```typescript
// src/lib/require-membership.ts
import type { DatabaseLike } from "./db";
import type { OrgRole } from "./types";

export interface MembershipResult {
  orgId: string;
  userId: string;
  role: OrgRole;
}

/**
 * Verify user belongs to org with at least the required role.
 * Role hierarchy: owner > admin > member.
 */
export async function requireMembership(
  db: DatabaseLike,
  userId: string,
  orgId: string,
  minimumRole: OrgRole = "member"
): Promise<MembershipResult | null> {
  const { rows } = await db.query<{ role: OrgRole }>(
    `SELECT role FROM org_memberships WHERE user_id = $1 AND org_id = $2`,
    [userId, orgId]
  );

  if (rows.length === 0) return null;

  const role = rows[0].role;
  const hierarchy: Record<OrgRole, number> = { owner: 3, admin: 2, member: 1 };

  if (hierarchy[role] < hierarchy[minimumRole]) return null;

  return { orgId, userId, role };
}

/**
 * Check if user is a global platform admin.
 */
export async function isGlobalAdmin(
  db: DatabaseLike,
  userId: string
): Promise<boolean> {
  const { rows } = await db.query<{ is_global_admin: boolean }>(
    `SELECT is_global_admin FROM users WHERE id = $1`,
    [userId]
  );
  return rows[0]?.is_global_admin === true;
}
```

### Org Invite Flow

```
1. Admin calls POST /api/orgs/{orgId}/invites with { email, role }
2. Server creates invite_tokens row, sends email with invite link
3. Invited user clicks link -> /auth/accept-invite?token=xxx
4. If user exists: add org_membership. If not: sign up first, then add.
5. invite_tokens.accepted_at is set.
```

---

## 3. Content Pipeline

### Overview

Content flows through this pipeline:

```
Raw regulation text (PDF/document)
  -> Manual chunking by content admin (via admin UI or bulk import API)
  -> study_items rows in database
  -> Batch TTS generation job (Modal)
  -> audio_files in Supabase Storage
  -> Ready for users to listen
```

### Content Import API

The admin API accepts content in a structured JSON format. This is the canonical import format for all niches.

```typescript
// Content import format
interface ContentImport {
  exam: {
    title: string;           // "Firefighter I Certification"
    slug: string;            // "firefighter-i"
    sourceDocument: string;  // "NFPA 1001 (2019 Edition)"
    editionYear: number;     // 2019
  };
  topics: Array<{
    title: string;
    slug: string;
    description?: string;
    sections: Array<{
      title: string;
      slug: string;
      description?: string;
      items: Array<{
        title?: string;
        textContent: string;     // The actual study text (max 3800 chars)
        difficulty?: "beginner" | "intermediate" | "advanced";
        importance?: "low" | "medium" | "high" | "critical";
        tags?: string[];
        sourceReference?: string; // "NFPA 1001 Section 5.3.1"
      }>;
    }>;
  }>;
}
```

### Text Chunking

We reuse the chunker from try-listening (`src/lib/chunker.ts`). For content import, if any `textContent` exceeds 3800 chars, the import API auto-chunks it into multiple study_items with sequential sort_order.

```typescript
// src/lib/content-import.ts
import { chunkText } from "./chunker";
import { createHash } from "crypto";

function textHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

/**
 * Process a content import: validate, chunk oversized items,
 * compute text hashes, and return normalized database rows.
 */
export function normalizeContentImport(
  orgId: string,
  input: ContentImport
): NormalizedContent {
  // ... validation, chunking, hash computation
  // Returns structured data ready for database insertion
}
```

### Content Versioning Strategy

Regulations update on known cycles (NEC every 3 years, FAR/AIM annually, etc.):

1. **New edition = new exam record.** Create a new `exams` row with `edition_year = 2026`. Copy the topic/section structure. Update study_items that changed.
2. **Archive old edition.** Set `is_archived = true` on the old exam. Users with progress on the old edition keep their data; they just can't access the archived exam's content.
3. **Minor corrections.** Update `study_items.text_content` in place. The `text_hash` column changes, triggering audio regeneration in the next batch job.

---

## 4. TTS / Audio Generation

### Architecture Change from try-listening

try-listening generates audio on-demand when users play content. niche-audio-prep pre-generates ALL audio for all content at upload time.

```
try-listening:  User presses play -> POST /api/tts -> Modal Kokoro -> return audio
niche-audio-prep:  Admin uploads content -> batch job -> Modal Kokoro -> Supabase Storage
                   User presses play -> GET signed URL from Supabase Storage -> stream audio
```

### Batch Generation Pipeline

```typescript
// src/lib/audio-generation.ts
import { synthesize } from "./tts";
import { createClient } from "@supabase/supabase-js";

interface GenerationJob {
  studyItemId: string;
  textContent: string;
  textHash: string;
  voice: string;
  model: string;
  storagePath: string;
}

/**
 * Find all study_items that need audio generation.
 * A study item needs generation if:
 * 1. No audio_files row exists for its current text_hash + voice combo, OR
 * 2. Its text_hash differs from the audio_files.text_hash (content updated)
 */
export async function findPendingGenerations(
  db: DatabaseLike,
  orgId: string,
  voices: string[] = ["af_heart"]  // Default voice(s) per org
): Promise<GenerationJob[]> {
  const { rows } = await db.query<{
    study_item_id: string;
    text_content: string;
    text_hash: string;
    exam_slug: string;
    org_slug: string;
  }>(
    `SELECT si.id as study_item_id, si.text_content, si.text_hash,
            e.slug as exam_slug, o.slug as org_slug
     FROM study_items si
     JOIN sections s ON s.id = si.section_id
     JOIN topics t ON t.id = s.topic_id
     JOIN exams e ON e.id = t.exam_id
     JOIN organizations o ON o.id = e.org_id
     WHERE e.org_id = $1 AND si.is_archived = false
     AND NOT EXISTS (
       SELECT 1 FROM audio_files af
       WHERE af.study_item_id = si.id
       AND af.text_hash = si.text_hash
       AND af.voice = ANY($2)
       AND af.is_current = true
     )`,
    [orgId, voices]
  );

  return rows.flatMap((row) =>
    voices.map((voice) => ({
      studyItemId: row.study_item_id,
      textContent: row.text_content,
      textHash: row.text_hash,
      voice,
      model: "kokoro",
      storagePath: `audio/${row.org_slug}/${row.exam_slug}/${row.study_item_id}/${voice}.flac`,
    }))
  );
}

/**
 * Generate audio for a single study item and upload to Supabase Storage.
 * Returns the audio_files metadata row to insert.
 */
export async function generateAndUpload(
  job: GenerationJob
): Promise<{
  studyItemId: string;
  voice: string;
  model: string;
  textHash: string;
  storagePath: string;
  storageBucket: string;
  fileSizeBytes: number;
  format: string;
}> {
  // 1. Synthesize via Modal Kokoro
  const audioBuffer = await synthesize(job.textContent, job.voice, job.model);

  // 2. Upload to Supabase Storage
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service role for storage writes
  );

  const { error } = await supabase.storage
    .from("audio")
    .upload(job.storagePath, audioBuffer, {
      contentType: "audio/flac",
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return {
    studyItemId: job.studyItemId,
    voice: job.voice,
    model: job.model,
    textHash: job.textHash,
    storagePath: job.storagePath,
    storageBucket: "audio",
    fileSizeBytes: audioBuffer.byteLength,
    format: "flac",
  };
}

/**
 * Run batch generation for an org. Processes items with concurrency limit.
 * Returns count of generated items.
 */
export async function runBatchGeneration(
  db: DatabaseLike,
  orgId: string,
  options: {
    voices?: string[];
    concurrency?: number;
  } = {}
): Promise<{ generated: number; failed: number; errors: string[] }> {
  const voices = options.voices ?? ["af_heart"];
  const concurrency = options.concurrency ?? 5;

  const jobs = await findPendingGenerations(db, orgId, voices);
  let generated = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process in batches of `concurrency`
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map(generateAndUpload));

    for (const result of results) {
      if (result.status === "fulfilled") {
        const meta = result.value;
        // Mark old audio as non-current
        await db.query(
          `UPDATE audio_files SET is_current = false
           WHERE study_item_id = $1 AND voice = $2 AND is_current = true`,
          [meta.studyItemId, meta.voice]
        );
        // Insert new audio_files row
        await db.query(
          `INSERT INTO audio_files
           (study_item_id, voice, model, text_hash, storage_path, storage_bucket, file_size_bytes, format)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [meta.studyItemId, meta.voice, meta.model, meta.textHash,
           meta.storagePath, meta.storageBucket, meta.fileSizeBytes, meta.format]
        );
        generated++;
      } else {
        failed++;
        errors.push(result.reason?.message || "Unknown error");
      }
    }
  }

  return { generated, failed, errors };
}
```

### Voice Configuration Per Niche

Different niches may want different default voices:

```typescript
// src/lib/voice-config.ts
export const NICHE_VOICES: Record<string, string[]> = {
  firefighting: ["am_adam", "af_heart"],    // Male primary (firefighter demographics)
  electrical:   ["am_adam", "af_heart"],
  aviation:     ["am_adam", "af_nova"],
  cdl:          ["am_adam", "af_heart"],
  nursing:      ["af_heart", "am_adam"],     // Female primary (nursing demographics)
  // Default for any niche not listed
  default:      ["af_heart", "am_adam"],
};

export function getVoicesForNiche(niche: string): string[] {
  return NICHE_VOICES[niche] || NICHE_VOICES.default;
}
```

### Audio Serving to Users

Users never hit Modal directly. They get signed URLs from Supabase Storage:

```typescript
// src/lib/audio-url.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Get a signed URL for an audio file. URL is valid for 1 hour.
 * Returns null if the audio file doesn't exist.
 */
export async function getAudioUrl(
  storagePath: string,
  bucket: string = "audio"
): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 3600); // 1 hour

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
```

---

## 5. API Routes

### Route Map

All routes use the Next.js App Router convention (`src/app/api/.../route.ts`).

```
PUBLIC (no auth required):
  GET  /api/health                      Health check
  POST /api/webhooks/stripe             Stripe webhook handler

AUTH (Supabase session required):
  GET  /api/me                          Current user profile + org memberships
  POST /api/auth/accept-invite          Accept org invite

ORG-SCOPED (auth + org membership required):
  GET  /api/orgs                        List user's orgs
  GET  /api/orgs/[orgId]                Org details + brand config
  GET  /api/orgs/[orgId]/exams          List published exams
  GET  /api/orgs/[orgId]/exams/[examId] Exam with full topic/section tree
  GET  /api/orgs/[orgId]/exams/[examId]/items  List study items for exam
  GET  /api/orgs/[orgId]/audio/[studyItemId]   Get signed audio URL
  GET  /api/orgs/[orgId]/progress       User's progress summary
  PATCH /api/orgs/[orgId]/progress      Update progress for a study item
  GET  /api/orgs/[orgId]/progress/review-queue  Items due for review (spaced rep)
  GET  /api/orgs/[orgId]/streaks        User's streak data

ADMIN (auth + org admin/owner role required):
  POST   /api/admin/orgs/[orgId]/content/import    Bulk content import
  POST   /api/admin/orgs/[orgId]/content/generate   Trigger audio generation
  GET    /api/admin/orgs/[orgId]/content/status     Audio generation status
  PUT    /api/admin/orgs/[orgId]/brand              Update brand config
  POST   /api/admin/orgs/[orgId]/invites            Send invite
  DELETE /api/admin/orgs/[orgId]/invites/[inviteId] Revoke invite
  GET    /api/admin/orgs/[orgId]/members            List members
  PATCH  /api/admin/orgs/[orgId]/members/[userId]   Update member role
  DELETE /api/admin/orgs/[orgId]/members/[userId]   Remove member

GLOBAL ADMIN (auth + is_global_admin required):
  POST /api/admin/orgs                    Create new org
  GET  /api/admin/orgs                    List all orgs
  PATCH /api/admin/orgs/[orgId]           Update org settings
```

### Route Implementation Pattern

Every org-scoped route follows this pattern (matching try-listening's `requireUser()` pattern):

```typescript
// src/app/api/orgs/[orgId]/exams/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { requireMembership } from "@/lib/require-membership";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  // 1. Auth check
  const { userId, error: authError } = await requireUser();
  if (authError) return authError;

  const { orgId } = await params;

  // 2. Org membership check
  const db = await getDb();
  const membership = await requireMembership(db, userId, orgId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  // 3. Business logic
  const { rows } = await db.query(
    `SELECT id, title, slug, description, source_document, edition_year, sort_order
     FROM exams
     WHERE org_id = $1 AND is_published = true AND is_archived = false
     ORDER BY sort_order`,
    [orgId]
  );

  return NextResponse.json({ exams: rows });
}
```

### Key Endpoint Details

#### `GET /api/orgs/[orgId]/audio/[studyItemId]`

Returns a signed URL for the audio file. Does not stream the audio directly -- the client uses the signed URL to stream from Supabase Storage.

```typescript
// Request: GET /api/orgs/{orgId}/audio/{studyItemId}?voice=af_heart
// Response: { url: "https://xxx.supabase.co/storage/v1/object/sign/audio/...", durationSeconds: 45.2 }
```

#### `PATCH /api/orgs/[orgId]/progress`

Updates listening progress. Called frequently during playback (debounced on client, same pattern as try-listening).

```typescript
// Request body:
{
  studyItemId: "uuid",
  positionSeconds: 23.5,
  playbackRate: 1.5,
  isCompleted: false        // Client sends true when user reaches 90%+
}

// When isCompleted transitions to true for the first time:
// 1. Increment listen_count
// 2. Update spaced repetition fields (ease_factor, interval_days, next_review_at)
// 3. Update user_streaks for today
```

#### `GET /api/orgs/[orgId]/progress/review-queue`

Returns study items due for spaced repetition review.

```typescript
// Response:
{
  items: [
    {
      studyItemId: "uuid",
      title: "Flashover Indicators",
      sectionTitle: "Fire Behavior",
      topicTitle: "Fire Dynamics",
      lastListenedAt: "2026-02-20T...",
      listenCount: 3,
      intervalDays: 4,
      audioUrl: "https://..."
    }
  ],
  totalDue: 12,
  nextReviewAt: "2026-02-25T08:00:00Z"  // When the next batch becomes due
}
```

### Spaced Repetition Algorithm (SM-2 Variant)

```typescript
// src/lib/spaced-repetition.ts

/**
 * SM-2 inspired algorithm for audio study items.
 * Quality is based on user action:
 *   5 = Listened to completion without pausing
 *   4 = Listened to completion with pauses
 *   3 = Listened to completion on second try
 *   2 = Listened but skipped before completion
 *   1 = Started but abandoned early
 *
 * For simplicity in v1, we use:
 *   quality = 5 if completed, 2 if not
 */
export function calculateNextReview(
  currentEaseFactor: number,
  currentIntervalDays: number,
  listenCount: number,
  isCompleted: boolean
): { easeFactor: number; intervalDays: number; nextReviewAt: Date } {
  const quality = isCompleted ? 5 : 2;

  // Update ease factor
  let easeFactor = currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor); // Floor at 1.3

  // Calculate interval
  let intervalDays: number;
  if (listenCount <= 1) {
    intervalDays = 1;
  } else if (listenCount === 2) {
    intervalDays = 3;
  } else {
    intervalDays = Math.round(currentIntervalDays * easeFactor);
  }

  // Cap at 180 days
  intervalDays = Math.min(180, intervalDays);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  return { easeFactor, intervalDays, nextReviewAt };
}
```

### Rate Limiting

Carry forward try-listening's dual-layer rate limiting pattern but scope it per-org:

```typescript
// Per-user burst: 50 tokens, 5/sec refill (for audio URL requests)
// Per-org daily cap: based on subscription tier
// Admin TTS generation: separate limits per org subscription
```

---

## 6. Billing (Stripe)

### Plan Tiers

| Tier | Price | Seats | Features |
|------|-------|-------|----------|
| **Free** | $0 | 1 | 1 exam, 50 study items, ads, no offline |
| **Individual** | $14.99/mo | 1 | All exams in niche, unlimited items, offline, no ads |
| **Team** | $49.99/mo | 10 | Everything in Individual + team progress dashboard |
| **Enterprise** | Custom | Unlimited | SSO, custom content, dedicated support |

### Stripe Integration

#### Setup

```typescript
// src/lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});
```

#### Checkout Flow

```
1. User clicks "Upgrade" -> POST /api/orgs/{orgId}/billing/checkout
2. Server creates Stripe Checkout Session with org metadata
3. Redirect user to Stripe Checkout
4. Stripe sends webhook -> POST /api/webhooks/stripe
5. Webhook handler updates subscriptions table
6. User redirected back to app with active subscription
```

#### Webhook Handler

```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = await getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id;
      const plan = session.metadata?.plan as string;
      if (!orgId) break;

      await db.query(
        `INSERT INTO subscriptions (org_id, stripe_customer_id, stripe_subscription_id, plan, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (org_id) DO UPDATE SET
           stripe_customer_id = EXCLUDED.stripe_customer_id,
           stripe_subscription_id = EXCLUDED.stripe_subscription_id,
           plan = EXCLUDED.plan,
           status = 'active',
           updated_at = NOW()`,
        [orgId, session.customer, session.subscription, plan]
      );
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await db.query(
        `UPDATE subscriptions SET
           status = $1,
           current_period_start = $2,
           current_period_end = $3,
           cancel_at_period_end = $4,
           updated_at = NOW()
         WHERE stripe_subscription_id = $5`,
        [
          sub.status,
          new Date(sub.current_period_start * 1000).toISOString(),
          new Date(sub.current_period_end * 1000).toISOString(),
          sub.cancel_at_period_end,
          sub.id,
        ]
      );
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await db.query(
        `UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
         WHERE stripe_subscription_id = $1`,
        [sub.id]
      );
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await db.query(
        `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
         WHERE stripe_customer_id = $1`,
        [invoice.customer]
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

#### Subscription Gating Middleware

```typescript
// src/lib/require-subscription.ts
import type { DatabaseLike } from "./db";
import type { PlanTier } from "./types";

/**
 * Check if org has an active subscription at the required tier.
 * Returns the subscription or null.
 */
export async function requireSubscription(
  db: DatabaseLike,
  orgId: string,
  minimumPlan: PlanTier = "free"
): Promise<{ plan: PlanTier; status: string } | null> {
  const { rows } = await db.query<{ plan: PlanTier; status: string }>(
    `SELECT plan, status FROM subscriptions
     WHERE org_id = $1 AND status IN ('active', 'trialing')`,
    [orgId]
  );

  if (rows.length === 0) {
    // No subscription = free tier
    if (minimumPlan === "free") return { plan: "free", status: "active" };
    return null;
  }

  const tier = rows[0];
  const hierarchy: Record<PlanTier, number> = {
    free: 0, individual: 1, team: 2, enterprise: 3,
  };

  if (hierarchy[tier.plan] < hierarchy[minimumPlan]) return null;
  return tier;
}
```

---

## 7. Infrastructure & Environment

### Services

| Service | Purpose | Cost |
|---------|---------|------|
| **Supabase** (Pro) | Auth, PostgreSQL, Storage, Realtime | $25/mo |
| **Vercel** (Pro) | Next.js hosting, edge middleware, domains | $20/mo |
| **Modal** | Kokoro TTS model hosting | ~$0.05/1M chars |
| **Stripe** | Billing | 2.9% + $0.30/txn |
| **PostHog** (free tier) | Analytics, feature flags | $0 |
| **Domain registrar** | Custom domains per niche | ~$12/yr each |

### Supabase Storage Buckets

```
audio/                    -- Pre-generated audio files (private, signed URLs)
  {org_slug}/
    {exam_slug}/
      {study_item_id}/
        {voice}.flac

brands/                   -- Brand assets (public)
  {org_slug}/
    logo.svg
    favicon.ico
    hero.webp
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Server-only, for storage writes + admin ops
DATABASE_URL=postgresql://...              # Direct Postgres connection for pg.Pool

# Modal (TTS)
KOKORO_TTS_URL=https://xxx.modal.run/v1/audio/speech
MODAL_AUTH_KEY=xxx
MODAL_AUTH_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# App
NEXT_PUBLIC_APP_URL=https://app.nicheaudioprep.com   # Canonical app URL
NODE_ENV=production
```

---

## 8. Migration Path from try-listening

### What We Keep

| Component | Keep? | Notes |
|-----------|-------|-------|
| `DatabaseLike` interface + `pg.Pool` | Yes | Core DB abstraction |
| `runMigrations()` pattern | Yes | Add new migrations for new schema |
| `requireUser()` auth guard | Yes | Extend with org membership checks |
| Supabase Auth (`@supabase/ssr`) | Yes | Add email/password + magic link providers |
| `synthesize()` TTS function | Yes | Used in batch generation pipeline |
| `chunkText()` chunker | Yes | Used in content import pipeline |
| `TokenBucket` rate limiter | Yes | Add per-org scoping |
| Middleware pattern | Yes | Add tenant resolution |
| PostHog integration | Yes | Add org-scoped events |

### What Changes

| try-listening | niche-audio-prep | Why |
|---------------|------------------|-----|
| Audio in BYTEA | Audio in Supabase Storage | Scale: pre-generated content is GBs, not MBs |
| User-generated content | Admin-managed content | Content is professional exam material, not URLs |
| Single-user model | Multi-tenant org model | White-label requires org scoping |
| On-demand TTS | Pre-generated batch TTS | Users should never wait for generation |
| `library_entries` | `exams > topics > sections > study_items` | Structured content hierarchy vs flat list |
| SHA-based entry IDs | UUID primary keys | Admin-managed content doesn't need deterministic IDs |
| Google OAuth only | Google + email/password + magic link | Broader user base |

### Migration Steps

1. **Copy shared utilities.** `db.ts`, `chunker.ts`, `tts.ts`, `rate-limiter.ts`, `supabase/server.ts`, `supabase/client.ts` -- copy these verbatim, then modify.
2. **Write new migrations.** All tables from section 1 as new migration files.
3. **Extend middleware.** Add tenant resolution to the existing auth middleware pattern.
4. **New API routes.** Build from scratch following the org-scoped pattern.
5. **Admin content pipeline.** New code for content import + batch audio generation.
6. **Stripe integration.** New code.

---

## 9. Task Breakdown

Implementation order follows dependencies. Each task is testable in isolation. TDD throughout.

### Phase 1: Foundation (Database + Auth)

#### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Step 1:** Initialize Next.js project with TypeScript, Tailwind, and App Router.

```bash
bunx create-next-app@latest . --typescript --tailwind --app --src-dir --no-import-alias
```

**Step 2:** Install dependencies from try-listening plus new ones.

```bash
bun add @supabase/ssr @supabase/supabase-js pg stripe posthog-js posthog-node
bun add -d @types/pg
```

**Step 3:** Create `.env.local` with all environment variables (use dummy values for now).

**Step 4:** Verify `bun dev` starts without errors.

**Step 5:** Commit.

```bash
git add -A && git commit -m "chore: scaffold next.js project with dependencies"
```

---

#### Task 2: Database Layer (`DatabaseLike` + Migrations)

**Files:**
- Create: `src/lib/db.ts` (copy from try-listening)
- Create: `src/lib/migrations.ts` (new schema)
- Test: `src/lib/db.test.ts`

**Step 1: Write the failing test.**

```typescript
// src/lib/db.test.ts
import { describe, it, expect } from "bun:test";
import { runMigrations, type DatabaseLike, type Migration } from "./db";

function createMockDb(): DatabaseLike & { executed: string[] } {
  const executed: string[] = [];
  return {
    executed,
    async query<T>(sql: string, params?: unknown[]) {
      executed.push(sql);
      if (sql.includes("SELECT version FROM migrations")) {
        return { rows: [] as T[] };
      }
      return { rows: [] as T[] };
    },
    async exec(sql: string) {
      executed.push(sql);
    },
  };
}

describe("runMigrations", () => {
  it("should run pending migrations in order", async () => {
    const db = createMockDb();
    const migrations: Migration[] = [
      { version: 2, name: "second", up: "CREATE TABLE second (id INT)" },
      { version: 1, name: "first", up: "CREATE TABLE first (id INT)" },
    ];
    await runMigrations(db, migrations);
    // Should run version 1 before version 2
    const createStatements = db.executed.filter((s) => s.includes("CREATE TABLE first") || s.includes("CREATE TABLE second"));
    expect(createStatements[0]).toContain("first");
    expect(createStatements[1]).toContain("second");
  });

  it("should skip already-applied migrations", async () => {
    const executed: string[] = [];
    const db: DatabaseLike = {
      async query<T>(sql: string) {
        executed.push(sql);
        if (sql.includes("SELECT version FROM migrations")) {
          return { rows: [{ version: 1 }] as T[] };
        }
        return { rows: [] as T[] };
      },
      async exec(sql: string) { executed.push(sql); },
    };
    await runMigrations(db, [
      { version: 1, name: "first", up: "CREATE TABLE first (id INT)" },
      { version: 2, name: "second", up: "CREATE TABLE second (id INT)" },
    ]);
    expect(executed.some((s) => s.includes("CREATE TABLE first"))).toBe(false);
    expect(executed.some((s) => s.includes("CREATE TABLE second"))).toBe(true);
  });
});
```

**Step 2:** Run test to verify it fails.

Run: `bun test src/lib/db.test.ts`
Expected: FAIL (module not found)

**Step 3:** Copy `db.ts` from try-listening verbatim (it's generic enough). Write new `migrations.ts` with the organizations + users migration only (first two tables).

```typescript
// src/lib/migrations.ts
import type { Migration } from "./db";

export const migrations: Migration[] = [
  {
    version: 1,
    name: "create_organizations",
    up: `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        niche TEXT NOT NULL,
        domain TEXT UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations (domain) WHERE domain IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations (slug);
    `,
  },
  {
    version: 2,
    name: "create_users_and_memberships",
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        is_global_admin BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');

      CREATE TABLE IF NOT EXISTS org_memberships (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role org_role NOT NULL DEFAULT 'member',
        invited_by UUID REFERENCES users(id),
        invited_at TIMESTAMPTZ,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (org_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON org_memberships (user_id);
      CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON org_memberships (org_id);
    `,
  },
];
```

**Step 4:** Run test to verify it passes.

Run: `bun test src/lib/db.test.ts`
Expected: PASS

**Step 5:** Commit.

```bash
git add src/lib/db.ts src/lib/db.test.ts src/lib/migrations.ts
git commit -m "feat: database layer with organizations and users migrations"
```

---

#### Task 3: Content Schema Migrations

**Files:**
- Modify: `src/lib/migrations.ts` (add migrations 3-6)

**Step 1:** Add migrations for brand_configs, exams, topics, sections, study_items, audio_files, and user_progress. Each as a separate migration version.

**Step 2:** Add migrations for subscriptions, invite_tokens, user_streaks, and tts_daily_usage.

**Step 3:** Run tests to verify existing migration tests still pass.

**Step 4:** Commit.

```bash
git add src/lib/migrations.ts
git commit -m "feat: complete database schema migrations"
```

---

#### Task 4: Tenant Resolution

**Files:**
- Create: `src/lib/tenant.ts`
- Test: `src/lib/tenant.test.ts`

**Step 1: Write the failing test.**

```typescript
// src/lib/tenant.test.ts
import { describe, it, expect } from "bun:test";
import { resolveTenant } from "./tenant";
import type { DatabaseLike } from "./db";

function mockDb(rows: Record<string, unknown>[]): DatabaseLike {
  return {
    async query<T>() { return { rows: rows as T[] }; },
    async exec() {},
  };
}

describe("resolveTenant", () => {
  it("should resolve by domain", async () => {
    const db = mockDb([{
      id: "org-1", slug: "firefighter-prep", name: "FirefighterPrep",
      niche: "firefighting", domain: "firefighterprep.com",
    }]);
    const tenant = await resolveTenant(db, "firefighterprep.com");
    expect(tenant).not.toBeNull();
    expect(tenant!.orgId).toBe("org-1");
    expect(tenant!.niche).toBe("firefighting");
  });

  it("should resolve by slug", async () => {
    const db = mockDb([{
      id: "org-2", slug: "pilot-audio", name: "PilotAudio",
      niche: "aviation", domain: null,
    }]);
    const tenant = await resolveTenant(db, "pilot-audio");
    expect(tenant).not.toBeNull();
    expect(tenant!.slug).toBe("pilot-audio");
  });

  it("should return null for unknown domain", async () => {
    const db = mockDb([]);
    const tenant = await resolveTenant(db, "unknown.com");
    expect(tenant).toBeNull();
  });

  it("should cache results", async () => {
    let queryCount = 0;
    const db: DatabaseLike = {
      async query<T>() {
        queryCount++;
        return { rows: [{
          id: "org-1", slug: "test", name: "Test", niche: "test", domain: "test.com",
        }] as T[] };
      },
      async exec() {},
    };
    await resolveTenant(db, "test.com");
    await resolveTenant(db, "test.com");
    expect(queryCount).toBe(1); // Second call should hit cache
  });
});
```

**Step 2:** Run test to verify it fails.

**Step 3:** Implement `src/lib/tenant.ts` (code shown in section 2 above).

**Step 4:** Run test to verify it passes.

**Step 5:** Commit.

```bash
git add src/lib/tenant.ts src/lib/tenant.test.ts
git commit -m "feat: tenant resolution with caching"
```

---

#### Task 5: Auth Guard + Membership Check

**Files:**
- Create: `src/lib/require-user.ts` (copy from try-listening)
- Create: `src/lib/require-membership.ts`
- Test: `src/lib/require-membership.test.ts`

**Step 1: Write the failing test.**

```typescript
// src/lib/require-membership.test.ts
import { describe, it, expect } from "bun:test";
import { requireMembership, isGlobalAdmin } from "./require-membership";
import type { DatabaseLike } from "./db";

function mockDb(rows: Record<string, unknown>[]): DatabaseLike {
  return {
    async query<T>() { return { rows: rows as T[] }; },
    async exec() {},
  };
}

describe("requireMembership", () => {
  it("should return membership for valid member", async () => {
    const db = mockDb([{ role: "member" }]);
    const result = await requireMembership(db, "user-1", "org-1");
    expect(result).not.toBeNull();
    expect(result!.role).toBe("member");
  });

  it("should return null for non-member", async () => {
    const db = mockDb([]);
    const result = await requireMembership(db, "user-1", "org-1");
    expect(result).toBeNull();
  });

  it("should reject member when admin required", async () => {
    const db = mockDb([{ role: "member" }]);
    const result = await requireMembership(db, "user-1", "org-1", "admin");
    expect(result).toBeNull();
  });

  it("should allow owner when admin required", async () => {
    const db = mockDb([{ role: "owner" }]);
    const result = await requireMembership(db, "user-1", "org-1", "admin");
    expect(result).not.toBeNull();
  });
});

describe("isGlobalAdmin", () => {
  it("should return true for global admin", async () => {
    const db = mockDb([{ is_global_admin: true }]);
    expect(await isGlobalAdmin(db, "user-1")).toBe(true);
  });

  it("should return false for regular user", async () => {
    const db = mockDb([{ is_global_admin: false }]);
    expect(await isGlobalAdmin(db, "user-1")).toBe(false);
  });
});
```

**Step 2:** Run test to verify it fails.

**Step 3:** Implement (code shown in section 2 above).

**Step 4:** Run test to verify it passes.

**Step 5:** Commit.

```bash
git add src/lib/require-user.ts src/lib/require-membership.ts src/lib/require-membership.test.ts
git commit -m "feat: auth guard and org membership authorization"
```

---

#### Task 6: Supabase Auth Setup + Middleware

**Files:**
- Create: `src/lib/supabase/server.ts` (copy from try-listening)
- Create: `src/lib/supabase/client.ts` (copy from try-listening)
- Create: `src/middleware.ts` (extend try-listening pattern)

**Step 1:** Copy Supabase client files from try-listening.

**Step 2:** Write middleware with tenant resolution (code shown in section 2).

**Step 3:** Verify dev server starts: `bun dev`.

**Step 4:** Commit.

```bash
git add src/lib/supabase/ src/middleware.ts
git commit -m "feat: supabase auth clients and tenant-aware middleware"
```

---

### Phase 2: Content Management

#### Task 7: Content Import Utility

**Files:**
- Create: `src/lib/content-import.ts`
- Test: `src/lib/content-import.test.ts`
- Reuse: `src/lib/chunker.ts` (copy from try-listening)

**Step 1: Write the failing test.**

```typescript
// src/lib/content-import.test.ts
import { describe, it, expect } from "bun:test";
import { normalizeContentImport, type ContentImport } from "./content-import";

describe("normalizeContentImport", () => {
  const validImport: ContentImport = {
    exam: {
      title: "Firefighter I",
      slug: "firefighter-i",
      sourceDocument: "NFPA 1001",
      editionYear: 2019,
    },
    topics: [{
      title: "Fire Behavior",
      slug: "fire-behavior",
      sections: [{
        title: "Phases of Fire",
        slug: "phases-of-fire",
        items: [{
          textContent: "Fire develops in four phases: ignition, growth, fully developed, and decay.",
          importance: "critical",
          sourceReference: "NFPA 1001 5.3.1",
        }],
      }],
    }],
  };

  it("should produce correct structure", () => {
    const result = normalizeContentImport("org-1", validImport);
    expect(result.exam.title).toBe("Firefighter I");
    expect(result.topics).toHaveLength(1);
    expect(result.topics[0].sections[0].items[0].charCount).toBe(
      "Fire develops in four phases: ignition, growth, fully developed, and decay.".length
    );
  });

  it("should compute text hash", () => {
    const result = normalizeContentImport("org-1", validImport);
    const item = result.topics[0].sections[0].items[0];
    expect(item.textHash).toMatch(/^[a-f0-9]{32}$/);
  });

  it("should auto-chunk items exceeding 3800 chars", () => {
    const longText = "A".repeat(5000);
    const importData: ContentImport = {
      exam: { title: "Test", slug: "test", sourceDocument: "Test", editionYear: 2024 },
      topics: [{
        title: "T", slug: "t",
        sections: [{
          title: "S", slug: "s",
          items: [{ textContent: longText }],
        }],
      }],
    };
    const result = normalizeContentImport("org-1", importData);
    const items = result.topics[0].sections[0].items;
    expect(items.length).toBeGreaterThan(1);
    items.forEach((item) => expect(item.charCount).toBeLessThanOrEqual(3800));
  });

  it("should assign sequential sort_order", () => {
    const importData: ContentImport = {
      exam: { title: "Test", slug: "test", sourceDocument: "Test", editionYear: 2024 },
      topics: [{
        title: "T", slug: "t",
        sections: [{
          title: "S", slug: "s",
          items: [
            { textContent: "First item" },
            { textContent: "Second item" },
          ],
        }],
      }],
    };
    const result = normalizeContentImport("org-1", importData);
    const items = result.topics[0].sections[0].items;
    expect(items[0].sortOrder).toBe(0);
    expect(items[1].sortOrder).toBe(1);
  });
});
```

**Step 2:** Run test to verify it fails.

**Step 3:** Implement `content-import.ts` with chunking, hashing, and validation.

**Step 4:** Run test to verify it passes.

**Step 5:** Commit.

```bash
git add src/lib/content-import.ts src/lib/content-import.test.ts src/lib/chunker.ts
git commit -m "feat: content import normalization with auto-chunking"
```

---

#### Task 8: Content Admin API Routes

**Files:**
- Create: `src/app/api/admin/orgs/[orgId]/content/import/route.ts`
- Create: `src/app/api/admin/orgs/[orgId]/content/generate/route.ts`
- Create: `src/app/api/admin/orgs/[orgId]/content/status/route.ts`

**Step 1:** Implement `POST /api/admin/orgs/[orgId]/content/import` -- accepts `ContentImport` JSON, validates, writes to DB.

**Step 2:** Implement `POST /api/admin/orgs/[orgId]/content/generate` -- triggers batch audio generation.

**Step 3:** Implement `GET /api/admin/orgs/[orgId]/content/status` -- returns audio generation progress (how many items have audio vs need generation).

**Step 4:** Manual test with `curl` against local dev.

**Step 5:** Commit.

```bash
git add src/app/api/admin/
git commit -m "feat: admin content import and audio generation API routes"
```

---

### Phase 3: Audio Generation Pipeline

#### Task 9: TTS Integration

**Files:**
- Create: `src/lib/tts.ts` (copy from try-listening)
- Create: `src/lib/audio-generation.ts`
- Test: `src/lib/audio-generation.test.ts`

**Step 1: Write the failing test.**

```typescript
// src/lib/audio-generation.test.ts
import { describe, it, expect } from "bun:test";
import { findPendingGenerations } from "./audio-generation";
import type { DatabaseLike } from "./db";

describe("findPendingGenerations", () => {
  it("should return items without audio", async () => {
    const db: DatabaseLike = {
      async query<T>() {
        return {
          rows: [{
            study_item_id: "item-1",
            text_content: "Test content",
            text_hash: "abc123",
            exam_slug: "firefighter-i",
            org_slug: "firefighter-prep",
          }] as T[],
        };
      },
      async exec() {},
    };
    const jobs = await findPendingGenerations(db, "org-1", ["af_heart"]);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].storagePath).toBe("audio/firefighter-prep/firefighter-i/item-1/af_heart.flac");
  });

  it("should generate a job per voice", async () => {
    const db: DatabaseLike = {
      async query<T>() {
        return {
          rows: [{
            study_item_id: "item-1",
            text_content: "Test",
            text_hash: "abc",
            exam_slug: "test",
            org_slug: "test",
          }] as T[],
        };
      },
      async exec() {},
    };
    const jobs = await findPendingGenerations(db, "org-1", ["af_heart", "am_adam"]);
    expect(jobs).toHaveLength(2);
    expect(jobs[0].voice).toBe("af_heart");
    expect(jobs[1].voice).toBe("am_adam");
  });
});
```

**Step 2:** Run test to verify it fails.

**Step 3:** Implement `audio-generation.ts` (code shown in section 4 above).

**Step 4:** Run test to verify it passes.

**Step 5:** Commit.

```bash
git add src/lib/tts.ts src/lib/audio-generation.ts src/lib/audio-generation.test.ts
git commit -m "feat: audio generation pipeline with batch processing"
```

---

### Phase 4: User-Facing API

#### Task 10: Org + Exam Listing Routes

**Files:**
- Create: `src/app/api/orgs/route.ts`
- Create: `src/app/api/orgs/[orgId]/route.ts`
- Create: `src/app/api/orgs/[orgId]/exams/route.ts`
- Create: `src/app/api/orgs/[orgId]/exams/[examId]/route.ts`

**Step 1:** Implement `GET /api/orgs` -- list orgs for authenticated user.

**Step 2:** Implement `GET /api/orgs/[orgId]` -- org details + brand config.

**Step 3:** Implement `GET /api/orgs/[orgId]/exams` -- list published exams.

**Step 4:** Implement `GET /api/orgs/[orgId]/exams/[examId]` -- full exam tree (topics + sections + item counts).

**Step 5:** Commit.

```bash
git add src/app/api/orgs/
git commit -m "feat: org and exam listing API routes"
```

---

#### Task 11: Audio Serving Route

**Files:**
- Create: `src/app/api/orgs/[orgId]/audio/[studyItemId]/route.ts`
- Create: `src/lib/audio-url.ts`

**Step 1:** Implement `GET /api/orgs/[orgId]/audio/[studyItemId]` -- returns signed URL from Supabase Storage.

**Step 2:** Query `audio_files` for current audio, generate signed URL, return with duration metadata.

**Step 3:** Commit.

```bash
git add src/app/api/orgs/[orgId]/audio/ src/lib/audio-url.ts
git commit -m "feat: audio serving via signed storage URLs"
```

---

#### Task 12: Progress Tracking

**Files:**
- Create: `src/lib/progress.ts`
- Test: `src/lib/progress.test.ts`
- Create: `src/app/api/orgs/[orgId]/progress/route.ts`
- Create: `src/app/api/orgs/[orgId]/progress/review-queue/route.ts`

**Step 1: Write the failing test for spaced repetition.**

```typescript
// src/lib/spaced-repetition.test.ts
import { describe, it, expect } from "bun:test";
import { calculateNextReview } from "./spaced-repetition";

describe("calculateNextReview", () => {
  it("should set 1-day interval for first listen", () => {
    const result = calculateNextReview(2.5, 1, 1, true);
    expect(result.intervalDays).toBe(1);
    expect(result.easeFactor).toBeGreaterThan(2.5); // Quality 5 increases ease
  });

  it("should set 3-day interval for second listen", () => {
    const result = calculateNextReview(2.6, 1, 2, true);
    expect(result.intervalDays).toBe(3);
  });

  it("should use ease factor for subsequent listens", () => {
    const result = calculateNextReview(2.5, 3, 3, true);
    expect(result.intervalDays).toBe(Math.round(3 * 2.6)); // 3 * updated ease
  });

  it("should decrease ease factor for incomplete listens", () => {
    const result = calculateNextReview(2.5, 3, 3, false);
    expect(result.easeFactor).toBeLessThan(2.5);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3); // Floor
  });

  it("should cap interval at 180 days", () => {
    const result = calculateNextReview(2.5, 100, 10, true);
    expect(result.intervalDays).toBeLessThanOrEqual(180);
  });
});
```

**Step 2:** Run test to verify it fails.

**Step 3:** Implement `spaced-repetition.ts` (code shown in section 5 above).

**Step 4:** Run test to verify it passes.

**Step 5:** Implement `progress.ts` data access layer + API routes.

**Step 6:** Commit.

```bash
git add src/lib/spaced-repetition.ts src/lib/spaced-repetition.test.ts src/lib/progress.ts src/lib/progress.test.ts src/app/api/orgs/[orgId]/progress/
git commit -m "feat: progress tracking with spaced repetition"
```

---

#### Task 13: Streak Tracking

**Files:**
- Create: `src/lib/streaks.ts`
- Test: `src/lib/streaks.test.ts`
- Create: `src/app/api/orgs/[orgId]/streaks/route.ts`

**Step 1:** Write tests for streak calculation (current streak length, longest streak, daily totals).

**Step 2:** Implement streak data access and API route.

**Step 3:** Commit.

```bash
git add src/lib/streaks.ts src/lib/streaks.test.ts src/app/api/orgs/[orgId]/streaks/
git commit -m "feat: user streak tracking"
```

---

### Phase 5: Billing

#### Task 14: Stripe Integration

**Files:**
- Create: `src/lib/stripe.ts`
- Create: `src/lib/require-subscription.ts`
- Test: `src/lib/require-subscription.test.ts`
- Create: `src/app/api/webhooks/stripe/route.ts`
- Create: `src/app/api/orgs/[orgId]/billing/checkout/route.ts`
- Create: `src/app/api/orgs/[orgId]/billing/portal/route.ts`

**Step 1:** Write tests for subscription tier gating.

```typescript
// src/lib/require-subscription.test.ts
import { describe, it, expect } from "bun:test";
import { requireSubscription } from "./require-subscription";
import type { DatabaseLike } from "./db";

describe("requireSubscription", () => {
  it("should allow free tier when no subscription exists", async () => {
    const db: DatabaseLike = {
      async query<T>() { return { rows: [] as T[] }; },
      async exec() {},
    };
    const result = await requireSubscription(db, "org-1", "free");
    expect(result).not.toBeNull();
    expect(result!.plan).toBe("free");
  });

  it("should reject when higher tier required", async () => {
    const db: DatabaseLike = {
      async query<T>() { return { rows: [] as T[] }; },
      async exec() {},
    };
    const result = await requireSubscription(db, "org-1", "individual");
    expect(result).toBeNull();
  });

  it("should allow enterprise when team required", async () => {
    const db: DatabaseLike = {
      async query<T>() { return { rows: [{ plan: "enterprise", status: "active" }] as T[] }; },
      async exec() {},
    };
    const result = await requireSubscription(db, "org-1", "team");
    expect(result).not.toBeNull();
  });
});
```

**Step 2:** Implement `stripe.ts`, `require-subscription.ts`.

**Step 3:** Implement Stripe webhook handler (code shown in section 6).

**Step 4:** Implement checkout and billing portal routes.

**Step 5:** Commit.

```bash
git add src/lib/stripe.ts src/lib/require-subscription.ts src/lib/require-subscription.test.ts src/app/api/webhooks/stripe/ src/app/api/orgs/[orgId]/billing/
git commit -m "feat: stripe billing integration with subscription gating"
```

---

### Phase 6: Admin & Org Management

#### Task 15: Org Invite System

**Files:**
- Create: `src/lib/invites.ts`
- Test: `src/lib/invites.test.ts`
- Create: `src/app/api/admin/orgs/[orgId]/invites/route.ts`
- Create: `src/app/api/auth/accept-invite/route.ts`

**Step 1:** Write tests for invite creation, acceptance, expiration.

**Step 2:** Implement invite logic and API routes.

**Step 3:** Commit.

```bash
git add src/lib/invites.ts src/lib/invites.test.ts src/app/api/admin/orgs/[orgId]/invites/ src/app/api/auth/accept-invite/
git commit -m "feat: org invite system"
```

---

#### Task 16: Brand Config API

**Files:**
- Create: `src/app/api/admin/orgs/[orgId]/brand/route.ts`

**Step 1:** Implement `PUT /api/admin/orgs/[orgId]/brand` -- update brand config (colors, logo URL, copy, etc.).

**Step 2:** Commit.

```bash
git add src/app/api/admin/orgs/[orgId]/brand/
git commit -m "feat: brand config admin API"
```

---

#### Task 17: Global Admin Routes

**Files:**
- Create: `src/app/api/admin/orgs/route.ts` (create + list orgs)

**Step 1:** Implement `POST /api/admin/orgs` -- create new org (global admin only).

**Step 2:** Implement `GET /api/admin/orgs` -- list all orgs with member counts and subscription status.

**Step 3:** Commit.

```bash
git add src/app/api/admin/orgs/route.ts
git commit -m "feat: global admin org management"
```

---

### Phase 7: Types, Constants, PostHog

#### Task 18: Shared Types and Constants

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/constants.ts` (extend from try-listening)

```typescript
// src/lib/types.ts
export type OrgRole = "owner" | "admin" | "member";
export type PlanTier = "free" | "individual" | "team" | "enterprise";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Importance = "low" | "medium" | "high" | "critical";

export interface Exam { /* ... */ }
export interface Topic { /* ... */ }
export interface Section { /* ... */ }
export interface StudyItem { /* ... */ }
export interface UserProgress { /* ... */ }
// ... all shared types
```

This task should be done early (alongside Task 2) since other tasks depend on these types. Listed here for organizational clarity.

**Step 1:** Commit.

```bash
git add src/lib/types.ts src/lib/constants.ts
git commit -m "feat: shared types and constants"
```

---

#### Task 19: PostHog Events

**Files:**
- Create: `src/lib/posthog-server.ts` (copy from try-listening)
- Define events

```typescript
// Server-side events to track:
// content_imported        - admin imported content
// audio_batch_started     - batch TTS generation started
// audio_batch_completed   - batch TTS generation finished
// audio_item_generated    - single audio item generated
// study_item_listened     - user completed listening to an item
// streak_updated          - user's streak changed
// subscription_created    - new Stripe subscription
// subscription_canceled   - subscription canceled
// org_created             - new org created
// member_invited          - invite sent
// member_joined           - invite accepted
```

**Step 1:** Commit.

```bash
git add src/lib/posthog-server.ts
git commit -m "feat: posthog server-side event tracking"
```

---

### Phase 8: Integration Testing

#### Task 20: End-to-End Flow Test

Write an integration test that exercises the full content lifecycle:

1. Create org (global admin)
2. Create user + membership
3. Import content (admin)
4. Verify exam/topic/section/item structure
5. Get audio URL (simulated -- mock Supabase Storage)
6. Update progress
7. Check review queue

This should use a real (local) PostgreSQL database or Supabase local dev.

```bash
git commit -m "test: end-to-end content lifecycle integration test"
```

---

## Appendix A: Supabase Storage Bucket Config

Create via Supabase Dashboard or migration:

```sql
-- Run in Supabase SQL editor (not in app migrations -- this is Supabase infra)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('audio', 'audio', false),     -- Private: signed URLs required
  ('brands', 'brands', true);    -- Public: logos, images

-- Storage RLS: audio bucket
CREATE POLICY audio_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio'
    AND auth.role() = 'authenticated'
  );

-- Storage RLS: brands bucket (public read)
CREATE POLICY brands_select ON storage.objects
  FOR SELECT USING (bucket_id = 'brands');

-- Storage RLS: admin upload (service role bypasses RLS, but for extra safety)
CREATE POLICY audio_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_global_admin = true)
  );
```

## Appendix B: Supabase Auth Trigger

```sql
-- Run in Supabase SQL editor after creating the users table
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Appendix C: Rate Limiting by Subscription Tier

| Tier | Audio URL requests/min | API requests/min | Offline downloads |
|------|----------------------|------------------|-------------------|
| Free | 30 | 60 | No |
| Individual | 120 | 300 | Yes |
| Team | 300 | 600 | Yes |
| Enterprise | Unlimited | Unlimited | Yes |

## Appendix D: Content Size Estimates

| Niche | Source Pages | Est. Study Items | Est. Audio Hours | Est. Storage |
|-------|-------------|-----------------|-----------------|-------------|
| Firefighting (NFPA 1001) | ~200 | ~500 | ~15h | ~5 GB |
| Electrical (NEC) | ~900 | ~2,000 | ~60h | ~20 GB |
| Aviation (FAR/AIM) | ~1,000 | ~2,500 | ~75h | ~25 GB |
| CDL | ~100 | ~250 | ~8h | ~3 GB |
| Per niche average | ~500 | ~1,000 | ~30h | ~10 GB |

At Supabase Pro ($25/mo), storage is 100 GB included. Enough for ~10 niches before needing the first upgrade.
