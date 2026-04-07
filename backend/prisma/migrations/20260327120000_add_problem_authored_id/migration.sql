-- No-op: this migration is superseded by 20260327111500_add_problem_authored_identity
-- which already adds authored_id, the unique constraint, and is_archived with IF NOT EXISTS guards.
SELECT 1;
