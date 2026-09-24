BEGIN;

-- The Prisma model has always treated email as unique. Refuse ambiguous
-- historical identities instead of deleting or merging user accounts.
DO $$
BEGIN
  IF EXISTS (SELECT email FROM public.users GROUP BY email HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot enforce users.email uniqueness: duplicate email addresses exist'
      USING HINT = 'Review duplicate user identities and correct them before retrying this migration. No accounts were changed.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
-- The existing unique index on token already covers these lookups.
DROP INDEX IF EXISTS "invite_tokens_token_idx";
ALTER TABLE "cli_auth_sessions" ALTER COLUMN "updated_at" DROP DEFAULT;

COMMIT;
