-- CreateEnum
CREATE TYPE "course_progress_state" AS ENUM ('locked', 'unlocked', 'active', 'completed');

-- CreateTable
CREATE TABLE "academies" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "academies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_parts" (
    "id" UUID NOT NULL,
    "academy_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "academy_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy_enrollments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "academy_id" UUID NOT NULL,
    "diagnostic_completed" BOOLEAN NOT NULL DEFAULT false,
    "diagnostic_completed_at" TIMESTAMPTZ,
    "daily_xp_target" INTEGER NOT NULL DEFAULT 40,
    "total_xp_earned" INTEGER NOT NULL DEFAULT 0,
    "streak_freeze_tokens" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_course_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "status" "course_progress_state" NOT NULL DEFAULT 'locked',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_course_states_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "academy_id" UUID,
ADD COLUMN     "part_id" UUID,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "diagnostic_sessions" ADD COLUMN     "academy_id" UUID;

-- AlterTable
ALTER TABLE "xp_events" ADD COLUMN     "academy_id" UUID;

-- AlterTable
ALTER TABLE "remediations" ADD COLUMN     "academy_id" UUID;

-- Backfill academies as one-course academies.
INSERT INTO "academies" ("id", "org_id", "slug", "name", "description", "version", "created_at", "updated_at")
SELECT
    "id",
    "org_id",
    "slug",
    "name",
    "description",
    "version",
    "created_at",
    "updated_at"
FROM "courses";

-- Backfill course academy links.
UPDATE "courses"
SET "academy_id" = "id";

-- Backfill academy enrollment rows from the compatibility course enrollments.
INSERT INTO "academy_enrollments" (
    "id",
    "user_id",
    "academy_id",
    "diagnostic_completed",
    "diagnostic_completed_at",
    "daily_xp_target",
    "total_xp_earned",
    "streak_freeze_tokens",
    "created_at"
)
SELECT
    ce."id",
    ce."user_id",
    c."academy_id",
    ce."diagnostic_completed",
    ce."diagnostic_completed_at",
    ce."daily_xp_target",
    ce."total_xp_earned",
    ce."streak_freeze_tokens",
    ce."created_at"
FROM "course_enrollments" ce
JOIN "courses" c ON c."id" = ce."course_id";

-- Backfill course state rows from the compatibility course enrollments.
INSERT INTO "student_course_states" (
    "id",
    "user_id",
    "course_id",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    ce."id",
    ce."user_id",
    ce."course_id",
    'active',
    ce."created_at",
    ce."created_at"
FROM "course_enrollments" ce;

-- Backfill academy-scoped foreign keys from courses.
UPDATE "diagnostic_sessions" ds
SET "academy_id" = c."academy_id"
FROM "courses" c
WHERE ds."course_id" = c."id";

UPDATE "xp_events" xe
SET "academy_id" = c."academy_id"
FROM "courses" c
WHERE xe."course_id" = c."id";

UPDATE "remediations" r
SET "academy_id" = c."academy_id"
FROM "courses" c
WHERE r."course_id" = c."id";

-- Make academy links required after backfill.
ALTER TABLE "courses" ALTER COLUMN "academy_id" SET NOT NULL;
ALTER TABLE "diagnostic_sessions" ALTER COLUMN "academy_id" SET NOT NULL;
ALTER TABLE "xp_events" ALTER COLUMN "academy_id" SET NOT NULL;
ALTER TABLE "remediations" ALTER COLUMN "academy_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "academies_org_id_slug_key" ON "academies"("org_id", "slug");

-- CreateIndex
CREATE INDEX "academies_org_id_idx" ON "academies"("org_id");

-- CreateIndex
CREATE INDEX "academy_parts_academy_id_idx" ON "academy_parts"("academy_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_parts_academy_id_slug_key" ON "academy_parts"("academy_id", "slug");

-- CreateIndex
CREATE INDEX "academy_enrollments_user_id_idx" ON "academy_enrollments"("user_id");

-- CreateIndex
CREATE INDEX "academy_enrollments_academy_id_idx" ON "academy_enrollments"("academy_id");

-- CreateIndex
CREATE UNIQUE INDEX "academy_enrollments_user_id_academy_id_key" ON "academy_enrollments"("user_id", "academy_id");

-- CreateIndex
CREATE INDEX "student_course_states_user_id_idx" ON "student_course_states"("user_id");

-- CreateIndex
CREATE INDEX "student_course_states_course_id_idx" ON "student_course_states"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_course_states_user_id_course_id_key" ON "student_course_states"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "courses_academy_id_idx" ON "courses"("academy_id");

-- CreateIndex
CREATE INDEX "courses_part_id_idx" ON "courses"("part_id");

-- CreateIndex
CREATE INDEX "courses_academy_id_sort_order_idx" ON "courses"("academy_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "courses_academy_id_slug_key" ON "courses"("academy_id", "slug");

-- CreateIndex
CREATE INDEX "diagnostic_sessions_user_id_academy_id_idx" ON "diagnostic_sessions"("user_id", "academy_id");

-- CreateIndex
CREATE INDEX "xp_events_user_id_academy_id_created_at_idx" ON "xp_events"("user_id", "academy_id", "created_at");

-- CreateIndex
CREATE INDEX "remediations_user_id_academy_id_resolved_idx" ON "remediations"("user_id", "academy_id", "resolved");

-- AddForeignKey
ALTER TABLE "academies" ADD CONSTRAINT "academies_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_parts" ADD CONSTRAINT "academy_parts_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_enrollments" ADD CONSTRAINT "academy_enrollments_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_states" ADD CONSTRAINT "student_course_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_states" ADD CONSTRAINT "student_course_states_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "academy_parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediations" ADD CONSTRAINT "remediations_academy_id_fkey" FOREIGN KEY ("academy_id") REFERENCES "academies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the compatibility session uniqueness but make the academy boundary authoritative.
DROP INDEX IF EXISTS "diagnostic_sessions_active_unique";

-- Partial unique index: only one in_progress session per user+academy
CREATE UNIQUE INDEX "diagnostic_sessions_active_unique" ON "diagnostic_sessions" ("user_id", "academy_id") WHERE "status" = 'in_progress';
