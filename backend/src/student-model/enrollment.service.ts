import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}

  async enrollStudent(orgId: string, userId: string, courseId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Verify course exists and belongs to org
      const course = await tx.course.findFirst({
        where: { id: courseId, orgId },
      });
      if (!course) {
        throw new NotFoundException('Course not found');
      }

      // Check for existing enrollment
      const existing = await tx.courseEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
      });
      if (existing) {
        throw new ConflictException('Already enrolled in this course');
      }

      // Create enrollment
      const enrollment = await tx.courseEnrollment.create({
        data: { userId, courseId },
      });

      // Create initial StudentConceptState for every concept in the course
      const concepts = await tx.concept.findMany({
        where: { courseId },
        select: { id: true },
      });

      if (concepts.length > 0) {
        await tx.studentConceptState.createMany({
          data: concepts.map((c) => ({
            userId,
            conceptId: c.id,
          })),
          skipDuplicates: true,
        });
      }

      return enrollment;
    });
  }
}
