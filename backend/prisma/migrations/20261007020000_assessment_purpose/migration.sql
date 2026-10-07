CREATE TYPE "problem_purpose" AS ENUM ('practice', 'review', 'exam');

ALTER TABLE "problems"
  ADD COLUMN "purpose" "problem_purpose" NOT NULL DEFAULT 'practice',
  ADD COLUMN "is_transfer" BOOLEAN NOT NULL DEFAULT false;

UPDATE "problems" SET "purpose" = 'review' WHERE "is_review_variant" = true;

CREATE INDEX "problems_knowledge_point_id_purpose_is_archived_idx"
  ON "problems" ("knowledge_point_id", "purpose", "is_archived");
