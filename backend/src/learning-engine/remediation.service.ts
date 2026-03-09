import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class RemediationService {
  constructor(private prisma: PrismaService) {}

  async getActiveRemediations(userId: string, courseId: string) {
    return this.prisma.remediation.findMany({
      where: { userId, courseId, resolved: false },
    });
  }

  async createRemediation(
    userId: string,
    courseId: string,
    blockedConceptId: string,
    weakPrerequisiteId: string,
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
        courseId,
        blockedConceptId,
        weakPrerequisiteId,
      },
      update: {
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
    courseId: string,
  ): Promise<Set<string>> {
    const active = await this.getActiveRemediations(userId, courseId);
    return new Set(active.map((r) => r.blockedConceptId));
  }
}
