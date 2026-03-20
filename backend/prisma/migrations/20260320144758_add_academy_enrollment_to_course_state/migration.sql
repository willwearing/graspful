-- AlterTable
ALTER TABLE "student_course_states" ADD COLUMN     "academy_enrollment_id" UUID;

-- CreateIndex
CREATE INDEX "student_course_states_academy_enrollment_id_idx" ON "student_course_states"("academy_enrollment_id");

-- AddForeignKey
ALTER TABLE "student_course_states" ADD CONSTRAINT "student_course_states_academy_enrollment_id_fkey" FOREIGN KEY ("academy_enrollment_id") REFERENCES "academy_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: set academy_enrollment_id from matching academy enrollments
UPDATE student_course_states scs
SET academy_enrollment_id = ae.id
FROM academy_enrollments ae
JOIN courses c ON c.academy_id = ae.academy_id
WHERE scs.user_id = ae.user_id
AND scs.course_id = c.id;
