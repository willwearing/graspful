ALTER TABLE "cli_auth_sessions"
    ADD COLUMN IF NOT EXISTS "consumed_at" TIMESTAMPTZ;
