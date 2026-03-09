-- CreateEnum
CREATE TYPE "problem_type" AS ENUM ('multiple_choice', 'fill_blank', 'true_false', 'ordering', 'matching', 'scenario');

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "estimated_hours" DOUBLE PRECISION,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concepts" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 5,
    "estimated_minutes" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_reference" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "difficulty_theta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "time_intensity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "time_intensity_sd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "study_item_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "concepts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_points" (
    "id" UUID NOT NULL,
    "concept_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "instruction_text" TEXT,
    "worked_example_text" TEXT,
    "instruction_audio_url" TEXT,
    "worked_example_audio_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "knowledge_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prerequisite_edges" (
    "id" UUID NOT NULL,
    "source_concept_id" UUID NOT NULL,
    "target_concept_id" UUID NOT NULL,
    "source_kp_id" UUID,
    "target_kp_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prerequisite_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encompassing_edges" (
    "id" UUID NOT NULL,
    "source_concept_id" UUID NOT NULL,
    "target_concept_id" UUID NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "weight_source" TEXT NOT NULL DEFAULT 'authored',
    "last_calibrated_at" TIMESTAMPTZ,
    "retention_gap" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encompassing_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problems" (
    "id" UUID NOT NULL,
    "knowledge_point_id" UUID NOT NULL,
    "type" "problem_type" NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_audio_url" TEXT,
    "options" JSONB,
    "correct_answer" JSONB NOT NULL,
    "explanation" TEXT,
    "explanation_audio_url" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "is_review_variant" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "courses_org_id_idx" ON "courses"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "courses_org_id_slug_key" ON "courses"("org_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "concepts_study_item_id_key" ON "concepts"("study_item_id");

-- CreateIndex
CREATE INDEX "concepts_org_id_idx" ON "concepts"("org_id");

-- CreateIndex
CREATE INDEX "concepts_course_id_idx" ON "concepts"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "concepts_course_id_slug_key" ON "concepts"("course_id", "slug");

-- CreateIndex
CREATE INDEX "knowledge_points_concept_id_idx" ON "knowledge_points"("concept_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_points_concept_id_slug_key" ON "knowledge_points"("concept_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "prerequisite_edges_source_concept_id_target_concept_id_key" ON "prerequisite_edges"("source_concept_id", "target_concept_id");

-- CreateIndex
CREATE UNIQUE INDEX "encompassing_edges_source_concept_id_target_concept_id_key" ON "encompassing_edges"("source_concept_id", "target_concept_id");

-- CreateIndex
CREATE INDEX "problems_knowledge_point_id_idx" ON "problems"("knowledge_point_id");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_points" ADD CONSTRAINT "knowledge_points_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prerequisite_edges" ADD CONSTRAINT "prerequisite_edges_source_concept_id_fkey" FOREIGN KEY ("source_concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prerequisite_edges" ADD CONSTRAINT "prerequisite_edges_target_concept_id_fkey" FOREIGN KEY ("target_concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encompassing_edges" ADD CONSTRAINT "encompassing_edges_source_concept_id_fkey" FOREIGN KEY ("source_concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encompassing_edges" ADD CONSTRAINT "encompassing_edges_target_concept_id_fkey" FOREIGN KEY ("target_concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problems" ADD CONSTRAINT "problems_knowledge_point_id_fkey" FOREIGN KEY ("knowledge_point_id") REFERENCES "knowledge_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;
