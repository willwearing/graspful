-- Persist lesson submission results in the same transaction as their scoring effects.
ALTER TABLE "problem_attempts" ADD COLUMN "submission_receipt" JSONB;
