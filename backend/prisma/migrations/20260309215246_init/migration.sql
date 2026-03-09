-- CreateEnum
CREATE TYPE "org_role" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete');

-- CreateEnum
CREATE TYPE "plan_tier" AS ENUM ('free', 'individual', 'team', 'enterprise');

-- CreateEnum
CREATE TYPE "generation_status" AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "is_global_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_memberships" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "org_role" NOT NULL DEFAULT 'member',
    "invited_by" UUID,
    "invited_at" TIMESTAMPTZ,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "source_document" TEXT,
    "edition_year" INTEGER,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_items" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "title" TEXT,
    "text_content" TEXT NOT NULL,
    "text_hash" TEXT NOT NULL,
    "char_count" INTEGER NOT NULL,
    "difficulty" TEXT,
    "importance" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_reference" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "study_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_files" (
    "id" UUID NOT NULL,
    "study_item_id" UUID NOT NULL,
    "voice" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'kokoro',
    "text_hash" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "storage_bucket" TEXT NOT NULL DEFAULT 'audio',
    "file_size_bytes" INTEGER NOT NULL,
    "duration_seconds" DOUBLE PRECISION,
    "format" TEXT NOT NULL DEFAULT 'flac',
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "study_item_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "listen_count" INTEGER NOT NULL DEFAULT 0,
    "last_position_seconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_playback_rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "first_listened_at" TIMESTAMPTZ,
    "last_listened_at" TIMESTAMPTZ,
    "ease_factor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval_days" INTEGER NOT NULL DEFAULT 1,
    "next_review_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_streaks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "listen_seconds" INTEGER NOT NULL DEFAULT 0,
    "items_completed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_bookmarks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "study_item_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "plan" "plan_tier" NOT NULL DEFAULT 'free',
    "status" "subscription_status" NOT NULL DEFAULT 'trialing',
    "trial_ends_at" TIMESTAMPTZ,
    "current_period_start" TIMESTAMPTZ,
    "current_period_end" TIMESTAMPTZ,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "max_members" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "org_role" NOT NULL DEFAULT 'member',
    "token" TEXT NOT NULL,
    "invited_by" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_generation_jobs" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "exam_id" UUID,
    "status" "generation_status" NOT NULL DEFAULT 'pending',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "completed_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "voices" TEXT[] DEFAULT ARRAY['af_heart']::TEXT[],
    "error_log" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "triggered_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "audio_generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "org_memberships_user_id_idx" ON "org_memberships"("user_id");

-- CreateIndex
CREATE INDEX "org_memberships_org_id_idx" ON "org_memberships"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_memberships_org_id_user_id_key" ON "org_memberships"("org_id", "user_id");

-- CreateIndex
CREATE INDEX "exams_org_id_idx" ON "exams"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "exams_org_id_slug_key" ON "exams"("org_id", "slug");

-- CreateIndex
CREATE INDEX "topics_exam_id_idx" ON "topics"("exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "topics_exam_id_slug_key" ON "topics"("exam_id", "slug");

-- CreateIndex
CREATE INDEX "sections_topic_id_idx" ON "sections"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "sections_topic_id_slug_key" ON "sections"("topic_id", "slug");

-- CreateIndex
CREATE INDEX "study_items_section_id_idx" ON "study_items"("section_id");

-- CreateIndex
CREATE INDEX "audio_files_study_item_id_idx" ON "audio_files"("study_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "audio_files_study_item_id_voice_model_text_hash_key" ON "audio_files"("study_item_id", "voice", "model", "text_hash");

-- CreateIndex
CREATE INDEX "user_progress_user_id_org_id_idx" ON "user_progress"("user_id", "org_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_progress_user_id_study_item_id_key" ON "user_progress"("user_id", "study_item_id");

-- CreateIndex
CREATE INDEX "user_streaks_user_id_org_id_idx" ON "user_streaks"("user_id", "org_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_streaks_user_id_org_id_date_key" ON "user_streaks"("user_id", "org_id", "date");

-- CreateIndex
CREATE INDEX "user_bookmarks_user_id_org_id_idx" ON "user_bookmarks"("user_id", "org_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_bookmarks_user_id_study_item_id_key" ON "user_bookmarks"("user_id", "study_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_org_id_key" ON "subscriptions"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key" ON "subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");

-- CreateIndex
CREATE INDEX "invite_tokens_token_idx" ON "invite_tokens"("token");

-- CreateIndex
CREATE INDEX "invite_tokens_email_idx" ON "invite_tokens"("email");

-- CreateIndex
CREATE INDEX "audio_generation_jobs_org_id_idx" ON "audio_generation_jobs"("org_id");

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_items" ADD CONSTRAINT "study_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_study_item_id_fkey" FOREIGN KEY ("study_item_id") REFERENCES "study_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_study_item_id_fkey" FOREIGN KEY ("study_item_id") REFERENCES "study_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_bookmarks" ADD CONSTRAINT "user_bookmarks_study_item_id_fkey" FOREIGN KEY ("study_item_id") REFERENCES "study_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_generation_jobs" ADD CONSTRAINT "audio_generation_jobs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_generation_jobs" ADD CONSTRAINT "audio_generation_jobs_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
