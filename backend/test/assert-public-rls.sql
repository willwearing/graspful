-- Fail closed when a new migration introduces a public table without RLS.
-- Include partitioned tables and Prisma metadata because both are exposed
-- through the public schema. A missing schema must also fail the check.
DO $$
DECLARE
  unprotected_tables text;
  public_table_count integer;
BEGIN
  SELECT count(*), string_agg(format('%I.%I', n.nspname, c.relname), ', ' ORDER BY c.relname)
    FILTER (WHERE NOT c.relrowsecurity)
  INTO public_table_count, unprotected_tables
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p');

  IF public_table_count = 0 THEN
    RAISE EXCEPTION 'RLS check found no public tables. Apply migrations first.';
  END IF;

  IF unprotected_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Public tables without row security: %', unprotected_tables;
  END IF;
END;
$$;
