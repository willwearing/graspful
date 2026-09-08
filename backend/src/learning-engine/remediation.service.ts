import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RemediationService {
  constructor(private prisma: PrismaService) {}

  async getActiveRemediations(userId: string, academyId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.remediation.findMany({
      where: { userId, academyId, resolved: false },
    });
  }

  async createRemediation(
    userId: string,
    academyId: string,
    blockedConceptId: string,
    weakPrerequisiteId: string,
    courseId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    return tx.remediation.upsert({
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
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Set<string>> {
    const active = await this.getActiveRemediations(userId, academyId, tx);
    return new Set(active.map((r) => r.blockedConceptId));
  }

  async getBlockedConceptIdsForCourse(
    userId: string,
    courseId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Set<string>> {
    const academyId = await this.getAcademyIdForCourse(courseId, tx);
    return this.getBlockedConceptIds(userId, academyId, tx);
  }

  private async getAcademyIdForCourse(courseId: string, tx: Prisma.TransactionClient): Promise<string> {
    const course = await tx.course.findUnique({
      where: { id: courseId },
      select: { academyId: true },
    });

    if (!course?.academyId) {
      throw new Error(`Course ${courseId} is missing academyId`);
    }

    return course.academyId;
  }

}
