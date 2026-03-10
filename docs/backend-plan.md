# Niche Audio Prep -- Backend Architecture

> Document-Driven Development spec. This document IS the backend. Code implements what this describes.

**Status:** Not Started

**Status:** Phases 1-6 Complete — Phase 9 (Audio Pipeline) Complete — Phase 10 (Billing) Complete — Phase 11 (Gamification) Complete

**Goal:** A multi-tenant REST API for audio exam prep. Organizations create content libraries for professional certification exams. The system batch pre-generates audio via Kokoro TTS on Modal. Users study by listening.

**Architecture:** NestJS (TypeScript) standalone service. Single deployment, all tenants. Tenant context comes from the authenticated user's org membership -- JWT in, org-scoped data out. The backend does not know or care about white-labeling, domains, or branding. Those are frontend concerns.

**Tech Stack:**
- **NestJS** (TypeScript) -- API server
- **Prisma** -- Database ORM and migrations
- **Supabase** -- Auth (JWT verification), PostgreSQL database, file storage (audio)
- **Modal** -- Hosts Kokoro TTS for batch audio pre-generation
- **Stripe** -- Billing and subscription management
- **PostHog** -- Server-side analytics and feature flags

**Why NestJS over FastAPI:** TypeScript end-to-end. The frontend is Next.js, the mobile app is React Native, and shared types live in a monorepo `packages/types` package. A NestJS backend means one language across the entire stack. No Python-to-TypeScript type translation. Shared validation schemas (Zod) between frontend and backend. Engineers work in one language.

**Why Prisma over raw SQL:** Prisma gives us type-safe database access with zero runtime overhead for query building. The generated client types flow directly into DTOs and controller responses. Migrations are version-controlled `.sql` files that Prisma generates from schema changes. We still write raw SQL when Prisma's query builder falls short (complex aggregations, window functions), but the common CRUD path is type-safe.

**Prototype Reference:** `try-listening` at `/Users/will/github/try-listening`. Patterns carried forward: Modal Kokoro TTS deployment (`modal/kokoro_tts.py`), sentence-boundary text chunking, token bucket rate limiting, content-hash audio caching.

---

## Table of Contents

