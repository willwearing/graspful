BEGIN;

-- Fail before changing the schema if historical rows have orphaned org IDs.
-- Keep the rows intact so an operator can determine the correct organization.
DO $$
DECLARE
  table_name text;
  orphan_count bigint;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'user_progress', 'user_streaks', 'user_bookmarks', 'concepts', 'diagnostic_sessions'
  ] LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I child LEFT JOIN public.organizations parent ON parent.id = child.org_id WHERE parent.id IS NULL',
      table_name
    ) INTO orphan_count;
    IF orphan_count > 0 THEN
      RAISE EXCEPTION 'Cannot add organization relation: % contains % orphaned org_id values', table_name, orphan_count
        USING HINT = 'Restore the referenced organization or correct the org_id after review, then retry the migration. No rows were removed.';
    END IF;
  END LOOP;
END $$;

CREATE INDEX "xp_events_academy_id_created_at_idx" ON "xp_events"("academy_id", "created_at");
CREATE INDEX "xp_events_course_id_created_at_idx" ON "xp_events"("course_id", "created_at");
CREATE INDEX "user_progress_org_id_idx" ON "user_progress"("org_id");
CREATE INDEX "user_streaks_org_id_idx" ON "user_streaks"("org_id");
CREATE INDEX "user_bookmarks_org_id_idx" ON "user_bookmarks"("org_id");
CREATE INDEX "diagnostic_sessions_org_id_idx" ON "diagnostic_sessions"("org_id");

ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
