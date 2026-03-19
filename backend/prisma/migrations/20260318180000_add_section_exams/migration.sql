CREATE TYPE "section_mastery_state" AS ENUM (
  'locked',
  'lesson_in_progress',
  'exam_ready',
  'certified',
  'needs_review'
);

CREATE TYPE "exam_session_status" AS ENUM (
  'in_progress',
  'completed',
  'expired'
);

ALTER TABLE "course_sections"
ADD COLUMN "section_exam_config" JSONB;

CREATE TABLE "student_section_states" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "course_id" UUID NOT NULL,
  "section_id" UUID NOT NULL,
  "status" "section_mastery_state" NOT NULL DEFAULT 'locked',
  "exam_passed_at" TIMESTAMPTZ,
  "last_exam_attempt_at" TIMESTAMPTZ,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "student_section_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "section_exam_sessions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "course_id" UUID NOT NULL,
  "section_id" UUID NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "status" "exam_session_status" NOT NULL DEFAULT 'in_progress',
  "score" DOUBLE PRECISION,
  "passed" BOOLEAN,
  "time_limit_ms" INTEGER,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "section_exam_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "section_exam_questions" (
  "id" UUID NOT NULL,
  "session_id" UUID NOT NULL,
  "problem_id" UUID NOT NULL,
  "concept_id" UUID NOT NULL,
  "sort_order" INTEGER NOT NULL,
  "response" JSONB,
  "correct" BOOLEAN,
  "response_time_ms" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "section_exam_questions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_section_states_user_id_section_id_key"
ON "student_section_states"("user_id", "section_id");

CREATE INDEX "student_section_states_user_id_course_id_idx"
ON "student_section_states"("user_id", "course_id");

CREATE INDEX "student_section_states_course_id_section_id_idx"
ON "student_section_states"("course_id", "section_id");

CREATE INDEX "section_exam_sessions_user_id_course_id_section_id_idx"
ON "section_exam_sessions"("user_id", "course_id", "section_id");

CREATE UNIQUE INDEX "section_exam_questions_session_id_problem_id_key"
ON "section_exam_questions"("session_id", "problem_id");

CREATE INDEX "section_exam_questions_session_id_sort_order_idx"
ON "section_exam_questions"("session_id", "sort_order");

ALTER TABLE "student_section_states"
ADD CONSTRAINT "student_section_states_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_section_states"
ADD CONSTRAINT "student_section_states_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_section_states"
ADD CONSTRAINT "student_section_states_section_id_fkey"
FOREIGN KEY ("section_id") REFERENCES "course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_exam_sessions"
ADD CONSTRAINT "section_exam_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_exam_sessions"
ADD CONSTRAINT "section_exam_sessions_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_exam_sessions"
ADD CONSTRAINT "section_exam_sessions_section_id_fkey"
FOREIGN KEY ("section_id") REFERENCES "course_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_exam_questions"
ADD CONSTRAINT "section_exam_questions_session_id_fkey"
FOREIGN KEY ("session_id") REFERENCES "section_exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_exam_questions"
ADD CONSTRAINT "section_exam_questions_problem_id_fkey"
FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "section_exam_questions"
ADD CONSTRAINT "section_exam_questions_concept_id_fkey"
FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