1. [System Context](#1-system-context)
2. [Database Schema](#2-database-schema)
3. [Auth & Multi-tenancy](#3-auth--multi-tenancy)
4. [API Design](#4-api-design)
5. [Content Pipeline](#5-content-pipeline)
6. [Audio Generation Pipeline](#6-audio-generation-pipeline)
7. [User Progress & Spaced Repetition](#7-user-progress--spaced-repetition)
8. [Billing (Stripe)](#8-billing-stripe)
9. [Infrastructure & Deployment](#9-infrastructure--deployment)
10. [Evolution from try-listening](#10-evolution-from-try-listening)
11. [Implementation Plan](#11-implementation-plan)

---

## 1. System Context

### What This Service Does

The backend is a REST API. It handles:

- Verifying Supabase JWTs and resolving which org(s) a user belongs to
- Serving content (exams, topics, sections, study items) scoped by org
- Serving signed URLs for pre-generated audio files stored in Supabase Storage
- Tracking per-user listening progress and spaced repetition schedules
- Managing org memberships and invitations
- Processing Stripe webhooks and gating features by subscription tier
- Triggering batch audio generation via Modal

### What This Service Does NOT Do

- **No domain detection.** The backend receives a JWT. It looks up which orgs the user belongs to. That is the entire multi-tenancy mechanism.
- **No brand theming.** No colors, logos, fonts, taglines, hero images. The frontend handles all white-labeling.
- **No landing pages.** No HTML rendering of any kind.
- **No on-demand TTS.** All audio is pre-generated in batch when content is created or updated. Users stream from Supabase Storage via signed URLs.

### System Diagram

```
Frontend (Next.js on Vercel, per-brand domains)
  |
  | HTTPS + Authorization: Bearer <supabase-jwt>
  v
NestJS Backend (single deployment on Railway/Fly.io)
  |
  |-- Supabase Auth (JWT verification via shared secret)
  |-- Supabase PostgreSQL (all data, Prisma ORM)
  |-- Supabase Storage (audio files, signed URLs)
  |-- Modal (Kokoro TTS, batch generation only)
  |-- Stripe (billing webhooks, checkout sessions)
  |-- PostHog (server-side event capture)
```

---

## 2. Database Schema

### Design Principles

- **UUIDs everywhere.** All primary keys are UUIDs.
- **`orgId` on every tenant-scoped row.** This is the multi-tenancy key.
- **Row-level security (RLS).** All user-facing tables get RLS policies scoped to org membership. Admin mutations use the service role key (bypasses RLS).
- **Soft deletes for content.** `isArchived` flag. Regulations change yearly; old content is archived, not destroyed.
- **Timestamps everywhere.** `createdAt`, `updatedAt` on every table.

### Entity Relationships

```
organizations (tenant)
  |-- orgMemberships (join) -- users (extends auth.users)
  |-- exams
  |     |-- topics
  |     |     |-- sections
  |     |     |     |-- studyItems (text chunks users listen to)
  |     |     |     |     |-- audioFiles (metadata; bytes in Supabase Storage)
  |-- subscriptions (Stripe billing)

userProgress (per-user, per-study-item listening state)
userStreaks (daily activity tracking)
userBookmarks (flagged items)
inviteTokens (org invitations)
audioGenerationJobs (batch generation tracking)
```

No `brandConfigs` table. No `domain` column on organizations. Branding is frontend-only.

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =============================================================================
// ORGANIZATIONS
// =============================================================================

model Organization {
  id        String   @id @default(uuid()) @db.Uuid
  slug      String   @unique               // URL-safe identifier: "firefighter-prep"
  name      String                          // Display name: "FirefighterPrep"
  niche     String                          // Category: "firefighting", "electrical", "aviation"
  isActive  Boolean  @default(true) @map("is_active")
  settings  Json     @default("{}")         // Org-level config (default voices, etc.)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  memberships   OrgMembership[]
  exams         Exam[]
  subscription  Subscription?
  inviteTokens  InviteToken[]
  generationJobs AudioGenerationJob[]

  @@map("organizations")
}

// =============================================================================
// USERS (extends Supabase auth.users)
// =============================================================================

model User {
  id            String   @id @db.Uuid       // References auth.users(id)
  email         String
  displayName   String?  @map("display_name")
  avatarUrl     String?  @map("avatar_url")
  isGlobalAdmin Boolean  @default(false) @map("is_global_admin")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz

  memberships    OrgMembership[]
  sentInvites    OrgMembership[] @relation("InvitedBy")
  progress       UserProgress[]
  streaks        UserStreak[]
  bookmarks      UserBookmark[]
  invitesSent    InviteToken[]   @relation("InviteSender")
  triggeredJobs  AudioGenerationJob[] @relation("JobTriggeredBy")

  @@map("users")
}

// =============================================================================
// ORG MEMBERSHIPS (users <-> organizations, many-to-many)
// =============================================================================

enum OrgRole {
  owner
  admin
  member

  @@map("org_role")
}

model OrgMembership {
  id        String   @id @default(uuid()) @db.Uuid
  orgId     String   @map("org_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  role      OrgRole  @default(member)
  invitedBy String?  @map("invited_by") @db.Uuid
  invitedAt DateTime? @map("invited_at") @db.Timestamptz
  joinedAt  DateTime @default(now()) @map("joined_at") @db.Timestamptz
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz

  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  inviter   User?        @relation("InvitedBy", fields: [invitedBy], references: [id])

  @@unique([orgId, userId])
  @@index([userId])
  @@index([orgId])
  @@map("org_memberships")
}

// =============================================================================
// CONTENT HIERARCHY: exams -> topics -> sections -> study_items
// =============================================================================

model Exam {
  id             String   @id @default(uuid()) @db.Uuid
  orgId          String   @map("org_id") @db.Uuid
  title          String
  slug           String
  description    String?
  sourceDocument String?  @map("source_document")  // "NFPA 1001 (2019 Edition)"
  editionYear    Int?     @map("edition_year")
  isPublished    Boolean  @default(false) @map("is_published")
  isArchived     Boolean  @default(false) @map("is_archived")
  sortOrder      Int      @default(0) @map("sort_order")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz

  org    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  topics Topic[]

  @@unique([orgId, slug])
  @@index([orgId])
  @@map("exams")
}

model Topic {
  id         String   @id @default(uuid()) @db.Uuid
  examId     String   @map("exam_id") @db.Uuid
  title      String
  slug       String
  description String?
  sortOrder  Int      @default(0) @map("sort_order")
  isArchived Boolean  @default(false) @map("is_archived")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz

  exam     Exam      @relation(fields: [examId], references: [id], onDelete: Cascade)
  sections Section[]

  @@unique([examId, slug])
  @@index([examId])
  @@map("topics")
}

model Section {
  id         String   @id @default(uuid()) @db.Uuid
  topicId    String   @map("topic_id") @db.Uuid
  title      String
  slug       String
  description String?
  sortOrder  Int      @default(0) @map("sort_order")
  isArchived Boolean  @default(false) @map("is_archived")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz

  topic      Topic       @relation(fields: [topicId], references: [id], onDelete: Cascade)
  studyItems StudyItem[]

  @@unique([topicId, slug])
  @@index([topicId])
  @@map("sections")
}

model StudyItem {
  id              String   @id @default(uuid()) @db.Uuid
  sectionId       String   @map("section_id") @db.Uuid
  title           String?
  textContent     String   @map("text_content")     // The actual text (~3800 chars max for TTS)
  textHash        String   @map("text_hash")         // SHA-256 of normalized text (cache key)
  charCount       Int      @map("char_count")
  difficulty      String?                             // beginner | intermediate | advanced
  importance      String?                             // low | medium | high | critical
  tags            String[] @default([])
  sourceReference String?  @map("source_reference")  // "NFPA 1001 Section 5.3.1"
  sortOrder       Int      @default(0) @map("sort_order")
  isArchived      Boolean  @default(false) @map("is_archived")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz

  section    Section        @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  audioFiles AudioFile[]
  progress   UserProgress[]
  bookmarks  UserBookmark[]

  @@index([sectionId])
  @@map("study_items")
}

// =============================================================================
// CONTENT VERSIONING STRATEGY
// =============================================================================
// When regulations change (e.g., NEC 2023 -> NEC 2026), create a new exam
// record with the new editionYear. The old exam is archived (isArchived = true).
// This is simpler than row-level versioning and matches how regulations work:
// you study one edition at a time.
//
// For minor corrections within an edition, update studyItems.textContent
// in place. The textHash column changes, triggering audio regeneration
// in the next batch job.

// =============================================================================
// AUDIO FILES (metadata; bytes stored in Supabase Storage)
// =============================================================================

// Storage path convention: audio/{org_slug}/{exam_slug}/{study_item_id}/{voice}.flac
model AudioFile {
  id            String   @id @default(uuid()) @db.Uuid
  studyItemId   String   @map("study_item_id") @db.Uuid
  voice         String                          // Kokoro voice ID: "af_heart", "am_adam"
  model         String   @default("kokoro")
  textHash      String   @map("text_hash")     // Must match studyItems.textHash
  storagePath   String   @map("storage_path")
  storageBucket String   @default("audio") @map("storage_bucket")
  fileSizeBytes Int      @map("file_size_bytes")
  durationSeconds Float? @map("duration_seconds")
  format        String   @default("flac")
  isCurrent     Boolean  @default(true) @map("is_current")
  generatedAt   DateTime @default(now()) @map("generated_at") @db.Timestamptz
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz

  studyItem StudyItem @relation(fields: [studyItemId], references: [id], onDelete: Cascade)

  @@unique([studyItemId, voice, model, textHash])
  @@index([studyItemId])
  @@map("audio_files")
}

// =============================================================================
// USER PROGRESS
// =============================================================================

model UserProgress {
  id                 String    @id @default(uuid()) @db.Uuid
  userId             String    @map("user_id") @db.Uuid
  studyItemId        String    @map("study_item_id") @db.Uuid
  orgId              String    @map("org_id") @db.Uuid
  listenCount        Int       @default(0) @map("listen_count")
  lastPositionSeconds Float    @default(0) @map("last_position_seconds")
  lastPlaybackRate   Float     @default(1.0) @map("last_playback_rate")
  isCompleted        Boolean   @default(false) @map("is_completed")
  firstListenedAt    DateTime? @map("first_listened_at") @db.Timestamptz
  lastListenedAt     DateTime? @map("last_listened_at") @db.Timestamptz
  // Spaced repetition fields (SM-2)
  easeFactor         Float     @default(2.5) @map("ease_factor")
  intervalDays       Int       @default(1) @map("interval_days")
  nextReviewAt       DateTime? @map("next_review_at") @db.Timestamptz
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt          DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  studyItem StudyItem @relation(fields: [studyItemId], references: [id], onDelete: Cascade)

  @@unique([userId, studyItemId])
  @@index([userId, orgId])
  @@map("user_progress")
}

// =============================================================================
// USER STREAKS (daily activity tracking)
// =============================================================================

model UserStreak {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  orgId          String   @map("org_id") @db.Uuid
  date           DateTime @db.Date
  listenSeconds  Int      @default(0) @map("listen_seconds")
  itemsCompleted Int      @default(0) @map("items_completed")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId, date])
  @@index([userId, orgId])
  @@map("user_streaks")
}

// =============================================================================
// USER BOOKMARKS
// =============================================================================

model UserBookmark {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  studyItemId String   @map("study_item_id") @db.Uuid
  orgId       String   @map("org_id") @db.Uuid
  note        String?
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  studyItem StudyItem @relation(fields: [studyItemId], references: [id], onDelete: Cascade)

  @@unique([userId, studyItemId])
  @@index([userId, orgId])
  @@map("user_bookmarks")
}

// =============================================================================
// SUBSCRIPTIONS (Stripe billing)
// =============================================================================

enum SubscriptionStatus {
  trialing
  active
  past_due
  canceled
  unpaid
  incomplete

  @@map("subscription_status")
}

enum PlanTier {
  free
  individual
  team
  enterprise

  @@map("plan_tier")
}

model Subscription {
  id                   String             @id @default(uuid()) @db.Uuid
  orgId                String             @unique @map("org_id") @db.Uuid
  stripeCustomerId     String             @unique @map("stripe_customer_id")
  stripeSubscriptionId String?            @unique @map("stripe_subscription_id")
  plan                 PlanTier           @default(free)
  status               SubscriptionStatus @default(trialing)
  trialEndsAt          DateTime?          @map("trial_ends_at") @db.Timestamptz
  currentPeriodStart   DateTime?          @map("current_period_start") @db.Timestamptz
  currentPeriodEnd     DateTime?          @map("current_period_end") @db.Timestamptz
  cancelAtPeriodEnd    Boolean            @default(false) @map("cancel_at_period_end")
  maxMembers           Int                @default(1) @map("max_members")
  createdAt            DateTime           @default(now()) @map("created_at") @db.Timestamptz
  updatedAt            DateTime           @updatedAt @map("updated_at") @db.Timestamptz

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}

// =============================================================================
// INVITE TOKENS
// =============================================================================

model InviteToken {
  id         String    @id @default(uuid()) @db.Uuid
  orgId      String    @map("org_id") @db.Uuid
  email      String
  role       OrgRole   @default(member)
  token      String    @unique @default(uuid())
  invitedBy  String    @map("invited_by") @db.Uuid
  expiresAt  DateTime  @map("expires_at") @db.Timestamptz
  acceptedAt DateTime? @map("accepted_at") @db.Timestamptz
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz

  org     Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  inviter User         @relation("InviteSender", fields: [invitedBy], references: [id])

  @@index([token])
  @@index([email])
  @@map("invite_tokens")
}

// =============================================================================
// AUDIO GENERATION JOBS (tracking batch generation progress)
// =============================================================================

enum GenerationStatus {
  pending
  in_progress
  completed
  failed

  @@map("generation_status")
}

model AudioGenerationJob {
  id             String           @id @default(uuid()) @db.Uuid
  orgId          String           @map("org_id") @db.Uuid
  examId         String?          @map("exam_id") @db.Uuid
  status         GenerationStatus @default(pending)
  totalItems     Int              @default(0) @map("total_items")
  completedItems Int              @default(0) @map("completed_items")
  failedItems    Int              @default(0) @map("failed_items")
  voices         String[]         @default(["af_heart"])
  errorLog       Json             @default("[]") @map("error_log")
  startedAt      DateTime?        @map("started_at") @db.Timestamptz
  completedAt    DateTime?        @map("completed_at") @db.Timestamptz
  triggeredBy    String?          @map("triggered_by") @db.Uuid
  createdAt      DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime         @updatedAt @map("updated_at") @db.Timestamptz

  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  triggerer User?        @relation("JobTriggeredBy", fields: [triggeredBy], references: [id])

  @@index([orgId])
  @@map("audio_generation_jobs")
}
```

### RLS Policies (Supabase SQL)

RLS policies live outside of Prisma and are applied via a separate migration file run in the Supabase SQL editor. These are identical in logic to what Prisma manages structurally -- they add defense-in-depth at the database layer for any direct Supabase client access.

```sql
-- =============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_generation_jobs ENABLE ROW LEVEL SECURITY;

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

-- Content: readable by org members (published, non-archived only)
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

-- User progress, streaks, bookmarks: users can only access their own
CREATE POLICY user_progress_select ON user_progress
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_progress_insert ON user_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_progress_update ON user_progress
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_streaks_select ON user_streaks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_streaks_insert ON user_streaks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_streaks_update ON user_streaks
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_bookmarks_select ON user_bookmarks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_bookmarks_insert ON user_bookmarks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_bookmarks_delete ON user_bookmarks
  FOR DELETE USING (user_id = auth.uid());

-- Subscriptions: readable by org admins/owners
CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Invite tokens: readable by org admins/owners
CREATE POLICY invite_tokens_select ON invite_tokens
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Generation jobs: readable by org admins/owners
CREATE POLICY generation_jobs_select ON audio_generation_jobs
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Global admins can read everything
CREATE POLICY global_admin_all ON organizations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_global_admin = true)
  );
```

### Key Schema Decisions

1. **No `brandConfigs` table.** Branding is exclusively a frontend concern. The backend stores org identity (`slug`, `name`, `niche`) but nothing visual.

2. **No `domain` column on organizations.** Domain-to-org mapping is handled by the frontend deployment, not the API. The backend identifies tenants through JWT claims and org membership lookups.

3. **Audio in Supabase Storage, metadata in PostgreSQL.** try-listening stores audio in `BYTEA` columns. That does not scale for pre-generated content libraries (potentially 10-25 GB per niche). Supabase Storage is S3-compatible and serves via signed URLs.

4. **Flat four-level content hierarchy.** Exam > Topic > Section > Study Item. Four levels model any regulation structure. NEC articles map to topics, sub-articles to sections, individual code paragraphs to study items.

5. **SM-2 spaced repetition on `userProgress`.** `easeFactor`, `intervalDays`, `nextReviewAt` let us build a review queue without a separate table. Items surface when `nextReviewAt <= NOW()`.

6. **Per-org subscriptions, not per-user.** The org purchases a plan. Seat limits enforced via `subscriptions.maxMembers` checked against `orgMemberships` count.

7. **Prisma with `@@map` for snake_case.** The database uses snake_case column names (PostgreSQL convention). Prisma models use camelCase (TypeScript convention). The `@map` and `@@map` directives bridge the two without compromise.

---

## 3. Auth & Multi-tenancy

### How Authentication Works

Supabase Auth handles all identity management. The frontend uses `@supabase/ssr` for sign-up/sign-in (Google OAuth, email/password, magic link). After authentication, Supabase issues a JWT.

The NestJS backend verifies the JWT on every request using a Guard. It does NOT manage sessions, cookies, or auth state.

```
Frontend (any brand domain)
  |
  | Authorization: Bearer <supabase-jwt>
  v
NestJS
  |-- SupabaseAuthGuard: Verify JWT signature (HS256, Supabase JWT secret)
  |-- Extract user_id from JWT sub claim
  |-- OrgMembershipGuard: Look up org_memberships for that user_id
  |-- Scope all queries by org_id from URL path
```

### JWT Verification (NestJS Guard)

```typescript
// src/auth/guards/supabase-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface AuthUser {
  userId: string;
  email: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const payload = jwt.verify(token, this.config.get('SUPABASE_JWT_SECRET'), {
        algorithms: ['HS256'],
        audience: 'authenticated',
      }) as jwt.JwtPayload;

      if (!payload.sub) {
        throw new UnauthorizedException('Token missing subject');
      }

      request.user = {
        userId: payload.sub,
        email: payload.email,
      } satisfies AuthUser;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
```

### Org Membership Guard

Every org-scoped endpoint requires the user to be a member of the target org. This runs after JWT verification:

```typescript
// src/auth/guards/org-membership.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { OrgRole } from '@prisma/client';

export interface OrgContext {
  userId: string;
  email: string;
  orgId: string;
  role: OrgRole;
}

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export const MIN_ROLE_KEY = 'minRole';

@Injectable()
export class OrgMembershipGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = request.params.orgId;

    if (!user || !orgId) {
      throw new ForbiddenException('Missing user or org context');
    }

    const membership = await this.prisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId, userId: user.userId } },
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    const minRole = this.reflector.get<OrgRole>(MIN_ROLE_KEY, context.getHandler()) ?? 'member';

    if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[minRole]) {
      throw new ForbiddenException('Insufficient role');
    }

    request.orgContext = {
      userId: user.userId,
      email: user.email,
      orgId,
      role: membership.role,
    } satisfies OrgContext;

    return true;
  }
}
```

### Custom Decorators

```typescript
// src/auth/decorators/min-role.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { OrgRole } from '@prisma/client';
import { MIN_ROLE_KEY } from '../guards/org-membership.guard';

export const MinRole = (role: OrgRole) => SetMetadata(MIN_ROLE_KEY, role);

// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../guards/supabase-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);

// src/auth/decorators/org-context.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { OrgContext } from '../guards/org-membership.guard';

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrgContext => {
    return ctx.switchToHttp().getRequest().orgContext;
  },
);
```

### Global Admin Guard

```typescript
// src/auth/guards/global-admin.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GlobalAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { isGlobalAdmin: true },
    });

    if (!dbUser?.isGlobalAdmin) {
      throw new ForbiddenException('Global admin access required');
    }

    return true;
  }
}
```

### Supabase Auth Trigger (auto-create user record)

When a user signs up via Supabase Auth, a database trigger creates the corresponding `users` row:

```sql
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

