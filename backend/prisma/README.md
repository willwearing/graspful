# Database migrations

Prisma owns the public schema, the Supabase signup trigger, and the public RLS policies. Run `bun x prisma migrate deploy` from `backend`. Do not apply a separate `supabase/migrations` directory. Previously applied Prisma migrations must remain unchanged because Prisma records their checksums.

The consolidated auth migration replaces the former Supabase SQL scripts on both new and existing Supabase databases. It can be replayed without duplicate triggers or policies. On plain PostgreSQL, it skips Supabase integration when `auth.users` is absent. Supabase must be initialized before Prisma migrations on a Supabase deployment.

The membership policy uses a function owned by the migration role to prevent recursive policy evaluation. That function has a fixed search path and reads only the current authenticated user's organization IDs. Profile updates through the Data API are limited to `display_name` and `avatar_url`; backend profile management still uses Prisma. Keep migrations owned by the database owner. Do not grant that role to application users.

## Organization relation rollout

The organization relation migration validates existing `org_id` values in `user_progress`, `user_streaks`, `user_bookmarks`, `concepts`, and `diagnostic_sessions`. It aborts atomically if any referenced organization is absent and preserves all data. If it fails, inspect the named table, restore the referenced organization or correct the reference after review, mark the failed migration rolled back with `prisma migrate resolve --rolled-back 20260924130000_add_org_relations_and_leaderboard_indexes`, then retry deployment. Never delete historical learner rows just to pass validation.

The separate schema alignment migration enforces the existing Prisma `User.email` uniqueness contract. It aborts if historical duplicate email addresses exist, preserves those accounts, and requires reviewed identity repair before retrying. It also removes a redundant token index and aligns the CLI auth session timestamp default.

The added relations cascade on organization deletion, consistent with the rest of the tenant model. They enforce that an organization exists. They do not enforce that every related course and content row belongs to the same organization; the backend guards and query scopes enforce that requirement.

The migration creates normal PostgreSQL indexes and takes write locks during index creation and constraint validation. Review row counts and schedule an appropriate deployment window before running it on a large database. No production migration is executed as part of this cleanup.

## Migration regression tests

Start an isolated local PostgreSQL server, then run from the repository root:

```sh
MIGRATION_TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  bun test backend/prisma/__tests__/migrations.test.ts
```

The suite requires `psql` and a local database owner account. It creates randomly named databases and drops only those databases after testing. It rejects remote hosts. It tests the historical migration chain, orphan rejection, preserved records, new foreign keys and leaderboard indexes, repeatable auth setup, RLS tenant isolation, restricted profile updates, and plain PostgreSQL compatibility. CI runs this suite against its isolated Supabase database server.

## Proposal: retire legacy tables and use brand organization IDs

Status: proposal only, requires Will's decision. The cleanup does not drop tables, change brand identity, or remove existing records.

1. Audit reads, writes, exports, and retained data for `UserProgress`, `UserBookmark`, and `InviteToken`. Confirm whether any supported clients still need those records. Record table counts and the latest write times in the target environment.
2. Map any required legacy `Exam`, `Topic`, `Section`, and `StudyItem` content to the academy/course/concept model. Include `AudioFile`, `AudioGenerationJob.examId`, and `Concept.studyItemId` consumers in that audit. Agree on an archive/export and retention policy before considering a drop.
3. Introduce a nullable `Brand.orgId` FK while preserving `orgSlug`. Backfill it by exact matching against `Organization.slug`, report unmatched rows, and require a reviewed resolution for each. Keep the existing slug response contract while clients migrate.
4. Ship dual reads and writes, check that both identity fields stay consistent, then make `orgId` required in a later migration. Remove `orgSlug` only after all supported readers use the FK and a rollback window has passed.
5. Disable writes to retired tables before a separate, approved removal release. Capture a tested restore procedure and a backup/export first. Keep removal migrations separate from the additive schema cleanup.

Acceptance criteria for a later implementation: no unmatched brands; no unaccounted active readers or writers; preserved learner state and audio references; tenant isolation tests for brand lookup and organization rename/deletion; verified rollback and restore; explicit approval of retention and table removal.
