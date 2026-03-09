-- CreateEnum
CREATE TYPE "mastery_state" AS ENUM ('unstarted', 'in_progress', 'mastered', 'needs_review');

-- CreateEnum
CREATE TYPE "diagnostic_state" AS ENUM ('unknown', 'mastered', 'partially_known', 'conditionally_mastered');

-- CreateTable
CREATE TABLE "course_enrollments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "diagnostic_completed" BOOLEAN NOT NULL DEFAULT false,
    "diagnostic_completed_at" TIMESTAMPTZ,
    "daily_xp_target" INTEGER NOT NULL DEFAULT 40,
    "total_xp_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_concept_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "concept_id" UUID NOT NULL,
    "mastery_state" "mastery_state" NOT NULL DEFAULT 'unstarted',
    "rep_num" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memory" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "last_practiced_at" TIMESTAMPTZ,
    "interval" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "ability_theta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "speed_rd" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "observation_count" INTEGER NOT NULL DEFAULT 0,
    "implicit_credit_ratio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "diagnostic_state" "diagnostic_state" NOT NULL DEFAULT 'unknown',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_concept_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_kp_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "knowledge_point_id" UUID NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consecutive_correct" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "student_kp_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "problem_id" UUID NOT NULL,
    "answer" JSONB NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "response_time_ms" INTEGER NOT NULL,
    "xp_awarded" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_enrollments_user_id_idx" ON "course_enrollments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_user_id_course_id_key" ON "course_enrollments"("user_id", "course_id");

-- CreateIndex
CREATE INDEX "student_concept_states_user_id_idx" ON "student_concept_states"("user_id");

-- CreateIndex
CREATE INDEX "student_concept_states_user_id_mastery_state_idx" ON "student_concept_states"("user_id", "mastery_state");

-- CreateIndex
CREATE UNIQUE INDEX "student_concept_states_user_id_concept_id_key" ON "student_concept_states"("user_id", "concept_id");

-- CreateIndex
CREATE INDEX "student_kp_states_user_id_idx" ON "student_kp_states"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_kp_states_user_id_knowledge_point_id_key" ON "student_kp_states"("user_id", "knowledge_point_id");

-- CreateIndex
CREATE INDEX "problem_attempts_user_id_problem_id_idx" ON "problem_attempts"("user_id", "problem_id");

-- CreateIndex
CREATE INDEX "problem_attempts_user_id_created_at_idx" ON "problem_attempts"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_concept_states" ADD CONSTRAINT "student_concept_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_concept_states" ADD CONSTRAINT "student_concept_states_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_kp_states" ADD CONSTRAINT "student_kp_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_kp_states" ADD CONSTRAINT "student_kp_states_knowledge_point_id_fkey" FOREIGN KEY ("knowledge_point_id") REFERENCES "knowledge_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_attempts" ADD CONSTRAINT "problem_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_attempts" ADD CONSTRAINT "problem_attempts_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