### Multi-Tenancy: How Org Context Flows

1. User authenticates via Supabase on any frontend domain.
2. Frontend includes the JWT in the `Authorization` header.
3. `SupabaseAuthGuard` verifies the JWT, extracts `userId`.
4. For org-scoped endpoints (e.g., `GET /api/v1/orgs/:orgId/exams`), the `orgId` is in the URL path.
5. `OrgMembershipGuard` verifies the user belongs to that org.
6. All database queries for that request are scoped by `orgId`.

A user who belongs to multiple orgs can access each by making requests with different `orgId` values. The frontend decides which org context to show (based on domain mapping, user selection, etc.) -- the backend does not care how the frontend made that choice.

### Org Invite Flow

```
1. Admin calls POST /api/v1/orgs/:orgId/invites with { email, role }
2. Server creates invite_tokens row, returns invite URL with token
3. Frontend sends invitation email with link containing the token
4. Invited user clicks link -> redirected to sign-up/sign-in
5. After auth, frontend calls POST /api/v1/auth/accept-invite?token=xxx
6. Server validates token (not expired, not already accepted)
7. Server creates org_membership, marks token accepted_at = NOW()
```

---

## 4. API Design

### Route Map

All routes are prefixed with `/api/v1`. The backend is a standalone NestJS app.

```
PUBLIC (no auth):
  GET  /api/v1/health                                  Health check
  POST /api/v1/webhooks/stripe                         Stripe webhook handler

AUTH (JWT required):
  GET  /api/v1/me                                      Current user profile + org list
  POST /api/v1/auth/accept-invite                      Accept org invitation

ORG-SCOPED (JWT + org membership):
  GET  /api/v1/orgs                                    List user's orgs
  GET  /api/v1/orgs/:orgId                             Org details
  GET  /api/v1/orgs/:orgId/exams                       List published exams
  GET  /api/v1/orgs/:orgId/exams/:examId               Exam detail with topic/section tree
  GET  /api/v1/orgs/:orgId/exams/:examId/items         Study items (paginated, filterable)
  GET  /api/v1/orgs/:orgId/audio/:studyItemId          Get signed audio URL
  GET  /api/v1/orgs/:orgId/progress                    User's progress summary for org
  POST /api/v1/orgs/:orgId/progress                    Update progress for a study item
  GET  /api/v1/orgs/:orgId/progress/review-queue       Items due for spaced rep review
  GET  /api/v1/orgs/:orgId/streaks                     User's streak data
  GET  /api/v1/orgs/:orgId/bookmarks                   User's bookmarked items
  POST /api/v1/orgs/:orgId/bookmarks                   Add bookmark
  DELETE /api/v1/orgs/:orgId/bookmarks/:bookmarkId     Remove bookmark

ORG ADMIN (JWT + org admin/owner role):
  POST   /api/v1/orgs/:orgId/content/import            Bulk content import
  POST   /api/v1/orgs/:orgId/content/generate          Trigger audio generation
  GET    /api/v1/orgs/:orgId/content/jobs               Audio generation job status
  GET    /api/v1/orgs/:orgId/content/items              List all items (incl. unpublished)
  PUT    /api/v1/orgs/:orgId/content/items/:itemId      Update a study item
  DELETE /api/v1/orgs/:orgId/content/items/:itemId      Archive a study item
  POST   /api/v1/orgs/:orgId/invites                    Send invite
  GET    /api/v1/orgs/:orgId/invites                    List pending invites
  DELETE /api/v1/orgs/:orgId/invites/:inviteId          Revoke invite
  GET    /api/v1/orgs/:orgId/members                    List members
  PATCH  /api/v1/orgs/:orgId/members/:userId            Update member role
  DELETE /api/v1/orgs/:orgId/members/:userId            Remove member
  POST   /api/v1/orgs/:orgId/billing/checkout           Create Stripe checkout session
  POST   /api/v1/orgs/:orgId/billing/portal             Create Stripe billing portal

GLOBAL ADMIN (JWT + is_global_admin):
  POST  /api/v1/admin/orgs                             Create new org
  GET   /api/v1/admin/orgs                             List all orgs
  PATCH /api/v1/admin/orgs/:orgId                      Update org settings
```

### NestJS Module Structure

