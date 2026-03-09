-- =============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_generation_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (id = auth.uid());

-- Org memberships: users can see memberships for orgs they belong to
CREATE POLICY memberships_select ON org_memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  );

-- Organizations: users can see orgs they belong to
CREATE POLICY orgs_select ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
  );

-- Content: readable by org members (published, non-archived only)
CREATE POLICY exams_select ON exams
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
    AND is_published = true
    AND is_archived = false
  );

CREATE POLICY topics_select ON topics
  FOR SELECT USING (
    exam_id IN (
      SELECT id FROM exams
      WHERE org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
      AND is_published = true AND is_archived = false
    )
    AND is_archived = false
  );

CREATE POLICY sections_select ON sections
  FOR SELECT USING (
    topic_id IN (
      SELECT t.id FROM topics t
      JOIN exams e ON e.id = t.exam_id
      WHERE e.org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
      AND e.is_published = true AND e.is_archived = false
      AND t.is_archived = false
    )
    AND is_archived = false
  );

CREATE POLICY study_items_select ON study_items
  FOR SELECT USING (
    section_id IN (
      SELECT s.id FROM sections s
      JOIN topics t ON t.id = s.topic_id
      JOIN exams e ON e.id = t.exam_id
      WHERE e.org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
      AND e.is_published = true AND e.is_archived = false
      AND t.is_archived = false AND s.is_archived = false
    )
    AND is_archived = false
  );

-- Audio files: readable if the study item is readable
CREATE POLICY audio_files_select ON audio_files
  FOR SELECT USING (
    study_item_id IN (
      SELECT si.id FROM study_items si
      JOIN sections s ON s.id = si.section_id
      JOIN topics t ON t.id = s.topic_id
      JOIN exams e ON e.id = t.exam_id
      WHERE e.org_id IN (SELECT org_id FROM org_memberships WHERE user_id = auth.uid())
      AND e.is_published = true
    )
    AND is_current = true
  );

-- User progress, streaks, bookmarks: users can only access their own
CREATE POLICY user_progress_select ON user_progress
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_progress_insert ON user_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_progress_update ON user_progress
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_streaks_select ON user_streaks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_streaks_insert ON user_streaks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_streaks_update ON user_streaks
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_bookmarks_select ON user_bookmarks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY user_bookmarks_insert ON user_bookmarks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY user_bookmarks_delete ON user_bookmarks
  FOR DELETE USING (user_id = auth.uid());

-- Subscriptions: readable by org admins/owners
CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Invite tokens: readable by org admins/owners
CREATE POLICY invite_tokens_select ON invite_tokens
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Generation jobs: readable by org admins/owners
CREATE POLICY generation_jobs_select ON audio_generation_jobs
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_memberships
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Global admins can read everything (applied to organizations as representative table)
CREATE POLICY global_admin_all ON organizations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_global_admin = true)
  );
