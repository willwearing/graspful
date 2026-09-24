import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const connection = process.env.MIGRATION_TEST_DATABASE_URL;
const migrationsDir = join(import.meta.dir, '../migrations');
const relationMigration = '20260924130000_add_org_relations_and_leaderboard_indexes';
const authMigration = '20260924140000_consolidate_auth_and_policies';
const alignmentMigration = '20260924150000_align_existing_schema';
const orgId = '10000000-0000-4000-8000-000000000001';
const otherOrgId = '10000000-0000-4000-8000-000000000002';
const userId = '20000000-0000-4000-8000-000000000001';
const peerId = '20000000-0000-4000-8000-000000000002';
const outsiderId = '20000000-0000-4000-8000-000000000003';
const academyId = '30000000-0000-4000-8000-000000000001';
const courseId = '40000000-0000-4000-8000-000000000001';
const examId = '50000000-0000-4000-8000-000000000001';
const topicId = '60000000-0000-4000-8000-000000000001';
const sectionId = '70000000-0000-4000-8000-000000000001';
const studyItemId = '80000000-0000-4000-8000-000000000001';
const orgTables = ['user_progress', 'user_streaks', 'user_bookmarks', 'concepts', 'diagnostic_sessions'];

// The suite creates its own databases. Never accept a remote database server.
function localConnection(value: string): URL {
  const parsed = new URL(value);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
    throw new Error('Migration tests require a local PostgreSQL server');
  }
  return parsed;
}

