-- Slice 3: track first & last failure session id per student+KP so the
-- KPPlateauDetector can require multi-session failures before triggering
-- key-prerequisite remediation.

ALTER TABLE "student_kp_states"
ADD COLUMN "first_failed_session_id" TEXT;

ALTER TABLE "student_kp_states"
ADD COLUMN "last_failed_session_id" TEXT;
