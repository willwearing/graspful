-- AlterTable
ALTER TABLE "section_exam_questions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "section_exam_sessions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_section_states" ALTER COLUMN "updated_at" DROP DEFAULT;
