CREATE TABLE "cli_auth_sessions" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "user_id" UUID,
    "org_id" UUID,
    "encrypted_api_key" TEXT,
    "authorized_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cli_auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cli_auth_sessions_token_hash_key" ON "cli_auth_sessions"("token_hash");
CREATE INDEX "cli_auth_sessions_expires_at_idx" ON "cli_auth_sessions"("expires_at");
CREATE INDEX "cli_auth_sessions_user_id_idx" ON "cli_auth_sessions"("user_id");
CREATE INDEX "cli_auth_sessions_org_id_idx" ON "cli_auth_sessions"("org_id");

ALTER TABLE "cli_auth_sessions"
    ADD CONSTRAINT "cli_auth_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cli_auth_sessions"
    ADD CONSTRAINT "cli_auth_sessions_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
