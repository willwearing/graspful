import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, SectionMasteryState, CourseProgressState } from '@prisma/client';
import {
  activeConceptWhere,
  activeSectionWhere,
} from '@/knowledge-graph/active-course-content';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}

  async enrollStudent(orgId: string, userId: string, courseId: string) {
    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.findFirst({
        where: { id: courseId, orgId },
        select: { id: true, academyId: true },
      });
      if (!course) {
        throw new NotFoundException('Course not found');
      }

      const academyEnrollment = await this.ensureAcademyEnrollment(
        tx,
        orgId,
        userId,
        course.academyId,
      );

      const projection = await this.ensureCourseCompatibilityProjection(
        tx,
        userId,
        courseId,
      );

      return {
        userId,
        courseId,
        academyEnrollment,
        courseEnrollment: projection.courseEnrollment,
      };
    });
  }

  async enrollInAcademy(orgId: string, userId: string, academyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const academyEnrollment = await this.ensureAcademyEnrollment(
        tx,
        orgId,
        userId,
        academyId,
      );

      return { academyEnrollment };
    });
  }

  private async ensureAcademyEnrollment(
    tx: PrismaTx,
    orgId: string,
    userId: string,
    academyId: string,
  ) {
    const academy = await tx.academy.findFirst({
      where: { id: academyId, orgId },
      include: {
        courses: {
          orderBy: { sortOrder: 'asc' },
          include: {
            sections: {
              where: activeSectionWhere(),
              orderBy: { sortOrder: 'asc' },
              select: { id: true, courseId: true },
            },
            concepts: {
              where: activeConceptWhere(),
              select: { id: true },
            },
          },
        },
      },
    });

    if (!academy) {
      throw new NotFoundException('Academy not found');
    }

    const existing = await tx.academyEnrollment.findUnique({
      where: { userId_academyId: { userId, academyId } },
    });

    const enrollment =
      existing ??
      (await tx.academyEnrollment.create({
        data: { userId, academyId },
      }));

    const conceptRows = academy.courses.flatMap((course) =>
      course.concepts.map((concept) => ({
        userId,
        conceptId: concept.id,
      })),
    );

    if (conceptRows.length > 0) {
      await tx.studentConceptState.createMany({
        data: conceptRows,
        skipDuplicates: true,
      });
    }

    const sectionRows = academy.courses.flatMap((course) =>
      course.sections.map((section, index) => ({
        userId,
        courseId: course.id,
        sectionId: section.id,
        status:
          index === 0
            ? SectionMasteryState.lesson_in_progress
            : SectionMasteryState.locked,
      })),
    );

    if (sectionRows.length > 0) {
      await tx.studentSectionState.createMany({
        data: sectionRows,
        skipDuplicates: true,
      });
    }

    const courseStateRows = academy.courses.map((course, index) => ({
      userId,
      courseId: course.id,
      academyEnrollmentId: enrollment.id,
      status:
        index === 0
          ? CourseProgressState.active
          : CourseProgressState.unlocked,
    }));

    if (courseStateRows.length > 0) {
      await tx.studentCourseState.createMany({
        data: courseStateRows,
        skipDuplicates: true,
      });
    }

    const compatibilityEnrollments = academy.courses.map((course) => ({
      userId,
      courseId: course.id,
    }));

    if (compatibilityEnrollments.length > 0) {
      await tx.courseEnrollment.createMany({
        data: compatibilityEnrollments,
        skipDuplicates: true,
      });
    }

    return enrollment;
  }

  private async ensureCourseCompatibilityProjection(
    tx: PrismaTx,
    userId: string,
    courseId: string,
  ) {
    const courseEnrollment = await tx.courseEnrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: {},
      create: { userId, courseId },
    });

    const [concepts, sections] = await Promise.all([
      tx.concept.findMany({
        where: activeConceptWhere({ courseId }),
        select: { id: true },
      }),
      tx.courseSection.findMany({
        where: activeSectionWhere({ courseId }),
        orderBy: { sortOrder: 'asc' },
        select: { id: true },
      }),
    ]);

    if (concepts.length > 0) {
      await tx.studentConceptState.createMany({
        data: concepts.map((concept) => ({
          userId,
          conceptId: concept.id,
        })),
        skipDuplicates: true,
      });
    }

    if (sections.length > 0) {
      await tx.studentSectionState.createMany({
        data: sections.map((section, index) => ({
          userId,
          courseId,
          sectionId: section.id,
          status:
            index === 0
              ? SectionMasteryState.lesson_in_progress
              : SectionMasteryState.locked,
        })),
        skipDuplicates: true,
      });
    }

    return { courseEnrollment };
  }
}
