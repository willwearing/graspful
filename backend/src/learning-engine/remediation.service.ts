import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RemediationService {
  constructor(private prisma: PrismaService) {}

  async getActiveRemediations(userId: string, academyId: string) {
    return this.prisma.remediation.findMany({
      where: { userId, academyId, resolved: false },
    });
  }

  async createRemediation(
    userId: string,
    academyId: string,
    blockedConceptId: string,
    weakPrerequisiteId: string,
    courseId: string,
  ) {
    return this.prisma.remediation.upsert({
      where: {
        userId_blockedConceptId_weakPrerequisiteId: {
          userId,
          blockedConceptId,
          weakPrerequisiteId,
        },
      },
      create: {
        userId,
        academyId,
        courseId,
        blockedConceptId,
        weakPrerequisiteId,
      },
      update: {
        academyId,
        courseId,
        resolved: false,
        resolvedAt: null,
      },
    });
  }

  async resolveRemediationsForPrerequisite(
    userId: string,
    weakPrerequisiteId: string,
  ) {
    return this.prisma.remediation.updateMany({
      where: {
        userId,
        weakPrerequisiteId,
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  async getBlockedConceptIds(
    userId: string,
    academyId: string,
  ): Promise<Set<string>> {
    const active = await this.getActiveRemediations(userId, academyId);
    return new Set(active.map((r) => r.blockedConceptId));
  }

  async getBlockedConceptIdsForCourse(
    userId: string,
    courseId: string,
  ): Promise<Set<string>> {
    const academyId = await this.getAcademyIdForCourse(courseId);
    return this.getBlockedConceptIds(userId, academyId);
  }

  private async getAcademyIdForCourse(courseId: string): Promise<string> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { academyId: true },
    });

    if (!course?.academyId) {
      throw new Error(`Course ${courseId} is missing academyId`);
    }

    return course.academyId;
  }

}
