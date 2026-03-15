-- CreateEnum
CREATE TYPE "diagnostic_session_status" AS ENUM ('in_progress', 'completed', 'abandoned');

-- CreateTable
CREATE TABLE "diagnostic_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "status" "diagnostic_session_status" NOT NULL DEFAULT 'in_progress',
    "question_count" INTEGER NOT NULL DEFAULT 0,
    "current_problem_id" UUID,
    "current_concept_id" UUID,
    "responses" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "diagnostic_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_mastery_snapshots" (
    "id" UUID NOT NULL,
    "diagnostic_session_id" UUID NOT NULL,
    "concept_id" UUID NOT NULL,
    "p_l" DOUBLE PRECISION NOT NULL,
    "tested" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "diagnostic_mastery_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnostic_sessions_user_id_course_id_idx" ON "diagnostic_sessions"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "diagnostic_mastery_snapshots_diagnostic_session_id_idx" ON "diagnostic_mastery_snapshots"("diagnostic_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_mastery_snapshots_diagnostic_session_id_concept__key" ON "diagnostic_mastery_snapshots"("diagnostic_session_id", "concept_id");

-- AddForeignKey
ALTER TABLE "diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_current_problem_id_fkey" FOREIGN KEY ("current_problem_id") REFERENCES "problems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_mastery_snapshots" ADD CONSTRAINT "diagnostic_mastery_snapshots_diagnostic_session_id_fkey" FOREIGN KEY ("diagnostic_session_id") REFERENCES "diagnostic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: only one in_progress session per user+course
CREATE UNIQUE INDEX "diagnostic_sessions_active_unique" ON "diagnostic_sessions" ("user_id", "course_id") WHERE "status" = 'in_progress';
