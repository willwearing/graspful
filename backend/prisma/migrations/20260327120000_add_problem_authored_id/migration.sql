ALTER TABLE "problems" ADD COLUMN "authored_id" TEXT;

UPDATE "problems"
SET "authored_id" = "id"
WHERE "authored_id" IS NULL;

ALTER TABLE "problems"
ALTER COLUMN "authored_id" SET NOT NULL;

ALTER TABLE "problems"
ADD CONSTRAINT "problems_knowledge_point_id_authored_id_key" UNIQUE ("knowledge_point_id", "authored_id");
