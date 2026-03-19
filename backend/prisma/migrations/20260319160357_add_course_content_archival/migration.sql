-- AlterTable
ALTER TABLE "concepts" ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "course_sections" ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "knowledge_points" ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false;
