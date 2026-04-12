-- Slice 2: session-based lesson pause for wrong-answer remediation loop.
-- Both columns are nullable / default-zero so existing rows keep working.

ALTER TABLE "student_concept_states"
ADD COLUMN "paused_at_session_id" TEXT;

ALTER TABLE "student_concept_states"
ADD COLUMN "session_failed_kp_attempts" INTEGER NOT NULL DEFAULT 0;
