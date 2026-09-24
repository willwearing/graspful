-- Prisma owns both the public schema and its Supabase integration.
-- This migration can be replayed on databases that used the former SQL files.
-- Plain PostgreSQL remains supported without creating a substitute auth system.
DO $migration$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'Supabase auth.users is absent; skipping Supabase auth integration';
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
  BEGIN
    INSERT INTO public.users (id, email, display_name, avatar_url, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'avatar_url',
      now()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END;
  $function$;

  REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- Use the table owner's view of memberships to avoid recursive RLS policies.
  -- The caller supplies no user ID and can only list their own organizations.
  CREATE OR REPLACE FUNCTION public.current_user_org_ids()
  RETURNS SETOF uuid
  LANGUAGE sql STABLE
  SECURITY DEFINER
  SET search_path = ''
  AS $function$
    SELECT membership.org_id FROM public.org_memberships membership WHERE membership.user_id = auth.uid()
  $function$;
  REVOKE ALL ON FUNCTION public.current_user_org_ids() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.current_user_org_ids() TO authenticated;

  -- RLS controls rows. Column grants also prevent self-service privilege changes.
  REVOKE UPDATE ON public.users FROM PUBLIC, anon, authenticated;
  REVOKE UPDATE (id, email, display_name, avatar_url, is_global_admin, created_at, updated_at)
    ON public.users FROM PUBLIC, anon, authenticated;
  GRANT UPDATE (display_name, avatar_url) ON public.users TO authenticated;

  -- Users can read their own profile
  DROP POLICY IF EXISTS users_select_own ON public.users;
  CREATE POLICY users_select_own ON public.users
    FOR SELECT TO authenticated USING (id = auth.uid());

  DROP POLICY IF EXISTS users_update_own ON public.users;
  CREATE POLICY users_update_own ON public.users
    FOR UPDATE TO authenticated USING (id = auth.uid());

  -- Org memberships: users can see memberships for orgs they belong to
  DROP POLICY IF EXISTS memberships_select ON public.org_memberships;
  CREATE POLICY memberships_select ON public.org_memberships
    FOR SELECT TO authenticated USING (
      user_id = auth.uid()
      OR org_id IN (SELECT public.current_user_org_ids())
    );

  -- Organizations: users can see orgs they belong to
  DROP POLICY IF EXISTS orgs_select ON public.organizations;
  CREATE POLICY orgs_select ON public.organizations
    FOR SELECT TO authenticated USING (
      id IN (SELECT public.current_user_org_ids())
    );

  -- Content: readable by org members (published, non-archived only)
  DROP POLICY IF EXISTS exams_select ON public.exams;
  CREATE POLICY exams_select ON public.exams
    FOR SELECT TO authenticated USING (
      org_id IN (SELECT public.current_user_org_ids())
      AND is_published = true
      AND is_archived = false
    );

  DROP POLICY IF EXISTS topics_select ON public.topics;
  CREATE POLICY topics_select ON public.topics
    FOR SELECT TO authenticated USING (
      exam_id IN (
        SELECT id FROM public.exams
        WHERE org_id IN (SELECT public.current_user_org_ids())
        AND is_published = true AND is_archived = false
      )
      AND is_archived = false
    );

  DROP POLICY IF EXISTS sections_select ON public.sections;
  CREATE POLICY sections_select ON public.sections
    FOR SELECT TO authenticated USING (
      topic_id IN (
        SELECT t.id FROM public.topics t
        JOIN public.exams e ON e.id = t.exam_id
        WHERE e.org_id IN (SELECT public.current_user_org_ids())
        AND e.is_published = true AND e.is_archived = false
        AND t.is_archived = false
      )
      AND is_archived = false
    );

  DROP POLICY IF EXISTS study_items_select ON public.study_items;
  CREATE POLICY study_items_select ON public.study_items
    FOR SELECT TO authenticated USING (
      section_id IN (
        SELECT s.id FROM public.sections s
        JOIN public.topics t ON t.id = s.topic_id
        JOIN public.exams e ON e.id = t.exam_id
        WHERE e.org_id IN (SELECT public.current_user_org_ids())
        AND e.is_published = true AND e.is_archived = false
        AND t.is_archived = false AND s.is_archived = false
      )
      AND is_archived = false
    );

  -- Audio files: readable if the study item is readable
  DROP POLICY IF EXISTS audio_files_select ON public.audio_files;
  CREATE POLICY audio_files_select ON public.audio_files
    FOR SELECT TO authenticated USING (
      study_item_id IN (
        SELECT si.id FROM public.study_items si
        JOIN public.sections s ON s.id = si.section_id
        JOIN public.topics t ON t.id = s.topic_id
        JOIN public.exams e ON e.id = t.exam_id
        WHERE e.org_id IN (SELECT public.current_user_org_ids())
        AND e.is_published = true
      )
      AND is_current = true
    );

  -- User progress, streaks, bookmarks: users can only access their own
  DROP POLICY IF EXISTS user_progress_select ON public.user_progress;
  CREATE POLICY user_progress_select ON public.user_progress
    FOR SELECT TO authenticated USING (user_id = auth.uid());
  DROP POLICY IF EXISTS user_progress_insert ON public.user_progress;
  CREATE POLICY user_progress_insert ON public.user_progress
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  DROP POLICY IF EXISTS user_progress_update ON public.user_progress;
  CREATE POLICY user_progress_update ON public.user_progress
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

  DROP POLICY IF EXISTS user_streaks_select ON public.user_streaks;
  CREATE POLICY user_streaks_select ON public.user_streaks
    FOR SELECT TO authenticated USING (user_id = auth.uid());
  DROP POLICY IF EXISTS user_streaks_insert ON public.user_streaks;
  CREATE POLICY user_streaks_insert ON public.user_streaks
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  DROP POLICY IF EXISTS user_streaks_update ON public.user_streaks;
  CREATE POLICY user_streaks_update ON public.user_streaks
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

  DROP POLICY IF EXISTS user_bookmarks_select ON public.user_bookmarks;
  CREATE POLICY user_bookmarks_select ON public.user_bookmarks
    FOR SELECT TO authenticated USING (user_id = auth.uid());
  DROP POLICY IF EXISTS user_bookmarks_insert ON public.user_bookmarks;
  CREATE POLICY user_bookmarks_insert ON public.user_bookmarks
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  DROP POLICY IF EXISTS user_bookmarks_delete ON public.user_bookmarks;
  CREATE POLICY user_bookmarks_delete ON public.user_bookmarks
    FOR DELETE TO authenticated USING (user_id = auth.uid());

  -- Subscriptions: readable by org admins/owners
  DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
  CREATE POLICY subscriptions_select ON public.subscriptions
    FOR SELECT TO authenticated USING (
      org_id IN (
        SELECT org_id FROM public.org_memberships
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    );

  -- Invite tokens: readable by org admins/owners
  DROP POLICY IF EXISTS invite_tokens_select ON public.invite_tokens;
  CREATE POLICY invite_tokens_select ON public.invite_tokens
    FOR SELECT TO authenticated USING (
      org_id IN (
        SELECT org_id FROM public.org_memberships
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    );

  -- Generation jobs: readable by org admins/owners
  DROP POLICY IF EXISTS generation_jobs_select ON public.audio_generation_jobs;
  CREATE POLICY generation_jobs_select ON public.audio_generation_jobs
    FOR SELECT TO authenticated USING (
      org_id IN (
        SELECT org_id FROM public.org_memberships
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    );

  -- Preserve the existing global admin policy for organizations
  DROP POLICY IF EXISTS global_admin_all ON public.organizations;
  CREATE POLICY global_admin_all ON public.organizations
    FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_global_admin = true)
    );
END
$migration$;