function query(url: string, sql: string, allowFailure = false) {
  const result = spawnSync('psql', ['-X', '-q', '-A', '-t', '--dbname', url, '--set', 'ON_ERROR_STOP=1'], {
    input: sql,
    encoding: 'utf8',
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(result.stderr || result.error?.message || 'psql failed');
  }
  return { status: result.status, output: result.stdout.trim(), error: result.stderr };
}

function migration(name: string) {
  return readFileSync(join(migrationsDir, name, 'migration.sql'), 'utf8');
}

function asUser(sql: string, id = userId, role = 'authenticated') {
  return `BEGIN; SET LOCAL ROLE ${role}; SET LOCAL request.jwt.claim.sub = '${id}'; ${sql}; ROLLBACK;`;
}

const suite = connection ? describe : describe.skip;
suite('Prisma migration integration', () => {
  let adminUrl: string;
  let databaseUrl: string;
  let bareDatabaseUrl: string;
  const databaseNames: string[] = [];

  function createDatabase() {
    const name = `graspful_migrations_${randomUUID().replaceAll('-', '')}`;
    query(adminUrl, `CREATE DATABASE "${name}"`);
    databaseNames.push(name);
    const url = new URL(adminUrl);
    url.pathname = `/${name}`;
    return url.toString();
  }

  beforeAll(() => {
    adminUrl = localConnection(connection!).toString();
    databaseUrl = createDatabase();
    bareDatabaseUrl = createDatabase();
    query(databaseUrl, `
      CREATE SCHEMA auth;
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
      END $$;
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
    `);
    const historical = readdirSync(migrationsDir).filter(name => name < relationMigration && /^\d/.test(name)).sort();
    const schema = historical.map(migration).join('\n');
    query(databaseUrl, schema);
    query(bareDatabaseUrl, schema);
    query(databaseUrl, `
      INSERT INTO public.organizations (id, slug, name, niche, updated_at) VALUES
        ('${orgId}', 'first', 'First', 'tech', now()),
        ('${otherOrgId}', 'other', 'Other', 'tech', now());
      INSERT INTO public.users (id, email, updated_at) VALUES
        ('${userId}', 'first@example.test', now()),
        ('${peerId}', 'peer@example.test', now()),
        ('${outsiderId}', 'outsider@example.test', now());
      INSERT INTO public.org_memberships (id, org_id, user_id, updated_at) VALUES
        (gen_random_uuid(), '${orgId}', '${userId}', now()),
        (gen_random_uuid(), '${orgId}', '${peerId}', now()),
        (gen_random_uuid(), '${otherOrgId}', '${outsiderId}', now());
      INSERT INTO public.user_streaks (id, user_id, org_id, date, xp_earned, updated_at)
        VALUES (gen_random_uuid(), '${userId}', '${orgId}', current_date, 25, now());
      INSERT INTO public.academies (id, org_id, slug, name, updated_at)
        VALUES ('${academyId}', '${orgId}', 'fixture', 'Fixture', now());
      INSERT INTO public.courses (id, org_id, academy_id, slug, name, updated_at)
        VALUES ('${courseId}', '${orgId}', '${academyId}', 'fixture', 'Fixture', now());
      INSERT INTO public.concepts (id, org_id, course_id, slug, name, updated_at)
        VALUES (gen_random_uuid(), '${orgId}', '${courseId}', 'fixture', 'Fixture', now());
      INSERT INTO public.diagnostic_sessions (id, org_id, user_id, course_id, academy_id, updated_at)
        VALUES (gen_random_uuid(), '${orgId}', '${userId}', '${courseId}', '${academyId}', now());
      INSERT INTO public.exams (id, org_id, slug, title, is_published, updated_at)
        VALUES ('${examId}', '${orgId}', 'fixture', 'Fixture', true, now());
      INSERT INTO public.topics (id, exam_id, slug, title, updated_at)
        VALUES ('${topicId}', '${examId}', 'fixture', 'Fixture', now());
      INSERT INTO public.sections (id, topic_id, slug, title, updated_at)
        VALUES ('${sectionId}', '${topicId}', 'fixture', 'Fixture', now());
      INSERT INTO public.study_items (id, section_id, text_content, text_hash, char_count, updated_at)
        VALUES ('${studyItemId}', '${sectionId}', 'Fixture', 'fixture', 7, now());
      INSERT INTO public.user_progress (id, user_id, org_id, study_item_id, updated_at)
        VALUES (gen_random_uuid(), '${userId}', '${orgId}', '${studyItemId}', now());
      INSERT INTO public.user_bookmarks (id, user_id, org_id, study_item_id)
        VALUES (gen_random_uuid(), '${userId}', '${orgId}', '${studyItemId}');
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
      CREATE POLICY users_select_own ON public.users FOR SELECT USING (id = auth.uid());
      CREATE POLICY memberships_select ON public.org_memberships FOR SELECT USING (
        user_id = auth.uid() OR org_id IN (SELECT org_id FROM public.org_memberships WHERE user_id = auth.uid())
      );
      CREATE POLICY users_update_own ON public.users FOR UPDATE USING (id = auth.uid());
    `);
  }, 60_000);

  afterAll(() => {
    for (const name of databaseNames) {
      query(adminUrl, `DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    }
  });

  test('rejects each orphaned organization reference atomically and retains the data', () => {
    for (const table of orgTables) {
      query(databaseUrl, `UPDATE public.${table} SET org_id = '10000000-0000-4000-8000-000000000099'`);
      const result = query(databaseUrl, migration(relationMigration), true);
      expect(result.status).not.toBe(0);
      expect(result.error).toContain(table);
      expect(query(databaseUrl, `SELECT count(*) FROM public.${table} WHERE org_id = '10000000-0000-4000-8000-000000000099'`).output).toBe('1');
      expect(query(databaseUrl, `SELECT count(*) FROM pg_constraint WHERE conname = '${table}_org_id_fkey'`).output).toBe('0');
      expect(query(databaseUrl, `SELECT count(*) FROM pg_indexes WHERE indexname = 'xp_events_academy_id_created_at_idx'`).output).toBe('0');
      query(databaseUrl, `UPDATE public.${table} SET org_id = '${orgId}'`);
    }
  });

  test('adds all organization constraints without changing valid historical data', () => {
    query(databaseUrl, migration(relationMigration));
    expect(query(databaseUrl, 'SELECT xp_earned FROM public.user_streaks').output).toBe('25');
    for (const table of orgTables) {
      expect(query(databaseUrl, `SELECT convalidated FROM pg_constraint WHERE conname = '${table}_org_id_fkey'`).output).toBe('t');
      const invalidUpdate = query(databaseUrl, `UPDATE public.${table} SET org_id = '10000000-0000-4000-8000-000000000099'`, true);
      expect(invalidUpdate.error).toContain(`${table}_org_id_fkey`);
      expect(query(databaseUrl, `SELECT count(*) FROM public.${table} WHERE org_id = '${orgId}'`).output).toBe('1');
    }
    const rejected = query(databaseUrl, `INSERT INTO public.user_streaks (id, user_id, org_id, date, updated_at)
      VALUES (gen_random_uuid(), '${userId}', '10000000-0000-4000-8000-000000000099', current_date, now())`, true);
    expect(rejected.error).toContain('user_streaks_org_id_fkey');
  });

  test('cascades tenant deletion while retaining the learner identity', () => {
    const checks = orgTables.map(table => `SELECT count(*) FROM public.${table}`).join(';');
    expect(query(databaseUrl, `BEGIN; DELETE FROM public.organizations WHERE id = '${orgId}'; ${checks}; SELECT count(*) FROM public.users WHERE id = '${userId}'; ROLLBACK;`).output)
      .toBe('0\n0\n0\n0\n0\n1');
  });

  test('creates indexes ordered for both leaderboard filters', () => {
    for (const dimension of ['academy', 'course']) {
      expect(query(databaseUrl, `SELECT indexdef FROM pg_indexes WHERE indexname = 'xp_events_${dimension}_id_created_at_idx'`).output)
        .toContain(`(${dimension}_id, created_at)`);
    }
  });

  test('refuses duplicate historical emails without changing identities, then enforces uniqueness', () => {
    const duplicateId = '20000000-0000-4000-8000-000000000099';
    query(databaseUrl, `INSERT INTO public.users (id, email, updated_at) VALUES ('${duplicateId}', 'first@example.test', now())`);
    const rejected = query(databaseUrl, migration(alignmentMigration), true);
    expect(rejected.status).not.toBe(0);
    expect(rejected.error).toContain('duplicate email addresses');
    expect(query(databaseUrl, `SELECT count(*) FROM public.users WHERE email = 'first@example.test'`).output).toBe('2');
    query(databaseUrl, `DELETE FROM public.users WHERE id = '${duplicateId}'`);
    query(databaseUrl, migration(alignmentMigration));
    const duplicate = query(databaseUrl, `INSERT INTO public.users (id, email, updated_at) VALUES ('${duplicateId}', 'first@example.test', now())`, true);
    expect(duplicate.error).toContain('users_email_key');
  });

  test('consolidates existing policies and installs the auth trigger idempotently', () => {
    query(databaseUrl, migration(authMigration));
    query(databaseUrl, migration(authMigration));
    expect(query(databaseUrl, `SELECT count(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND NOT tgisinternal`).output).toBe('1');
    query(databaseUrl, `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
      ('20000000-0000-4000-8000-000000000004', 'new@example.test', '{"full_name":"New learner","avatar_url":"https://example.test/avatar.png"}')`);
    expect(query(databaseUrl, `SELECT display_name || ':' || (updated_at IS NOT NULL) FROM public.users WHERE email = 'new@example.test'`).output).toBe('New learner:true');
    query(databaseUrl, `INSERT INTO auth.users (id, email) VALUES ('${userId}', 'first@example.test')`);
    expect(query(databaseUrl, `SELECT count(*) FROM public.users WHERE id = '${userId}'`).output).toBe('1');
  });

  test('shows same-organization memberships without recursion or cross-tenant access', () => {
    expect(query(databaseUrl, asUser('SELECT count(*) FROM public.org_memberships')).output).toBe('2');
    expect(query(databaseUrl, asUser('SELECT slug FROM public.organizations')).output).toBe('first');
    expect(query(databaseUrl, asUser('SELECT count(*) FROM public.users')).output).toBe('1');
    expect(query(databaseUrl, asUser('SELECT count(*) FROM public.org_memberships', outsiderId)).output).toBe('1');
    expect(query(databaseUrl, asUser('SELECT count(*) FROM public.organizations', '', 'anon')).output).toBe('0');
    expect(query(databaseUrl, asUser('SELECT count(*) FROM public.users', '', 'anon')).output).toBe('0');
  });

  test('allows profile display edits while blocking privilege and identity changes', () => {
    expect(query(databaseUrl, asUser(`UPDATE public.users SET display_name = 'Edited' WHERE id = '${userId}' RETURNING display_name`)).output).toBe('Edited');
    expect(query(databaseUrl, asUser(`UPDATE public.users SET display_name = 'Wrong user' WHERE id = '${peerId}' RETURNING id`)).output).toBe('');
    for (const assignment of ["is_global_admin = true", "email = 'hijack@example.test'", `id = '${peerId}'`]) {
      expect(query(databaseUrl, asUser(`UPDATE public.users SET ${assignment} WHERE id = '${userId}'`), true).error).toContain('permission denied');
    }
    expect(query(databaseUrl, `SELECT is_global_admin FROM public.users WHERE id = '${userId}'`).output).toBe('f');
  });

  test('uses a fixed search path for privileged functions and keeps all tables under RLS', () => {
    expect(query(databaseUrl, `SELECT count(*) FROM pg_proc JOIN pg_namespace n ON n.oid = pronamespace
      WHERE n.nspname = 'public' AND proname IN ('handle_new_user', 'current_user_org_ids')
      AND prosecdef AND array_to_string(proconfig, ',') LIKE '%search_path=%'`).output).toBe('2');
    expect(query(databaseUrl, `SELECT count(*) FROM pg_tables t JOIN pg_class c ON c.oid = (quote_ident(t.schemaname) || '.' || quote_ident(t.tablename))::regclass
      WHERE t.schemaname = 'public' AND NOT c.relrowsecurity`).output).toBe('0');
  });

  test('retains legacy data until the separate retirement proposal is approved', () => {
    for (const table of ['user_progress', 'user_bookmarks', 'invite_tokens', 'exams', 'topics', 'sections', 'study_items']) {
      expect(query(databaseUrl, `SELECT to_regclass('public.${table}') IS NOT NULL`).output).toBe('t');
    }
    expect(query(databaseUrl, `SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'org_slug'`).output).toBe('1');
  });

  test('applies every migration on plain PostgreSQL without Supabase auth objects', () => {
    query(bareDatabaseUrl, migration(relationMigration));
    query(bareDatabaseUrl, migration(authMigration));
    query(bareDatabaseUrl, migration(authMigration));
    query(bareDatabaseUrl, migration(alignmentMigration));
    expect(query(bareDatabaseUrl, `SELECT to_regclass('auth.users') IS NULL`).output).toBe('t');
  });

  test('deploys a new database through Prisma and matches the schema', () => {
    const freshUrl = createDatabase();
    const cwd = join(import.meta.dir, '../..');
    const env = { ...process.env, DATABASE_URL: freshUrl, DIRECT_URL: freshUrl };
    for (let attempt = 0; attempt < 2; attempt++) {
      const deployed = spawnSync('bun', ['x', 'prisma', 'migrate', 'deploy'], { cwd, env, encoding: 'utf8' });
      expect(deployed.stderr).not.toContain('Error:');
      expect(deployed.status).toBe(0);
    }
    const diff = spawnSync('bun', ['x', 'prisma', 'migrate', 'diff', '--from-url', freshUrl,
      '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code'], { cwd, env, encoding: 'utf8' });
    if (diff.status !== 0) throw new Error(diff.stdout + diff.stderr);
    expect(diff.status).toBe(0);
  }, 60_000);
});
