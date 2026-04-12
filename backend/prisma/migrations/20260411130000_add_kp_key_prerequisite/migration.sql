-- Slice 3: key-prerequisite link per knowledge point.
-- Nullable during backfill; `graspful review` enforces presence in CI.

ALTER TABLE "knowledge_points"
ADD COLUMN "key_prerequisite_concept_id" UUID;

ALTER TABLE "knowledge_points"
ADD CONSTRAINT "knowledge_points_key_prerequisite_concept_id_fkey"
FOREIGN KEY ("key_prerequisite_concept_id")
REFERENCES "concepts"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "knowledge_points_key_prerequisite_concept_id_idx"
ON "knowledge_points"("key_prerequisite_concept_id");