```
backend/
  src/
    main.ts                          # Bootstrap, CORS, global pipes
    app.module.ts                    # Root module
    prisma/
      prisma.module.ts               # Global PrismaService
      prisma.service.ts              # Prisma client wrapper with onModuleInit/onModuleDestroy
    config/
      config.module.ts               # ConfigModule setup
      env.validation.ts              # Zod schema for env var validation
    auth/
      auth.module.ts
      auth.controller.ts             # GET /me, POST /auth/accept-invite
      auth.service.ts
      guards/
        supabase-auth.guard.ts       # JWT verification
        org-membership.guard.ts      # Org membership + role check
        global-admin.guard.ts        # Global admin check
      decorators/
        current-user.decorator.ts    # @CurrentUser() param decorator
        org-context.decorator.ts     # @CurrentOrg() param decorator
        min-role.decorator.ts        # @MinRole('admin') method decorator
    health/
      health.module.ts
      health.controller.ts           # GET /health
    orgs/
      orgs.module.ts
      orgs.controller.ts             # GET /orgs, GET /orgs/:orgId
      orgs.service.ts
    exams/
      exams.module.ts
      exams.controller.ts            # GET /exams, GET /exams/:examId, GET /exams/:examId/items
      exams.service.ts
      dto/
        exam.dto.ts
    audio/
      audio.module.ts
      audio.controller.ts            # GET /audio/:studyItemId
      audio.service.ts               # Signed URL generation
    progress/
      progress.module.ts
      progress.controller.ts         # GET/POST /progress, GET /progress/review-queue
      progress.service.ts
      spaced-repetition.service.ts   # SM-2 algorithm
      dto/
        update-progress.dto.ts
    streaks/
      streaks.module.ts
      streaks.controller.ts          # GET /streaks
      streaks.service.ts
    bookmarks/
      bookmarks.module.ts
      bookmarks.controller.ts        # GET/POST/DELETE /bookmarks
      bookmarks.service.ts
      dto/
        create-bookmark.dto.ts
    content/
      content.module.ts
      content.controller.ts          # POST /content/import, POST /content/generate, GET /content/jobs, CRUD items
      content.service.ts             # Content import, normalization, auto-chunking
      dto/
        content-import.dto.ts
    members/
      members.module.ts
      members.controller.ts          # GET /members, PATCH /members/:userId, DELETE /members/:userId
      members.service.ts
    invites/
      invites.module.ts
      invites.controller.ts          # POST/GET/DELETE /invites
      invites.service.ts
      dto/
        create-invite.dto.ts
    billing/
      billing.module.ts
      billing.controller.ts          # POST /billing/checkout, POST /billing/portal
      billing.service.ts             # Stripe operations
      stripe-webhook.controller.ts   # POST /webhooks/stripe (no auth)
    admin/
      admin.module.ts
      admin.controller.ts            # POST/GET/PATCH /admin/orgs
      admin.service.ts
    tts/
      tts.module.ts
      tts.service.ts                 # Modal Kokoro API wrapper
    audio-generation/
      audio-generation.module.ts
      audio-generation.service.ts    # Batch generation orchestration
      voice-config.service.ts        # Niche-specific voice defaults
    shared/
      utils/
        chunker.ts                   # Text chunking (ported from try-listening)
        text-hash.ts                 # SHA-256 content hashing
      interceptors/
        logging.interceptor.ts       # Request/response logging
      pipes/
        zod-validation.pipe.ts       # Zod-based DTO validation
      filters/
        http-exception.filter.ts     # Consistent error responses
      middleware/
        rate-limiter.middleware.ts    # Token bucket (ported from try-listening)
    analytics/
      analytics.module.ts
      analytics.service.ts           # PostHog server-side event capture
  prisma/
    schema.prisma                    # Database schema
    migrations/                      # Prisma-generated migration files
    seed.ts                          # Seed script for dev data
  modal/
    kokoro_tts.py                    # Modal deployment (identical to try-listening)
  test/
    jest-e2e.json
    app.e2e-spec.ts
  package.json
  tsconfig.json
  tsconfig.build.json
  nest-cli.json
  Dockerfile
  .env.example
```

### Request/Response Patterns

Every org-scoped controller method receives verified membership context via custom decorators:

```typescript
// src/exams/exams.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { OrgMembershipGuard, OrgContext } from '../auth/guards/org-membership.guard';
import { CurrentOrg } from '../auth/decorators/org-context.decorator';
import { ExamsService } from './exams.service';

@Controller('api/v1/orgs/:orgId')
@UseGuards(SupabaseAuthGuard, OrgMembershipGuard)
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  @Get('exams')
  async listExams(@CurrentOrg() org: OrgContext) {
    return this.examsService.listPublished(org.orgId);
  }

  @Get('exams/:examId')
  async getExam(
    @CurrentOrg() org: OrgContext,
    @Param('examId') examId: string,
  ) {
    return this.examsService.getWithTopicTree(org.orgId, examId);
  }

  @Get('exams/:examId/items')
  async listItems(
    @CurrentOrg() org: OrgContext,
    @Param('examId') examId: string,
  ) {
    return this.examsService.listItems(org.orgId, examId);
  }
}
```

### Key Endpoint Details

#### `GET /api/v1/orgs/:orgId/audio/:studyItemId`

Returns a signed URL for the pre-generated audio file. The client streams directly from Supabase Storage -- the backend never proxies audio bytes.

```typescript
// Request: GET /api/v1/orgs/:orgId/audio/:studyItemId?voice=af_heart
// Response:
{
    "url": "https://xxx.supabase.co/storage/v1/object/sign/audio/...",
    "durationSeconds": 45.2,
    "voice": "af_heart",
    "format": "flac",
    "expiresIn": 3600
}
```

#### `POST /api/v1/orgs/:orgId/progress`

Updates listening progress. Called frequently during playback (debounced on client, ~every 10 seconds).

```typescript
// Request body:
{
    "studyItemId": "uuid",
    "positionSeconds": 23.5,
    "playbackRate": 1.5,
    "isCompleted": false
}

// When isCompleted transitions to true for the first time:
// 1. Increment listenCount
// 2. Recalculate spaced repetition fields (SM-2)
// 3. Upsert userStreaks for today (increment itemsCompleted, add listenSeconds)
```

#### `GET /api/v1/orgs/:orgId/progress/review-queue`

Returns study items due for spaced repetition review.

```typescript
// Response:
{
    "items": [
        {
            "studyItemId": "uuid",
            "title": "Flashover Indicators",
            "sectionTitle": "Fire Behavior",
            "topicTitle": "Fire Dynamics",
            "lastListenedAt": "2026-02-20T...",
            "listenCount": 3,
            "intervalDays": 4
        }
    ],
    "totalDue": 12,
    "nextReviewAt": "2026-02-25T08:00:00Z"
}
```

### Error Responses

All errors follow a consistent shape via a global exception filter:

```typescript
// src/shared/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const body = typeof exceptionResponse === 'string'
      ? { detail: exceptionResponse, code: 'UNKNOWN_ERROR' }
      : { detail: (exceptionResponse as any).message, code: (exceptionResponse as any).code ?? 'UNKNOWN_ERROR' };

    response.status(status).json(body);
  }
}
```

```json
{
    "detail": "Human-readable error message",
    "code": "MACHINE_READABLE_CODE"
}
```

Standard HTTP status codes: 400 (bad request), 401 (not authenticated), 403 (not authorized), 404 (not found), 422 (validation error), 429 (rate limited), 500 (internal error).

### Rate Limiting

Port try-listening's `TokenBucket` and `PerUserTokenBucket` pattern to a NestJS middleware:

```typescript
// src/shared/middleware/rate-limiter.middleware.ts
import { Injectable, NestMiddleware, HttpException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRatePerSecond: number,
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  consume(): boolean {
    this.refill();
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerSecond);
    this.lastRefill = now;
  }
}

export class PerUserTokenBucket {
  private buckets = new Map<string, { bucket: TokenBucket; lastAccess: number }>();

  constructor(
    private maxTokens: number,
    private refillRatePerSecond: number,
  ) {}

  consume(userId: string): boolean {
    let entry = this.buckets.get(userId);
    if (!entry) {
      entry = {
        bucket: new TokenBucket(this.maxTokens, this.refillRatePerSecond),
        lastAccess: Date.now(),
      };
      this.buckets.set(userId, entry);
    }
    entry.lastAccess = Date.now();
    return entry.bucket.consume();
  }

  cleanup(maxAgeMs: number) {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, entry] of this.buckets) {
      if (entry.lastAccess < cutoff) this.buckets.delete(key);
    }
  }
}
```

| Tier | Audio URL req/min | API req/min |
|------|------------------|-------------|
| Free | 30 | 60 |
| Individual | 120 | 300 |
| Team | 300 | 600 |
| Enterprise | Unlimited | Unlimited |

---

## 5. Content Pipeline

### Overview

Content flows through this pipeline:

```
Raw regulation text (PDF/document)
  -> Manual curation + structuring by content admin
  -> POST /api/v1/orgs/:orgId/content/import (structured JSON)
  -> studyItems rows in database (auto-chunked if > 3800 chars)
  -> POST /api/v1/orgs/:orgId/content/generate (triggers batch job)
  -> Modal Kokoro TTS -> audio bytes -> Supabase Storage
  -> audioFiles metadata rows in database
  -> Ready for users: GET /audio/:studyItemId returns signed URL
```

### Content Import DTOs

```typescript
// src/content/dto/content-import.dto.ts
import { z } from 'zod';

export const StudyItemImportSchema = z.object({
  title: z.string().optional(),
  textContent: z.string().max(10000),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  importance: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  tags: z.array(z.string()).default([]),
  sourceReference: z.string().optional(),
});

export const SectionImportSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  items: z.array(StudyItemImportSchema),
});

export const TopicImportSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  sections: z.array(SectionImportSchema),
});

export const ExamImportSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  sourceDocument: z.string(),
  editionYear: z.number().int(),
});

export const ContentImportSchema = z.object({
  exam: ExamImportSchema,
  topics: z.array(TopicImportSchema),
});

export type ContentImport = z.infer<typeof ContentImportSchema>;
export type StudyItemImport = z.infer<typeof StudyItemImportSchema>;
```

### Text Chunking

Ported from try-listening's `chunkText()`. If any `textContent` exceeds 3800 characters, the import service auto-chunks it into multiple study items with sequential `sortOrder`.

