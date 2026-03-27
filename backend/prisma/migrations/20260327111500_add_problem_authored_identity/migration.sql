ALTER TABLE "problems"
ADD COLUMN IF NOT EXISTS "authored_id" TEXT;

UPDATE "problems"
SET "authored_id" = "id"::text
WHERE "authored_id" IS NULL;

ALTER TABLE "problems"
ALTER COLUMN "authored_id" SET NOT NULL;

ALTER TABLE "problems"
ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "problems_knowledge_point_id_authored_id_key"
ON "problems"("knowledge_point_id", "authored_id");

CREATE INDEX IF NOT EXISTS "problems_knowledge_point_id_is_archived_idx"
ON "problems"("knowledge_point_id", "is_archived");
