-- CreateEnum
CREATE TYPE "xp_source" AS ENUM ('lesson', 'review', 'quiz', 'remediation', 'bonus');

-- AlterTable
ALTER TABLE "course_enrollments" ADD COLUMN     "streak_freeze_tokens" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "user_streaks" ADD COLUMN     "xp_earned" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "xp_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "source" "xp_source" NOT NULL,
    "amount" INTEGER NOT NULL,
    "concept_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "xp_events_user_id_course_id_created_at_idx" ON "xp_events"("user_id", "course_id", "created_at");

-- CreateIndex
CREATE INDEX "xp_events_user_id_created_at_idx" ON "xp_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_events" ADD CONSTRAINT "xp_events_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
