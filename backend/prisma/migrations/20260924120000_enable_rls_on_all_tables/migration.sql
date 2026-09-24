-- Deny-by-default for Supabase's Data API roles (anon, authenticated).
--
-- Nothing reads these tables through PostgREST: the backend connects through
-- Prisma as the table owner, and owners bypass RLS. Enabling RLS on a table
-- with no policies therefore changes nothing for the API, but stops the public
-- anon key from reading tables such as api_keys, cli_auth_sessions and brands.
-- Existing policies from supabase/migrations/00002_rls_policies.sql still apply.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  -- Tables created by later migrations start with no Data API grants either.
  -- The roles only exist on Supabase, so skip this on plain Postgres.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
  END IF;
END $$;
