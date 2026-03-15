-- AddForeignKey
ALTER TABLE "diagnostic_mastery_snapshots" ADD CONSTRAINT "diagnostic_mastery_snapshots_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
