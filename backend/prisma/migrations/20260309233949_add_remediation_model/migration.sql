-- CreateTable
CREATE TABLE "remediations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "blocked_concept_id" UUID NOT NULL,
    "weak_prerequisite_id" UUID NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "remediations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "remediations_user_id_course_id_resolved_idx" ON "remediations"("user_id", "course_id", "resolved");

-- CreateIndex
CREATE UNIQUE INDEX "remediations_user_id_blocked_concept_id_weak_prerequisite_i_key" ON "remediations"("user_id", "blocked_concept_id", "weak_prerequisite_id");