```typescript
// src/shared/utils/chunker.ts
export const MAX_CHUNK_SIZE = 3800;

export function chunkText(text: string, maxSize = MAX_CHUNK_SIZE): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxSize) return [trimmed];

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining) {
    if (remaining.length <= maxSize) {
      chunks.push(remaining.trim());
      break;
    }

    const window = remaining.slice(0, maxSize);

    // Try sentence boundary
    const sentenceIdx = lastSentenceBoundary(window);
    if (sentenceIdx > 0) {
      chunks.push(window.slice(0, sentenceIdx + 1).trim());
      remaining = remaining.slice(sentenceIdx + 1).trim();
      continue;
    }

    // Fall back to word boundary
    const spaceIdx = window.lastIndexOf(' ');
    if (spaceIdx > 0) {
      chunks.push(window.slice(0, spaceIdx).trim());
      remaining = remaining.slice(spaceIdx).trim();
      continue;
    }

    // Hard split (extremely rare)
    chunks.push(window);
    remaining = remaining.slice(maxSize).trim();
  }

  return chunks;
}

function lastSentenceBoundary(text: string): number {
  let lastIdx = -1;
  for (let i = 0; i < text.length; i++) {
    if ('.!?'.includes(text[i])) {
      const next = text[i + 1];
      if (next === undefined || next === ' ' || next === '\n') {
        lastIdx = i;
      }
    }
  }
  return lastIdx;
}
```

### Content Hash

```typescript
// src/shared/utils/text-hash.ts
import { createHash } from 'crypto';

/**
 * SHA-256 hash of normalized text. Used for audio cache invalidation.
 * Ported from try-listening src/lib/text-hash.ts.
 */
export function computeTextHash(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
```

### Content Versioning Strategy

Regulations update on known cycles (NEC every 3 years, FAR/AIM annually, etc.):

1. **New edition = new exam record.** Create a new `exams` row with `editionYear = 2026`. Copy the topic/section structure. Update study items that changed.
2. **Archive old edition.** Set `isArchived = true` on the old exam. Users with progress on the old edition keep their data; they just cannot access the archived exam's content through the API.
3. **Minor corrections.** Update `studyItems.textContent` in place. The `textHash` column changes, which the batch generation job detects as needing re-generation.

---

## 6. Audio Generation Pipeline

### Architecture: Batch Pre-generation

try-listening generates audio on-demand when users press play. niche-audio-prep pre-generates ALL audio at content upload time. Users never wait for TTS.

```
try-listening:       User presses play -> API -> Modal Kokoro -> return audio -> cache
niche-audio-prep:    Admin uploads content -> trigger batch -> Modal Kokoro -> Supabase Storage
                     User presses play -> GET signed URL -> stream from Supabase Storage
```

### Modal Kokoro TTS Deployment

Identical to try-listening's `modal/kokoro_tts.py`. Same model, same OpenAI-compatible API, same proxy auth. The deployment does not change -- what changes is how we call it (batch from a background job instead of on-demand from a route handler).

```python
# modal/kokoro_tts.py
# Identical to try-listening deployment.
# Key specs:
#   - GPU: T4
#   - Concurrency: 10 concurrent inputs per container
#   - Scale-down: 120s idle
#   - Min containers: 0
#   - Auth: Modal proxy auth (Modal-Key + Modal-Secret headers)
#   - Endpoint: POST /speech (OpenAI-compatible: { model, input, voice, response_format })
#   - Available voices: 28 Kokoro voices (af_*, am_*, bf_*, bm_*)
#   - Output: audio bytes (FLAC or WAV)
```

### TTS Client

```typescript
// src/tts/tts.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  constructor(private config: ConfigService) {}

  /**
   * Synthesize text to audio via Modal-hosted Kokoro TTS.
   * Ported from try-listening src/lib/tts.ts.
   */
  async synthesize(
    text: string,
    voice = 'af_heart',
    responseFormat = 'flac',
  ): Promise<Buffer> {
    const url = this.config.getOrThrow('KOKORO_TTS_URL');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Modal-Key': this.config.getOrThrow('MODAL_AUTH_KEY'),
        'Modal-Secret': this.config.getOrThrow('MODAL_AUTH_SECRET'),
      },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice,
        response_format: responseFormat,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`TTS synthesis failed: ${response.status} ${detail}`);
      throw new Error(`TTS synthesis failed: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
```

### Batch Generation Service

```typescript
// src/audio-generation/audio-generation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TtsService } from '../tts/tts.service';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

interface PendingGeneration {
  studyItemId: string;
  textContent: string;
  textHash: string;
  voice: string;
  storagePath: string;
}

@Injectable()
export class AudioGenerationService {
  private readonly logger = new Logger(AudioGenerationService.name);
  private supabase;

  constructor(
    private prisma: PrismaService,
    private tts: TtsService,
    private config: ConfigService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async findPendingGenerations(
    orgId: string,
    voices: string[],
  ): Promise<PendingGeneration[]> {
    // Raw SQL because this join + NOT EXISTS is cleaner than Prisma's generated API
    const rows = await this.prisma.$queryRaw<Array<{
      study_item_id: string;
      text_content: string;
      text_hash: string;
      exam_slug: string;
      org_slug: string;
    }>>`
      SELECT si.id as study_item_id, si.text_content, si.text_hash,
             e.slug as exam_slug, o.slug as org_slug
      FROM study_items si
      JOIN sections s ON s.id = si.section_id
      JOIN topics t ON t.id = s.topic_id
      JOIN exams e ON e.id = t.exam_id
      JOIN organizations o ON o.id = e.org_id
      WHERE e.org_id = ${orgId}::uuid AND si.is_archived = false
      AND NOT EXISTS (
        SELECT 1 FROM audio_files af
        WHERE af.study_item_id = si.id
        AND af.text_hash = si.text_hash
        AND af.voice = ANY(${voices})
        AND af.is_current = true
      )
    `;

    const jobs: PendingGeneration[] = [];
    for (const row of rows) {
      for (const voice of voices) {
        jobs.push({
          studyItemId: row.study_item_id,
          textContent: row.text_content,
          textHash: row.text_hash,
          voice,
          storagePath: `audio/${row.org_slug}/${row.exam_slug}/${row.study_item_id}/${voice}.flac`,
        });
      }
    }
    return jobs;
  }

  async generateAndUpload(job: PendingGeneration): Promise<{
    studyItemId: string;
    voice: string;
    textHash: string;
    storagePath: string;
    fileSizeBytes: number;
  }> {
    const audioBuffer = await this.tts.synthesize(job.textContent, job.voice);

    const { error } = await this.supabase.storage
      .from('audio')
      .upload(job.storagePath, audioBuffer, {
        contentType: 'audio/flac',
        upsert: true,
      });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    return {
      studyItemId: job.studyItemId,
      voice: job.voice,
      textHash: job.textHash,
      storagePath: job.storagePath,
      fileSizeBytes: audioBuffer.length,
    };
  }

  async runBatchGeneration(
    orgId: string,
    voices?: string[],
    concurrency = 5,
    jobId?: string,
  ): Promise<{ generated: number; failed: number; total: number; errors: any[] }> {
    const effectiveVoices = voices ?? ['af_heart'];
    const jobs = await this.findPendingGenerations(orgId, effectiveVoices);

    if (jobId) {
      await this.prisma.audioGenerationJob.update({
        where: { id: jobId },
        data: { status: 'in_progress', totalItems: jobs.length, startedAt: new Date() },
      });
    }

    let generated = 0;
    let failed = 0;
    const errors: any[] = [];

    // Process with concurrency limit
    const semaphore = { count: 0 };
    const results = jobs.map(async (job) => {
      while (semaphore.count >= concurrency) {
        await new Promise((r) => setTimeout(r, 50));
      }
      semaphore.count++;

      try {
        const meta = await this.generateAndUpload(job);

        // Mark old audio as non-current
        await this.prisma.audioFile.updateMany({
          where: { studyItemId: meta.studyItemId, voice: meta.voice, isCurrent: true },
          data: { isCurrent: false },
        });

        // Insert new audio_files row
        await this.prisma.audioFile.create({
          data: {
            studyItemId: meta.studyItemId,
            voice: meta.voice,
            model: 'kokoro',
            textHash: meta.textHash,
            storagePath: meta.storagePath,
            storageBucket: 'audio',
            fileSizeBytes: meta.fileSizeBytes,
            format: 'flac',
          },
        });

        generated++;

        if (jobId) {
          await this.prisma.audioGenerationJob.update({
            where: { id: jobId },
            data: { completedItems: generated },
          });
        }
      } catch (e) {
        failed++;
        errors.push({
          studyItemId: job.studyItemId,
          voice: job.voice,
          error: e instanceof Error ? e.message : String(e),
        });
      } finally {
        semaphore.count--;
      }
    });

    await Promise.all(results);

    const finalStatus = failed === 0 ? 'completed' : 'failed';
    if (jobId) {
      await this.prisma.audioGenerationJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus as any,
          failedItems: failed,
          errorLog: errors,
          completedAt: new Date(),
        },
      });
    }

    return { generated, failed, total: jobs.length, errors };
  }
}
```

### Voice Configuration

Default voices per niche, stored in `organizations.settings` JSONB:

```typescript
// src/audio-generation/voice-config.service.ts
import { Injectable } from '@nestjs/common';

const DEFAULT_VOICES: Record<string, string[]> = {
  firefighting: ['am_adam', 'af_heart'],
  electrical:   ['am_adam', 'af_heart'],
  aviation:     ['am_adam', 'af_nova'],
  cdl:          ['am_adam', 'af_heart'],
  nursing:      ['af_heart', 'am_adam'],
  plumbing:     ['am_adam', 'af_heart'],
  hvac:         ['am_adam', 'af_heart'],
  real_estate:  ['af_heart', 'am_adam'],
  insurance:    ['af_heart', 'am_adam'],
};

const FALLBACK_VOICES = ['af_heart', 'am_adam'];

@Injectable()
export class VoiceConfigService {
  getVoicesForOrg(org: { niche: string; settings: any }): string[] {
    const custom = org.settings?.voices as string[] | undefined;
    if (custom?.length) return custom;
    return DEFAULT_VOICES[org.niche] ?? FALLBACK_VOICES;
  }
}
```

### Audio Serving

Users never hit Modal directly. They get signed URLs from Supabase Storage:

```typescript
// src/audio/audio.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class AudioService {
  private supabase;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async getSignedUrl(
    orgId: string,
    studyItemId: string,
    voice = 'af_heart',
    expiresIn = 3600,
  ) {
    const audioFile = await this.prisma.audioFile.findFirst({
      where: {
        studyItemId,
        voice,
        isCurrent: true,
        studyItem: {
          section: {
            topic: {
              exam: { orgId, isPublished: true, isArchived: false },
            },
          },
        },
      },
    });

    if (!audioFile) {
      throw new NotFoundException('Audio file not found');
    }

    const { data, error } = await this.supabase.storage
      .from(audioFile.storageBucket)
      .createSignedUrl(audioFile.storagePath, expiresIn);

    if (error) throw new Error(`Failed to create signed URL: ${error.message}`);

    return {
      url: data.signedUrl,
      durationSeconds: audioFile.durationSeconds,
      voice: audioFile.voice,
      format: audioFile.format,
      expiresIn,
    };
  }
}
```

---

## 7. User Progress & Spaced Repetition

### SM-2 Algorithm

```typescript
// src/progress/spaced-repetition.service.ts
import { Injectable } from '@nestjs/common';

interface ReviewCalculation {
  easeFactor: number;
  intervalDays: number;
  nextReviewAt: Date;
}

@Injectable()
export class SpacedRepetitionService {
  /**
   * SM-2 inspired algorithm for audio study items.
   *
   * Simplified quality scoring:
   *   5 = completed listening (isCompleted=true)
   *   2 = incomplete listening (isCompleted=false)
   */
  calculateNextReview(
    currentEase: number,
    currentInterval: number,
    listenCount: number,
    isCompleted: boolean,
  ): ReviewCalculation {
    const quality = isCompleted ? 5 : 2;

    // Update ease factor
    let ease = currentEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    ease = Math.max(1.3, ease);

    // Calculate interval
    let interval: number;
    if (listenCount <= 1) {
      interval = 1;
    } else if (listenCount === 2) {
      interval = 3;
    } else {
      interval = Math.round(currentInterval * ease);
    }

    interval = Math.min(180, interval); // Cap at 6 months

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);

    return { easeFactor: ease, intervalDays: interval, nextReviewAt };
  }
}
```

### Progress Update Flow

When the client reports progress:

1. Upsert `userProgress` row for (userId, studyItemId).
2. If `isCompleted` transitions to `true` for the first time:
   a. Increment `listenCount`.
   b. Recalculate SM-2 fields via `calculateNextReview()`.
   c. Upsert `userStreaks` for today (increment `itemsCompleted`, add `listenSeconds`).
   d. Capture `study_item_listened` event to PostHog.
3. Always update `lastPositionSeconds`, `lastPlaybackRate`, `lastListenedAt`.

```typescript
// src/progress/progress.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpacedRepetitionService } from './spaced-repetition.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class ProgressService {
  constructor(
    private prisma: PrismaService,
    private spacedRep: SpacedRepetitionService,
    private analytics: AnalyticsService,
  ) {}

  async updateProgress(
    userId: string,
    orgId: string,
    data: {
      studyItemId: string;
      positionSeconds: number;
      playbackRate: number;
      isCompleted: boolean;
    },
  ) {
    const existing = await this.prisma.userProgress.findUnique({
      where: { userId_studyItemId: { userId, studyItemId: data.studyItemId } },
    });

    const isNewCompletion = data.isCompleted && (!existing || !existing.isCompleted);
    const newListenCount = isNewCompletion
      ? (existing?.listenCount ?? 0) + 1
      : (existing?.listenCount ?? 0);

    let smFields = {};
    if (isNewCompletion) {
      smFields = this.spacedRep.calculateNextReview(
        existing?.easeFactor ?? 2.5,
        existing?.intervalDays ?? 1,
        newListenCount,
        true,
      );
    }

    const progress = await this.prisma.userProgress.upsert({
      where: { userId_studyItemId: { userId, studyItemId: data.studyItemId } },
      create: {
        userId,
        studyItemId: data.studyItemId,
        orgId,
        lastPositionSeconds: data.positionSeconds,
        lastPlaybackRate: data.playbackRate,
        isCompleted: data.isCompleted,
        listenCount: isNewCompletion ? 1 : 0,
        firstListenedAt: new Date(),
        lastListenedAt: new Date(),
        ...smFields,
      },
      update: {
        lastPositionSeconds: data.positionSeconds,
        lastPlaybackRate: data.playbackRate,
        isCompleted: data.isCompleted,
        listenCount: newListenCount,
        lastListenedAt: new Date(),
        ...(isNewCompletion ? { firstListenedAt: existing?.firstListenedAt ?? new Date() } : {}),
        ...smFields,
      },
    });

    // Update streaks if completed
    if (isNewCompletion) {
      const today = new Date().toISOString().slice(0, 10);
      await this.prisma.$executeRaw`
        INSERT INTO user_streaks (id, user_id, org_id, date, items_completed, listen_seconds)
        VALUES (gen_random_uuid(), ${userId}::uuid, ${orgId}::uuid, ${today}::date, 1, ${Math.round(data.positionSeconds)})
        ON CONFLICT (user_id, org_id, date)
        DO UPDATE SET
          items_completed = user_streaks.items_completed + 1,
          listen_seconds = user_streaks.listen_seconds + ${Math.round(data.positionSeconds)},
          updated_at = NOW()
      `;

      this.analytics.capture({
        distinctId: userId,
        event: 'study_item_listened',
        properties: { orgId, studyItemId: data.studyItemId },
      });
    }

    return progress;
  }
}
```

### Review Queue

Query items where `nextReviewAt <= NOW()` for a given user and org, ordered by `nextReviewAt` ascending (most overdue first). Include item metadata (title, section, topic) for display in the client.

### Streak Calculation

Streaks are computed from `userStreaks` rows. A streak is the count of consecutive days with at least one `itemsCompleted > 0` row, ending at today (or yesterday, if the user hasn't studied today yet). The backend calculates this on-read -- no separate streak counter to keep in sync.

```typescript
// src/streaks/streaks.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StreaksService {
  constructor(private prisma: PrismaService) {}

  async getStreak(userId: string, orgId: string) {
    const rows = await this.prisma.userStreak.findMany({
      where: { userId, orgId, itemsCompleted: { gt: 0 } },
      orderBy: { date: 'desc' },
      take: 365,
      select: { date: true, listenSeconds: true, itemsCompleted: true },
    });

    if (rows.length === 0) return { currentStreak: 0, longestStreak: 0, history: [] };

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < rows.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      const rowDate = new Date(rows[i].date);
      rowDate.setHours(0, 0, 0, 0);

      if (rowDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else if (i === 0) {
        // Allow yesterday as the most recent streak day
        expectedDate.setDate(expectedDate.getDate() - 1);
        if (rowDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return { currentStreak, history: rows };
  }
}
```

---

## 8. Billing (Stripe)

### Plan Tiers

| Tier | Price | Seats | Features |
|------|-------|-------|----------|
| **Free** | $0 | 1 | 1 exam, 50 study items, no offline downloads |
| **Individual** | $14.99/mo | 1 | All exams in niche, unlimited items, offline |
| **Team** | $49.99/mo | 10 | Everything in Individual + team progress dashboard |
| **Enterprise** | Custom | Unlimited | SSO, custom content, dedicated support |

### Checkout Flow

```
1. Org admin calls POST /api/v1/orgs/:orgId/billing/checkout with { plan }
2. Server creates Stripe Checkout Session with org_id in metadata
3. Returns checkout URL -> frontend redirects user to Stripe
4. After payment, Stripe sends webhook -> POST /api/v1/webhooks/stripe
5. Webhook handler creates/updates subscriptions row
6. Stripe redirects user back to app (success_url)
```

### Webhook Handler

```typescript
// src/billing/stripe-webhook.controller.ts
import { Controller, Post, Req, Res, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Request, Response } from 'express';
import Stripe from 'stripe';

@Controller('api/v1/webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow('STRIPE_SECRET_KEY'));
  }

  @Post('stripe')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.body, // raw body -- needs express.raw() middleware on this route
        sig,
        this.config.getOrThrow('STRIPE_WEBHOOK_SECRET'),
      );
    } catch {
      throw new HttpException('Invalid signature', 400);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.org_id;
        const plan = session.metadata?.plan;
        if (orgId) {
          await this.prisma.subscription.upsert({
            where: { orgId },
            create: {
              orgId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              plan: plan as any ?? 'individual',
              status: 'active',
            },
            update: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              plan: plan as any ?? 'individual',
              status: 'active',
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: sub.status as any,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'canceled' },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await this.prisma.subscription.updateMany({
          where: { stripeCustomerId: invoice.customer as string },
          data: { status: 'past_due' },
        });
        break;
      }
    }

    res.json({ received: true });
  }
}
```

### Subscription Gating

```typescript
// src/billing/guards/subscription.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanTier } from '@prisma/client';

const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  individual: 1,
  team: 2,
  enterprise: 3,
};

export const MIN_PLAN_KEY = 'minPlan';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orgId = request.params.orgId;
    const minPlan = this.reflector.get<PlanTier>(MIN_PLAN_KEY, context.getHandler()) ?? 'free';

    const subscription = await this.prisma.subscription.findUnique({
      where: { orgId },
    });

    if (!subscription || !['active', 'trialing'].includes(subscription.status)) {
      if (minPlan === 'free') {
        request.subscription = { plan: 'free', status: 'active' };
        return true;
      }
      throw new ForbiddenException('Subscription required');
    }

    if (PLAN_HIERARCHY[subscription.plan] < PLAN_HIERARCHY[minPlan]) {
      throw new ForbiddenException(`Requires ${minPlan} plan or higher`);
    }

    request.subscription = { plan: subscription.plan, status: subscription.status };
    return true;
  }
}
```

### Free Tier Enforcement

The free tier caps are enforced at the application layer, not at Stripe:

```typescript
// Checked in content listing endpoints:
// - Free: max 1 published exam, max 50 study items accessible
// - Individual+: all exams, all items
// The enforcement is a simple count check in the exam/items query
```

---

## 9. Infrastructure & Deployment

### Services

| Service | Purpose | Est. Cost |
|---------|---------|-----------|
| **Supabase** (Pro) | Auth, PostgreSQL, Storage | $25/mo |
| **Railway or Fly.io** | NestJS container hosting | ~$5-20/mo |
| **Modal** | Kokoro TTS GPU hosting | ~$0.05/1M chars (batch only) |
| **Stripe** | Payment processing | 2.9% + $0.30/txn |
| **PostHog** (free tier) | Analytics, feature flags | $0 to start |

No Vercel for the backend. The backend is a NestJS container deployed to Railway, Fly.io, or any Docker host.

### Supabase Storage Buckets

```
audio/                    -- Pre-generated audio files (private bucket, signed URLs)
  {org_slug}/
    {exam_slug}/
      {study_item_id}/
        {voice}.flac      -- e.g., af_heart.flac, am_adam.flac
```

### Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...         # Server-only: storage writes, admin ops
SUPABASE_JWT_SECRET=your-jwt-secret      # For verifying client JWTs
DATABASE_URL=postgresql://...            # Prisma connection string

# Modal (TTS)
KOKORO_TTS_URL=https://xxx.modal.run/speech
MODAL_AUTH_KEY=xxx
MODAL_AUTH_SECRET=xxx

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PostHog
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com

# App
CORS_ORIGINS=https://firefighterprep.com,https://pilotaudioprep.com,http://localhost:3000
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
```

### CORS Configuration

The backend serves multiple frontend domains. CORS origins configured via env var:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Stripe webhook signature verification
  });

  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get('CORS_ORIGINS')?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = config.get('PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();
```

### App Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { OrgsModule } from './orgs/orgs.module';
import { ExamsModule } from './exams/exams.module';
import { AudioModule } from './audio/audio.module';
import { ProgressModule } from './progress/progress.module';
import { StreaksModule } from './streaks/streaks.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { ContentModule } from './content/content.module';
import { MembersModule } from './members/members.module';
import { InvitesModule } from './invites/invites.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { TtsModule } from './tts/tts.module';
import { AudioGenerationModule } from './audio-generation/audio-generation.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    HealthModule,
    OrgsModule,
    ExamsModule,
    AudioModule,
    ProgressModule,
    StreaksModule,
    BookmarksModule,
    ContentModule,
    MembersModule,
    InvitesModule,
    BillingModule,
    AdminModule,
    TtsModule,
    AudioGenerationModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
```

### Prisma Service

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Dockerfile

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app
COPY package.json bun.lock ./
RUN npm install --frozen-lockfile

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Dependencies

```json
// package.json (relevant deps)
{
  "name": "niche-audio-prep-backend",
  "version": "0.1.0",
  "dependencies": {
    "@nestjs/common": "^11",
    "@nestjs/config": "^4",
    "@nestjs/core": "^11",
    "@nestjs/platform-express": "^11",
    "@prisma/client": "^6",
    "@supabase/supabase-js": "^2",
    "jsonwebtoken": "^9",
    "posthog-node": "^4",
    "reflect-metadata": "^0.2",
    "rxjs": "^7",
    "stripe": "^17",
    "zod": "^3"
  },
  "devDependencies": {
    "@nestjs/cli": "^11",
    "@nestjs/schematics": "^11",
    "@nestjs/testing": "^11",
    "@types/express": "^5",
    "@types/jsonwebtoken": "^9",
    "@types/node": "^22",
    "jest": "^30",
    "prisma": "^6",
    "ts-jest": "^29",
    "typescript": "^5.7"
  }
}
```

---

## 10. Evolution from try-listening

### What We Port (keep in TypeScript)

| try-listening (TypeScript) | niche-audio-prep (TypeScript/NestJS) | Notes |
|---------------------------|--------------------------------------|-------|
| `src/lib/chunker.ts` | `src/shared/utils/chunker.ts` | Same algorithm, same language |
| `src/lib/tts.ts` (`synthesize()`) | `src/tts/tts.service.ts` | Same Modal API, NestJS service |
| `src/lib/rate-limiter.ts` (`TokenBucket`) | `src/shared/middleware/rate-limiter.middleware.ts` | Same token bucket logic |
| `src/lib/text-hash.ts` | `src/shared/utils/text-hash.ts` | Same SHA-256, use Node.js crypto instead of Web Crypto |
| `modal/kokoro_tts.py` | `modal/kokoro_tts.py` | Unchanged -- already Python |
| `src/lib/constants.ts` (voice IDs, chunk size) | `src/shared/utils/chunker.ts` + voice-config service | Split across relevant locations |

### What Changes Fundamentally

| try-listening | niche-audio-prep | Why |
|---------------|------------------|-----|
| Next.js API routes | NestJS standalone service | TypeScript end-to-end, proper module system |
| Cookie-based auth (`@supabase/ssr`) | JWT Bearer auth (Guard) | Standalone API, not SSR |
| `pg.Pool` (node-postgres) | Prisma Client | Type-safe ORM, generated types |
| Audio in `BYTEA` columns | Audio in Supabase Storage | Pre-gen content is GBs |
| User pastes URLs | Admin imports structured content | Professional exam material |
| Single-user model | Multi-tenant orgs | Orgs purchase subscriptions |
| On-demand TTS | Batch pre-generated TTS | Users never wait |
| `library_entries` (flat) | `exams > topics > sections > studyItems` | Content hierarchy |
| SHA-based entry IDs | UUID primary keys | Admin-managed, no dedup |
| Google OAuth only | Google + email/password + magic link | Broader user base |

### What We Do NOT Port

- `src/lib/extractor.ts` -- URL content extraction. Content is admin-uploaded.
- `src/lib/file-parser.ts` -- File upload parsing. Not needed.
- `src/lib/idb-audio-store.ts` -- IndexedDB client-side cache. Frontend concern.
- `src/lib/library.ts` -- Library management. Replaced by content hierarchy.
- `src/middleware.ts` -- Next.js middleware. Not applicable.
- `src/components/*` -- React components. Frontend.
- `src/hooks/*` -- React hooks. Frontend.

---

## 11. Implementation Plan

### Phase 1: Foundation

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** This spec (Sections 1-3), monorepo structure, Supabase project credentials
> - **Outputs:** NestJS scaffold, Prisma schema + initial migration, auth guards + decorators, health endpoint
> - **Dependencies:** None (first phase)

**Task 1: Project Scaffolding**
- [ ] Create `backend/` directory with NestJS scaffold (`@nestjs/cli`)
- [ ] Install deps: `@nestjs/common`, `@nestjs/config`, `@prisma/client`, `@supabase/supabase-js`, `jsonwebtoken`, `stripe`, `posthog-node`, `zod`
- [ ] Create `Dockerfile` and `.env.example`
- [ ] Set up `ConfigModule.forRoot({ isGlobal: true })` with Zod env validation
- [ ] Verify `bun run start:dev` starts and serves `GET /api/v1/health`

**Task 2: Database Layer (Prisma)**
- [ ] Create `prisma/schema.prisma` with full schema from section 2
- [ ] Create `src/prisma/prisma.module.ts` and `prisma.service.ts` (global module)
- [ ] Run `npx prisma migrate dev --name init` to generate initial migration
- [ ] Create `prisma/seed.ts` for dev data (one org, one user, sample content)
- [ ] Test: Prisma client connects, queries work, seed data loads

**Task 3: Auth & Guards**
- [ ] Create `src/auth/guards/supabase-auth.guard.ts` (JWT verification)
- [ ] Create `src/auth/guards/org-membership.guard.ts` with role hierarchy
- [ ] Create `src/auth/guards/global-admin.guard.ts`
- [ ] Create decorators: `@CurrentUser()`, `@CurrentOrg()`, `@MinRole()`
- [ ] Create Supabase auth trigger SQL for auto user record creation
- [ ] Test: valid JWT extracts userId; invalid JWT returns 401; membership check returns 403 for non-members

### Phase 2: Content Management

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Phase 1 deliverables, try-listening chunker/hash utils, content hierarchy spec (Section 5)
> - **Outputs:** Content import service, admin CRUD API, chunker + text-hash utils
> - **Dependencies:** Phase 1

**Task 4: Content Import Service**
- [ ] Create `src/shared/utils/chunker.ts` (port from try-listening)
- [ ] Create `src/shared/utils/text-hash.ts` (port from try-listening)
- [ ] Create `src/content/dto/content-import.dto.ts` with Zod schemas
- [ ] Create `src/content/content.service.ts` with normalization, auto-chunking, DB insertion
- [ ] Test: chunker splits at sentence boundaries; oversized items auto-chunked; hashes stable

**Task 5: Content Admin API**
- [ ] Create `src/content/content.controller.ts`
  - `POST /content/import` -- bulk import from JSON
  - `GET /content/jobs` -- list generation job statuses
  - `GET /content/items` -- list all items (admin view, includes unpublished)
  - `PUT /content/items/:itemId` -- update study item text/metadata
  - `DELETE /content/items/:itemId` -- archive (soft delete)
- [ ] Test: import creates correct DB structure; admin role enforced; non-admins get 403

### Phase 3: Audio Generation

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Phase 2 deliverables, try-listening TTS service, Modal Kokoro deployment, Supabase Storage config
> - **Outputs:** TTS service, batch generation pipeline, voice config, signed URL audio serving
> - **Dependencies:** Phase 2

**Task 6: TTS Client & Batch Generation**
- [ ] Create `src/tts/tts.service.ts` (port synthesize from try-listening)
- [ ] Create `src/audio-generation/audio-generation.service.ts` with `findPendingGenerations`, `generateAndUpload`, `runBatchGeneration`
- [ ] Create `src/audio-generation/voice-config.service.ts` with niche-specific defaults
- [ ] Create `src/audio/audio.service.ts` for signed URL generation
- [ ] Wire `POST /content/generate` to create job record + trigger batch in background
- [ ] Test: pending items correctly identified; generation job status tracked; audio files uploaded to Storage

### Phase 4: User-Facing API

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Phases 1-3 deliverables, API design spec (Section 4), SM-2 algorithm spec (Section 7)
> - **Outputs:** Org/exam routes, audio serving endpoint, progress tracking + SM-2, streaks + bookmarks
> - **Dependencies:** Phase 3

**Task 7: Org & Exam Routes**
- [ ] Create `src/orgs/orgs.controller.ts` -- `GET /orgs`, `GET /orgs/:orgId`
- [ ] Create `src/exams/exams.controller.ts` -- `GET /exams`, `GET /exams/:examId`, `GET /exams/:examId/items`
- [ ] Test: only published non-archived exams returned; org scoping enforced; pagination works

**Task 8: Audio Serving**
- [ ] Create `src/audio/audio.controller.ts` -- `GET /audio/:studyItemId?voice=af_heart`
- [ ] Returns signed URL + metadata (duration, format, voice)
- [ ] Test: returns valid signed URL; 404 for missing audio; voice parameter respected

**Task 9: Progress Tracking**
- [ ] Create `src/progress/spaced-repetition.service.ts` (SM-2 algorithm)
- [ ] Create `src/progress/progress.service.ts` (upsert logic, completion detection)
- [ ] Create `src/progress/progress.controller.ts` -- `GET /progress`, `POST /progress`, `GET /progress/review-queue`
- [ ] Test: SM-2 intervals correct; completion triggers streak update; review queue returns due items sorted by urgency

**Task 10: Streaks & Bookmarks**
- [ ] Create `src/streaks/streaks.service.ts` (consecutive day calculation)
- [ ] Create `src/streaks/streaks.controller.ts` -- `GET /streaks`
- [ ] Create `src/bookmarks/bookmarks.controller.ts` -- `GET`, `POST`, `DELETE`
- [ ] Test: streak count correct for consecutive days with gaps; bookmarks scoped to user+org

### Phase 5: Billing & Org Management

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Phase 4 deliverables, Stripe API keys, billing spec (Section 8), org admin spec (Section 4)
> - **Outputs:** Stripe webhook handler, checkout/portal endpoints, subscription guard, org admin + invite routes, global admin routes
> - **Dependencies:** Phase 4

**Task 11: Stripe Integration**
- [ ] Create `src/billing/stripe-webhook.controller.ts` (handle checkout.session.completed, subscription.updated/deleted, invoice.payment_failed)
- [ ] Create `src/billing/billing.service.ts` (create checkout session, create portal session)
- [ ] Create `src/billing/billing.controller.ts`: `POST /billing/checkout`, `POST /billing/portal`
- [ ] Create `src/billing/guards/subscription.guard.ts` for tier gating
- [ ] Test: webhook correctly updates subscription status for each event type; tier gating blocks downgraded features

**Task 12: Org Admin Routes**
- [ ] Create `src/members/members.controller.ts` -- list members, update role, remove member
- [ ] Create `src/invites/invites.controller.ts` -- create, list, revoke invites
- [ ] Create `src/auth/auth.controller.ts` -- `GET /me`, `POST /auth/accept-invite`
- [ ] Test: invite creation + acceptance + expiration; role updates; member removal; seat limit enforcement

**Task 13: Global Admin Routes**
- [ ] Create `src/admin/admin.controller.ts` -- `POST /admin/orgs`, `GET /admin/orgs`, `PATCH /admin/orgs/:orgId`
- [ ] Test: global_admin flag enforced; org creation with correct defaults; settings update

### Phase 6: Polish & Hardening

**Status:** Not Started

> **Agent Boundary**
> - **Skill:** `/writing-plans` → `/subagent-driven-development`
> - **Inputs:** Phases 1-5 deliverables, try-listening rate limiter, PostHog project API key
> - **Outputs:** Rate limiting middleware, PostHog analytics instrumentation, full integration test suite
> - **Dependencies:** Phase 5

**Task 14: Rate Limiting**
- [ ] Create `src/shared/middleware/rate-limiter.middleware.ts` (port TokenBucket + PerUserTokenBucket from try-listening)
- [ ] Apply as NestJS middleware, respect tier-based limits from subscription table
- [ ] Test: burst protection works; tier-based limits enforced; 429 returned with retry info

**Task 15: PostHog Integration**
- [ ] Create `src/analytics/analytics.service.ts` with server-side PostHog capture
- [ ] Instrument events: `content_imported`, `audio_batch_started`, `audio_batch_completed`, `study_item_listened`, `streak_updated`, `subscription_created`, `subscription_canceled`, `org_created`, `member_invited`, `member_joined`
- [ ] Include properties: `orgId`, `orgSlug`, `niche`, `planTier`, `userId` as appropriate

**Task 16: Integration Tests**
- [ ] Full content lifecycle: create org -> import content -> generate audio -> list exams -> get audio URL -> update progress -> check review queue
- [ ] Auth flow: invalid JWT, expired JWT, missing membership, insufficient role
- [ ] Billing flow: webhook processing for each event type, tier gating
- [ ] Edge cases: empty org, archived content, concurrent progress updates

---

## Appendix A: Supabase Storage Bucket Config

```sql
-- Run in Supabase SQL editor (not in app migrations)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', false);  -- Private bucket: signed URLs required

-- Storage RLS: authenticated users can read audio files
CREATE POLICY audio_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio'
    AND auth.role() = 'authenticated'
  );

-- Storage RLS: service role handles uploads (bypasses RLS by default)
-- This policy adds defense-in-depth for admin users
CREATE POLICY audio_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio'
    AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_global_admin = true)
  );
```

## Appendix B: Content Size Estimates

| Niche | Source Pages | Est. Study Items | Est. Audio Hours | Est. Storage |
|-------|-------------|-----------------|-----------------|-------------|
| Firefighting (NFPA 1001) | ~200 | ~500 | ~15h | ~5 GB |
| Electrical (NEC) | ~900 | ~2,000 | ~60h | ~20 GB |
| Aviation (FAR/AIM) | ~1,000 | ~2,500 | ~75h | ~25 GB |
| CDL | ~100 | ~250 | ~8h | ~3 GB |
| Per niche average | ~500 | ~1,000 | ~30h | ~10 GB |

Supabase Pro ($25/mo) includes 100 GB storage. Enough for ~10 niches before needing upgrade.

## Appendix C: PostHog Events

```typescript
// Server-side events to capture:
'content_imported'          // Admin imported content batch
'audio_batch_started'       // Batch TTS generation kicked off
'audio_batch_completed'     // Batch TTS generation finished (with success/fail counts)
'study_item_listened'       // User completed listening to an item
'streak_updated'            // User's streak changed
'subscription_created'      // New Stripe subscription
'subscription_canceled'     // Subscription canceled
'org_created'               // New org created
'member_invited'            // Invite sent
'member_joined'             // Invite accepted

// Properties on all events:
// orgId, orgSlug, niche (for org-scoped events)
// userId (for user-scoped events)
// planTier (when relevant)
```

## Appendix D: Supabase Auth Trigger

See the SQL in [Section 3: Auth & Multi-tenancy](#3-auth--multi-tenancy). Run this in the Supabase SQL editor after creating the `users` table.

## Appendix E: Shared Types Package

The monorepo includes a `packages/types` package that exports shared TypeScript types used by both the NestJS backend and the Next.js/React Native frontends. Key shared types:

```typescript
// packages/types/src/index.ts
export type { Exam, Topic, Section, StudyItem } from './content';
export type { UserProgress, ReviewQueueItem } from './progress';
export type { Organization, OrgMembership } from './orgs';
export type { SubscriptionPlan, SubscriptionStatus } from './billing';
export type { AudioUrlResponse, ProgressUpdateRequest } from './api';
```

This eliminates type duplication. When the backend adds a field to an API response, the frontend TypeScript compiler catches any consuming code that needs updating. This is the core value proposition of a TypeScript-end-to-end stack.
